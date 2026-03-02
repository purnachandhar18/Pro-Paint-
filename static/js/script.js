// script.js — modern layered paint engine with object selection and movement
(function () {
  const canvasStack = document.getElementById("canvasStack");
  const statusSpan = document.getElementById("status");
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  const clearBtn = document.getElementById("clearBtn");
  const saveBtn = document.getElementById("saveBtn");
  const mouseX = document.getElementById("mouseX");
  const mouseY = document.getElementById("mouseY");
  const selectionOverlay = document.getElementById("selectionOverlay");

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const TS = window.ToolState;

  let drawing = false;
  let last = { x: 0, y: 0 };
  let isDrawingShape = false,
    shapeStart = null;
  let isMovingLayer = false,
    activeMovingLayer = null;
  let moveStartPos = { x: 0, y: 0 },
    originalLayerOffset = { x: 0, y: 0 };
  let isTextModalOpen = false;
  let isMovingObject = false,
    activeObject = null,
    objectStartPos = { x: 0, y: 0 };
  let isResizingObject = false,
    resizeHandle = null;
  // Buffer to hold the canvas snapshot used for shape preview (synchronous copy)
  let shapePreviewBuffer = null;

  const maxHistory = 60;

  // Initialize object storage for each layer
  if (TS.layers) {
    TS.layers.forEach((layer) => {
      if (!layer.objects) layer.objects = [];
    });
  }

  // ---------- Dark Mode Detection ----------
  function isDarkMode() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  function getTextColorForBackground() {
    return isDarkMode() ? "#000000" : "#ffffff";
  }

  // ---------- Responsive UI Fixes ----------
  function initResponsiveUI() {
    // Make sure UI elements are properly visible on mobile
    const toolbar = document.querySelector(".toolbar");
    const controls = document.querySelector(".controls");

    if (toolbar) {
      toolbar.style.zIndex = "1000";
      toolbar.style.position = "relative";
    }

    if (controls) {
      controls.style.zIndex = "1000";
      controls.style.position = "relative";
    }

    // Fix text modal for mobile
    const textModal = document.getElementById("textModal");
    if (textModal) {
      textModal.style.zIndex = "2000";
      textModal.style.position = "fixed";
      textModal.style.top = "50%";
      textModal.style.left = "50%";
      textModal.style.transform = "translate(-50%, -50%)";
      textModal.style.maxWidth = "90vw";
      textModal.style.maxHeight = "90vh";
      textModal.style.overflow = "auto";
    }

    // Fix selection overlay
    if (selectionOverlay) {
      selectionOverlay.style.zIndex = "100";
      selectionOverlay.style.pointerEvents = "none";
    }
  }

  // ---------- Enhanced Object System ----------
  function createTextObject(text, x, y, font, size, color, isBold, isItalic) {
    return {
      type: "text",
      id: "text_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      text: text,
      x: x,
      y: y,
      width: 0, // Will be calculated when drawn
      height: 0,
      font: font,
      size: size,
      color: color,
      bold: isBold,
      italic: isItalic,
      selected: false,
      resizable: true, // Text objects CAN be resized
    };
  }

  function createImageObject(img, x, y, width, height) {
    return {
      type: "image",
      id: "image_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      img: img, // HTMLImageElement or canvas
      x: x,
      y: y,
      width: width,
      height: height,
      selected: false,
      resizable: true,
    };
  }

  function createShapeObject(
    shapeType,
    x1,
    y1,
    x2,
    y2,
    color,
    fill,
    stroke,
    strokeWidth
  ) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.max(Math.abs(x2 - x1), 5);
    const height = Math.max(Math.abs(y2 - y1), 5);

    return {
      type: "shape",
      id: "shape_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      shapeType: shapeType,
      x: x,
      y: y,
      width: width,
      height: height,
      color: color,
      fill: fill,
      stroke: stroke,
      strokeWidth: strokeWidth,
      selected: false,
      resizable: true, // Shape objects CAN be resized
    };
  }

  // ---------- FIXED: Enhanced Rendering System ----------
  function smoothRenderLayer(layer) {
    const ctx = layer.ctx;
    const w = layer.canvas.width / DPR;
    const h = layer.canvas.height / DPR;

    // 1. Clear the canvas completely
    ctx.clearRect(0, 0, w, h);

    // 2. Get the current drawing state from history
    const currentHistory = layer.history[layer.historyIndex];

    if (currentHistory) {
      const baseImage = new Image();
      baseImage.onload = function () {
        // 3. Redraw the base drawing first
        ctx.drawImage(baseImage, 0, 0, w, h);

        // 4. THEN, redraw all objects on top of it
        if (layer.objects) {
          layer.objects.forEach((obj) => {
            drawObject(ctx, obj);
          });
        }
      };
      baseImage.src = currentHistory;
    } else {
      // If there's no history, just draw the objects on a blank canvas
      if (layer.id === 0) {
        // Fill base layer with white if empty
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      if (layer.objects) {
        layer.objects.forEach((obj) => {
          drawObject(ctx, obj);
        });
      }
    }
  }

  function drawAllObjects(layer) {
    if (layer.objects && layer.objects.length > 0) {
      layer.objects.forEach((obj) => {
        drawObject(layer.ctx, obj);
      });
    }
  }

  function drawObject(ctx, obj) {
    ctx.save();
    ctx.globalAlpha = TS.opacity;

    if (obj.type === "text") {
      let fontStyle = "";
      if (obj.bold) fontStyle += "bold ";
      if (obj.italic) fontStyle += "italic ";

      ctx.font = `${fontStyle}${obj.size}px ${obj.font}`;
      ctx.fillStyle = obj.color;
      ctx.textBaseline = "top";

      // Add text background for better visibility - adapts to dark mode
      if (TS.showTextBackground) {
        const metrics = ctx.measureText(obj.text);
        const textWidth = metrics.width;
        const textHeight = obj.size;

        // Use appropriate background color based on dark mode
        const bgColor = isDarkMode()
          ? "rgba(255, 255, 255, 0.9)"
          : "rgba(0, 0, 0, 0.7)";
        ctx.fillStyle = bgColor;
        ctx.fillRect(obj.x - 2, obj.y - 2, textWidth + 4, textHeight + 4);

        ctx.fillStyle = obj.color;
      }

      ctx.fillText(obj.text, obj.x, obj.y);

      // Calculate actual dimensions
      const metrics = ctx.measureText(obj.text);
      obj.width = metrics.width;
      obj.height = obj.size;
    } else if (obj.type === "shape") {
      const fill = obj.fill;
      const stroke = obj.stroke;
      const strokeWidth = obj.strokeWidth;

      if (fill) {
        ctx.fillStyle = obj.color;
      }
      if (stroke) {
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = strokeWidth;
      }

      ctx.beginPath();

      switch (obj.shapeType) {
        case "rect":
          ctx.rect(obj.x, obj.y, obj.width, obj.height);
          break;
        case "circle":
          const radius = Math.min(obj.width, obj.height) / 2;
          const centerX = obj.x + obj.width / 2;
          const centerY = obj.y + obj.height / 2;
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          break;
        case "ellipse":
          ctx.ellipse(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            obj.width / 2,
            obj.height / 2,
            0,
            0,
            Math.PI * 2
          );
          break;
        case "triangle":
          ctx.moveTo(obj.x + obj.width / 2, obj.y);
          ctx.lineTo(obj.x, obj.y + obj.height);
          ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
          ctx.closePath();
          break;
        case "line":
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
          break;
        case "star":
          drawStar(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            5,
            Math.min(obj.width, obj.height) / 2,
            Math.min(obj.width, obj.height) / 4
          );
          break;
        case "heart":
          drawHeart(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            obj.width,
            obj.height
          );
          break;
        case "arrow":
          drawArrow(ctx, obj.x, obj.y, obj.x + obj.width, obj.y + obj.height);
          break;
        case "polygon":
          drawPolygon(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            6,
            Math.min(obj.width, obj.height) / 2
          );
          break;
        // NEW SHAPES ADDED HERE
        case "cloud":
          drawCloud(ctx, obj.x, obj.y, obj.width, obj.height);
          break;
        case "house":
          drawHouse(ctx, obj.x, obj.y, obj.width, obj.height);
          break;
        case "burst":
          drawBurst(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            Math.min(obj.width, obj.height) / 2
          );
          break;
        case "cross":
          drawCross(ctx, obj.x, obj.y, obj.width, obj.height);
          break;
        case "moon":
          drawMoon(ctx, obj.x, obj.y, obj.width, obj.height);
          break;
        case "hexagon":
          drawHexagon(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            Math.min(obj.width, obj.height) / 2
          );
          break;
        case "octagon":
          drawOctagon(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            Math.min(obj.width, obj.height) / 2
          );
          break;
        case "roundedRect":
          drawRoundedRect(ctx, obj.x, obj.y, obj.width, obj.height, 10);
          break;
        case "speechBubble":
          drawSpeechBubble(ctx, obj.x, obj.y, obj.width, obj.height);
          break;
        case "thoughtBubble":
          drawThoughtBubble(ctx, obj.x, obj.y, obj.width, obj.height);
          break;
        case "spiral":
          drawSpiral(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            Math.min(obj.width, obj.height) / 2
          );
          break;
        case "cog":
          drawCog(
            ctx,
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            Math.min(obj.width, obj.height) / 2
          );
          break;
      }

      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    } else if (obj.type === "image") {
      try {
        if (
          obj.img instanceof HTMLImageElement ||
          obj.img instanceof HTMLCanvasElement
        ) {
          ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
        } else if (typeof obj.img === "string") {
          const im = new Image();
          im.src = obj.img;
          ctx.drawImage(im, obj.x, obj.y, obj.width, obj.height);
        }
      } catch (e) {
        console.warn("Error drawing image object:", e);
      }
    }

    ctx.restore();

    // Draw selection handles if object is selected and resizable
    if (obj.selected && obj.resizable) {
      drawSelectionHandles(ctx, obj);
    } else if (obj.selected) {
      // Just draw bounding box for non-resizable objects
      drawBoundingBox(ctx, obj);
    }
  }

  // ---------- NEW SHAPE DRAWING FUNCTIONS ----------
  function drawCloud(ctx, x, y, width, height) {
    const radius = Math.min(width, height) / 4;
    ctx.moveTo(x + radius, y + height / 2);
    ctx.arc(x + radius, y + height / 2, radius, Math.PI, 0, false);
    ctx.arc(x + radius * 2, y + height / 3, radius * 0.8, 0, Math.PI, true);
    ctx.arc(x + radius * 3, y + height / 2, radius, 0, Math.PI, false);
    ctx.closePath();
  }

  function drawHouse(ctx, x, y, width, height) {
    // Roof
    ctx.moveTo(x, y + height * 0.6);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height * 0.6);
    // Base
    ctx.lineTo(x + width * 0.8, y + height * 0.6);
    ctx.lineTo(x + width * 0.8, y + height);
    ctx.lineTo(x + width * 0.2, y + height);
    ctx.lineTo(x + width * 0.2, y + height * 0.6);
    ctx.closePath();
  }

  function drawBurst(ctx, cx, cy, size) {
    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const angle = (i * Math.PI * 2) / spikes;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    }
  }

  function drawCross(ctx, x, y, width, height) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const armWidth = width / 3;
    const armHeight = height / 3;

    // Horizontal arm
    ctx.rect(x, centerY - armHeight / 2, width, armHeight);
    // Vertical arm
    ctx.rect(centerX - armWidth / 2, y, armWidth, height);
  }

  function drawMoon(ctx, x, y, width, height) {
    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.arc(centerX, centerY, radius, 0.5 * Math.PI, 1.5 * Math.PI, false);
    ctx.arc(
      centerX - radius * 0.3,
      centerY,
      radius * 0.7,
      1.5 * Math.PI,
      0.5 * Math.PI,
      true
    );
    ctx.closePath();
  }

  function drawHexagon(ctx, cx, cy, size) {
    drawPolygon(ctx, cx, cy, 6, size);
  }

  function drawOctagon(ctx, cx, cy, size) {
    drawPolygon(ctx, cx, cy, 8, size);
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawSpeechBubble(ctx, x, y, width, height) {
    const radius = 10;
    const tailSize = 15;

    // Main bubble
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius - tailSize);
    ctx.quadraticCurveTo(
      x + width,
      y + height - tailSize,
      x + width - radius,
      y + height - tailSize
    );
    ctx.lineTo(x + radius + tailSize, y + height - tailSize);
    ctx.lineTo(x + radius, y + height);
    ctx.lineTo(x + radius + tailSize, y + height - tailSize);
    ctx.lineTo(x + radius, y + height - tailSize);
    ctx.quadraticCurveTo(
      x,
      y + height - tailSize,
      x,
      y + height - radius - tailSize
    );
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawThoughtBubble(ctx, x, y, width, height) {
    const radius = 10;
    const circleSize = 5;

    // Main bubble
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    // Thought circles
    ctx.moveTo(x + width * 0.7, y + height);
    ctx.arc(
      x + width * 0.7,
      y + height + circleSize,
      circleSize,
      0,
      Math.PI * 2
    );
    ctx.moveTo(x + width * 0.8, y + height + circleSize * 2);
    ctx.arc(
      x + width * 0.8,
      y + height + circleSize * 3,
      circleSize * 0.7,
      0,
      Math.PI * 2
    );
  }

  function drawSpiral(ctx, cx, cy, size) {
    const coils = 4;
    const rotation = 2;
    ctx.moveTo(cx, cy);

    for (let i = 0; i <= 360 * coils; i++) {
      const angle = (i * Math.PI) / 180;
      const radius = size * (i / (360 * coils));
      const x = cx + Math.cos(angle + rotation) * radius;
      const y = cy + Math.sin(angle + rotation) * radius;
      ctx.lineTo(x, y);
    }
  }

  function drawCog(ctx, cx, cy, size) {
    const teeth = 8;
    const innerRadius = size * 0.6;
    const toothDepth = size * 0.2;

    for (let i = 0; i < teeth; i++) {
      const angle = (i * 2 * Math.PI) / teeth;
      const nextAngle = ((i + 1) * 2 * Math.PI) / teeth;

      // Tooth outer point
      const outerX1 = cx + Math.cos(angle) * size;
      const outerY1 = cy + Math.sin(angle) * size;

      // Tooth inner point
      const innerX1 = cx + Math.cos(angle) * innerRadius;
      const innerY1 = cy + Math.sin(angle) * innerRadius;

      const innerX2 = cx + Math.cos(nextAngle) * innerRadius;
      const innerY2 = cy + Math.sin(nextAngle) * innerRadius;

      const outerX2 = cx + Math.cos(nextAngle) * size;
      const outerY2 = cy + Math.sin(nextAngle) * size;

      if (i === 0) {
        ctx.moveTo(outerX1, outerY1);
      } else {
        ctx.lineTo(outerX1, outerY1);
      }

      ctx.lineTo(innerX1, innerY1);
      ctx.lineTo(innerX2, innerY2);
      ctx.lineTo(outerX2, outerY2);
    }
    ctx.closePath();
  }

  // Keep existing shape functions (triangle, star, heart, arrow, polygon)
  function drawTriangle(ctx, x, y, width, height) {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
  }

  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  function drawHeart(ctx, x, y, width, height) {
    const topCurveHeight = height * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y + height / 4);
    // Left top curve
    ctx.bezierCurveTo(x, y, x - width / 2, y, x - width / 2, y + height / 4);
    // Left bottom curve
    ctx.bezierCurveTo(
      x - width / 2,
      y + height / 2,
      x,
      y + height * 0.75,
      x,
      y + height
    );
    // Right bottom curve
    ctx.bezierCurveTo(
      x,
      y + height * 0.75,
      x + width / 2,
      y + height / 2,
      x + width / 2,
      y + height / 4
    );
    // Right top curve
    ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + height / 4);
    ctx.closePath();
  }

  function drawArrow(ctx, fromX, fromY, toX, toY) {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.moveTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    );
  }

  function drawPolygon(ctx, x, y, sides, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius * Math.cos(0), y + radius * Math.sin(0));

    for (let i = 1; i <= sides; i++) {
      ctx.lineTo(
        x + radius * Math.cos((i * 2 * Math.PI) / sides),
        y + radius * Math.sin((i * 2 * Math.PI) / sides)
      );
    }

    ctx.closePath();
  }

  function drawBoundingBox(ctx, obj) {
    ctx.save();
    // Use contrasting color based on dark mode
    const strokeColor = isDarkMode() ? "#00ff00" : "#0000ff";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);
    ctx.restore();
  }

  function drawSelectionHandles(ctx, obj) {
    if (!obj.resizable) return;

    ctx.save();
    // Use contrasting colors based on dark mode
    const strokeColor = isDarkMode() ? "#00ff00" : "#0000ff";
    const fillColor = isDarkMode() ? "#000000" : "#ffffff";

    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Draw bounding box
    ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);

    // Draw resize handles
    const handleSize = 6;

    // Top-left
    ctx.fillRect(
      obj.x - handleSize / 2,
      obj.y - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.strokeRect(
      obj.x - handleSize / 2,
      obj.y - handleSize / 2,
      handleSize,
      handleSize
    );

    // Top-right
    ctx.fillRect(
      obj.x + obj.width - handleSize / 2,
      obj.y - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.strokeRect(
      obj.x + obj.width - handleSize / 2,
      obj.y - handleSize / 2,
      handleSize,
      handleSize
    );

    // Bottom-left
    ctx.fillRect(
      obj.x - handleSize / 2,
      obj.y + obj.height - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.strokeRect(
      obj.x - handleSize / 2,
      obj.y + obj.height - handleSize / 2,
      handleSize,
      handleSize
    );

    // Bottom-right
    ctx.fillRect(
      obj.x + obj.width - handleSize / 2,
      obj.y + obj.height - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.strokeRect(
      obj.x + obj.width - handleSize / 2,
      obj.y + obj.height - handleSize / 2,
      handleSize,
      handleSize
    );

    ctx.restore();
  }

  function getObjectAtPoint(x, y) {
    const layer = currentLayer();
    if (!layer || !layer.objects) return null;

    // Check objects in reverse order (top-most first)
    for (let i = layer.objects.length - 1; i >= 0; i--) {
      const obj = layer.objects[i];

      if (obj.type === "text") {
        // Simple bounding box check for text
        if (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        ) {
          return obj;
        }
      } else if (obj.type === "shape") {
        // Bounding box check for shapes
        if (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        ) {
          return obj;
        }
      } else if (obj.type === "image") {
        if (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        ) {
          return obj;
        }
      }
    }
    return null;
  }

  // Paste handler: supports image clipboard (PNG/JPEG) and image data URLs
  window.addEventListener("paste", async (e) => {
    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (!blob) continue;

        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          // Create image object in center of canvas
          const layer = currentLayer();
          if (!layer) return;
          const w = img.width / DPR;
          const h = img.height / DPR;
          const xpos = Math.max(10, (layer.canvas.width / DPR - w) / 2);
          const ypos = Math.max(10, (layer.canvas.height / DPR - h) / 2);

          const imgObj = createImageObject(img, xpos, ypos, w, h);
          layer.objects.push(imgObj);
          smoothRenderLayer(layer);
          pushHistory(layer);
          URL.revokeObjectURL(url);
        };
        img.src = url;
        e.preventDefault();
        return;
      }
    }
  });

  function getResizeHandleAtPoint(obj, x, y) {
    // Only allow resizing for objects that are marked as resizable
    if (!obj || !obj.resizable) return null;

    const handleSize = 6;
    const handles = [
      {
        name: "top-left",
        x: obj.x - handleSize / 2,
        y: obj.y - handleSize / 2,
      },
      {
        name: "top-right",
        x: obj.x + obj.width - handleSize / 2,
        y: obj.y - handleSize / 2,
      },
      {
        name: "bottom-left",
        x: obj.x - handleSize / 2,
        y: obj.y + obj.height - handleSize / 2,
      },
      {
        name: "bottom-right",
        x: obj.x + obj.width - handleSize / 2,
        y: obj.y + obj.height - handleSize / 2,
      },
    ];

    for (const handle of handles) {
      if (
        x >= handle.x &&
        x <= handle.x + handleSize &&
        y >= handle.y &&
        y <= handle.y + handleSize
      ) {
        return handle.name;
      }
    }
    return null;
  }

  function resizeObject(obj, handle, newX, newY) {
    if (!obj.resizable) return;

    switch (handle) {
      case "top-left":
        obj.width += obj.x - newX;
        obj.height += obj.y - newY;
        obj.x = newX;
        obj.y = newY;
        break;
      case "top-right":
        obj.width = newX - obj.x;
        obj.height += obj.y - newY;
        obj.y = newY;
        break;
      case "bottom-left":
        obj.width += obj.x - newX;
        obj.height = newY - obj.y;
        obj.x = newX;
        break;
      case "bottom-right":
        obj.width = newX - obj.x;
        obj.height = newY - obj.y;
        break;
    }

    // Ensure minimum size
    obj.width = Math.max(obj.width, 10);
    obj.height = Math.max(obj.height, 10);

    // For text objects, update font size proportionally
    if (obj.type === "text") {
      obj.size = Math.max(12, Math.min(obj.width / 5, obj.height));
    }
  }

  function deselectAllObjects() {
    const layer = currentLayer();
    if (layer && layer.objects) {
      layer.objects.forEach((obj) => {
        obj.selected = false;
      });
    }
    activeObject = null;
    hideSelectionOverlay();
  }

  function showSelectionOverlay(obj) {
    if (selectionOverlay && obj) {
      selectionOverlay.style.left = obj.x - 2 + "px";
      selectionOverlay.style.top = obj.y - 2 + "px";
      selectionOverlay.style.width = obj.width + 4 + "px";
      selectionOverlay.style.height = obj.height + 4 + "px";
      selectionOverlay.style.display = "block";
    }
  }

  function hideSelectionOverlay() {
    if (selectionOverlay) {
      selectionOverlay.style.display = "none";
    }
  }

  // ---------- Layers ----------
  function createLayer(id, width, height) {
    const c = document.createElement("canvas");
    c.dataset.layerId = id;
    c.className = "layer-canvas";
    c.style.position = "absolute";
    c.style.inset = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.zIndex = id;
    canvasStack.appendChild(c);

    c.width = Math.floor(width * DPR);
    c.height = Math.floor(height * DPR);
    const ctx = c.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    return {
      id,
      canvas: c,
      ctx,
      visible: true,
      history: [],
      historyIndex: -1,
      name: `Layer ${id + 1}`,
      offsetX: 0,
      offsetY: 0,
      objects: [], // Array to store objects
    };
  }

  function init() {
    const w = Math.max(400, Math.floor(canvasStack.clientWidth));
    const h = Math.max(300, Math.floor(canvasStack.clientHeight));
    canvasStack.querySelectorAll("canvas").forEach((n) => n.remove());
    TS.layers = [];
    const base = createLayer(0, w, h);
    base.ctx.fillStyle = "#ffffff";
    base.ctx.fillRect(0, 0, w, h);
    pushHistory(base);
    TS.layers.push(base);
    TS.activeLayer = 0;

    // Initialize text background setting
    TS.showTextBackground = true;

    renderUI();
    updateCanvasSizeDisplay(w, h);
    initResponsiveUI();
  }

  function updateCanvasSizeDisplay(w, h) {
    const canvasSize = document.getElementById("canvasSize");
    if (canvasSize) {
      canvasSize.textContent = `${w}×${h}`;
    }
  }

  function resizeAll() {
    const w = Math.max(400, Math.floor(canvasStack.clientWidth));
    const h = Math.max(300, Math.floor(canvasStack.clientHeight));
    TS.layers.forEach((layer) => {
      const old = new Image();
      old.src = layer.canvas.toDataURL();
      old.onload = () => {
        layer.canvas.width = w * DPR;
        layer.canvas.height = h * DPR;
        layer.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        layer.ctx.drawImage(old, 0, 0, w, h);
        // Redraw objects on top
        if (layer.objects && layer.objects.length > 0) {
          layer.objects.forEach((obj) => {
            drawObject(layer.ctx, obj);
          });
        }
      };
    });
    renderUI();
    updateCanvasSizeDisplay(w, h);
    initResponsiveUI();
  }
  window.addEventListener("resize", resizeAll);

  // ---------- History ----------
  function pushHistory(layer) {
    const snap = layer.canvas.toDataURL();
    if (layer.historyIndex < layer.history.length - 1)
      layer.history = layer.history.slice(0, layer.historyIndex + 1);
    layer.history.push(snap);
    if (layer.history.length > maxHistory) layer.history.shift();
    layer.historyIndex = layer.history.length - 1;
  }

  function loadHistoryState(layer, index) {
    const ctx = layer.ctx;
    const w = layer.canvas.width / DPR,
      h = layer.canvas.height / DPR;
    ctx.clearRect(0, 0, w, h);
    if (index >= 0 && index < layer.history.length) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        // Redraw objects after loading history
        if (layer.objects && layer.objects.length > 0) {
          layer.objects.forEach((obj) => {
            drawObject(ctx, obj);
          });
        }
      };
      img.src = layer.history[index];
      layer.historyIndex = index;
    } else {
      if (layer.id === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      layer.history = [];
      layer.historyIndex = -1;
      layer.objects = []; // Clear objects too
      pushHistory(layer);
    }
  }

  function undoLayer(layer) {
    if (!layer) return;
    if (layer.historyIndex <= 0) loadHistoryState(layer, -1);
    else loadHistoryState(layer, layer.historyIndex - 1);
  }
  function redoLayer(layer) {
    if (!layer) return;
    if (layer.historyIndex < layer.history.length - 1)
      loadHistoryState(layer, layer.historyIndex + 1);
  }

  // ---------- Helpers ----------
  function getPos(e) {
    const rect = canvasStack.getBoundingClientRect();
    let x = e.clientX,
      y = e.clientY;
    if (e.touches?.[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }

    // Update coordinates display
    if (mouseX && mouseY) {
      mouseX.textContent = Math.floor(x - rect.left);
      mouseY.textContent = Math.floor(y - rect.top);
    }

    return { x: x - rect.left, y: y - rect.top };
  }

  function currentLayer() {
    return TS.layers[TS.activeLayer];
  }

  function strokeLine(ctx, x1, y1, x2, y2, size, color, type) {
    ctx.save();
    ctx.globalAlpha = TS.opacity;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = type === "square" ? "butt" : "round";
    ctx.lineJoin = ctx.lineCap;

    if (type === "textured") {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.lineWidth = size * (0.6 + Math.random() * 0.8);
        const off = (Math.random() - 0.5) * 2;
        ctx.moveTo(x1 + off, y1 + off);
        ctx.lineTo(x2 + off, y2 + off);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function sprayAt(ctx, x, y, radius, density, color) {
    ctx.save();
    ctx.globalAlpha = TS.opacity;
    ctx.fillStyle = color;
    for (let i = 0; i < density; i++) {
      const r = Math.random() * radius,
        a = Math.random() * Math.PI * 2;
      ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1, 1);
    }
    ctx.restore();
  }

  // ---- Flood Fill (DPR-correct) ----
  function hexToRGBA(hex) {
    let h = hex.replace("#", "");
    if (h.length === 3)
      h = h
        .split("")
        .map((ch) => ch + ch)
        .join("");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      255,
    ];
  }
  function colorsMatch(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  function floodFillLayer(layer, x, y, fillHex) {
    const c = layer.canvas,
      ctx = layer.ctx;
    const w = c.width,
      h = c.height;
    const sx = Math.floor(x * DPR),
      sy = Math.floor(y * DPR);
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

    const img = ctx.getImageData(0, 0, w, h),
      data = img.data;
    const idx0 = (sy * w + sx) * 4;
    const target = [data[idx0], data[idx0 + 1], data[idx0 + 2], data[idx0 + 3]];
    const fill = hexToRGBA(fillHex);
    if (colorsMatch(target, fill)) return;

    const stack = [[sx, sy]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const i = (cy * w + cx) * 4;
      const cur = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (colorsMatch(cur, target)) {
        data[i] = fill[0];
        data[i + 1] = fill[1];
        data[i + 2] = fill[2];
        data[i + 3] = fill[3];
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function drawShape(ctx, shapeType, x1, y1, x2, y2) {
    ctx.save();
    ctx.globalAlpha = TS.opacity;

    const fill = TS.shapeFill;
    const stroke = TS.shapeStroke;
    const strokeWidth = TS.strokeWidth;

    if (fill) {
      ctx.fillStyle = TS.color;
    }
    if (stroke) {
      ctx.strokeStyle = TS.color;
      ctx.lineWidth = strokeWidth;
    }

    ctx.beginPath();

    const width = x2 - x1;
    const height = y2 - y1;

    switch (shapeType) {
      case "rect":
        ctx.rect(x1, y1, width, height);
        break;
      case "circle":
        const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
        const centerX = x1 + width / 2;
        const centerY = y1 + height / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        break;
      case "ellipse":
        ctx.ellipse(
          x1 + width / 2,
          y1 + height / 2,
          Math.abs(width) / 2,
          Math.abs(height) / 2,
          0,
          0,
          Math.PI * 2
        );
        break;
      case "triangle":
        ctx.moveTo(x1 + width / 2, y1);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        break;
      case "line":
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        break;
      case "star":
        drawStar(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          5,
          Math.min(Math.abs(width), Math.abs(height)) / 2,
          Math.min(Math.abs(width), Math.abs(height)) / 4
        );
        break;
      case "heart":
        drawHeart(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          Math.abs(width),
          Math.abs(height)
        );
        break;
      case "arrow":
        drawArrow(ctx, x1, y1, x2, y2);
        break;
      case "polygon":
        drawPolygon(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          6,
          Math.min(Math.abs(width), Math.abs(height)) / 2
        );
        break;
      // NEW SHAPES FOR PREVIEW
      case "cloud":
        drawCloud(ctx, x1, y1, Math.abs(width), Math.abs(height));
        break;
      case "house":
        drawHouse(ctx, x1, y1, Math.abs(width), Math.abs(height));
        break;
      case "burst":
        drawBurst(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          Math.min(Math.abs(width), Math.abs(height)) / 2
        );
        break;
      case "cross":
        drawCross(ctx, x1, y1, Math.abs(width), Math.abs(height));
        break;
      case "moon":
        drawMoon(ctx, x1, y1, Math.abs(width), Math.abs(height));
        break;
      case "hexagon":
        drawHexagon(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          Math.min(Math.abs(width), Math.abs(height)) / 2
        );
        break;
      case "octagon":
        drawOctagon(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          Math.min(Math.abs(width), Math.abs(height)) / 2
        );
        break;
      case "roundedRect":
        drawRoundedRect(ctx, x1, y1, Math.abs(width), Math.abs(height), 10);
        break;
      case "speechBubble":
        drawSpeechBubble(ctx, x1, y1, Math.abs(width), Math.abs(height));
        break;
      case "thoughtBubble":
        drawThoughtBubble(ctx, x1, y1, Math.abs(width), Math.abs(height));
        break;
      case "spiral":
        drawSpiral(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          Math.min(Math.abs(width), Math.abs(height)) / 2
        );
        break;
      case "cog":
        drawCog(
          ctx,
          x1 + width / 2,
          y1 + height / 2,
          Math.min(Math.abs(width), Math.abs(height)) / 2
        );
        break;
    }

    if (fill) ctx.fill();
    if (stroke) ctx.stroke();

    ctx.restore();
  }

  // ---------- Text Modal Management ----------
  function openTextModal() {
    isTextModalOpen = true;
    const textModal = document.getElementById("textModal");
    if (textModal) {
      textModal.classList.remove("hidden");
      textModal.style.zIndex = "2000";
      textModal.style.position = "fixed";
      textModal.style.top = "50%";
      textModal.style.left = "50%";
      textModal.style.transform = "translate(-50%, -50%)";
      textModal.style.maxWidth = "90vw";
      textModal.style.maxHeight = "90vh";
      textModal.style.overflow = "auto";
    }
    document.getElementById("textInput")?.focus();
  }

  function closeTextModal() {
    isTextModalOpen = false;
    document.getElementById("textModal")?.classList.add("hidden");
    document.getElementById("textInput").value = "";
  }

  // ---------- Tool Management ----------
  function setTool(tool) {
    TS.tool = tool;

    // Reset brush type when switching to brush tool
    if (tool === "brush") {
      TS.brushType = "round"; // Default brush type
    }

    renderUI();
  }

  // ---------- FIXED: Enhanced Input Handling ----------
  function start(e) {
    if (isTextModalOpen) return;

    e.preventDefault();
    const pos = getPos(e);
    const layer = currentLayer();
    if (!layer) return;

    // Handle object selection/movement only when select tool is active
    if (TS.tool === "select") {
      const clickedObject = getObjectAtPoint(pos.x, pos.y);

      if (clickedObject) {
        // Select and potentially move/resize object
        deselectAllObjects();
        clickedObject.selected = true;
        activeObject = clickedObject;
        showSelectionOverlay(clickedObject);

        // Check if clicking on resize handle (for resizable objects)
        if (clickedObject.resizable) {
          resizeHandle = getResizeHandleAtPoint(clickedObject, pos.x, pos.y);
          if (resizeHandle) {
            isResizingObject = true;
            objectStartPos = { x: pos.x, y: pos.y };
          } else {
            isMovingObject = true;
            objectStartPos = {
              x: pos.x - clickedObject.x,
              y: pos.y - clickedObject.y,
            };
          }
        } else {
          // For non-resizable objects, only allow moving
          isMovingObject = true;
          objectStartPos = {
            x: pos.x - clickedObject.x,
            y: pos.y - clickedObject.y,
          };
        }
        smoothRenderLayer(layer);
        return;
      } else {
        // Deselect all objects if clicking elsewhere
        deselectAllObjects();

        // Start layer movement
        isMovingLayer = true;
        activeMovingLayer = layer;
        moveStartPos = pos;
        originalLayerOffset = { x: layer.offsetX, y: layer.offsetY };
        canvasStack.style.cursor = "move";
        smoothRenderLayer(layer);
        return;
      }
    }

    // For other tools, handle normal drawing
    if (TS.tool === "fill") {
      pushHistory(layer);
      floodFillLayer(layer, pos.x, pos.y, TS.color);
      return;
    }
    if (TS.tool === "shape") {
      isDrawingShape = true;
      shapeStart = pos;
      // FIX: Capture the canvas state *before* drawing the preview
      // Create an offscreen buffer canvas and copy current layer into it.
      shapePreviewBuffer = document.createElement("canvas");
      // Use same physical pixel size as layer canvas to avoid scaling artifacts
      shapePreviewBuffer.width = layer.canvas.width;
      shapePreviewBuffer.height = layer.canvas.height;
      const bufCtx = shapePreviewBuffer.getContext("2d");
      // Draw the current layer into the buffer synchronously
      bufCtx.drawImage(layer.canvas, 0, 0);
      return;
    }
    if (TS.tool === "text") {
      openTextModal();
      return;
    }

    // Brush and eraser tools - FIXED: Now preserves existing content
    drawing = true;
    last = pos;

    // Draw initial point for brush/eraser
    if (TS.tool === "brush" || TS.tool === "eraser") {
      const ctx = layer.ctx;
      if (TS.tool === "eraser") {
        // FIXED: Proper eraser implementation
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, TS.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (TS.tool === "brush") {
        if (TS.brushType === "spray") {
          sprayAt(
            ctx,
            pos.x,
            pos.y,
            TS.size * 1.5,
            Math.max(10, TS.size * 2),
            TS.color
          );
        } else {
          strokeLine(
            ctx,
            pos.x,
            pos.y,
            pos.x,
            pos.y,
            TS.size,
            TS.color,
            TS.brushType
          );
        }
      }
      // FIXED: Redraw objects to maintain proper layering
      drawAllObjects(layer);
    }
  }

  function move(e) {
    if (isTextModalOpen) return;

    const pos = getPos(e);
    const layer = currentLayer();
    if (!layer) return;
    const ctx = layer.ctx;

    // Handle object movement
    if (isMovingObject && activeObject) {
      activeObject.x = pos.x - objectStartPos.x;
      activeObject.y = pos.y - objectStartPos.y;
      smoothRenderLayer(layer);
      showSelectionOverlay(activeObject);
      return;
    }

    // Handle object resizing (for resizable objects)
    if (
      isResizingObject &&
      activeObject &&
      activeObject.resizable &&
      resizeHandle
    ) {
      resizeObject(activeObject, resizeHandle, pos.x, pos.y);
      smoothRenderLayer(layer);
      showSelectionOverlay(activeObject);
      return;
    }

    // Handle layer movement
    if (isMovingLayer && activeMovingLayer) {
      const dx = pos.x - moveStartPos.x,
        dy = pos.y - moveStartPos.y;
      activeMovingLayer.offsetX = originalLayerOffset.x + dx;
      activeMovingLayer.offsetY = originalLayerOffset.y + dy;
      activeMovingLayer.canvas.style.transform = `translate(${activeMovingLayer.offsetX}px, ${activeMovingLayer.offsetY}px)`;
      return;
    }

    // Handle shape preview without flickering
    if (isDrawingShape && shapeStart && shapePreviewBuffer) {
      const w = layer.canvas.width / DPR;
      const h = layer.canvas.height / DPR;

      // 1. Clear the real canvas
      ctx.clearRect(0, 0, w, h);
      // 2. Draw the synchronous buffer copy (no async image loading)
      ctx.drawImage(shapePreviewBuffer, 0, 0, w, h);
      // 3. Draw the temporary shape preview on top
      drawShape(ctx, TS.shapeType, shapeStart.x, shapeStart.y, pos.x, pos.y);
      return;
    }

    if (!drawing) return;

    // Handle brush and eraser drawing
    if (TS.tool === "eraser") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = TS.size;
      ctx.strokeStyle = "rgba(0,0,0,1)";

      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
    } else if (TS.tool === "brush") {
      if (TS.brushType === "spray") {
        sprayAt(
          ctx,
          pos.x,
          pos.y,
          TS.size * 1.5,
          Math.max(10, TS.size * 2),
          TS.color
        );
      } else {
        strokeLine(
          ctx,
          last.x,
          last.y,
          pos.x,
          pos.y,
          TS.size,
          TS.color,
          TS.brushType
        );
      }
    }
    last = pos;

    // FIXED: Redraw objects to maintain layering
    drawAllObjects(layer);
  }

  function end(e) {
    if (isTextModalOpen) return;

    const pos = getPos(e);
    const layer = currentLayer();
    if (!layer) return;

    if (isMovingObject || isResizingObject) {
      isMovingObject = false;
      isResizingObject = false;
      resizeHandle = null;
      pushHistory(layer);
      return;
    }

    if (isMovingLayer) {
      isMovingLayer = false;
      activeMovingLayer = null;
      canvasStack.style.cursor = "default";
      return;
    }

    // Handle shape drawing completion
    if (isDrawingShape && shapeStart) {
      // 1. Create the shape as an object
      const obj = createShapeObject(
        TS.shapeType,
        shapeStart.x,
        shapeStart.y,
        pos.x,
        pos.y,
        TS.color,
        TS.shapeFill,
        TS.shapeStroke,
        TS.strokeWidth
      );
      // 2. Add it to the layer's object list
      layer.objects.push(obj);

      // 3. Redraw the canvas *with* the new object
      smoothRenderLayer(layer);

      // 4. Save the new canvas state (with the object baked in) to history
      pushHistory(layer);

      // 5. Reset state
      isDrawingShape = false;
      shapeStart = null;
      shapePreviewBuffer = null;
      return;
    }

    if (drawing) {
      drawing = false;
      pushHistory(layer);
    }
  }

  // ---------- Events ----------
  canvasStack.addEventListener("mousedown", start);
  canvasStack.addEventListener("mousemove", move);
  document.addEventListener("mouseup", end);
  canvasStack.addEventListener("mouseleave", end);
  canvasStack.addEventListener("touchstart", start, { passive: false });
  canvasStack.addEventListener("touchmove", move, { passive: false });
  document.addEventListener("touchend", end, { passive: false });

  // Mouse coordinates tracking
  canvasStack.addEventListener("mousemove", (e) => {
    getPos(e); // This updates the coordinates display
  });

  // UI Buttons
  undoBtn?.addEventListener("click", () => undoLayer(currentLayer()));
  redoBtn?.addEventListener("click", () => redoLayer(currentLayer()));
  clearBtn?.addEventListener("click", () => {
    const layer = currentLayer();
    if (layer) {
      layer.objects = [];
      loadHistoryState(layer, -1);
    }
  });

  // ✅ Modified Save Button Handler
  saveBtn?.addEventListener("click", async () => {
    const w = TS.layers[0].canvas.width / DPR;
    const h = TS.layers[0].canvas.height / DPR;
    const composite = document.createElement("canvas");
    composite.width = w * DPR;
    composite.height = h * DPR;
    const cctx = composite.getContext("2d");
    cctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cctx.fillStyle = "#fff";
    cctx.fillRect(0, 0, w, h);
    TS.layers.forEach(
      (l) => l.visible && cctx.drawImage(l.canvas, l.offsetX, l.offsetY, w, h)
    );

    const imageData = composite.toDataURL("image/png");

    try {
      // Try server save first
      const response = await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await response.json();

      if (result.status === "ok") {
        alert("✅ Drawing Saved on Server!");
      } else {
        // Fallback to client-side download
        downloadImage(imageData);
      }
    } catch (error) {
      // Fallback to client-side download if server is unavailable
      console.log(
        "Server save failed, falling back to client download:",
        error
      );
      downloadImage(imageData);
    }
  });

  // Client-side download function
  function downloadImage(dataUrl) {
    const link = document.createElement("a");
    link.download = `drawing-${new Date().getTime()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("🎨 Your drawing has been downloaded successfully!");
  }

  // Text modal handlers
  document.getElementById("confirmText")?.addEventListener("click", () => {
    const text = document.getElementById("textInput").value;
    if (!text.trim()) return;

    const layer = currentLayer();
    if (layer) {
      const fontSize =
        parseInt(document.getElementById("fontSize").value) || 24;
      const fontFamily = document.getElementById("fontSelect").value || "Arial";
      const isBold = document
        .getElementById("boldBtn")
        ?.classList.contains("active");
      const isItalic = document
        .getElementById("italicBtn")
        ?.classList.contains("active");

      // Create text object instead of drawing directly
      const textObj = createTextObject(
        text,
        50,
        50, // Default position
        fontFamily,
        fontSize,
        TS.color,
        isBold,
        isItalic
      );

      layer.objects.push(textObj);
      smoothRenderLayer(layer);
      pushHistory(layer);
    }

    closeTextModal();
  });

  document.getElementById("cancelText")?.addEventListener("click", () => {
    closeTextModal();
  });

  // Text style buttons
  document.querySelectorAll("#textModal .tool-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      this.classList.toggle("active");
    });
  });

  // Font size display
  document.getElementById("fontSize")?.addEventListener("input", function () {
    const fontSizeValue = document.getElementById("fontSizeValue");
    if (fontSizeValue) {
      fontSizeValue.textContent = this.value + "px";
    }
  });

  // Text background toggle
  document
    .getElementById("textBackgroundToggle")
    ?.addEventListener("click", function () {
      TS.showTextBackground = !TS.showTextBackground;
      this.classList.toggle("active");
      this.textContent = TS.showTextBackground
        ? "📝 Text BG: On"
        : "📝 Text BG: Off";

      // Redraw current layer to update text visibility
      const layer = currentLayer();
      if (layer) {
        smoothRenderLayer(layer);
      }
    });

  // Update text tool click handler
  document.getElementById("textTool")?.addEventListener("click", () => {
    setTool("text");
    deselectAllObjects();
    openTextModal();
  });

  // Update select tool click handler
  document.getElementById("selectTool")?.addEventListener("click", () => {
    setTool("select");
  });

  // Update other tools to deselect objects
  document.getElementById("brushTool")?.addEventListener("click", () => {
    setTool("brush");
    deselectAllObjects();
  });

  document.getElementById("eraserTool")?.addEventListener("click", () => {
    setTool("eraser");
    deselectAllObjects();
  });

  document.getElementById("fillTool")?.addEventListener("click", () => {
    setTool("fill");
    deselectAllObjects();
  });

  document.getElementById("sprayTool")?.addEventListener("click", () => {
    setTool("brush");
    TS.brushType = "spray";
    deselectAllObjects();
  });

  document.getElementById("shapeTool")?.addEventListener("click", () => {
    setTool("shape");
    deselectAllObjects();
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    // Don't process shortcuts if text modal is open
    if (isTextModalOpen) {
      if (e.key === "Escape") {
        closeTextModal();
      }
      return;
    }

    // Delete selected object
    if ((e.key === "Delete" || e.key === "Backspace") && TS.tool === "select") {
      const layer = currentLayer();
      if (layer && layer.objects && activeObject) {
        layer.objects = layer.objects.filter((obj) => obj !== activeObject);
        smoothRenderLayer(layer);
        pushHistory(layer);
        deselectAllObjects();
      }
    }

    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case "z":
          e.preventDefault();
          undoLayer(currentLayer());
          break;
        case "y":
          e.preventDefault();
          redoLayer(currentLayer());
          break;
        case "s":
          e.preventDefault();
          saveBtn?.click();
          break;
      }
    }

    // Tool shortcuts - only when modal is not open
    if (!e.ctrlKey && !e.altKey && !isTextModalOpen) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          setTool("brush");
          deselectAllObjects();
          break;
        case "e":
          e.preventDefault();
          setTool("eraser");
          deselectAllObjects();
          break;
        case "f":
          e.preventDefault();
          setTool("fill");
          deselectAllObjects();
          break;
        case "t":
          e.preventDefault();
          setTool("text");
          deselectAllObjects();
          openTextModal();
          break;
        case "s":
          e.preventDefault();
          setTool("select");
          break;
        case "r":
          e.preventDefault();
          setTool("shape");
          deselectAllObjects();
          break;
        case "p":
          e.preventDefault();
          setTool("brush");
          TS.brushType = "spray";
          deselectAllObjects();
          break;
      }
    }
  });

  // Layer management events
  window.addEventListener("addLayer", () => {
    const w = Math.max(400, Math.floor(canvasStack.clientWidth));
    const h = Math.max(300, Math.floor(canvasStack.clientHeight));
    const id = TS.layers.length;
    const newLayer = createLayer(id, w, h);
    pushHistory(newLayer);
    TS.layers.push(newLayer);
    TS.activeLayer = id;
    renderUI();
    if (statusSpan) {
      statusSpan.textContent = `New Layer ${id + 1} added`;
      setTimeout(() => (statusSpan.textContent = "Ready to draw"), 1200);
    }
  });

  window.addEventListener("deleteLayer", () => {
    if (TS.layers.length <= 1) return;

    const activeLayer = TS.activeLayer;
    const layerToRemove = TS.layers[activeLayer];

    // Remove from DOM
    layerToRemove.canvas.remove();

    // Remove from array
    TS.layers.splice(activeLayer, 1);

    // Update active layer
    TS.activeLayer = Math.max(0, activeLayer - 1);

    renderUI();

    if (statusSpan) {
      statusSpan.textContent = `Layer deleted`;
      setTimeout(() => (statusSpan.textContent = "Ready to draw"), 1200);
    }
  });

  window.addEventListener("duplicateLayer", () => {
    const currentLayer = TS.layers[TS.activeLayer];
    const w = currentLayer.canvas.width / DPR;
    const h = currentLayer.canvas.height / DPR;

    const newLayer = createLayer(TS.layers.length, w, h);

    // Copy the content including objects
    newLayer.ctx.drawImage(currentLayer.canvas, 0, 0);
    newLayer.objects = JSON.parse(JSON.stringify(currentLayer.objects)); // Deep copy objects

    pushHistory(newLayer);

    TS.layers.push(newLayer);
    TS.activeLayer = TS.layers.length - 1;

    renderUI();

    if (statusSpan) {
      statusSpan.textContent = `Layer duplicated`;
      setTimeout(() => (statusSpan.textContent = "Ready to draw"), 1200);
    }
  });

  function renderUI() {
    // 1. Canvas management
    TS.layers.forEach((l, i) => {
      l.canvas.style.zIndex = i;
      l.canvas.style.display = l.visible ? "block" : "none";
      l.canvas.style.transform = `translate(${l.offsetX}px, ${l.offsetY}px)`;
    });

    // 2. Update Layer List UI
    const list = document.getElementById("layerList");
    if (!list) return;

    list.innerHTML = "";
    [...TS.layers]
      .slice()
      .reverse()
      .forEach((layer, idx) => {
        const realIndex = TS.layers.length - 1 - idx;
        const item = document.createElement("div");
        item.className =
          "layer-item" + (realIndex === TS.activeLayer ? " active" : "");

        // Create thumbnail
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = 60;
        thumbCanvas.height = 40;
        const thumbCtx = thumbCanvas.getContext("2d");
        thumbCtx.fillStyle = "#ffffff";
        thumbCtx.fillRect(0, 0, 60, 40);
        thumbCtx.drawImage(layer.canvas, 0, 0, 60, 40);

        item.innerHTML = `
          <div class="layer-thumbnail"></div>
          <div class="layer-name">${layer.name}</div>
          <button class="layer-visibility" title="Toggle visibility">${
            layer.visible ? "👁️" : "🚫"
          }</button>
        `;

        // Replace the thumbnail placeholder with actual canvas
        const thumbContainer = item.querySelector(".layer-thumbnail");
        thumbContainer.appendChild(thumbCanvas);

        // Make layer active when clicked
        item.addEventListener("click", (e) => {
          if (e.target.tagName === "BUTTON") return; // ignore toggle button
          TS.activeLayer = realIndex;
          renderUI();
        });

        // Toggle visibility
        item.querySelector("button").addEventListener("click", (e) => {
          e.stopPropagation();
          layer.visible = !layer.visible;
          renderUI();
        });

        list.appendChild(item);
      });
  }

  // Initialize responsive UI on load
  window.addEventListener("load", initResponsiveUI);

  // boot
  init();
  renderUI();
})();
