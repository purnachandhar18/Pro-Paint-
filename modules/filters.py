import base64
from io import BytesIO
from PIL import Image, ImageFilter, ImageEnhance


class ImageFilters:
    @staticmethod
    def apply_filter(image_data, filter_name):
        """
        Apply a filter to an image given as base64 data.
        Returns base64-encoded PNG image for frontend display.
        """
        try:
            # --- Decode base64 image ---
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            img_bytes = base64.b64decode(image_data)

            with Image.open(BytesIO(img_bytes)) as img:
                img = img.convert("RGB")

                # --- Apply chosen filter ---
                if filter_name == 'grayscale':
                    result = img.convert('L').convert('RGB')
                elif filter_name == 'sepia':
                    result = ImageFilters._apply_sepia(img)
                elif filter_name == 'blur':
                    result = img.filter(ImageFilter.GaussianBlur(2))
                elif filter_name == 'sharpen':
                    result = img.filter(ImageFilter.SHARPEN)
                elif filter_name == 'contrast':
                    enhancer = ImageEnhance.Contrast(img)
                    result = enhancer.enhance(1.5)
                elif filter_name == 'brightness':
                    enhancer = ImageEnhance.Brightness(img)
                    result = enhancer.enhance(1.3)
                elif filter_name == 'invert':
                    result = ImageFilters._invert(img)
                else:
                    result = img  # no change

                # --- Encode back to base64 ---
                buffered = BytesIO()
                result.save(buffered, format="PNG")
                encoded_img = base64.b64encode(
                    buffered.getvalue()).decode("utf-8")

                return f"data:image/png;base64,{encoded_img}"

        except Exception as e:
            print(f"Error applying filter: {e}")
            return None

    # ---------- Helper Filters ----------
    @staticmethod
    def _apply_sepia(img):
        """Apply sepia tone filter manually."""
        width, height = img.size
        pixels = img.load()

        for py in range(height):
            for px in range(width):
                r, g, b = img.getpixel((px, py))
                tr = int(0.393 * r + 0.769 * g + 0.189 * b)
                tg = int(0.349 * r + 0.686 * g + 0.168 * b)
                tb = int(0.272 * r + 0.534 * g + 0.131 * b)
                pixels[px, py] = (min(255, tr), min(255, tg), min(255, tb))
        return img

    @staticmethod
    def _invert(img):
        """Invert (negative) colors."""
        return Image.eval(img, lambda x: 255 - x)


# --- Simple function wrapper for Flask import ---
def apply_filter(image_data, filter_name):
    """Wrapper so app.py can import directly."""
    return ImageFilters.apply_filter(image_data, filter_name)
