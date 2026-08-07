"""Local-only development server for the web UI.

Python's MIME database may label SVG files as ``image/svg`` on Windows.
WebView and Chromium reject that type for <img> elements, so expose SVG as
the standards-compliant ``image/svg+xml`` while debugging the standalone web
page.
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial


ROOT_DIR = Path(__file__).resolve().parent


class WebHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".svg": "image/svg+xml",
    }


def main() -> None:
    handler = partial(WebHandler, directory=str(ROOT_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", 8765), handler)
    print("Serving Token Cost Calc at http://127.0.0.1:8765/web/")
    server.serve_forever()


if __name__ == "__main__":
    main()
