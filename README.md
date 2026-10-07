# EWURC Photo Branding Studio 📸🤖

An automated FastAPI web application and media toolkit for **East West University Robotics Club (EWURC)** to apply official club visual branding, bottom darkening gradients, university & club logos, and typography onto event photos.

---

## ✨ Features

- **🚀 FastAPI High-Performance Backend**: Fast asynchronous processing with non-blocking streaming responses.
- **🎨 Modern HTML5 + CSS3 + Vanilla JS Frontend**:
  - **Single Photo Studio**:
    - Drag & drop, browse files, or direct clipboard paste (<kbd>Ctrl</kbd> + <kbd>V</kbd>).
    - **Interactive Split-View Slider**: Drag divider horizontally to inspect Before vs After branding.
    - **Side-by-Side Mode** and **Branded Only** inspection modes.
    - Fullscreen preview.
    - Live instant updates on slider adjustments.
    - Full-resolution HD download with automatic `branded_` prefix.
  - **Batch Photo Processing**:
    - Bulk upload entire albums or multi-file selections.
    - Visual queue with individual status indicators and progress bar.
    - **Download All as ZIP** server archive or download individually.
- **📐 Complete `main.py` Branding Logic Preserved**:
  - Smooth 25% bottom darkening gradient fading cleanly from transparent to semi-opaque black.
  - **Left Logo**: Official East West University (`ewu.png`) scaled to ~11% width with edge padding.
  - **Right Logo**: Official EWURC Robotics Club (`ewurc.png`) scaled to ~11% width with edge padding.
  - **Center Text**: Clean typography (`East West University Robotics Club`), horizontally centered and vertically aligned with logo baseline, with subtle drop shadow for crisp legibility across light and dark backgrounds.
  - **Typography Options**: Bundled `industry.otf` (official club font), Arial Bold, and Segoe UI.
  - **EXIF Auto-Transpose**: Corrects DSLR and smartphone camera rotation so portrait shots aren't rotated sideways.
- **⚙️ Fully Customizable Controls**:
  - Center Text & quick preset chips.
  - Logo Scale (5% – 25%).
  - Font Scale (1.5% – 8.0%).
  - Gradient Height Ratio (10% – 45%).
  - Gradient Darkness / Max Opacity (50 – 255).
  - Edge Padding (0px – 120px).
  - Baseline Offset adjustment (Auto / Proportional / Manual).
  - Format (Auto, JPEG 95% HQ, PNG Lossless, WebP).
  - One-click "Reset to EWURC Defaults" button.
- **💻 CLI & Batch Compatibility**:
  - Legacy directory processing can still be run via CLI commands.

---

## 🚀 Quick Start

### 1. Requirements

- Python 3.10+ (or Python 3.14 via `uv`)
- Dependencies installed via `uv` or `pip`:
  - `fastapi`
  - `uvicorn`
  - `pillow`
  - `python-multipart`

### 2. Run the Web Application

Launch using `uv`:
```bash
uv run python main.py
```
Or directly with `uvicorn`:
```bash
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open your browser and navigate to:
```
http://127.0.0.1:8000
```

---

## 📡 API Endpoints

### 1. `GET /`
Serves the web application interface.

### 2. `GET /api/info`
Returns club metadata, default parameters, and font options.

### 3. `POST /api/process`
Applies branding to a single image.
- **Form Data**:
  - `file`: Image file (`.jpg`, `.png`, `.webp`, `.bmp`).
  - `center_text`: Center text (default: `"East West University Robotics Club"`).
  - `font_choice`: Font name (`"industry"`, `"arial"`, `"segoe"`).
  - `logo_scale`: Logo scale ratio (default: `0.11`).
  - `font_scale`: Font scale ratio (default: `0.038`).
  - `gradient_height_ratio`: Bottom gradient coverage (default: `0.25`).
  - `gradient_max_opacity`: Gradient opacity (default: `185`).
  - `padding`: Padding in pixels (default: `35`).
  - `preview`: Boolean (if `true`, optimizes preview resolution for browser responsiveness).
  - `output_format`: `"auto"`, `"jpeg"`, `"png"`, or `"webp"`.
  - `quality`: JPEG quality (default: `95`).
- **Response**: Image binary stream with `Content-Disposition: inline; filename="branded_..."` and dimension headers `X-Image-Width`, `X-Image-Height`.

### 4. `POST /api/process-batch`
Applies branding to multiple images and returns a compressed archive.
- **Form Data**: `files` (array of uploaded images) + branding configuration parameters.
- **Response**: `application/zip` stream (`ewurc_branded_photos.zip`).

---

## 🖥️ CLI Batch Processing Mode

To process a directory of images from the command line without the web server:
```bash
uv run python main.py --cli --image-dir ./images --output-dir ./output_images
```

---

## 📁 Project Structure

```
logo_automate/
├── branding.py          # Core branding, gradient, and typography processing module
├── main.py              # FastAPI server, API routes, and CLI entrypoint
├── templates/
│   └── index.html       # Single Studio & Batch Studio web interface
├── static/
│   ├── css/
│   │   └── style.css    # Modern EWURC dark-themed responsive styles
│   ├── js/
│   │   └── app.js       # Interactive split comparison, upload, batch processing logic
│   ├── fonts/
│   │   └── industry.otf # Club brand font
│   ├── ewu.png          # East West University logo
│   └── ewurc.png        # EWU Robotics Club logo
├── ewu.png              # Root EWU logo
├── ewurc.png            # Root EWURC logo
├── industry.otf         # Root industry font
├── pyproject.toml       # Python package configuration
└── uv.lock              # UV lockfile
```
