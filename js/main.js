/**
 * Main Application Entry Point
 * Initializes the Behavior Tree Editor and handles UI interactions
 */

// Global editor instance
let editor = null;
let logPlayer = null;
let wsViewer = null;

// Replay state
let replayNidMap = new Map(); // nid -> drawflow node ID
let isReplayMode = false;

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

  // Setup replay panel
  setupReplayPanel();

  showMessage("编辑器已就绪");
  console.log("Application initialized successfully");
}

/**
 * Setup all UI event handlers
 */
function setupUIHandlers() {
  // Toolbar buttons for collapsing and expanding all nodes
  document.getElementById("btn-collapse-all")?.addEventListener("click", () => {
    collapseAllNodes();
    showMessage("已折叠所有子树");
  });

  document.getElementById("btn-expand-all")?.addEventListener("click", () => {
    expandAllNodes();
    showMessage("已展开所有子树");
  });
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
  div.dataset.nodeType = template.name;

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

    // Fill textareas
    document.getElementById("export-tree-json").value = treeJson;

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

  // Download tree
  downloadFile("behavior_tree.json", treeJson);

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
 * Collapse all nodes in the editor
 */
function collapseAllNodes() {
  const nodes = editor.getAllNodes();
  Object.keys(nodes).forEach((nodeId) => {
    const node = editor.getNode(nodeId);
    if (node && !node.data.collapsed) {
      editor.toggleSubtree(nodeId);
    }
  });
}

/**
 * Expand all nodes in the editor
 */
function expandAllNodes() {
  const nodes = editor.getAllNodes();
  Object.keys(nodes).forEach((nodeId) => {
    const node = editor.getNode(nodeId);
    if (node && node.data.collapsed) {
      editor.toggleSubtree(nodeId);
    }
  });
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

      editor.editor.zoom_refresh();

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

// ============================================================
// REPLAY PANEL & WEBSOCKET VIEWER
// ============================================================

/**
 * Setup replay panel and all related event handlers
 */
function setupReplayPanel() {
  // Initialize LogPlayer
  logPlayer = new LogPlayer();
  wsViewer = new WSViewer();

  // Panel toggle buttons
  document.getElementById('btn-replay-toggle')?.addEventListener('click', toggleReplayPanel);
  document.getElementById('btn-close-replay')?.addEventListener('click', toggleReplayPanel);

  // File input
  document.getElementById('replay-file-input')?.addEventListener('change', handleReplayFileLoad);
  document.getElementById('btn-load-example')?.addEventListener('click', handleLoadExample);

  // Playback controls
  document.getElementById('btn-replay-play')?.addEventListener('click', handleReplayPlayPause);
  document.getElementById('btn-replay-stop')?.addEventListener('click', handleReplayStop);
  document.getElementById('btn-replay-step-fwd')?.addEventListener('click', handleReplayStepFwd);
  document.getElementById('btn-replay-step-back')?.addEventListener('click', handleReplayStepBack);
  document.getElementById('tick-slider')?.addEventListener('input', handleTickSliderChange);
  document.getElementById('speed-select')?.addEventListener('change', handleSpeedChange);

  // WebSocket
  document.getElementById('btn-ws-connect')?.addEventListener('click', handleWSConnect);

  // LogPlayer callbacks
  logPlayer.onTickChange = (tick, events) => {
    applyTickState(tick);
  };

  logPlayer.onStateChange = (state) => {
    updateReplayUI(state);
  };

  logPlayer.onLoaded = (treeDef) => {
    if (treeDef) {
      loadTreeForReplay(treeDef);
    }
  };

  // WSViewer callbacks
  wsViewer.onEvent = (event) => {
    handleWSEvent(event);
  };

  wsViewer.onStateChange = (state) => {
    updateWSStatus(state);
  };
}

/**
 * Toggle replay panel visibility
 */
function toggleReplayPanel() {
  const panel = document.getElementById('replay-panel');
  if (panel) {
    panel.classList.toggle('collapsed');
  }
}

/**
 * Handle file load for replay
 */
function handleReplayFileLoad(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    logPlayer.load(text);
    showMessage(`日志加载成功: ${logPlayer.getTickCount()} ticks`, 'success');
  };
  reader.readAsText(file);
}

/**
 * Handle load example log
 */
async function handleLoadExample() {
  try {
    showMessage('正在加载示例日志...');
    const response = await fetch('/api/logs/bt_log.jsonl');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    logPlayer.load(text);
    showMessage(`示例日志加载成功: ${logPlayer.getTickCount()} ticks`, 'success');
  } catch (error) {
    showMessage('加载示例失败: ' + error.message, 'error');
  }
}

/**
 * Load tree definition for replay mode
 * Registers node templates dynamically and imports the tree
 */
function loadTreeForReplay(treeDef) {
  isReplayMode = true;

  // Register node types from tree that aren't in templates
  registerTreeNodeTypes(treeDef.root);

  // Import tree into editor
  editor.importBehaviorTree(treeDef);

  // Build nid -> drawflow node ID mapping
  replayNidMap.clear();
  buildNidMapFromTree(treeDef.root, replayNidMap);

  // Expand all nodes for visibility
  expandAllNodes();

  // Reset all node visual states
  resetAllNodeVisuals();

  updateHintVisibility();
  showMessage(`树已加载: ${replayNidMap.size} 个节点`, 'success');
}

/**
 * Register node types from tree definition that don't exist in templates
 */
function registerTreeNodeTypes(node) {
  if (!node) return;

  if (!nodeTemplates.hasTemplate(node.name)) {
    nodeTemplates.addTemplate({
      name: node.name,
      type: node.type !== undefined ? node.type : NodeType.ACTION,
      description: node.name,
      icon: nodeTemplates.getIconForType(node.type !== undefined ? node.type : NodeType.ACTION),
      ports: node.ports ? Object.keys(node.ports).map(k => ({ name: k, type_name: 'any', mode: 0 })) : null,
    });
  }

  if (node.children) {
    for (const child of node.children) {
      registerTreeNodeTypes(child);
    }
  }
}

/**
 * Build nid -> drawflow node ID mapping via DFS pre-order traversal
 * Drawflow assigns IDs starting from 1 in DFS order during import
 */
function buildNidMapFromTree(root, map) {
  let counter = 0;

  function dfs(node) {
    const nid = counter;
    const drawflowId = counter + 1;
    map.set(nid, drawflowId);
    counter++;

    if (node.children) {
      for (const child of node.children) {
        dfs(child);
      }
    }
  }

  dfs(root);
}

/**
 * Apply state at a specific tick - updates all node visuals
 * Uses incremental update for sequential play, full rebuild for seeking
 */
function applyTickState(tick) {
  const prevTick = logPlayer._prevAppliedTick ?? 0;
  let transitions;
  let runningNodeIds = []; // Track currently running nodes for focus

  if (tick === prevTick + 1) {
    // Sequential: apply only this tick's transitions (fast)
    transitions = logPlayer.applyTickTransitions(tick);
    // Update only changed nodes
    for (const tr of transitions) {
      const drawflowId = replayNidMap.get(tr.nid);
      if (drawflowId == null) continue;
      updateNodeReplayVisual(drawflowId, tr.statusInt);
      if (tr.statusInt === 1) runningNodeIds.push(drawflowId); // Running
    }
  } else {
    // Seeking: rebuild full state
    const states = logPlayer.getStateAtTick(tick);
    for (const [nid, status] of states) {
      const drawflowId = replayNidMap.get(nid);
      if (drawflowId == null) continue;
      updateNodeReplayVisual(drawflowId, status);
      if (status === 1) runningNodeIds.push(drawflowId);
    }
    transitions = [];
  }

  logPlayer._prevAppliedTick = tick;

  // Auto-focus on the deepest running node (last in DFS = deepest leaf)
  if (runningNodeIds.length > 0) {
    const focusTarget = runningNodeIds[runningNodeIds.length - 1];
    smoothFocusNode(focusTarget);
  }

  // Update info display
  const result = logPlayer.getTickResult(tick);
  const infoEl = document.getElementById('replay-tick-info');
  if (infoEl) {
    let resultHtml = '';
    if (result) {
      const cls = `result-${result.toLowerCase()}`;
      resultHtml = ` | 结果: <span class="${cls}">${result}</span>`;
    }
    infoEl.innerHTML = `Tick ${tick} / ${logPlayer.maxTick}${resultHtml}`;
  }
}

/**
 * Update a single node's visual state for replay
 */
function updateNodeReplayVisual(drawflowId, status) {
  const nodeEl = document.getElementById(`node-${drawflowId}`);
  if (!nodeEl) return;

  // Remove all replay status classes
  nodeEl.classList.remove('replay-idle', 'replay-running', 'replay-success', 'replay-failure');

  // Add current status class (CSS handles all visual changes)
  switch (status) {
    case 0: nodeEl.classList.add('replay-idle'); break;
    case 1: nodeEl.classList.add('replay-running'); break;
    case 2: nodeEl.classList.add('replay-success'); break;
    case 3: nodeEl.classList.add('replay-failure'); break;
  }
}

/**
 * Flash animation on node status transition
 */
function flashNode(drawflowId, status) {
  const nodeEl = document.getElementById(`node-${drawflowId}`);
  if (!nodeEl) return;

  // Remove any existing flash classes
  nodeEl.classList.remove('replay-flash-running', 'replay-flash-success', 'replay-flash-failure');

  // Force reflow to restart animation
  void nodeEl.offsetWidth;

  // Add flash class based on status
  switch (status) {
    case 1: nodeEl.classList.add('replay-flash-running'); break;
    case 2: nodeEl.classList.add('replay-flash-success'); break;
    case 3: nodeEl.classList.add('replay-flash-failure'); break;
  }

  // Remove flash class after animation
  setTimeout(() => {
    nodeEl.classList.remove('replay-flash-running', 'replay-flash-success', 'replay-flash-failure');
  }, 500);
}

/**
 * Smoothly pan the canvas to focus on a specific node.
 * Only moves if the node is outside the visible area (with margin).
 * Uses CSS transition for smooth movement, avoids jitter.
 */
let _focusAnimFrame = null;
let _lastFocusTarget = null;

function smoothFocusNode(drawflowId) {
  // Debounce: don't focus same node repeatedly
  if (_lastFocusTarget === drawflowId) return;
  _lastFocusTarget = drawflowId;

  if (_focusAnimFrame) cancelAnimationFrame(_focusAnimFrame);
  _focusAnimFrame = requestAnimationFrame(() => {
    _focusAnimFrame = null;
    _doFocusNode(drawflowId);
  });
}

function _doFocusNode(drawflowId) {
  const container = document.getElementById('drawflow');
  if (!container || !editor || !editor.editor) return;

  const nodeData = editor.editor.drawflow?.drawflow?.Home?.data?.[drawflowId];
  if (!nodeData) return;

  const zoom = editor.editor.zoom;
  const containerRect = container.getBoundingClientRect();
  const cw = containerRect.width;
  const ch = containerRect.height;

  // Node center in canvas coords
  const nodeW = 240; // approximate
  const nodeH = 100;
  const nodeCX = nodeData.pos_x + nodeW / 2;
  const nodeCY = nodeData.pos_y + nodeH / 2;

  // Node center in screen coords
  const screenX = nodeCX * zoom + editor.editor.canvas_x;
  const screenY = nodeCY * zoom + editor.editor.canvas_y;

  // Check if node is already visible (with 20% margin)
  const marginX = cw * 0.2;
  const marginY = ch * 0.2;
  if (screenX > marginX && screenX < cw - marginX &&
      screenY > marginY && screenY < ch - marginY) {
    return; // Already in view, don't move
  }

  // Target: center the node in the viewport
  const targetCanvasX = cw / 2 - nodeCX * zoom;
  const targetCanvasY = ch / 2 - nodeCY * zoom;

  // Smooth interpolation (lerp toward target)
  const lerp = 0.35;
  const newX = editor.editor.canvas_x + (targetCanvasX - editor.editor.canvas_x) * lerp;
  const newY = editor.editor.canvas_y + (targetCanvasY - editor.editor.canvas_y) * lerp;

  editor.editor.canvas_x = newX;
  editor.editor.canvas_y = newY;
  editor.editor.zoom_refresh();
}

/**
 * Reset all node visual states to idle
 */
function resetAllNodeVisuals() {
  const nodes = editor.getAllNodes();
  Object.keys(nodes).forEach(nodeId => {
    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (nodeEl) {
      nodeEl.classList.remove('replay-idle', 'replay-running', 'replay-success', 'replay-failure');
      nodeEl.classList.remove('replay-flash-running', 'replay-flash-success', 'replay-flash-failure');
      nodeEl.classList.add('replay-idle');
    }
  });
}

/**
 * Update replay UI elements based on player state
 */
function updateReplayUI(state) {
  const playBtn = document.getElementById('btn-replay-play');
  const slider = document.getElementById('tick-slider');
  const tickLabel = document.getElementById('tick-label');

  if (playBtn) {
    playBtn.textContent = state.isPlaying ? '⏸' : '▶';
    playBtn.title = state.isPlaying ? '暂停' : '播放';
  }

  if (slider) {
    slider.max = state.maxTick;
    slider.value = state.currentTick;
  }

  if (tickLabel) {
    tickLabel.textContent = `Tick: ${state.currentTick}/${state.maxTick}`;
  }
}

// Playback control handlers
function handleReplayPlayPause() {
  if (!logPlayer.isLoaded()) {
    showMessage('请先加载日志文件', 'warning');
    return;
  }
  if (logPlayer.isPlaying) {
    logPlayer.pause();
  } else {
    logPlayer.play();
  }
}

function handleReplayStop() {
  logPlayer.stop();
  resetAllNodeVisuals();
}

function handleReplayStepFwd() {
  if (!logPlayer.isLoaded()) return;
  logPlayer.stepForward();
}

function handleReplayStepBack() {
  if (!logPlayer.isLoaded()) return;
  logPlayer.stepBackward();
}

function handleTickSliderChange(e) {
  const tick = parseInt(e.target.value);
  logPlayer.seekToTick(tick);
}

function handleSpeedChange(e) {
  const speed = parseFloat(e.target.value);
  logPlayer.setSpeed(speed);
}

// ============================================================
// WEBSOCKET VIEWER
// ============================================================

/**
 * Handle WS connect/disconnect button
 */
function handleWSConnect() {
  const urlInput = document.getElementById('ws-url');
  const btn = document.getElementById('btn-ws-connect');

  if (wsViewer.getIsConnected()) {
    wsViewer.disconnect();
    btn.textContent = '连接';
  } else {
    const url = urlInput.value.trim();
    if (!url) {
      showMessage('请输入 WebSocket URL', 'warning');
      return;
    }
    wsViewer.autoReconnect = true;
    wsViewer.connect(url);
    btn.textContent = '断开';
  }
}

/**
 * Handle incoming WebSocket events (same format as log file)
 */
function handleWSEvent(event) {
  switch (event.type) {
    case 'tree':
      // Full tree definition received - load it
      loadTreeForReplay(event.data);
      logPlayer.treeDefinition = event.data;
      logPlayer.buildNidMapping(event.data.root);
      break;

    case 'tick_begin':
      // Reset nodes to idle at start of new tick (only nodes that were success/failure)
      break;

    case 'transition':
      // Live update node status
      const drawflowId = replayNidMap.get(event.nid);
      if (drawflowId != null) {
        const status = LogPlayer.parseStatus(event.to);
        updateNodeReplayVisual(drawflowId, status);
        flashNode(drawflowId, status);
      }
      break;

    case 'tick_end':
      // Update info display
      const infoEl = document.getElementById('replay-tick-info');
      if (infoEl) {
        const cls = `result-${event.result.toLowerCase()}`;
        infoEl.innerHTML = `[Live] Tick ${event.tick} | 结果: <span class="${cls}">${event.result}</span>`;
      }
      break;
  }
}

/**
 * Update WebSocket status indicator
 */
function updateWSStatus(state) {
  const statusEl = document.getElementById('ws-status');
  const btn = document.getElementById('btn-ws-connect');

  if (statusEl) {
    if (state.isConnected) {
      statusEl.textContent = '● 已连接';
      statusEl.className = 'ws-status connected';
    } else {
      statusEl.textContent = '● 未连接';
      statusEl.className = 'ws-status disconnected';
    }
  }

  if (btn) {
    btn.textContent = state.isConnected ? '断开' : '连接';
  }

  if (state.isConnected) {
    showMessage('WebSocket 已连接', 'success');
  }
}
