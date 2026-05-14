/**
 * Canvas Panning Module
 * Handles spacebar + left mouse button canvas panning
 */
const CanvasPanning = {
  isSpacePressed: false,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  canvasStartX: 0,
  canvasStartY: 0,

  /**
   * Initialize canvas panning with spacebar + left mouse button
   */
  init() {
    const drawflowContainer = document.getElementById("drawflow");
    if (!drawflowContainer) return;

    // Listen for spacebar
    document.addEventListener("keydown", (e) => {
      if (
        e.code === "Space" &&
        !this.isSpacePressed &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        this.isSpacePressed = true;
        drawflowContainer.style.cursor = "grab";
        e.preventDefault();
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this.isSpacePressed = false;
        this.isPanning = false;
        drawflowContainer.style.cursor = "";
      }
    });

    // Listen for mouse events
    drawflowContainer.addEventListener("mousedown", (e) => {
      if (this.isSpacePressed && e.button === 0) {
        this.isPanning = true;
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;
        this.canvasStartX = App.editor.editor.canvas_x;
        this.canvasStartY = App.editor.editor.canvas_y;
        drawflowContainer.style.cursor = "grabbing";
        e.preventDefault();
        e.stopPropagation();
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isPanning) {
        const deltaX = e.clientX - this.panStartX;
        const deltaY = e.clientY - this.panStartY;

        App.editor.editor.canvas_x = this.canvasStartX + deltaX;
        App.editor.editor.canvas_y = this.canvasStartY + deltaY;

        App.editor.editor.zoom_refresh();

        e.preventDefault();
      }
    });

    document.addEventListener("mouseup", (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        drawflowContainer.style.cursor = this.isSpacePressed ? "grab" : "";
      }
    });

    // Reset on blur
    window.addEventListener("blur", () => {
      this.isSpacePressed = false;
      this.isPanning = false;
      drawflowContainer.style.cursor = "";
    });
  },
};
