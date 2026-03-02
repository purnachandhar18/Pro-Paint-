import os
import base64
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from modules.image_handler import save_image, get_saved_images
from modules.filters import apply_filter

# -------------------- APP SETUP --------------------
app = Flask(__name__)

# Folders
BASE_DIR = app.root_path
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
SAVED_FOLDER = os.path.join(BASE_DIR, 'static', 'images', 'saved')

# Ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SAVED_FOLDER, exist_ok=True)

# Configurations
app.config.update(
    UPLOAD_FOLDER=UPLOAD_FOLDER,
    MAX_CONTENT_LENGTH=16 * 1024 * 1024  # 16 MB
)


# -------------------- ROUTES --------------------

@app.route('/')
def landing():
    """Landing Page"""
    return render_template('landing.html')


@app.route('/paint')
def paint_page():
    """Main Paint Editor Page"""
    return render_template('index.html')


@app.route('/about')
def about_page():
    """About Page"""
    return render_template('about.html')


# -------------------- IMAGE SAVE / DOWNLOAD --------------------

@app.route('/save', methods=['POST'])
def save_drawing():
    """Save the drawing as PNG"""
    try:
        data = request.get_json()
        image_data = data.get('image')
        if not image_data:
            return jsonify({'success': False, 'message': 'No image data provided'}), 400

        filename = data.get(
            'filename', f"drawing_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")

        # Remove header if present (base64 image prefix)
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        # Save image
        filepath = save_image(image_data, filename, SAVED_FOLDER)

        return jsonify({
            'success': True,
            'message': 'Drawing saved successfully!',
            'filename': filename,
            'filepath': f"/download/{filename}"
        })
    except Exception as e:
        print(f"[ERROR] /save - {e}")
        return jsonify({'success': False, 'message': f'Error saving drawing: {str(e)}'}), 500


@app.route('/download/<filename>')
def download_image(filename):
    """Download the saved drawing"""
    try:
        return send_from_directory(SAVED_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'File not found'}), 404


@app.route('/gallery')
def gallery():
    """Fetch list of saved drawings"""
    try:
        images = get_saved_images(SAVED_FOLDER)
        return jsonify({'success': True, 'images': images})
    except Exception as e:
        print(f"[ERROR] /gallery - {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# -------------------- IMAGE FILTERS --------------------

@app.route('/filter', methods=['POST'])
def apply_image_filter():
    """Apply a visual filter (grayscale, blur, sepia, etc.)"""
    try:
        data = request.get_json()
        image_data = data.get('image')
        filter_type = data.get('filter', 'grayscale')

        filtered_image = apply_filter(image_data, filter_type)

        return jsonify({'success': True, 'filtered_image': filtered_image})
    except Exception as e:
        print(f"[ERROR] /filter - {e}")
        return jsonify({'success': False, 'message': f'Error applying filter: {str(e)}'}), 500


# -------------------- STATIC FILES --------------------

@app.route('/static/<path:path>')
def serve_static_files(path):
    """Serve static files (CSS, JS, Images)"""
    return send_from_directory('static', path)


# -------------------- MAIN APP ENTRY --------------------

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Render sets PORT dynamically
    app.run(host='0.0.0.0', port=port, debug=False)
