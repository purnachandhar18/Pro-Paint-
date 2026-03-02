// Add to your existing tools.js file:

// New shape implementations
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
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
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

// Add new tool event listeners to your existing tools.js:
document.getElementById("textTool")?.addEventListener("click", () => {
  state.tool = "text";
  highlightActive();
  // Show text properties panel
  document
    .querySelectorAll(".tool-properties")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById("textProperties")?.classList.remove("hidden");
});

document.getElementById("gradientTool")?.addEventListener("click", () => {
  state.tool = "gradient";
  highlightActive();
});

document.getElementById("blurTool")?.addEventListener("click", () => {
  state.tool = "blur";
  highlightActive();
});

// Add brush size value display
document.getElementById("brushSize")?.addEventListener("input", (e) => {
  state.size = +e.target.value;
  const sizeValue = document.getElementById("sizeValue");
  if (sizeValue) {
    sizeValue.textContent = state.size + "px";
  }
});
