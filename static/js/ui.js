// ui.js — refined micro interactions: theme + layer list rendering
(function () {
  const themeToggle = document.getElementById("themeToggle");

  /* --------------------------------------------------
     THEME TOGGLE (🌙 / ☀️)
  -------------------------------------------------- */
  themeToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    localStorage.setItem("pp-theme", dark ? "dark" : "light");
    themeToggle.textContent = dark ? "☀️" : "🌙";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("pp-theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
      themeToggle.textContent = "☀️";
    } else {
      themeToggle.textContent = "🌙";
    }
  });

  /* --------------------------------------------------
     LAYER LIST RENDERING
  -------------------------------------------------- */
  const layerList = document.getElementById("layerList");

  function renderLayerList(layers, active) {
    if (!layerList) return;
    layerList.innerHTML = "";

    layers
      .slice()
      .reverse() // show newest layer on top
      .forEach((layer, reversedIndex) => {
        const realIndex = layers.length - 1 - reversedIndex;

        const row = document.createElement("div");
        row.className = "layer-item" + (realIndex === active ? " active" : "");
        row.dataset.index = realIndex;

        // Thumbnail
        const thumb = document.createElement("canvas");
        thumb.width = 60;
        thumb.height = 40;
        const tctx = thumb.getContext("2d");
        tctx.fillStyle = "#ffffff";
        tctx.fillRect(0, 0, thumb.width, thumb.height);
        try {
          tctx.imageSmoothingEnabled = false;
          tctx.drawImage(
            layers[realIndex].canvas,
            0,
            0,
            thumb.width,
            thumb.height
          );
        } catch (e) {}
        thumb.style.width = "40px";
        thumb.style.height = "30px";
        thumb.style.borderRadius = "4px";
        thumb.style.border = "1px solid var(--border)";

        // Name
        const name = document.createElement("div");
        name.textContent = layers[realIndex].name;
        name.style.flex = "1";
        name.style.fontSize = "0.9rem";
        name.style.userSelect = "none";

        // Visibility Toggle
        const visBtn = document.createElement("button");
        visBtn.textContent = layers[realIndex].visible ? "👁" : "🚫";
        visBtn.title = "Toggle visibility";
        visBtn.classList.add("layer-visibility");
        visBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          layers[realIndex].visible = !layers[realIndex].visible;
          visBtn.textContent = layers[realIndex].visible ? "👁" : "🚫";
          window.dispatchEvent(new CustomEvent("layerStateChange"));
        });

        // Click → activate this layer
        row.addEventListener("click", () => {
          window.ToolState.activeLayer = realIndex;
          renderLayerList(layers, realIndex);
          window.dispatchEvent(new CustomEvent("layerStateChange"));
        });

        row.appendChild(thumb);
        row.appendChild(name);
        row.appendChild(visBtn);
        layerList.appendChild(row);
      });
  }

  window.renderLayerList = renderLayerList;
})();
