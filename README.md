# IReadIt - V2

A chrome/Edge (Manifest V3) extension that reads a Privacy Policy / KVKK notice - from the current web page, or from an uploaded PDF/DOCX file (including scanned/image-only PDFs via on-device OCR) - analyzes it with Claude, flags risky clauses, scores it out of 100, and keeps a local history you can revisit and compare.

## What's new in V2
- **PDF analysis** - text-layer extractino via pdf.js
- **DOCX analysis** - via mammoth.js
- **OCR** - if a PDF's text layer is nearly empty (scanned document), pages are rasterized and run through Tesseract.js OCR (English + Turkish) entirely on-device before analysis
- **History** - every analysis (page, PDF or DOCX) is saved locally so u can reopen it later
- **Comparison** - pick any two saved analyses and get a short AI-Written verdict on which one is safer and why

Carried over from V1: auto page-text extraction, risk score /100, color-coded risky clauses, plain-language explanations and elapsed-time display

Not in this version yet: browser-wide "warn before u accept" mode, data-flow diagrams, a knowledge base of KVKK articles with citations (RAG), local/offline LLM support, and a public API

## Install
1. Unzip this folder somewhere on ur machine
2. Go to 'chrome://extensions'
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked**
5. Select this folder ('IReadIt)
6. Click the extension icon, then the icon in the popup (or right-click the icon -> Options) to open Settings
7. Paste an API key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) and click **Save**

> The key lives only in this browser's local storage and is sent directly to 'api.anthropic.com' when u run an analysis - no other server is involved

## Usage
**Page tab** - open a site's Privacy Policy / Terms / Cookie Policy page, click the extension icon, then **Analyze This Page**

**File tab** — drag a `.pdf` or `.docx` file into the drop zone (or click to choose one), then
**▶ Analyze File**. If a PDF turns out to be a scanned image (no real text layer), the extension automatically
falls back to on-device OCR — this is shown as a status message while it runs and flagged on the result screen.

**History tab** — every analysis you run is listed here with its score, source icon, title, and timestamp.
Click an item to reopen its full result. Tick two items and press **⇄ Compare Selected** to get a side-by-side
score/category comparison plus a short written verdict on which one is safer.

## Known limitations (v2)
- Very long documents (~20,000 characters) are truncated before being sent for analysis.
- PDF text extraction reads up to the first 40 pages; OCR fallback is capped to the first 12 pages (OCR is slow).
- OCR uses a single bundled WASM build (SIMD); this covers essentially all current desktop Chrome/Edge, but very
  old browser builds without SIMD support are not handled.
- Language trained-data files for OCR (`eng`/`tur`) are fetched on first use from a public tessdata CDN — this
  requires an internet connection the first time OCR runs (subsequent runs use the browser's cache).
- Password-protected files and pages behind a login wall are not supported.
- Results are informational only and are not legal advice.

## File structure
```
IReadIt/
├── manifest.json         # Extension definition (Manifest V3)
├── background.js         # Anthropic API calls (ANALYZE + COMPARE), prompts, JSON schemas
├── popup.html/.css/.js   # Main UI: Page / File / History tabs, shared loading/result/compare views
├── options.html/.css/.js # API key settings + clear-history action
├── lib/
│   ├── pdf-extract.js    # pdf.js text extraction + OCR fallback for scanned PDFs
│   ├── docx-extract.js   # mammoth.js text extraction
│   ├── ocr.js            # Tesseract.js worker wrapper
│   └── history.js        # chrome.storage.local-backed history helpers
├── vendor/                # Bundled pdf.js, mammoth.js, tesseract.js (no remote code, MV3-compliant)
└── icons/
```
