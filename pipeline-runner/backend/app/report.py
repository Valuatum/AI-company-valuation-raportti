"""Connect a finished run to the JSON→HTML report generator (repo scripts/).

The final stage output (v3 schema) is fed to `node scripts/generate.js`, which
adapts + renders a self-contained HTML report. PDF is rendered from that HTML
with headless Chrome when available.
"""
import json
import os
import shutil
import subprocess

_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPO_ROOT = os.path.abspath(os.path.join(_BACKEND, "..", ".."))
GENERATOR = os.path.join(REPO_ROOT, "scripts", "generate.js")
REPORTS_DIR = os.path.join(_BACKEND, "_reports")

_CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
    "chromium-browser",
]


def _ensure_dir():
    os.makedirs(REPORTS_DIR, exist_ok=True)


def find_chrome() -> str | None:
    for c in _CHROME_CANDIDATES:
        if os.path.isabs(c):
            if os.path.exists(c):
                return c
        else:
            found = shutil.which(c)
            if found:
                return found
    return None


def generator_available() -> bool:
    return os.path.exists(GENERATOR) and shutil.which("node") is not None


def generate_html(rid: str, report_json: dict) -> str:
    """Run the Node generator. Returns path to the written HTML file."""
    if not os.path.exists(GENERATOR):
        raise RuntimeError(f"Generaattoria ei löydy: {GENERATOR}")
    if shutil.which("node") is None:
        raise RuntimeError("node ei ole asennettu / PATHissa.")
    _ensure_dir()
    json_path = os.path.join(REPORTS_DIR, f"{rid}.json")
    html_path = os.path.join(REPORTS_DIR, f"{rid}.html")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_json, f, ensure_ascii=False)
    proc = subprocess.run(
        ["node", GENERATOR, json_path, html_path],
        capture_output=True, text=True, cwd=REPO_ROOT, timeout=60,
    )
    if proc.returncode != 0 or not os.path.exists(html_path):
        raise RuntimeError(
            "Generaattori epäonnistui:\n" + (proc.stderr or proc.stdout)[:2000]
        )
    return html_path


def generate_pdf(rid: str, report_json: dict) -> str:
    """Render HTML (via the generator) then print to PDF with headless Chrome."""
    html_path = generate_html(rid, report_json)
    chrome = find_chrome()
    if not chrome:
        raise RuntimeError(
            "Chrome/Chromium ei löytynyt — PDF-vienti ei käytettävissä. "
            "Lataa HTML ja tulosta selaimesta."
        )
    pdf_path = os.path.join(REPORTS_DIR, f"{rid}.pdf")
    proc = subprocess.run(
        [
            chrome, "--headless", "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}", "--virtual-time-budget=8000",
            "--no-sandbox", f"file://{html_path}",
        ],
        capture_output=True, text=True, timeout=90,
    )
    if not os.path.exists(pdf_path):
        raise RuntimeError("PDF-renderöinti epäonnistui:\n" + proc.stderr[:2000])
    return pdf_path
