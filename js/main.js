/**
 * Main Application Entry Point
 * Initializes the Behavior Tree Editor and orchestrates module startup
 */

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeApplication();
});

/**
 * Initialize the application
 */
function initializeApplication() {
  console.log("Initializing Behavior Tree Editor...");

  // Wire up App namespace references
  App.nodeTemplates = nodeTemplates;
  App.behaviorTree = behaviorTree;
  App.Constants.NodeType = NodeType;
  App.Constants.NodeStatus = NodeStatus;
  App.Constants.PortMode = PortMode;

  // Initialize editor
  App.editor = new BehaviorTreeEditor("drawflow");
  if (!App.editor.initialize()) {
    App.showMessage("Failed to initialize editor", "error");
    return;
  }

  // Initialize UI modules
  Panels.init();
  Keyboard.init();
  CanvasPanning.init();

  // Initialize replay controller
  const replayController = new ReplayController();
  replayController.init();

  App.showMessage("编辑器已就绪");
  console.log("Application initialized successfully");
}
