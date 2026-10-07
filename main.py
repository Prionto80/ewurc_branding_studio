import os
import sys
import argparse
import io
import zipfile
from pathlib import Path
from typing import Optional, List

from PIL import Image, ImageOps
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.responses import FileResponse, Response, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import branding

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

app = FastAPI(
    title="EWURC Photo Branding Studio",
    description="Automated East West University Robotics Club image watermarking and branding service",
    version="1.0.0"
)

# Mount static assets
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def index():
    """Serves the main web studio frontend."""
    candidates = [
        TEMPLATES_DIR / "index.html",
        Path("templates/index.html"),
        BASE_DIR / "templates" / "index.html"
    ]
    for p in candidates:
        if p.exists():
            return FileResponse(str(p))
    raise HTTPException(status_code=404, detail="Template index.html not found")


@app.get("/api/info")
async def get_service_info():
    """Returns application metadata, defaults, and capabilities."""
    return {
        "service": "EWURC Photo Branding Automation",
        "club": "East West University Robotics Club",
        "defaults": {
            "center_text": "East West University Robotics Club",
            "logo_scale": 0.11,
            "font_scale": 0.038,
            "gradient_height_ratio": 0.25,
            "gradient_max_opacity": 185,
            "padding": 35,
            "font_choice": "industry"
        },
        "available_fonts": ["industry", "arial", "segoe"]
    }


@app.post("/api/process")
async def process_single_image(
    file: UploadFile = File(...),
    center_text: str = Form("East West University Robotics Club"),
    font_choice: str = Form("industry"),
    logo_scale: float = Form(0.11),
    font_scale: float = Form(0.038),
    gradient_height_ratio: float = Form(0.25),
    gradient_max_opacity: int = Form(185),
    padding: int = Form(35),
    text_offset_y: Optional[int] = Form(None),
    output_format: str = Form("auto"),
    quality: int = Form(95),
    preview: bool = Form(False),
    custom_logo_left: Optional[UploadFile] = File(None),
    custom_logo_right: Optional[UploadFile] = File(None)
):
    """
    Processes a single uploaded image with EWU & EWURC logos and typography.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image")

    try:
        contents = await file.read()
        raw_img = Image.open(io.BytesIO(contents))
        # Handle phone/camera rotation
        raw_img = ImageOps.exif_transpose(raw_img)

        orig_w, orig_h = raw_img.size

        # For fast live preview responsiveness in the browser, downscale if massive
        if preview and max(orig_w, orig_h) > 1800:
            scale_factor = 1800 / max(orig_w, orig_h)
            new_w = max(int(orig_w * scale_factor), 1)
            new_h = max(int(orig_h * scale_factor), 1)
            raw_img = raw_img.resize((new_w, new_h), Image.Resampling.BILINEAR)

        # Optional custom logos
        logo_l = None
        if custom_logo_left and custom_logo_left.filename:
            l_bytes = await custom_logo_left.read()
            if l_bytes:
                logo_l = Image.open(io.BytesIO(l_bytes)).convert("RGBA")

        logo_r = None
        if custom_logo_right and custom_logo_right.filename:
            r_bytes = await custom_logo_right.read()
            if r_bytes:
                logo_r = Image.open(io.BytesIO(r_bytes)).convert("RGBA")

        # Apply branding
        branded = branding.apply_bottom_branding(
            image=raw_img,
            logo_left=logo_l,
            logo_right=logo_r,
            center_text=center_text,
            gradient_height_ratio=gradient_height_ratio,
            gradient_max_opacity=gradient_max_opacity,
            logo_scale=logo_scale,
            font_scale=font_scale,
            padding=padding,
            text_offset_y=text_offset_y,
            font_choice=font_choice
        )

        final_w, final_h = branded.size

        # Determine target export format
        target_fmt = output_format.upper()
        if target_fmt == "AUTO":
            original_ext = Path(file.filename or "image.jpg").suffix.lower()
            if original_ext in {".png"}:
                target_fmt = "PNG"
            elif original_ext in {".webp"}:
                target_fmt = "WEBP"
            else:
                target_fmt = "JPEG"

        out_buffer = io.BytesIO()
        if target_fmt == "PNG":
            branded.save(out_buffer, format="PNG")
            mime = "image/png"
            ext = ".png"
        elif target_fmt == "WEBP":
            branded.save(out_buffer, format="WEBP", quality=quality)
            mime = "image/webp"
            ext = ".webp"
        else:
            branded.convert("RGB").save(out_buffer, format="JPEG", quality=quality)
            mime = "image/jpeg"
            ext = ".jpg"

        out_bytes = out_buffer.getvalue()
        base_name = Path(file.filename or "image").stem
        out_filename = f"branded_{base_name}{ext}"

        return Response(
            content=out_bytes,
            media_type=mime,
            headers={
                "Content-Disposition": f'inline; filename="{out_filename}"',
                "X-Image-Width": str(final_w),
                "X-Image-Height": str(final_h),
                "X-Original-Width": str(orig_w),
                "X-Original-Height": str(orig_h)
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")


@app.post("/api/process-batch")
async def process_batch_images(
    files: List[UploadFile] = File(...),
    center_text: str = Form("East West University Robotics Club"),
    font_choice: str = Form("industry"),
    logo_scale: float = Form(0.11),
    font_scale: float = Form(0.038),
    gradient_height_ratio: float = Form(0.25),
    gradient_max_opacity: int = Form(185),
    padding: int = Form(35),
    text_offset_y: Optional[int] = Form(None),
    output_format: str = Form("auto"),
    quality: int = Form(95)
):
    """
    Processes multiple images concurrently and packages them into a ZIP file.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for batch processing")

    zip_buffer = io.BytesIO()
    success_count = 0

    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            try:
                contents = await f.read()
                raw_img = Image.open(io.BytesIO(contents))
                raw_img = ImageOps.exif_transpose(raw_img)

                branded = branding.apply_bottom_branding(
                    image=raw_img,
                    center_text=center_text,
                    gradient_height_ratio=gradient_height_ratio,
                    gradient_max_opacity=gradient_max_opacity,
                    logo_scale=logo_scale,
                    font_scale=font_scale,
                    padding=padding,
                    text_offset_y=text_offset_y,
                    font_choice=font_choice
                )

                target_fmt = output_format.upper()
                if target_fmt == "AUTO":
                    original_ext = Path(f.filename or "image.jpg").suffix.lower()
                    if original_ext in {".png"}:
                        target_fmt = "PNG"
                    elif original_ext in {".webp"}:
                        target_fmt = "WEBP"
                    else:
                        target_fmt = "JPEG"

                img_buf = io.BytesIO()
                if target_fmt == "PNG":
                    branded.save(img_buf, format="PNG")
                    ext = ".png"
                elif target_fmt == "WEBP":
                    branded.save(img_buf, format="WEBP", quality=quality)
                    ext = ".webp"
                else:
                    branded.convert("RGB").save(img_buf, format="JPEG", quality=quality)
                    ext = ".jpg"

                base_name = Path(f.filename or "image").stem
                out_name = f"branded_{base_name}{ext}"
                zf.writestr(out_name, img_buf.getvalue())
                success_count += 1
            except Exception as item_err:
                print(f"Error processing {f.filename}: {item_err}")
                continue

    if success_count == 0:
        raise HTTPException(status_code=500, detail="None of the files could be processed successfully")

    zip_bytes = zip_buffer.getvalue()

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="ewurc_branded_photos.zip"',
            "X-Total-Count": str(len(files)),
            "X-Success-Count": str(success_count)
        }
    )


# Backwards compatibility export
def add_bottom_branding(*args, **kwargs):
    """Delegates to branding.add_bottom_branding for backward compatibility."""
    return branding.add_bottom_branding(*args, **kwargs)


def generate_bottom_gradient(*args, **kwargs):
    """Delegates to branding.generate_bottom_gradient for backward compatibility."""
    return branding.generate_bottom_gradient(*args, **kwargs)


def get_industry_font(*args, **kwargs):
    """Delegates to branding.get_industry_font for backward compatibility."""
    return branding.get_industry_font(*args, **kwargs)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EWURC Photo Branding Service")
    parser.add_argument("--cli", action="store_true", help="Run in CLI batch folder mode instead of starting web server")
    parser.add_argument("--image-dir", default="./images", help="Folder of input images for CLI mode")
    parser.add_argument("--output-dir", default="./output_images", help="Folder for branded outputs in CLI mode")
    parser.add_argument("--host", default="127.0.0.1", help="FastAPI server host")
    parser.add_argument("--port", type=int, default=8000, help="FastAPI server port")
    parser.add_argument("--reload", action="store_true", default=True, help="Enable auto-reload")

    args = parser.parse_args()

    if args.cli:
        print(f"Running CLI batch processor on {args.image_dir} -> {args.output_dir}...")
        branding.add_bottom_branding(
            image_dir=args.image_dir,
            output_dir=args.output_dir
        )
    else:
        print(f"Starting EWURC Branding Studio server at http://{args.host}:{args.port}")
        uvicorn.run("main:app", host=args.host, port=args.port, reload=args.reload)