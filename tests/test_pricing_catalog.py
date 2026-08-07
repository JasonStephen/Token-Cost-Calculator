import unittest
import json
import tempfile
import re
from pathlib import Path
from unittest.mock import patch
import urllib.error

from backend.pricing_catalog import bundled_fallback_models, fetch_pricing_models, reduce_catalog


class PricingCatalogTests(unittest.TestCase):
    def test_locales_define_custom_pricing_filter_copy(self):
        root = Path(__file__).resolve().parents[1]
        required = {
            "models.filterPricing",
            "models.allPricing",
            "models.customPricing",
            "models.originalPricing",
            "models.nonCustomPricing",
            "models.pricingSelected",
            "scenario.emptyAdd",
            "filter.modelOrder",
            "filter.modelOrderHint",
        }
        locale_files = {
            "zh-CN": root / "web" / "locales" / "zh-CN.js",
            "zh-TW": root / "web" / "locales" / "zh-TW.js",
            "en": root / "web" / "locales" / "en.js",
        }

        for locale, path in locale_files.items():
            source = path.read_text(encoding="utf-8")
            keys = set(re.findall(r'^\s*"([^"]+)"\s*:', source, re.MULTILINE))
            self.assertTrue(required <= keys, f"{locale} is missing {required - keys}")
            selected_line = next(
                line for line in source.splitlines() if '"models.pricingSelected"' in line
            )
            self.assertIn("{count}", selected_line)

    def test_help_copy_matches_catalog_and_unbounded_model_selection(self):
        root = Path(__file__).resolve().parents[1]
        locale_files = [
            root / "web" / "locales" / "zh-CN.js",
            root / "web" / "locales" / "zh-TW.js",
            root / "web" / "locales" / "en.js",
        ]
        stale_fragments = (
            '"filter.maxSelected"',
            "At most three models can be selected",
            "Only the three GPT-5.6 model prices are preconfigured",
            "当前最多只支持选择 3 个模型",
            "本项目默认只预设了 GPT-5.6",
            "目前最多只支援選擇 3 個模型",
            "本專案預設僅包含 GPT-5.6",
        )
        for path in locale_files:
            source = path.read_text(encoding="utf-8")
            self.assertIn('"help.comparison.note"', source)
            for fragment in stale_fragments:
                self.assertNotIn(fragment, source)

        app_source = (root / "web" / "app.js").read_text(encoding="utf-8")
        self.assertIn("ONBOARDING_DEFAULT_MODEL_LIMIT = 3", app_source)
        self.assertNotIn("MAX_CALCULATOR_MODELS", app_source)

    def test_model_management_ui_contract(self):
        root = Path(__file__).resolve().parents[1]
        app_source = (root / "web" / "app.js").read_text(encoding="utf-8")
        html_source = (root / "web" / "index.html").read_text(encoding="utf-8")
        css_source = (root / "web" / "styles.css").read_text(encoding="utf-8")

        self.assertIn("const SETTINGS_MODEL_PAGE_SIZES = [12, 24]", app_source)
        self.assertNotIn("SETTINGS_MODEL_PAGE_SIZE = 48", app_source)
        self.assertIn("model.source === 'manual'", app_source)
        self.assertIn('id="newModelCategory"', html_source)
        self.assertIn('id="newModelProvider"', html_source)
        self.assertIn("['others', uiText('model.add.providerOther'", app_source)
        self.assertNotIn('class="model-name"', app_source)
        self.assertIn('id="showHostedModels"', html_source)
        self.assertIn('data-i18n="action.syncPricing"', html_source)
        self.assertIn('id="pricingStatus"', html_source)
        self.assertNotIn('settings-catalog-status"><span class="pricing-status"', html_source)
        self.assertIn('class="settings-panel-stack"', html_source)
        self.assertIn('data-i18n="settings.modelVisibility"', html_source)
        self.assertIn(".settings-panel-stack", css_source)
        self.assertIn("width:42px; min-width:42px", css_source)
        self.assertIn('providerWhitelist', (root / "config" / "pricing_catalog.json").read_text(encoding="utf-8"))
        self.assertIn("settingsVisibleModels()", app_source)
        self.assertIn("models.otherProviders", app_source)
        self.assertIn('id="resetModelConfig"', html_source)
        self.assertIn("catalogPricing:priceSnapshot(item)", app_source)
        self.assertNotRegex(css_source, r"\.app\s*\{[^}]*max-width")
        self.assertIn("settings-models-active", css_source)
        self.assertIn("settings-models-section .settings-model-grid", css_source)
        self.assertIn("grid-template-rows:auto minmax(0, 1fr) auto", css_source)
        self.assertIn("settings-models-section .settings-model-main", css_source)
        self.assertIn("settings-view.settings-models-active:not([hidden])", css_source)
        self.assertIn("settings-view.settings-models-active[hidden]", css_source)
        self.assertIn("align-items:stretch", css_source)
        self.assertIn("overflow-y:scroll", css_source)
        self.assertIn("scrollbar-gutter:stable", css_source)
        self.assertIn("flex:1 1 auto", css_source)
        self.assertIn(".settings-models-section .settings-model-list", css_source)
        self.assertIn("min-height:100%", css_source)
        self.assertIn("min(100%, 300px), 300px", css_source)
        self.assertIn(".settings-model-card { min-width:0; display:flex; flex-direction:column; }", css_source)
        self.assertIn(".model-card-price-unit { margin: auto 0 -5px;", css_source)
        self.assertIn(".settings-model-card-actions { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:0; }", css_source)
        self.assertIn("has-model-tooltip", app_source)
        self.assertIn("data-model-tooltip", app_source)
        self.assertIn("attr(data-model-tooltip)", css_source)
        self.assertIn("old && typeof old.enabled === 'boolean' ? old.enabled : false", app_source)
        self.assertIn("clearPricingStatus()", app_source)
        self.assertIn("model-status ' + (modelEnabled(model) ? 'is-enabled' : 'is-disabled')", app_source)
        self.assertIn("--accent-ink", css_source)
        self.assertIn("--result-ink", css_source)
        self.assertIn(":root[data-theme=\"dark\"] .about-brand-logo", css_source)
        self.assertIn('.section-heading h2 span:first-child { margin-left:0; font-size:22px;', css_source)
        self.assertNotIn('① Usage breakdown', html_source)
        self.assertNotIn('② Model comparison', html_source)
        self.assertNotIn('③ Tokens to cost', html_source)
        self.assertNotIn('④ Budget to tokens', html_source)
        self.assertIn('.section-heading h2 span:nth-of-type(2) { font-size:12px;', css_source)
        self.assertIn('.home-view-card > span:last-child { color:var(--accent-ink); font-size:13px;', css_source)
        self.assertIn('.hint { margin:5px 0 0; font-size:13px;', css_source)
        self.assertIn('.about-brand-row p, .about-block p, .about-license p', css_source)
        self.assertNotIn("modelBadge(model, true) + '<span class=\"model-status\">", app_source)
        self.assertNotIn("height:calc(100vh - 190px)", css_source)
        self.assertNotIn("height:calc(100vh - 164px)", css_source)
        self.assertIn("grid-template-rows:auto auto minmax(0, 1fr)", css_source)
        self.assertIn("margin-bottom:0; padding-bottom:0; border-bottom:0", css_source)
        self.assertIn(".settings-back-button { justify-self:start; width:max-content;", css_source)
        self.assertIn(".settings-back-button:hover { color:var(--ink); background:transparent; }", css_source)
        self.assertIn(".settings-back-button:focus-visible { color:var(--ink); outline:0;", css_source)
        self.assertIn("const activeView = 'home'", app_source)
        self.assertIn('id="sidebarBackdrop"', html_source)
        self.assertNotIn('class="sidebar-toggle-label"', html_source)
        self.assertIn('.sidebar-backdrop', css_source)
        self.assertIn('transform:translateX(-100%)', css_source)
        self.assertIn('id="sidebarToggle"', html_source)
        self.assertIn('class="section tool-view"', html_source)
        self.assertIn('class="tool-view-body"', html_source)
        self.assertIn('.app-shell.tool-view-active .app', css_source)
        self.assertIn('.app-shell.tool-view-active .tool-view.is-active:not([hidden])', css_source)
        self.assertIn("tool-view-active", app_source)
        self.assertIn("scenario-entry-list", app_source)
        self.assertIn("scenario-entry", app_source)
        self.assertIn("scenario-row-inputs", app_source)
        self.assertIn("scenario-result-scroll", app_source)
        self.assertIn(".scenario-result-scroll { min-width:0; min-height:0; flex:1 1 auto; overflow-y:auto;", css_source)
        self.assertIn(".tool-view-body { min-width:0; min-height:0; overflow-x:hidden; overflow-y:auto; }", css_source)
        self.assertIn(".scenario-row-inputs { min-width:0; flex:0 0 auto; display:grid; grid-template-columns:1fr; }", css_source)
        self.assertIn(".scenario-row-inputs .scenario-cell label { font-size:18px; }", css_source)
        self.assertIn(".scenario-row-inputs .scenario-number { min-height:39px; padding:6px 10px; }", css_source)
        self.assertIn(".scenario-row-inputs .scenario-input { padding:6px; font-size:12px; }", css_source)
        self.assertIn(".scenario-entry-list { width:max-content; min-width:0; min-height:100%; display:grid; grid-auto-flow:column; grid-auto-columns:180px;", css_source)
        self.assertIn("grid-template-columns:repeat(2, minmax(0, 1fr))", css_source)
        self.assertIn("section-heading h2 span:nth-of-type(2) { display:inline;", css_source)
        self.assertIn("section-heading h2 .help-btn { flex:0 0 auto; margin-left:0; }", css_source)
        self.assertIn(".section-actions .model-filter { flex:0 1 auto; width:auto; max-width:100%; min-width:0; }", css_source)
        self.assertIn('class="tool-view-actions"', html_source)
        self.assertNotIn('id="addModel"', html_source)
        self.assertIn(".app-shell.tool-view-active .tool-view.is-active:not([hidden])", css_source)
        self.assertIn('class="add-btn add-item-icon-btn"', html_source)
        self.assertIn('data-model-selection-panel="select"', html_source)
        self.assertIn('id="modelSelectionOrderPanel"', html_source)
        self.assertIn("modelSelectionPanel = 'select'", app_source)
        self.assertIn('draggable="true"', app_source)
        self.assertIn("data-model-order-id", app_source)
        self.assertNotIn("data-model-order-move", app_source)
        self.assertIn("is-drop-before", app_source)
        self.assertIn("is-drop-after", app_source)
        self.assertIn("model-selection-order-hint", app_source)
        self.assertIn(".scenario-config { width:100%; max-width:760px; display:grid; grid-template-columns:repeat(5, minmax(0, 1fr));", css_source)
        self.assertGreaterEqual(css_source.count(".section-actions { width:100%; flex-wrap:wrap; justify-content:flex-end; }"), 2)
        self.assertIn(".scenario-config { grid-template-columns:repeat(2, minmax(0, 1fr)); max-width:none; }", css_source)
        self.assertNotIn("slice(0, 3)", app_source)
        self.assertNotIn("modelSelectionDraft.size > 1", app_source)
        self.assertNotIn("filter.maxSelected", app_source)

    def test_batch_launcher_keeps_devtools_manual(self):
        root = Path(__file__).resolve().parents[1]
        app_source = (root / "app.py").read_text(encoding="utf-8")
        batch_source = (root / "start.bat").read_text(encoding="utf-8")

        self.assertIn('debug="--devtools" in sys.argv[1:]', app_source)
        self.assertIn("webview.start(debug=debug)", app_source)
        self.assertNotIn("--devtools", batch_source)

    def test_about_page_ui_contract(self):
        root = Path(__file__).resolve().parents[1]
        html_source = (root / "web" / "index.html").read_text(encoding="utf-8")
        app_source = (root / "web" / "app.js").read_text(encoding="utf-8")
        css_source = (root / "web" / "styles.css").read_text(encoding="utf-8")

        self.assertIn('data-settings-target="about"', html_source)
        self.assertIn('id="settingsAboutSection"', html_source)
        self.assertIn('assets/about/memspace-icon.svg', html_source)
        self.assertIn('assets/about/author-avatar.jpg', html_source)
        self.assertIn('assets/about/github.svg', html_source)
        self.assertIn('assets/about/bilibili.svg', html_source)
        self.assertIn('assets/about/youtube.svg', html_source)
        self.assertIn("https://github.com/JasonStephen", html_source)
        self.assertIn("https://space.bilibili.com/39750208", html_source)
        self.assertIn("https://www.youtube.com/@stephenjason280", html_source)
        self.assertIn("https://github.com/BerriAI/litellm", html_source)
        self.assertIn("https://github.com/lobehub/lobe-icons", html_source)
        self.assertNotIn('data-i18n="about.subtitle"', html_source)
        self.assertIn('class="about-scroll"', html_source)
        self.assertIn("settings-about-active", app_source)
        self.assertIn(".settings-view.settings-about-active .about-scroll", css_source)
        self.assertIn("'about'", app_source)
        self.assertTrue((root / "web" / "assets" / "about" / "memspace-icon.svg").is_file())
        self.assertTrue((root / "web" / "assets" / "about" / "author-avatar.jpg").is_file())
        self.assertTrue((root / "web" / "assets" / "about" / "github.svg").is_file())
        self.assertTrue((root / "web" / "assets" / "about" / "bilibili.svg").is_file())
        self.assertTrue((root / "web" / "assets" / "about" / "youtube.svg").is_file())

    def test_project_license_and_readme_contract(self):
        root = Path(__file__).resolve().parents[1]
        license_source = (root / "LICENSE").read_text(encoding="utf-8")
        readme_source = (root / "README.md").read_text(encoding="utf-8")

        self.assertIn("Apache License", license_source)
        self.assertIn("Copyright 2026 Jason Stephen", license_source)
        self.assertIn("Apache License 2.0", readme_source)
        self.assertIn("LiteLLM", readme_source)
        self.assertIn("Lobe Icons", readme_source)

    def test_decorative_strokes_are_removed(self):
        root = Path(__file__).resolve().parents[1]
        html_source = (root / "web" / "index.html").read_text(encoding="utf-8")
        css_source = (root / "web" / "styles.css").read_text(encoding="utf-8")

        self.assertNotIn('class="scribble"', html_source)
        self.assertNotIn('class="settings-page-rule"', html_source)
        self.assertNotIn(".scribble", css_source)
        self.assertNotIn("settings-page-rule", css_source)

    def test_configured_brand_icons_are_local_files(self):
        root = Path(__file__).resolve().parents[1]
        config = json.loads((root / "config" / "pricing_catalog.json").read_text(encoding="utf-8"))

        self.assertEqual(set(config["providers"]), {"openai", "anthropic", "gemini", "deepseek", "dashscope", "moonshot", "zai", "meta", "mistral", "minimax", "xai"})
        for provider in config["providers"].values():
            icon = provider["icon"]
            self.assertTrue(icon.startswith("icons/brands/"), icon)
            self.assertTrue((root / "web" / icon).is_file(), icon)

    def test_runtime_icon_source_is_local(self):
        root = Path(__file__).resolve().parents[1]
        config = json.loads((root / "config" / "pricing_catalog.json").read_text(encoding="utf-8"))

        self.assertEqual(config["iconSource"]["baseUrl"], "icons/providers")
        self.assertFalse(config["iconSource"]["preferRemote"])
        self.assertTrue((root / "web" / "icons" / "providers" / "openai.svg").is_file())
        self.assertTrue((root / "web" / "icons" / "providers" / "zhipu.svg").is_file())

    def test_full_catalog_ignores_provider_and_include_allow_lists(self):
        raw = {
            "openai/gpt-4o": {
                "litellm_provider": "openai",
                "input_cost_per_token": 2.5e-6,
                "output_cost_per_token": 10e-6,
                "cache_read_input_token_cost": 1.25e-6,
            },
            "deepseek-chat": {
                "litellm_provider": "deepseek",
                "input_cost_per_token": 0.2e-6,
                "output_cost_per_token": 0.8e-6,
            },
            "openai/text-embedding-3-small": {
                "litellm_provider": "openai",
                "input_cost_per_token": 0.02e-6,
                "output_cost_per_token": 0,
            },
            "anthropic/claude-3": {
                "litellm_provider": "anthropic",
                "input_cost_per_token": 3e-6,
                "output_cost_per_token": 15e-6,
            },
            "google/gemini-2.5-pro": {
                "litellm_provider": "gemini",
                "input_cost_per_token": 1.25e-6,
                "output_cost_per_token": 10e-6,
            },
            "openai/gpt-4o-mini": {
                "litellm_provider": "openai",
                "input_cost_per_token": 0.15e-6,
            },
        }
        config = {
            "filters": {
                "allModels": True,
                "providers": ["openai", "deepseek"],
                "includeModels": ["this-model-does-not-exist"],
            },
            "defaults": {
                "cacheField": "cache_read_input_token_cost",
                "cacheFallback": "input",
            },
            "providers": {"openai": {"name": "OpenAI"}},
            "modelMappings": {"openai/gpt-4o": {"targetId": "sol"}},
        }

        models = reduce_catalog(raw, config)

        self.assertEqual(
            {model["sourceModelId"] for model in models},
            {
                "deepseek-chat",
                "openai/gpt-4o",
                "openai/text-embedding-3-small",
                "anthropic/claude-3",
                "google/gemini-2.5-pro",
            },
        )
        openai = next(model for model in models if model["sourceModelId"] == "openai/gpt-4o")
        self.assertEqual(openai["input"], 2.5)
        self.assertEqual(openai["output"], 10)
        self.assertEqual(openai["cache"], 1.25)
        self.assertEqual(openai["provider"], "OpenAI")
        self.assertEqual(openai["providerId"], "openai")
        self.assertEqual(openai["category"], "OpenAI")
        self.assertEqual(openai["categoryId"], "provider-openai")
        self.assertFalse(openai["enabled"])
        self.assertEqual(openai["targetId"], "sol")

    def test_pricing_config_has_no_blacklist_filters(self):
        root = Path(__file__).resolve().parents[1]
        config = json.loads((root / "config" / "pricing_catalog.json").read_text(encoding="utf-8"))

        self.assertTrue(config["filters"]["allModels"])
        self.assertNotIn("excludeModels", config["filters"])

    def test_onboarding_snapshot_has_the_ten_default_providers(self):
        root = Path(__file__).resolve().parents[1]
        config = json.loads((root / "config" / "pricing_catalog.json").read_text(encoding="utf-8"))
        expected_providers = [
            "openai",
            "anthropic",
            "gemini",
            "deepseek",
            "dashscope",
            "moonshot",
            "zai",
            "xai",
            "minimax",
            "meta",
        ]
        onboarding = config["onboarding"]
        snapshot = config["fallbackSnapshot"]
        recommended = onboarding["recommendedModelsByProvider"]
        fallback_models = config["fallbackModels"]

        self.assertEqual(config["providerWhitelist"], expected_providers)
        self.assertEqual(onboarding["defaultProviderIds"], expected_providers)
        self.assertEqual(list(recommended), expected_providers)
        self.assertEqual(onboarding["schemaVersion"], 1)
        self.assertEqual(snapshot["schemaVersion"], 1)
        self.assertEqual(snapshot["version"], "2026-08-07")
        self.assertEqual(snapshot["asOf"], "2026-08-07")
        self.assertEqual(snapshot["currency"], "USD")
        self.assertEqual(snapshot["priceUnit"], "USD per 1M tokens")

        recommended_ids = [model_id for models in recommended.values() for model_id in models]
        self.assertEqual(len(recommended_ids), 27)
        self.assertEqual(len(recommended_ids), len(set(recommended_ids)))
        self.assertEqual(snapshot["modelCount"], len(recommended_ids))
        self.assertEqual(
            {model["sourceModelId"] for model in fallback_models},
            set(recommended_ids),
        )
        self.assertEqual({model["providerId"] for model in fallback_models}, set(expected_providers))
        self.assertNotIn("mistral", {model["providerId"] for model in fallback_models})
        self.assertIn("mistral", config["providers"])
        self.assertEqual(recommended["dashscope"], ["dashscope/qwen3.7-max"])
        dashscope = next(model for model in fallback_models if model["sourceModelId"] == "dashscope/qwen3.7-max")
        self.assertEqual((dashscope["cache"], dashscope["input"], dashscope["output"]), (0.5, 2.5, 7.5))
        html_source = (root / "web" / "index.html").read_text(encoding="utf-8")
        app_source = (root / "web" / "app.js").read_text(encoding="utf-8")
        self.assertIn('data-onboarding-provider="dashscope"', html_source)
        self.assertIn("const ONBOARDING_PROVIDER_LIMIT = 10", app_source)
        self.assertIn("meta/muse-spark-1.1", recommended["meta"])

        excluded_personal_state = {
            "enabled",
            "multiplier",
            "fxRate",
            "comparisonRatio",
            "comparisonHit",
            "comparisonTotal",
            "targetId",
        }
        for model in fallback_models:
            self.assertFalse(excluded_personal_state & set(model), model)
            self.assertTrue(model["id"])
            self.assertTrue(model["name"])
            self.assertTrue(model["provider"])
            for field in ("cache", "input", "output"):
                self.assertIsInstance(model[field], (int, float))
                self.assertGreaterEqual(model[field], 0)

        offline_models = bundled_fallback_models(config)
        self.assertEqual(
            {model["sourceModelId"] for model in offline_models},
            set(recommended_ids),
        )
        self.assertTrue(all(model["source"] == "litellm" for model in offline_models))
        self.assertTrue(all(model["enabled"] is False for model in offline_models))

    def test_custom_category_overrides_provider_category(self):
        models = reduce_catalog(
            {
                "openai/o3-mini": {
                    "litellm_provider": "openai",
                    "input_cost_per_token": 1e-6,
                    "output_cost_per_token": 2e-6,
                }
            },
            {
                "filters": {},
                "categories": {"reasoning": {"name": "Reasoning", "patterns": ["*o3*"]}},
                "providers": {"openai": {"name": "OpenAI"}},
            },
        )

        self.assertEqual(models[0]["category"], "Reasoning")
        self.assertEqual(models[0]["categoryId"], "reasoning")

    def test_cache_falls_back_to_input_price(self):
        models = reduce_catalog(
            {"deepseek-chat": {"litellm_provider": "deepseek", "input_cost_per_token": 1e-6, "output_cost_per_token": 2e-6}},
            {"filters": {}, "defaults": {"cacheFallback": "input"}},
        )

        self.assertEqual(models[0]["cache"], models[0]["input"])

    def test_per_million_price_is_rounded(self):
        models = reduce_catalog(
            {
                "openai/gpt-test": {
                    "litellm_provider": "openai",
                    "input_cost_per_token": 2e-7,
                    "output_cost_per_token": 1.2e-6,
                }
            },
            {"filters": {}, "defaults": {"cacheFallback": "input"}},
        )

        self.assertEqual(models[0]["cache"], 0.2)
        self.assertEqual(models[0]["input"], 0.2)
        self.assertEqual(models[0]["output"], 1.2)

    def test_remote_fetch_falls_back_to_cached_catalog(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config_path = root / "config" / "pricing_catalog.json"
            cache_path = root / "cache" / "litellm-model-prices.json"
            config_path.parent.mkdir()
            cache_path.parent.mkdir()
            config_path.write_text(
                json.dumps(
                    {
                        "source": {
                            "url": "https://example.invalid/prices.json",
                            "cacheFile": "cache/litellm-model-prices.json",
                        },
                        "filters": {"allModels": True},
                        "defaults": {"cacheFallback": "input"},
                    }
                ),
                encoding="utf-8",
            )
            cache_path.write_text(
                json.dumps(
                    {
                        "cached/model": {
                            "litellm_provider": "cached-provider",
                            "input_cost_per_token": 1e-6,
                            "output_cost_per_token": 2e-6,
                        }
                    }
                ),
                encoding="utf-8",
            )

            with patch("backend.pricing_catalog.urllib.request.urlopen", side_effect=urllib.error.URLError("offline")):
                result = fetch_pricing_models(config_path)

        self.assertTrue(result["ok"])
        self.assertTrue(result["fromCache"])
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["models"][0]["sourceModelId"], "cached/model")
        self.assertFalse(result["models"][0]["enabled"])

    def test_remote_fetch_uses_bundled_fallback_when_cache_is_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config_path = root / "config" / "pricing_catalog.json"
            config_path.parent.mkdir()
            config_path.write_text(
                json.dumps(
                    {
                        "source": {
                            "url": "https://example.invalid/prices.json",
                            "cacheFile": "cache/litellm-model-prices.json",
                        },
                        "fallbackModels": [
                            {
                                "id": "fallback-sol",
                                "name": "GPT-5.6 Sol",
                                "provider": "OpenAI",
                                "providerId": "openai",
                                "sourceModelId": "gpt-5.6-sol",
                                "targetId": "sol",
                                "cache": 0.5,
                                "input": 5,
                                "output": 30,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            with patch("backend.pricing_catalog.urllib.request.urlopen", side_effect=urllib.error.URLError("offline")):
                result = fetch_pricing_models(config_path)

        self.assertTrue(result["ok"])
        self.assertTrue(result["fromCache"])
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["models"][0]["provider"], "OpenAI")
        self.assertEqual(result["models"][0]["sourceModelId"], "gpt-5.6-sol")
        self.assertEqual(result["models"][0]["output"], 30)
        self.assertFalse(result["models"][0]["enabled"])


if __name__ == "__main__":
    unittest.main()
