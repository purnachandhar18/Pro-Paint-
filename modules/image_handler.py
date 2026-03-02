import os
from PIL import Image
import base64
from io import BytesIO


class ImageHandler:
    @staticmethod
    def save_base64_image(base64_data, filename, output_dir):
        """Save base64 image data to file"""
        try:
            # Remove data:image/png;base64, prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]

            image_data = base64.b64decode(base64_data)
            image = Image.open(BytesIO(image_data))

            # Ensure output directory exists
            os.makedirs(output_dir, exist_ok=True)

            filepath = os.path.join(output_dir, filename)
            image.save(filepath, 'PNG')
            return True
        except Exception as e:
            print(f"Error saving image: {e}")
            return False

    @staticmethod
    def resize_image(image_path, width, height):
        """Resize image to specified dimensions"""
        try:
            with Image.open(image_path) as img:
                img = img.resize((width, height), Image.Resampling.LANCZOS)
                img.save(image_path)
            return True
        except Exception as e:
            print(f"Error resizing image: {e}")
            return False
# --- Simple functional wrappers for backward compatibility ---


def save_image(base64_data, filename, output_dir):
    return ImageHandler.save_base64_image(base64_data, filename, output_dir)


def get_saved_images(folder):
    try:
        os.makedirs(folder, exist_ok=True)
        return [f for f in os.listdir(folder)
                if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    except Exception as e:
        print(f"Error listing images: {e}")
        return []
