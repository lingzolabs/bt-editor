/**
 * Main Application Entry Point
 * Initializes the Behavior Tree Editor and handles UI interactions
 */

// Global editor instance
let editor = null;

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeApplication();
});

/**
 * Initialize the application
 */
function initializeApplication() {
  console.log("Initializing Behavior Tree Editor...");

  // Initialize editor
  editor = new BehaviorTreeEditor("drawflow");
  if (!editor.initialize()) {
    showMessage("Failed to initialize editor", "error");
    return;
  }

  // Setup UI event handlers
  setupUIHandlers();

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Load node templates to sidebar
  loadNodeTemplates();

  // Setup drag and drop
  setupDragAndDrop();

  // Setup hint visibility controller
  setupHintVisibility();

  // Setup canvas panning with spacebar
  setupCanvasPanning();

  showMessage("编辑器已就绪");
  console.log("Application initialized successfully");
}

/**
 * Setup all UI event handlers
 */
function setupUIHandlers() {
  // Header buttons
  document.getElementById("btn-clear")?.addEventListener("click", handleClear);
  document
    .getElementById("btn-import-nodes")
    ?.addEventListener("click", handleImportNodes);
  document
    .getElementById("btn-import-tree")
    ?.addEventListener("click", handleImportTree);
  document
    .getElementById("btn-export")
    ?.addEventListener("click", handleExport);

  // Toolbar buttons
  document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
    editor.zoomIn();
    showMessage("放大");
  });

  document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
    editor.zoomOut();
    showMessage("缩小");
  });

  document.getElementById("btn-zoom-reset")?.addEventListener("click", () => {
    editor.zoomReset();
    showMessage("重置缩放");
  });

  document.getElementById("btn-center-view")?.addEventListener("click", () => {
    editor.centerView();
    showMessage("居中视图");
  });

  document.getElementById("btn-fit-view")?.addEventListener("click", () => {
    editor.fitToView();
    showMessage("适应画布");
  });

  document
    .getElementById("btn-toggle-layout")
    ?.addEventListener("click", () => {
      const mode = editor.toggleLayoutMode();
      const modeText = mode === "horizontal" ? "左右布局" : "上下布局";
      showMessage(`切换到${modeText}`);

      // Update button icon based on mode
      const btn = document.getElementById("btn-toggle-layout");
      if (btn) {
        btn.textContent = mode === "horizontal" ? "⇄" : "⇅";
        btn.title = mode === "horizontal" ? "切换到上下布局" : "切换到左右布局";
      }
    });

  // Sidebar buttons
  document
    .getElementById("btn-add-custom-node")
    ?.addEventListener("click", handleAddCustomNode);

  // Modal handlers
  setupModalHandlers();

  // Editor event callbacks
  editor.onNodeCreated = (id) => {
    console.log("Node created:", id);
    updateHintVisibility();
  };

  editor.onNodeRemoved = (id) => {
    console.log("Node removed:", id);
    updateHintVisibility();
  };

  editor.onNodeSelected = (id) => {
    console.log("Node selected:", id);
  };
}

/**
 * Setup modal event handlers
 */
function setupModalHandlers() {
  // Custom Node Modal
  const customNodeModal = document.getElementById("custom-node-modal");
  const btnSaveNode = document.getElementById("btn-save-node");
  const btnCancelNode = document.getElementById("btn-cancel-node");

  btnSaveNode?.addEventListener("click", handleSaveCustomNode);
  btnCancelNode?.addEventListener("click", () =>
    closeModal("custom-node-modal"),
  );

  // Import Nodes Modal
  const importNodesModal = document.getElementById("import-nodes-modal");
  const btnConfirmImportNodes = document.getElementById(
    "btn-confirm-import-nodes",
  );
  const btnCancelImportNodes = document.getElementById(
    "btn-cancel-import-nodes",
  );

  btnConfirmImportNodes?.addEventListener("click", handleConfirmImportNodes);
  btnCancelImportNodes?.addEventListener("click", () =>
    closeModal("import-nodes-modal"),
  );

  // Import Tree Modal
  const importTreeModal = document.getElementById("import-tree-modal");
  const btnConfirmImportTree = document.getElementById(
    "btn-confirm-import-tree",
  );
  const btnCancelImportTree = document.getElementById("btn-cancel-import-tree");

  btnConfirmImportTree?.addEventListener("click", handleConfirmImportTree);
  btnCancelImportTree?.addEventListener("click", () =>
    closeModal("import-tree-modal"),
  );

  // Export Modal
  const exportModal = document.getElementById("export-modal");
  const btnCopyTree = document.getElementById("btn-copy-tree");
  const btnCopyNodes = document.getElementById("btn-copy-nodes");
  const btnDownloadJson = document.getElementById("btn-download-json");
  const btnCloseExport = document.getElementById("btn-close-export");

  btnCopyTree?.addEventListener("click", handleCopyTree);
  btnCopyNodes?.addEventListener("click", handleCopyNodes);
  btnDownloadJson?.addEventListener("click", handleDownloadJson);
  btnCloseExport?.addEventListener("click", () => closeModal("export-modal"));

  // Close modals when clicking close button or outside
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      if (modal) {
        modal.classList.remove("active");
      }
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + S: Export
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleExport();
    }

    // Ctrl/Cmd + C: Copy
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      editor.copySelection();
      showMessage("已复制到剪贴板");
    }

    // Ctrl/Cmd + V: Paste
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      editor.pasteSelection();
      showMessage("已粘贴");
    }

    // Delete/Backspace: Delete selected
    if (e.key === "Delete" || e.key === "Backspace") {
      const selected = editor.getSelectedNodes();
      if (selected.length > 0) {
        e.preventDefault();
        editor.deleteSelection();
        showMessage("已删除选中节点");
      }
    }

    // Escape: Clear selection
    if (e.key === "Escape") {
      editor.clearSelection();
    }
  });
}

/**
 * Load node templates to sidebar
 */
function loadNodeTemplates() {
  const compositeContainer = document.getElementById("composite-nodes");
  const actionContainer = document.getElementById("action-nodes");
  const decoratorContainer = document.getElementById("decorator-nodes");

  if (!compositeContainer || !actionContainer || !decoratorContainer) {
    console.error("Node containers not found");
    return;
  }

  // Load composite nodes
  const compositeNodes = nodeTemplates.getTemplatesByType(NodeType.COMPOSITE);
  compositeNodes.forEach((template) => {
    compositeContainer.appendChild(createNodeItem(template));
  });

  // Load action nodes
  const actionNodes = nodeTemplates.getTemplatesByType(NodeType.ACTION);
  actionNodes.forEach((template) => {
    actionContainer.appendChild(createNodeItem(template));
  });

  // Load decorator nodes
  const decoratorNodes = nodeTemplates.getTemplatesByType(NodeType.DECORATOR);
  decoratorNodes.forEach((template) => {
    decoratorContainer.appendChild(createNodeItem(template));
  });
}

/**
 * Create a node item element for sidebar
 * @param {Object} template - Node template
 * @returns {HTMLElement} Node item element
 */
function createNodeItem(template) {
  const div = document.createElement("div");
  div.className = `node-item ${nodeTemplates.getTypeClassName(template.type)}`;
  div.draggable = true;
  div.dataset.nodeType = template.id;

  const nameSpan = document.createElement("span");
  nameSpan.className = "node-item-name";
  nameSpan.textContent = `${template.icon} ${template.name}`;

  div.appendChild(nameSpan);

  // Add ports badge if exists
  if (template.ports && template.ports.length > 0) {
    const badge = document.createElement("span");
    badge.className = "node-item-badge";
    badge.textContent = `${template.ports.length}`;
    badge.title = "Has ports";
    div.appendChild(badge);
  }

  return div;
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
  const nodeItems = document.querySelectorAll(".node-item");

  nodeItems.forEach((item) => {
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragend", handleDragEnd);
  });

  const drawflowContainer = document.getElementById("drawflow");
  if (drawflowContainer) {
    drawflowContainer.addEventListener("dragover", handleDragOver);
    drawflowContainer.addEventListener("drop", handleDrop);
  }
}

let draggedNodeType = null;

function handleDragStart(e) {
  draggedNodeType = e.target.dataset.nodeType;
  e.dataTransfer.effectAllowed = "copy";
  e.target.style.opacity = "0.5";
}

function handleDragEnd(e) {
  e.target.style.opacity = "1";
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
}

function handleDrop(e) {
  e.preventDefault();

  if (!draggedNodeType) return;

  const drawflowContainer = document.getElementById("drawflow");
  const rect = drawflowContainer.getBoundingClientRect();

  // Calculate position relative to canvas accounting for zoom and pan
  const posX =
    (e.clientX - rect.left - editor.editor.canvas_x) / editor.editor.zoom;
  const posY =
    (e.clientY - rect.top - editor.editor.canvas_y) / editor.editor.zoom;

  // Add node
  const nodeId = editor.addNode(draggedNodeType, posX, posY);

  if (nodeId) {
    showMessage(`已添加节点: ${draggedNodeType}`);
  }

  draggedNodeType = null;
  updateHintVisibility();
}

/**
 * Setup hint visibility controller
 */
function setupHintVisibility() {
  updateHintVisibility();
}

/**
 * Update hint visibility based on node count
 */
function updateHintVisibility() {
  const drawflowContainer = document.getElementById("drawflow");
  if (!drawflowContainer) return;

  const nodeCount = editor ? editor.getNodeCount() : 0;

  if (nodeCount > 0) {
    drawflowContainer.classList.add("has-nodes");
  } else {
    drawflowContainer.classList.remove("has-nodes");
  }
}

/**
 * Handle clear button
 */
function handleClear() {
  if (editor.getNodeCount() === 0) {
    showMessage("画布已经是空的");
    return;
  }

  if (confirm("确定要清空画布吗？此操作无法撤销。")) {
    editor.clear();
    showMessage("画布已清空");
    updateHintVisibility();
  }
}

/**
 * Handle import nodes button
 */
function handleImportNodes() {
  openModal("import-nodes-modal");
  document.getElementById("nodes-json").value = "";
}

/**
 * Handle confirm import nodes
 */
function handleConfirmImportNodes() {
  const jsonText = document.getElementById("nodes-json").value.trim();

  if (!jsonText) {
    showMessage("请输入JSON数据", "error");
    return;
  }

  try {
    const nodesData = JSON.parse(jsonText);
    nodeTemplates.importFromJSON(nodesData);

    // Reload node templates in sidebar
    document.getElementById("composite-nodes").innerHTML = "";
    document.getElementById("action-nodes").innerHTML = "";
    document.getElementById("decorator-nodes").innerHTML = "";
    loadNodeTemplates();
    setupDragAndDrop();

    closeModal("import-nodes-modal");
    showMessage("节点定义导入成功");
  } catch (error) {
    console.error("Import error:", error);
    showMessage("导入失败: " + error.message, "error");
  }
}

/**
 * Handle import tree button
 */
function handleImportTree() {
  openModal("import-tree-modal");
  document.getElementById("tree-json").value = "";
}

/**
 * Handle confirm import tree
 */
function handleConfirmImportTree() {
  const jsonText = document.getElementById("tree-json").value.trim();

  if (!jsonText) {
    showMessage("请输入JSON数据", "error");
    return;
  }

  try {
    const treeData = JSON.parse(jsonText);
    editor.importBehaviorTree(treeData);

    closeModal("import-tree-modal");
    showMessage("行为树导入成功");
    updateHintVisibility();
  } catch (error) {
    console.error("Import error:", error);
    showMessage("导入失败: " + error.message, "error");
  }
}

/**
 * Handle export button
 */
function handleExport() {
  if (editor.getNodeCount() === 0) {
    showMessage("画布为空，无法导出", "error");
    return;
  }

  try {
    // Export behavior tree
    const treeData = editor.exportBehaviorTree();
    const treeJson = JSON.stringify(treeData, null, 2);

    // Export node definitions
    const nodesData = nodeTemplates.exportToJSON();
    const nodesJson = JSON.stringify(nodesData, null, 2);

    // Fill textareas
    document.getElementById("export-tree-json").value = treeJson;
    document.getElementById("export-nodes-json").value = nodesJson;

    openModal("export-modal");
    showMessage("导出成功");
  } catch (error) {
    console.error("Export error:", error);
    showMessage("导出失败: " + error.message, "error");
  }
}

/**
 * Handle copy tree JSON
 */
function handleCopyTree() {
  const textarea = document.getElementById("export-tree-json");
  copyToClipboard(textarea.value);
  showMessage("树结构已复制到剪贴板");
}

/**
 * Handle copy nodes JSON
 */
function handleCopyNodes() {
  const textarea = document.getElementById("export-nodes-json");
  copyToClipboard(textarea.value);
  showMessage("节点定义已复制到剪贴板");
}

/**
 * Handle download JSON
 */
function handleDownloadJson() {
  const treeJson = document.getElementById("export-tree-json").value;
  const nodesJson = document.getElementById("export-nodes-json").value;

  // Download tree
  downloadFile("behavior_tree.json", treeJson);

  // Download nodes
  downloadFile("behavior_nodes.json", nodesJson);

  showMessage("文件已下载");
}

/**
 * Handle add custom node button
 */
function handleAddCustomNode() {
  openModal("custom-node-modal");

  // Clear form
  document.getElementById("node-name").value = "";
  document.getElementById("node-type").value = "1";
  document.getElementById("node-ports").value = "";
}

/**
 * Handle save custom node
 */
function handleSaveCustomNode() {
  const name = document.getElementById("node-name").value.trim();
  const type = parseInt(document.getElementById("node-type").value);
  const portsText = document.getElementById("node-ports").value.trim();

  if (!name) {
    showMessage("请输入节点名称", "error");
    return;
  }

  // Parse ports if provided
  let ports = null;
  if (portsText) {
    try {
      ports = JSON.parse(portsText);
    } catch (error) {
      showMessage("端口配置JSON格式错误", "error");
      return;
    }
  }

  // Add template
  nodeTemplates.addTemplate({
    id: name,
    name: name,
    type: type,
    description: `自定义节点: ${name}`,
    icon: nodeTemplates.getIconForType(type),
    ports: ports,
  });

  // Reload sidebar
  document.getElementById("composite-nodes").innerHTML = "";
  document.getElementById("action-nodes").innerHTML = "";
  document.getElementById("decorator-nodes").innerHTML = "";
  loadNodeTemplates();
  setupDragAndDrop();

  closeModal("custom-node-modal");
  showMessage(`节点 "${name}" 已添加`);
}

/**
 * Open modal
 * @param {string} modalId - Modal element ID
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
  }
}

/**
 * Close modal
 * @param {string} modalId - Modal element ID
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

/**
 * Show status message
 * @param {string} message - Message text
 * @param {string} type - Message type (info, error, success)
 */
window.showMessage = function showMessage(message, type = "info") {
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
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

/**
 * Download text as file
 * @param {string} filename - File name
 * @param {string} content - File content
 */
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Setup canvas panning with spacebar + left mouse button
 */
let isSpacePressed = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let canvasStartX = 0;
let canvasStartY = 0;

function setupCanvasPanning() {
  const drawflowContainer = document.getElementById("drawflow");
  if (!drawflowContainer) return;

  // 监听空格键
  document.addEventListener("keydown", (e) => {
    if (
      e.code === "Space" &&
      !isSpacePressed &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      isSpacePressed = true;
      drawflowContainer.style.cursor = "grab";
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      isSpacePressed = false;
      isPanning = false;
      drawflowContainer.style.cursor = "";
    }
  });

  // 监听鼠标事件
  drawflowContainer.addEventListener("mousedown", (e) => {
    if (isSpacePressed && e.button === 0) {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      canvasStartX = editor.editor.canvas_x;
      canvasStartY = editor.editor.canvas_y;
      drawflowContainer.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (isPanning) {
      const deltaX = e.clientX - panStartX;
      const deltaY = e.clientY - panStartY;

      editor.editor.canvas_x = canvasStartX + deltaX;
      editor.editor.canvas_y = canvasStartY + deltaY;

      editor.editor.precanvas.style.transform = `translate(${editor.editor.canvas_x}px, ${editor.editor.canvas_y}px) scale(${editor.editor.zoom})`;

      e.preventDefault();
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (isPanning) {
      isPanning = false;
      drawflowContainer.style.cursor = isSpacePressed ? "grab" : "";
    }
  });

  // 失去焦点时重置
  window.addEventListener("blur", () => {
    isSpacePressed = false;
    isPanning = false;
    drawflowContainer.style.cursor = "";
  });
}

/**
 * Track mouse position
 */
document.addEventListener("mousemove", (e) => {
  const cursorPos = document.getElementById("cursor-position");
  if (cursorPos) {
    cursorPos.textContent = `X: ${e.clientX}, Y: ${e.clientY}`;
  }
});
