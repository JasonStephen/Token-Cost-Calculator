import unittest
import json
import tempfile
import re
from pathlib import Path
from unittest.mock import patch
import urllib.error

from backend.pricing_catalog import fetch_pricing_models, reduce_catalog


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
        self.assertIn("min(100%, 320px), 320px", css_source)
        self.assertIn("old && typeof old.enabled === 'boolean' ? old.enabled : false", app_source)
        self.assertIn("clearPricingStatus()", app_source)
        self.assertIn("model-status ' + (modelEnabled(model) ? 'is-enabled' : 'is-disabled')", app_source)
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
        self.assertIn('transform:translateX(calc(-100% + 58px))', css_source)

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

        self.assertEqual(set(config["providers"]), {"openai", "anthropic", "gemini", "deepseek", "moonshot", "zai", "meta", "mistral", "minimax", "xai"})
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
