/**
 * App Namespace - Global state holder for the Behavior Tree Editor
 * All shared state is accessed through this single namespace.
 */
const App = {
  // Core instances (initialized in main.js)
  editor: null,
  logPlayer: null,
  wsViewer: null,

  // Replay state
  replayNidMap: new Map(),
  isReplayMode: false,

  // Constants (re-exported from nodeTemplates.js for convenience)
  Constants: {
    NodeType: null,
    NodeStatus: null,
    PortMode: null,
  },

  // References to singletons
  nodeTemplates: null,
  behaviorTree: null,

  /**
   * Show status message
   * @param {string} message - Message text
   * @param {string} type - Message type (info, error, success, warning)
   */
  showMessage(message, type = "info") {
    const statusElement = document.getElementById("status-message");
    if (statusElement) {
      statusElement.textContent = message;

      // Reset color
      statusElement.style.color = "";

      // Set color based on type
      switch (type) {
        case "error":
          statusElement.style.color = "#dc3545";
          break;
        case "success":
          statusElement.style.color = "#28a745";
          break;
        case "warning":
          statusElement.style.color = "#ffc107";
          break;
        default:
          statusElement.style.color = "#b0b0b0";
      }
    }

    console.log(`[${type.toUpperCase()}] ${message}`);
  },
};

// Keep backward compatibility: window.showMessage still works
window.showMessage = function (message, type) {
  App.showMessage(message, type);
};
