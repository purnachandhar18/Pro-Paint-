// tools.js — Enhanced with scrollable shapes panel
const TS = window.ToolState;
(function () {
  const state = {
    tool: "brush",
    brushType: "round",
    shapeType: "rect",
    color: "#000000",
    size: 5,
    activeLayer: 0,
    layers: [],
    shapeFill: true,
    shapeStroke: true,
    strokeWidth: 2,
    opacity: 1,
    flow: 1,
    secondaryColor: "#ffffff",
  };
  window.ToolState = state;

  // Enhanced shapes list with ALL new shapes
  const shapesList = [
    { name: "rect", icon: "⬛", label: "Rectangle" },
    { name: "circle", icon: "⚪", label: "Circle" },
    { name: "ellipse", icon: "🌀", label: "Ellipse" },
    { name: "triangle", icon: "🔺", label: "Triangle" },
    { name: "line", icon: "📏", label: "Line" },
    { name: "star", icon: "⭐", label: "Star" },
    { name: "heart", icon: "❤️", label: "Heart" },
    { name: "arrow", icon: "➡️", label: "Arrow" },
    { name: "polygon", icon: "🔷", label: "Polygon" },
    { name: "cloud", icon: "☁️", label: "Cloud" },
    { name: "house", icon: "🏠", label: "House" },
    { name: "burst", icon: "💥", label: "Burst" },
    { name: "cross", icon: "➕", label: "Cross" },
    { name: "moon", icon: "🌙", label: "Moon" },
    { name: "hexagon", icon: "⎔", label: "Hexagon" },
    { name: "octagon", icon: "⏹️", label: "Octagon" },
    { name: "roundedRect", icon: "🔲", label: "Rounded Rect" },
    { name: "speechBubble", icon: "💬", label: "Speech Bubble" },
    { name: "thoughtBubble", icon: "💭", label: "Thought Bubble" },
    { name: "spiral", icon: "🌀", label: "Spiral" },
    { name: "cog", icon: "⚙️", label: "Cog" },
  ];

  // Initialize enhanced shapes dropdown
  function initShapesDropdown() {
    const dropdownMenu = document.getElementById("shapeDropdown");
    if (!dropdownMenu) return;

    // Clear existing content
    dropdownMenu.innerHTML = "";

    // Create scrollable container
    const scrollContainer = document.createElement("div");
    scrollContainer.style.maxHeight = "300px";
    scrollContainer.style.overflowY = "auto";
    scrollContainer.style.paddingRight = "5px";

    // Add all shapes
    shapesList.forEach((shape) => {
      const button = document.createElement("button");
      button.className = "shape-option";
      button.dataset.shape = shape.name;
      button.innerHTML = `${shape.icon} ${shape.label}`;

      button.addEventListener("click", () => {
        state.shapeType = shape.name;
        setTool("shape");
        document.getElementById("shapeDropdownRoot").classList.remove("open");
        updateStatus();
      });

      scrollContainer.appendChild(button);
    });

    dropdownMenu.appendChild(scrollContainer);

    // Add custom scrollbar styling
    const style = document.createElement("style");
    style.textContent = `
      #shapeDropdown div::-webkit-scrollbar {
        width: 6px;
      }
      #shapeDropdown div::-webkit-scrollbar-track {
        background: var(--border);
        border-radius: 3px;
      }
      #shapeDropdown div::-webkit-scrollbar-thumb {
        background: var(--accent-solid);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  // ---- Helpers ----
  function highlightActive() {
    document
      .querySelectorAll(".tool-btn")
      .forEach((b) => b.classList.remove("active"));
    const btn = document.getElementById(state.tool + "Tool");
    if (btn) btn.classList.add("active");
  }

  window.setTool = function (t) {
    state.tool = t;
    highlightActive();
    updatePropertiesPanel();
    updateStatus();
  };

  function updateStatus() {
    const statusSpan = document.getElementById("status");
    if (statusSpan) {
      const toolNames = {
        brush: "Brush Tool",
        eraser: "Eraser Tool",
        fill: "Fill Tool",
        text: "Text Tool",
        select: "Select Tool",
        shape: `Shape Tool (${state.shapeType})`,
      };
      statusSpan.textContent = `Ready - ${
        toolNames[state.tool] || state.tool
      } Active`;
    }
  }

  // Update properties panel based on active tool
  function updatePropertiesPanel() {
    const shapeProps = document.getElementById("shapeProperties");
    if (shapeProps) {
      if (state.tool === "shape") {
        shapeProps.style.display = "block";
      } else {
        shapeProps.style.display = "none";
      }
    }
  }

  // Color & Size
  document.getElementById("colorPicker")?.addEventListener("input", (e) => {
    state.color = e.target.value;
    addRecentColor(state.color);
  });

  document.getElementById("brushSize")?.addEventListener("input", (e) => {
    state.size = +e.target.value;
    const sizeValue = document.getElementById("sizeValue");
    if (sizeValue) {
      sizeValue.textContent = state.size + "px";
    }
  });

  // Brush presets
  document.querySelectorAll(".tool-preset").forEach((preset) => {
    preset.addEventListener("click", () => {
      document
        .querySelectorAll(".tool-preset")
        .forEach((p) => p.classList.remove("active"));
      preset.classList.add("active");
      state.size = parseInt(preset.dataset.size);
      document.getElementById("brushSize").value = state.size;
      document.getElementById("sizeValue").textContent = state.size + "px";
    });
  });

  // Shape properties
  document.getElementById("shapeFill")?.addEventListener("change", (e) => {
    state.shapeFill = e.target.checked;
  });

  document.getElementById("shapeStroke")?.addEventListener("change", (e) => {
    state.shapeStroke = e.target.checked;
  });

  document.getElementById("strokeWidth")?.addEventListener("input", (e) => {
    state.strokeWidth = parseInt(e.target.value);
  });

  // Opacity and Flow controls
  document.getElementById("opacitySlider")?.addEventListener("input", (e) => {
    state.opacity = parseInt(e.target.value) / 100;
    document.getElementById("opacityValue").textContent = e.target.value + "%";
  });

  document.getElementById("flowSlider")?.addEventListener("input", (e) => {
    state.flow = parseInt(e.target.value) / 100;
    document.getElementById("flowValue").textContent = e.target.value + "%";
  });

  // Secondary color picker
  document
    .getElementById("secondaryColorPicker")
    ?.addEventListener("input", (e) => {
      state.secondaryColor = e.target.value;
    });

  // Tool buttons
  document
    .getElementById("brushTool")
    ?.addEventListener("click", () => setTool("brush"));
  document
    .getElementById("eraserTool")
    ?.addEventListener("click", () => setTool("eraser"));
  document
    .getElementById("fillTool")
    ?.addEventListener("click", () => setTool("fill"));
  document
    .getElementById("textTool")
    ?.addEventListener("click", () => setTool("text"));
  document
    .getElementById("selectTool")
    ?.addEventListener("click", () => setTool("select"));
  document.getElementById("sprayTool")?.addEventListener("click", () => {
    state.brushType = "spray";
    setTool("brush");
  });

  // Shapes dropdown
  const dropdownRoot = document.getElementById("shapeDropdownRoot");
  const dropdownMenu = document.getElementById("shapeDropdown");

  document.getElementById("shapeTool")?.addEventListener("click", (e) => {
    e.stopPropagation();
    setTool("shape");
    dropdownRoot.classList.toggle("open");
  });

  // Close dropdown when clicking elsewhere
  document.addEventListener("click", (e) => {
    if (!dropdownRoot?.contains(e.target)) {
      dropdownRoot?.classList.remove("open");
    }
  });

  // Color swatches
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      document
        .querySelectorAll(".color-swatch")
        .forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      const color = swatch.dataset.color;
      document.getElementById("colorPicker").value = color;
      state.color = color;
      addRecentColor(color);
    });
  });

  // Recent colors functionality
  function addRecentColor(color) {
    let recentColors = JSON.parse(localStorage.getItem("recentColors") || "[]");

    // Remove if already exists
    recentColors = recentColors.filter((c) => c !== color);

    // Add to beginning
    recentColors.unshift(color);

    // Limit to 8 colors
    if (recentColors.length > 8) {
      recentColors = recentColors.slice(0, 8);
    }

    localStorage.setItem("recentColors", JSON.stringify(recentColors));
    updateRecentColorsDisplay();
  }

  function updateRecentColorsDisplay() {
    const container = document.getElementById("recentColors");
    if (!container) return;

    const recentColors = JSON.parse(
      localStorage.getItem("recentColors") || "[]"
    );
    container.innerHTML = "";

    recentColors.forEach((color, index) => {
      if (index % 4 === 0) {
        const row = document.createElement("div");
        row.className = "swatch-row";
        container.appendChild(row);
      }

      const lastRow = container.lastElementChild;
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.style.background = color;
      swatch.dataset.color = color;
      swatch.title = color;

      swatch.addEventListener("click", () => {
        document.getElementById("colorPicker").value = color;
        state.color = color;
        document
          .querySelectorAll(".color-swatch")
          .forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
      });

      lastRow.appendChild(swatch);
    });
  }

  // Layer management
  document.getElementById("addLayerBtn")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("addLayer"));
  });

  document.getElementById("deleteLayerBtn")?.addEventListener("click", () => {
    if (window.ToolState.layers.length > 1) {
      window.dispatchEvent(new CustomEvent("deleteLayer"));
    } else {
      alert("Cannot delete the last layer!");
    }
  });

  document
    .getElementById("duplicateLayerBtn")
    ?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("duplicateLayer"));
    });

  // Initialize enhanced shapes dropdown on DOM load
  window.addEventListener("DOMContentLoaded", () => {
    initShapesDropdown();
    setTool("brush");
    updatePropertiesPanel();
    updateRecentColorsDisplay();

    // Set initial brush size display
    const sizeValue = document.getElementById("sizeValue");
    if (sizeValue) {
      sizeValue.textContent = state.size + "px";
    }

    // Set initial opacity and flow values
    document.getElementById("opacityValue").textContent = "100%";
    document.getElementById("flowValue").textContent = "100%";
  });
})();
