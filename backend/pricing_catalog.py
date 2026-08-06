"""Fetch and reduce the LiteLLM model pricing catalog."""

from __future__ import annotations

import fnmatch
import hashlib
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _read_object(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def _per_million(value: float) -> float:
    """Convert a per-token price without exposing binary float noise."""
    return round(value * 1_000_000, 12)


def _normalized(value: Any) -> str:
    return str(value or "").strip().lower().replace("_", "-")


def _stable_slug(value: Any) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", _normalized(value)).strip("-")
    if slug:
        return slug
    return "unknown-" + hashlib.sha1(str(value or "").encode("utf-8")).hexdigest()[:8]


def _matches(value: str, patterns: list[str]) -> bool:
    if not patterns:
        return True
    return any(fnmatch.fnmatchcase(value, _normalized(pattern)) for pattern in patterns)


def _provider_candidates(model_id: str, item: dict[str, Any]) -> list[str]:
    candidates: list[str] = []
    provider = _normalized(item.get("litellm_provider") or item.get("provider"))
    if provider:
        candidates.append(provider)
    if "/" in model_id:
        prefix = _normalized(model_id.split("/", 1)[0])
        if prefix and prefix not in candidates:
            candidates.append(prefix)
    return candidates


def _provider_config(model_id: str, item: dict[str, Any], config: dict[str, Any]) -> tuple[str, str | None]:
    providers = config.get("providers") if isinstance(config.get("providers"), dict) else {}
    candidates = _provider_candidates(model_id, item)
    for candidate in candidates:
        details = next(
            (value for key, value in providers.items() if _normalized(key) == candidate),
            None,
        )
        if isinstance(details, dict):
            return str(details.get("name") or candidate), details.get("icon")
    provider = next(iter(candidates), "unknown")
    return provider, None


def _category_definitions(config: dict[str, Any]) -> list[tuple[str, str, list[str], list[str]]]:
    """Read custom category rules while accepting both list and map config forms."""
    configured = config.get("categories")
    if configured is None:
        configured = config.get("customCategories")
    definitions: list[tuple[str, str, list[str], list[str]]] = []
    entries = configured.items() if isinstance(configured, dict) else enumerate(configured or [])
    for key, value in entries:
        if isinstance(value, dict):
            category_id = str(value.get("categoryId") or value.get("id") or key)
            category_name = str(value.get("category") or value.get("name") or category_id)
            model_patterns = value.get("patterns") or value.get("modelPatterns") or value.get("models") or []
            provider_patterns = value.get("providers") or value.get("providerPatterns") or []
        else:
            category_id = str(key)
            category_name = category_id
            model_patterns = value if isinstance(value, list) else []
            provider_patterns = []
        if isinstance(model_patterns, str):
            model_patterns = [model_patterns]
        if isinstance(provider_patterns, str):
            provider_patterns = [provider_patterns]
        definitions.append(
            (
                _stable_slug(category_id),
                category_name,
                [str(pattern) for pattern in model_patterns if pattern is not None],
                [str(pattern) for pattern in provider_patterns if pattern is not None],
            )
        )
    return definitions


def _category_for(
    model_id: str,
    item: dict[str, Any],
    provider_id: str,
    provider_name: str,
    definitions: list[tuple[str, str, list[str], list[str]]],
) -> tuple[str, str]:
    normalized_model_id = _normalized(model_id)
    model_values = [normalized_model_id, _normalized(item.get("model_name")), _normalized(item.get("mode"))]
    for category_id, category_name, model_patterns, provider_patterns in definitions:
        model_match = any(
            pattern and any(fnmatch.fnmatchcase(value, _normalized(pattern)) for value in model_values if value)
            for pattern in model_patterns
        )
        provider_match = any(
            pattern and fnmatch.fnmatchcase(provider_id, _normalized(pattern)) for pattern in provider_patterns
        )
        if model_match or provider_match:
            return category_id, category_name
    return "provider-" + _stable_slug(provider_id), provider_name


def reduce_catalog(raw: dict[str, Any], config: dict[str, Any]) -> list[dict[str, Any]]:
    """Convert LiteLLM's large map into the app's small model shape."""
    filters = config.get("filters") if isinstance(config.get("filters"), dict) else {}
    all_models = bool(filters.get("allModels") or filters.get("includeAll") or filters.get("syncAll"))
    allow_providers = {_normalized(value) for value in filters.get("providers", [])} if not all_models else set()
    include_models = [str(value) for value in filters.get("includeModels", [])] if not all_models else []
    defaults = config.get("defaults") if isinstance(config.get("defaults"), dict) else {}
    mappings = config.get("modelMappings") if isinstance(config.get("modelMappings"), dict) else {}
    cache_field = str(defaults.get("cacheField") or "cache_read_input_token_cost")
    fallback_cache = str(defaults.get("cacheFallback") or "input")
    category_definitions = _category_definitions(config)
    models: list[dict[str, Any]] = []

    for model_id, item in raw.items():
        if not isinstance(item, dict):
            continue
        model_key = str(model_id)
        normalized_id = _normalized(model_key)
        candidates = _provider_candidates(model_key, item)
        if allow_providers and not any(
            provider == candidate or provider in candidate or candidate in provider
            for provider in allow_providers
            for candidate in candidates
        ):
            continue
        if not _matches(normalized_id, include_models):
            continue
        input_cost = _number(item.get("input_cost_per_token"))
        output_cost = _number(item.get("output_cost_per_token"))
        if input_cost is None or output_cost is None:
            continue
        cache_cost = _number(item.get(cache_field))
        if cache_cost is None and fallback_cache == "input":
            cache_cost = input_cost
        if cache_cost is None:
            cache_cost = 0

        provider_name, icon = _provider_config(model_key, item, config)
        provider_id = next(iter(candidates), "unknown")
        category_id, category_name = _category_for(
            model_key, item, provider_id, provider_name, category_definitions
        )
        mapping = mappings.get(model_key) if isinstance(mappings.get(model_key), dict) else {}
        stable_id = "catalog-litellm-" + hashlib.sha1(model_key.encode("utf-8")).hexdigest()[:12]
        display_name = str(item.get("display_name") or item.get("model_name") or model_key)
        models.append(
            {
                "id": stable_id,
                "name": display_name,
                "provider": provider_name,
                "providerId": provider_id,
                "category": category_name,
                "categoryId": category_id,
                "source": "litellm",
                "sourceModelId": model_key,
                "targetId": str(mapping.get("targetId") or ""),
                "enabled": False,
                "icon": icon,
                "cache": _per_million(cache_cost),
                "input": _per_million(input_cost),
                "output": _per_million(output_cost),
                "multiplier": _number(defaults.get("multiplier")) or 1,
                "fxRate": _number(defaults.get("fxRate")) or 7.2,
                "comparisonRatio": _number(defaults.get("comparisonRatio")) or 4,
                "comparisonHit": _number(defaults.get("comparisonHit")) or 30,
                "comparisonTotal": _number(defaults.get("comparisonTotal")) or 100,
            }
        )
    return sorted(models, key=lambda model: (model["provider"], model["name"]))


def bundled_fallback_models(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Return the small built-in catalog used before any remote/cache data exists."""
    configured = config.get("fallbackModels")
    if not isinstance(configured, list):
        return []
    models: list[dict[str, Any]] = []
    for index, item in enumerate(configured):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("sourceModelId") or f"Fallback model {index + 1}")
        source_id = str(item.get("sourceModelId") or item.get("id") or name)
        models.append(
            {
                "id": str(item.get("id") or "fallback-" + _stable_slug(source_id)),
                "name": name,
                "provider": str(item.get("provider") or "OpenAI"),
                "providerId": str(item.get("providerId") or "openai"),
                "category": str(item.get("category") or "openai"),
                "categoryId": str(item.get("categoryId") or "provider-openai"),
                "source": "litellm",
                "sourceModelId": source_id,
                "targetId": str(item.get("targetId") or ""),
                "enabled": False,
                "icon": str(item.get("icon") or ""),
                "cache": _number(item.get("cache")) or 0,
                "input": _number(item.get("input")) or 0,
                "output": _number(item.get("output")) or 0,
                "multiplier": _number(item.get("multiplier")) or 1,
                "fxRate": _number(item.get("fxRate")) or 7.2,
                "comparisonRatio": _number(item.get("comparisonRatio")) or 4,
                "comparisonHit": _number(item.get("comparisonHit")) or 30,
                "comparisonTotal": _number(item.get("comparisonTotal")) or 100,
            }
        )
    return models


def _cache_path(config_path: Path, configured_path: str) -> Path:
    root = config_path.parent.parent.resolve()
    target = (root / configured_path).resolve()
    try:
        target.relative_to(root)
    except ValueError as error:
        raise ValueError("Pricing cache must stay inside the project directory.") from error
    return target


def fetch_pricing_models(config_path: Path) -> dict[str, Any]:
    """Fetch remote pricing, with a local-cache fallback for offline use."""
    config = _read_object(config_path)
    if config is None:
        return {"ok": False, "error": "Pricing configuration is missing or invalid.", "models": []}

    source = config.get("source") if isinstance(config.get("source"), dict) else {}
    url = str(source.get("url") or "")
    cache_file = str(source.get("cacheFile") or "cache/litellm-model-prices.json")
    cache_path = _cache_path(config_path, cache_file)
    timeout = max(3, min(60, int(source.get("timeoutSeconds") or 15)))
    raw: dict[str, Any] | None = None
    from_cache = False
    warning = ""

    try:
        request = urllib.request.Request(url, headers={"User-Agent": "TokenCostCalc/1.0"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read()
        candidate = json.loads(payload.decode("utf-8"))
        if not isinstance(candidate, dict):
            raise ValueError("Remote pricing data is not a JSON object.")
        raw = candidate
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = cache_path.with_suffix(".tmp")
        temporary_path.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
        temporary_path.replace(cache_path)
    except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as error:
        raw = _read_object(cache_path)
        if raw is None:
            fallback_models = bundled_fallback_models(config)
            if not fallback_models:
                return {"ok": False, "error": f"Unable to fetch pricing data: {error}", "models": []}
            return {
                "ok": True,
                "fromCache": True,
                "warning": f"Remote fetch failed; using bundled fallback pricing: {error}",
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
                "count": len(fallback_models),
                "models": fallback_models,
            }
        from_cache = True
        warning = f"Remote fetch failed; using cached pricing data: {error}"

    models = reduce_catalog(raw, config)
    return {
        "ok": True,
        "fromCache": from_cache,
        "warning": warning,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(models),
        "models": models,
    }
