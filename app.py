"""TokenCostCalc application entry point."""

from pathlib import Path

import webview

from backend.state_store import StateApi


ROOT_DIR = Path(__file__).resolve().parent
WEB_PAGE = ROOT_DIR / "web" / "index.html"
DEFAULTS_PATH = ROOT_DIR / "config" / "defaults.json"
STATE_PATH = ROOT_DIR / "token-cost-calc.json"


def main() -> None:
    webview.create_window(
        "Token Cost Calc",
        url=WEB_PAGE.as_uri(),
        width=1320,
        height=900,
        min_size=(360, 640),
        background_color="#faf9f5",
        js_api=StateApi(DEFAULTS_PATH, STATE_PATH),
    )
    webview.start(debug=False)


if __name__ == "__main__":
    main()
