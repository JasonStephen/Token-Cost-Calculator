"""Persistent state and default-configuration access for the web UI."""

from __future__ import annotations

import json
from pathlib import Path

from backend.pricing_catalog import fetch_pricing_models


def read_json_object(path: Path) -> dict | None:
    """Return a JSON object from path, or None for a missing/invalid file."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


class StateApi:
    """Methods exposed to the PyWebView frontend."""

    def __init__(self, defaults_path: Path, state_path: Path, pricing_config_path: Path) -> None:
        self.defaults_path = defaults_path
        self.state_path = state_path
        self.pricing_config_path = pricing_config_path

    def load_defaults(self) -> dict:
        defaults = read_json_object(self.defaults_path)
        if defaults is None:
            raise RuntimeError("Default configuration is missing or invalid.")
        return defaults

    def load_state(self) -> dict | None:
        return read_json_object(self.state_path)

    def load_pricing_config(self) -> dict:
        config = read_json_object(self.pricing_config_path)
        if config is None:
            raise RuntimeError("Pricing configuration is missing or invalid.")
        return config

    def save_state(self, state: dict) -> bool:
        if not isinstance(state, dict):
            return False
        try:
            temporary_path = self.state_path.with_suffix(".tmp")
            temporary_path.write_text(
                json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            temporary_path.replace(self.state_path)
            return True
        except OSError:
            return False

    def reset_state(self) -> bool:
        try:
            self.state_path.unlink(missing_ok=True)
            return True
        except OSError:
            return False

    def fetch_pricing_models(self) -> dict:
        return fetch_pricing_models(self.pricing_config_path)
