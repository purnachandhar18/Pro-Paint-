// enhanced_features.js — Professional painting enhancements
(function () {
  const EnhancedFeatures = {
    // Zoom state
    zoomLevel: 1,
    minZoom: 0.1,
    maxZoom: 5,
    zoomStep: 0.1,

    // Grid state
    gridEnabled: false,
    gridSize: 20,

    // Selection state
    currentSelection: null,
    isSelecting: false,
    selectionStart: null,

    // Text state
    textInput: "",
    textFont: "Arial",
    textSize: 24,
    textBold: false,
    textItalic: false,
    textUnderline: false,

    // Transform state
    rotation: 0,
    scale: 1,

    // Recent colors
    recentColors: [],

    // Modal state
    isTextModalOpen: false,

    init() {
      this.initZoom();
      this.initGrid();
      this.initSelection();
      this.initTextTool();
      this.initTransform();
      this.initColorPalette();
      this.initAdvancedBrushes();
      this.initKeyboardShortcuts();
    },

    // 🔍 Zoom functionality
    initZoom() {
      document
        .getElementById("zoomInBtn")
        ?.addEventListener("click", () => this.zoomIn());
      document
        .getElementById("zoomOutBtn")
        ?.addEventListener("click", () => this.zoomOut());
      document
        .getElementById("resetZoomBtn")
        ?.addEventListener("click", () => this.resetZoom());

      // Mouse wheel zoom
      document.getElementById("canvasStack")?.addEventListener("wheel", (e) => {
        if (e.ctrlKey && !this.isTextModalOpen) {
          e.preventDefault();
          if (e.deltaY < 0) this.zoomIn();
          else this.zoomOut();
        }
      });
    },

    zoomIn() {
      if (this.isTextModalOpen) return;
      this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
      this.applyZoom();
    },

    zoomOut() {
      if (this.isTextModalOpen) return;
      this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
      this.applyZoom();
    },

    resetZoom() {
      if (this.isTextModalOpen) return;
      this.zoomLevel = 1;
      this.applyZoom();
    },

    applyZoom() {
      const canvasStack = document.getElementById("canvasStack");
      if (canvasStack) {
        canvasStack.style.transform = `scale(${this.zoomLevel})`;
        canvasStack.style.transformOrigin = "center center";
      }

      const zoomDisplay = document.getElementById("zoomLevel");
      if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + "%";
      }
    },

    // 🔳 Grid functionality
    initGrid() {
      // Grid toggle will be added when grid button is available
    },

    toggleGrid() {
      if (this.isTextModalOpen) return;
      this.gridEnabled = !this.gridEnabled;
      const gridOverlay = document.getElementById("gridOverlay");
      if (gridOverlay) {
        gridOverlay.classList.toggle("hidden", !this.gridEnabled);
      }
    },

    // 🔤 Text tool
    initTextTool() {
      const textModal = document.getElementById("textModal");
      const textInput = document.getElementById("textInput");

      // Text property controls
      document.getElementById("fontSelect")?.addEventListener("change", (e) => {
        this.textFont = e.target.value;
      });

      document.getElementById("fontSize")?.addEventListener("input", (e) => {
        this.textSize = parseInt(e.target.value);
        document.getElementById("fontSizeValue").textContent =
          this.textSize + "px";
      });

      // Text style buttons
      ["boldBtn", "italicBtn", "underlineBtn"].forEach((id) => {
        document.getElementById(id)?.addEventListener("click", (e) => {
          e.target.classList.toggle("active");
          this.updateTextStyle(id);
        });
      });

      // Prevent event propagation in text modal
      if (textModal) {
        textModal.addEventListener("keydown", (e) => {
          e.stopPropagation();
        });

        textModal.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }

      if (textInput) {
        textInput.addEventListener("keydown", (e) => {
          e.stopPropagation();

          // Allow common text editing shortcuts
          if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            if (
              key === "a" ||
              key === "c" ||
              key === "v" ||
              key === "x" ||
              key === "z" ||
              key === "y"
            ) {
              return; // Allow select all, copy, paste, cut, undo, redo
            }
          }

          // Prevent tool shortcuts from triggering while typing
          if (
            ["b", "e", "f", "t", "s", "r", "p"].includes(e.key.toLowerCase()) &&
            !e.ctrlKey
          ) {
            e.stopImmediatePropagation();
          }
        });

        textInput.addEventListener("input", (e) => {
          e.stopPropagation();
        });
      }
    },

    updateTextStyle(buttonId) {
      switch (buttonId) {
        case "boldBtn":
          this.textBold = !this.textBold;
          break;
        case "italicBtn":
          this.textItalic = !this.textItalic;
          break;
        case "underlineBtn":
          this.textUnderline = !this.textUnderline;
          break;
      }
    },

    // 🔄 Transform tools
    initTransform() {
      document
        .getElementById("rotateSlider")
        ?.addEventListener("input", (e) => {
          if (this.isTextModalOpen) return;
          this.rotation = parseInt(e.target.value);
          document.getElementById("rotationValue").textContent =
            this.rotation + "°";
          this.applyTransform();
        });

      document.getElementById("scaleSlider")?.addEventListener("input", (e) => {
        if (this.isTextModalOpen) return;
        this.scale = parseInt(e.target.value) / 100;
        document.getElementById("scaleValue").textContent =
          Math.round(this.scale * 100) + "%";
        this.applyTransform();
      });

      document
        .getElementById("flipHorizontal")
        ?.addEventListener("click", () => {
          if (this.isTextModalOpen) return;
          this.flipHorizontal();
        });
      document.getElementById("flipVertical")?.addEventListener("click", () => {
        if (this.isTextModalOpen) return;
        this.flipVertical();
      });
    },

    applyTransform() {
      if (this.isTextModalOpen) return;
      // Apply transform to current selection or active layer
      const layer = window.ToolState?.layers[window.ToolState.activeLayer];
      if (layer) {
        layer.canvas.style.transform = `rotate(${this.rotation}deg) scale(${this.scale})`;
      }
    },

    flipHorizontal() {
      const layer = window.ToolState?.layers[window.ToolState.activeLayer];
      if (layer) {
        const ctx = layer.ctx;
        const w = layer.canvas.width;
        const h = layer.canvas.height;

        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(layer.canvas, -w, 0);
        ctx.restore();

        window.pushHistory?.(layer);
      }
    },

    flipVertical() {
      const layer = window.ToolState?.layers[window.ToolState.activeLayer];
      if (layer) {
        const ctx = layer.ctx;
        const w = layer.canvas.width;
        const h = layer.canvas.height;

        ctx.save();
        ctx.scale(1, -1);
        ctx.drawImage(layer.canvas, 0, -h);
        ctx.restore();

        window.pushHistory?.(layer);
      }
    },

    // 🎨 Color palette
    initColorPalette() {
      // Color swatch click handlers are in tools.js
    },

    // 🖌️ Advanced brushes
    initAdvancedBrushes() {
      // Brush property controls are in tools.js
    },

    // ⌨️ Keyboard shortcuts
    initKeyboardShortcuts() {
      document.addEventListener("keydown", (e) => {
        // Don't process shortcuts if text modal is open
        if (this.isTextModalOpen) {
          // Allow Escape to close modal
          if (e.key === "Escape") {
            this.closeTextModal();
          }
          return;
        }

        if (e.ctrlKey) {
          switch (e.key.toLowerCase()) {
            case "g":
              e.preventDefault();
              this.toggleGrid();
              break;
            case "=":
            case "+":
              e.preventDefault();
              this.zoomIn();
              break;
            case "-":
              e.preventDefault();
              this.zoomOut();
              break;
            case "0":
              e.preventDefault();
              this.resetZoom();
              break;
          }
        }

        // Tool shortcuts are handled in script.js
      });
    },

    // Text modal management
    openTextModal() {
      this.isTextModalOpen = true;
      document.getElementById("textModal")?.classList.remove("hidden");
      document.getElementById("textInput")?.focus();
    },

    closeTextModal() {
      this.isTextModalOpen = false;
      document.getElementById("textModal")?.classList.add("hidden");
      document.getElementById("textInput").value = "";
    },

    // ✨ Gradient tool
    createGradient(x1, y1, x2, y2) {
      const layer = window.ToolState?.layers[window.ToolState.activeLayer];
      if (!layer) return;

      const ctx = layer.ctx;
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, window.ToolState.color);
      gradient.addColorStop(1, window.ToolState.secondaryColor || "#ffffff");

      return gradient;
    },

    // 🌀 Blur tool
    applyBlur(x, y, radius) {
      const layer = window.ToolState?.layers[window.ToolState.activeLayer];
      if (!layer) return;

      const ctx = layer.ctx;
      ctx.save();

      // Simple blur implementation (for demo)
      ctx.filter = `blur(${radius}px)`;
      ctx.drawImage(layer.canvas, 0, 0);

      ctx.restore();
    },
  };

  // Initialize when DOM is loaded
  window.addEventListener("DOMContentLoaded", () => {
    EnhancedFeatures.init();
  });

  // Make available globally
  window.EnhancedFeatures = EnhancedFeatures;
})();
