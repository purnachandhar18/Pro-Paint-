/**
 * @file api.js
 * @description Handles all communication with the backend server for the ProPaint application.
 * This includes saving, loading, and applying effects to images.
 */

/**
 * A generic helper object for making fetch requests.
 * @type {{postJSON: (function(String, Object): Promise<any>), getJSON: (function(String): Promise<any>)}}
 */
const api = {
  /**
   * Sends a POST request with a JSON payload.
   * @param {string} url - The endpoint URL.
   * @param {object} obj - The JavaScript object to send as JSON.
   * @returns {Promise<any>} - A promise that resolves to the JSON response.
   */
  postJSON: async (url, obj) => {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });
    return resp.json();
  },

  /**
   * Sends a GET request.
   * @param {string} url - The endpoint URL.
   * @returns {Promise<any>} - A promise that resolves to the JSON response.
   */
  getJSON: async (url) => {
    const resp = await fetch(url);
    return resp.json();
  },
};

/**
 * Main API interface for the ProPaint application.
 * @namespace API
 */
const API = {
  /**
   * Saves the drawing by triggering a client-side download and sending the data to the backend.
   * @param {string} imageData - The base64 encoded data URL of the canvas image.
   * @param {string|null} [filename=null] - An optional filename for the download.
   * @returns {Promise<{success: boolean, message: string}>} - The result from the backend save operation.
   */
  async saveDrawing(imageData, filename = null) {
    try {
      // 1️⃣ Instantly download in browser for immediate user feedback
      const link = document.createElement("a");
      link.href = imageData;
      link.download =
        filename ||
        `ProPaint_${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2️⃣ Also save to backend for persistent storage
      const response = await fetch("/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          filename: filename,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error("Error saving drawing:", error);
      return {
        success: false,
        message: "A network error occurred while saving.",
      };
    }
  },

  /**
   * Opens a new window to download a previously saved image from the server.
   * @param {string} filename - The name of the file to download.
   */
  downloadImage(filename) {
    window.open(`/download/${filename}`, "_blank");
  },

  /**
   * Fetches the list of saved images from the server's gallery.
   * @returns {Promise<{images: Array<string>}>} - A promise that resolves to an object containing an array of image filenames.
   */
  async getGallery() {
    try {
      const response = await fetch("/gallery");
      return await response.json();
    } catch (error) {
      console.error("Error fetching gallery:", error);
      return { images: [] };
    }
  },

  /**
   * Applies a specified filter to an image via the backend.
   * @param {string} imageData - The base64 encoded data URL of the image.
   * @param {string} filterType - The name of the filter to apply (e.g., 'grayscale', 'blur').
   * @returns {Promise<{success: boolean, filtered_image?: string, message?: string}>} - A promise that resolves to the filter operation result.
   */
  async applyFilter(imageData, filterType) {
    try {
      const response = await fetch("/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          filter: filterType,
        }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error applying filter:", error);
      return {
        success: false,
        message: "A network error occurred while applying the filter.",
      };
    }
  },

  /**
   * Sends an image to the backend for AI-based enhancement.
   * @param {string} imageData - The base64 encoded data URL of the image.
   * @param {string} [enhancementType="auto"] - The type of enhancement to perform.
   * @returns {Promise<{success: boolean, message?: string}>} - A promise that resolves to the enhancement operation result.
   */
  async enhanceImage(imageData, enhancementType = "auto") {
    try {
      const response = await fetch("/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          enhancement: enhancementType,
        }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error enhancing image:", error);
      return {
        success: false,
        message: "A network error occurred during enhancement.",
      };
    }
  },
};
