import os
from pathlib import Path
from typing import Optional, Union, Tuple
import io
from PIL import Image, ImageDraw, ImageFont, ImageOps

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_LOGO_LEFT_PATH = BASE_DIR / "ewu.png"
DEFAULT_LOGO_RIGHT_PATH = BASE_DIR / "ewurc.png"
DEFAULT_FONT_PATH = BASE_DIR / "industry.otf"


def generate_bottom_gradient(
    width: int,
    height: int,
    max_opacity: int = 185
) -> Image.Image:
    """
    Builds a smooth vertical black gradient fading from transparent at the top
    to semi-transparent black at the bottom edge.
    """
    if height <= 0 or width <= 0:
        return Image.new("RGBA", (max(width, 1), max(height, 1)), (0, 0, 0, 0))

    gradient_col = Image.new("L", (1, height))
    gradient_pixels = [
        int(max_opacity * ((y / max(height - 1, 1)) ** 1.5))
        for y in range(height)
    ]
    gradient_col.putdata(gradient_pixels)

    alpha_mask = gradient_col.resize((width, height), Image.Resampling.BICUBIC)

    gradient_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    black_fill = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    gradient_img.paste(black_fill, (0, 0), mask=alpha_mask)

    return gradient_img


def get_industry_font(
    target_font_size: int,
    font_choice: str = "industry"
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """
    Attempts to load font based on preference or common clean, bold/industrial
    sans-serif system fonts. Falls back safely if none are found.
    """
    candidates = []

    # Check project font files (including static folder fallbacks)
    font_paths = [
        DEFAULT_FONT_PATH,
        BASE_DIR / "static" / "fonts" / "industry.otf",
        Path("industry.otf"),
        Path("static/fonts/industry.otf")
    ]
    valid_local_fonts = [str(p) for p in font_paths if p.exists()]

    if font_choice == "industry":
        candidates.extend(valid_local_fonts)
    elif font_choice == "arial":
        candidates.extend([
            r"C:\Windows\Fonts\arialbd.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "Arial-Bold.ttf",
            "arial.ttf",
        ])
    elif font_choice == "segoe":
        candidates.extend([
            r"C:\Windows\Fonts\seguisb.ttf",
            r"C:\Windows\Fonts\segoeui.ttf",
        ])

    # Standard fallback list
    candidates.extend(valid_local_fonts)
    candidates.extend([
        r"C:\Windows\Fonts\arialbd.ttf",       # Arial Bold
        r"C:\Windows\Fonts\seguisb.ttf",       # Segoe UI SemiBold
        r"C:\Windows\Fonts\calibrib.ttf",      # Calibri Bold
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "Arial-Bold.ttf",
        "arial.ttf",
        "Roboto-Bold.ttf",
        "Montserrat-Bold.ttf",
        "industry.otf"
    ])

    for font_path in candidates:
        if not font_path:
            continue
        try:
            return ImageFont.truetype(font_path, size=target_font_size)
        except (OSError, IOError):
            continue

    try:
        return ImageFont.load_default(size=target_font_size)
    except Exception:
        return ImageFont.load_default()


def load_default_logo(path: Union[str, Path]) -> Optional[Image.Image]:
    """Helper to safely load and convert logo image with fallbacks."""
    try:
        p = Path(path)
        if not p.exists():
            alt = BASE_DIR / "static" / p.name
            if alt.exists():
                p = alt
            else:
                alt2 = Path("static") / p.name
                if alt2.exists():
                    p = alt2
        if p.exists():
            with Image.open(p) as img:
                return img.convert("RGBA")
    except Exception as e:
        print(f"Error loading logo from {path}: {e}")
    return None


def apply_bottom_branding(
    image: Image.Image,
    logo_left: Optional[Image.Image] = None,
    logo_right: Optional[Image.Image] = None,
    center_text: str = "East West University Robotics Club",
    gradient_height_ratio: float = 0.25,
    gradient_max_opacity: int = 185,
    logo_scale: float = 0.11,
    font_scale: float = 0.038,
    padding: int = 35,
    text_offset_y: Optional[int] = None,
    font_choice: str = "industry"
) -> Image.Image:
    """
    Applies bottom darkening gradient, left & right logos (EWU & EWURC),
    and centered club text branding onto the target PIL image.
    """
    # 0. Correct EXIF orientation if present
    image = ImageOps.exif_transpose(image)
    base_img = image.convert("RGBA")
    img_w, img_h = base_img.size

    # Load default logos if not provided
    if logo_left is None:
        logo_left = load_default_logo(DEFAULT_LOGO_LEFT_PATH)
    else:
        logo_left = logo_left.convert("RGBA")

    if logo_right is None:
        logo_right = load_default_logo(DEFAULT_LOGO_RIGHT_PATH)
    else:
        logo_right = logo_right.convert("RGBA")

    # 1. Bottom Darkening Gradient
    grad_h = max(int(img_h * gradient_height_ratio), 1)
    gradient = generate_bottom_gradient(img_w, grad_h, max_opacity=gradient_max_opacity)
    base_img.paste(gradient, (0, img_h - grad_h), mask=gradient)

    target_l_h = 0
    target_r_h = 0

    # 2. Left Logo (EWU)
    if logo_left:
        logo_l_w, logo_l_h = logo_left.size
        target_l_w = max(int(img_w * logo_scale), 1)
        target_l_h = max(int((target_l_w / max(logo_l_w, 1)) * logo_l_h), 1)
        resized_logo_l = logo_left.resize((target_l_w, target_l_h), Image.Resampling.LANCZOS)
        logo_l_x = padding
        logo_l_y = img_h - target_l_h - padding
        base_img.paste(resized_logo_l, (logo_l_x, logo_l_y), mask=resized_logo_l)

    # 3. Right Logo (EWURC)
    if logo_right:
        logo_r_w, logo_r_h = logo_right.size
        target_r_w = max(int(img_w * logo_scale), 1)
        target_r_h = max(int((target_r_w / max(logo_r_w, 1)) * logo_r_h), 1)
        resized_logo_r = logo_right.resize((target_r_w, target_r_h), Image.Resampling.LANCZOS)
        logo_r_x = img_w - target_r_w - padding
        logo_r_y = img_h - target_r_h - padding
        base_img.paste(resized_logo_r, (logo_r_x, logo_r_y), mask=resized_logo_r)

    # 4. Center Text Overlay
    if center_text and center_text.strip():
        font_size = max(int(img_w * font_scale), 14)
        font = get_industry_font(font_size, font_choice=font_choice)

        draw = ImageDraw.Draw(base_img)
        text_bbox = draw.textbbox((0, 0), center_text, font=font)
        text_w = text_bbox[2] - text_bbox[0]
        text_h = text_bbox[3] - text_bbox[1]

        # Center horizontally
        text_x = (img_w - text_w) // 2

        # Vertically center with logos baseline
        max_logo_h = max(target_l_h, target_r_h)
        if text_offset_y is None:
            # Scale proportionally so a 6000px image has exactly +50px baseline offset as in original main.py
            calc_offset = int(round(50 * (img_w / 6000.0)))
        else:
            calc_offset = text_offset_y

        text_y = (img_h - padding - (max_logo_h // 2)) - (text_h // 2) + calc_offset

        # Shadow offset based on font size (subtle shadow for crisp legibility)
        shadow_dist = max(int(round(font_size * 0.015)), 2)
        draw.text((text_x + shadow_dist, text_y + shadow_dist), center_text, fill=(0, 0, 0, 180), font=font)
        # Crisp white text
        draw.text((text_x, text_y), center_text, fill=(255, 255, 255, 255), font=font)

    return base_img


def process_image_bytes(
    input_bytes: bytes,
    output_format: str = "JPEG",
    quality: int = 95,
    **branding_kwargs
) -> Tuple[bytes, str, Tuple[int, int]]:
    """
    Processes image bytes and returns (result_bytes, mime_type, (width, height)).
    """
    with Image.open(io.BytesIO(input_bytes)) as raw_img:
        branded = apply_bottom_branding(raw_img, **branding_kwargs)
        width, height = branded.size

        fmt = output_format.upper()
        if fmt not in {"JPEG", "JPG", "PNG", "WEBP"}:
            fmt = "JPEG"

        output_buffer = io.BytesIO()
        if fmt in {"JPEG", "JPG"}:
            rgb_img = branded.convert("RGB")
            rgb_img.save(output_buffer, format="JPEG", quality=quality)
            mime = "image/jpeg"
        elif fmt == "PNG":
            branded.save(output_buffer, format="PNG")
            mime = "image/png"
        elif fmt == "WEBP":
            branded.save(output_buffer, format="WEBP", quality=quality)
            mime = "image/webp"

        return output_buffer.getvalue(), mime, (width, height)


def add_bottom_branding(
    image_dir: str,
    logo_left_path: str = "./ewu.png",
    logo_right_path: str = "./ewurc.png",
    output_dir: str = "./output_images",
    center_text: str = "East West University Robotics Club",
    gradient_height_ratio: float = 0.25,
    gradient_max_opacity: int = 185,
    logo_scale: float = 0.11,
    font_scale: float = 0.038,
    padding: int = 35
):
    """
    CLI/Script compatible batch processor matching the original main.py behavior.
    """
    os.makedirs(output_dir, exist_ok=True)

    with Image.open(logo_right_path) as lr, Image.open(logo_left_path) as ll:
        logo_r = lr.convert("RGBA")
        logo_l = ll.convert("RGBA")

        valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

        for filename in os.listdir(image_dir):
            base, ext = os.path.splitext(filename)
            if ext.lower() not in valid_exts:
                continue

            file_path = os.path.join(image_dir, filename)
            try:
                with Image.open(file_path) as img:
                    branded = apply_bottom_branding(
                        img,
                        logo_left=logo_l,
                        logo_right=logo_r,
                        center_text=center_text,
                        gradient_height_ratio=gradient_height_ratio,
                        gradient_max_opacity=gradient_max_opacity,
                        logo_scale=logo_scale,
                        font_scale=font_scale,
                        padding=padding
                    )
                    save_path = os.path.join(output_dir, filename)
                    if ext.lower() in {".jpg", ".jpeg"}:
                        branded.convert("RGB").save(save_path, quality=95)
                    else:
                        branded.save(save_path)
                    print(f"Processed: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")
