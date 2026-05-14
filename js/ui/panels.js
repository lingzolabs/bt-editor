/**
 * Panels Module - UI panel management
 * Handles header/toolbar events, modals, sidebar loading, drag-and-drop, import/export
 */
const Panels = {
  draggedNodeType: null,

  /**
   * Initialize all panel handlers
   */
  init() {
    this.setupUIHandlers();
    this.setupModalHandlers();
    this.loadNodeTemplates();
    this.setupDragAndDrop();
    this.setupHintVisibility();
    this.setupToolbarMore();
  },

  /**
   * Setup toolbar "more" dropdown for small screens
   */
  setupToolbarMore() {
    const moreBtn = document.getElementById("btn-toolbar-more");
    const dropdown = document.getElementById("toolbar-more-dropdown");
    if (!moreBtn || !dropdown) return;

    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      dropdown.classList.remove("active");
    });

    // Duplicate collapse/expand for overflow menu
    document.getElementById("btn-collapse-all-2")?.addEventListener("click", () => {
      this.collapseAllNodes();
      App.showMessage("已折叠所有子树");
      dropdown.classList.remove("active");
    });

    document.getElementById("btn-expand-all-2")?.addEventListener("click", () => {
      this.expandAllNodes();
      App.showMessage("已展开所有子树");
      dropdown.classList.remove("active");
    });
  },

  /**
   * Setup all UI event handlers
   */
  setupUIHandlers() {
    // Toolbar buttons for collapsing and expanding all nodes
    document.getElementById("btn-collapse-all")?.addEventListener("click", () => {
      this.collapseAllNodes();
      App.showMessage("已折叠所有子树");
    });

    document.getElementById("btn-expand-all")?.addEventListener("click", () => {
      this.expandAllNodes();
      App.showMessage("已展开所有子树");
    });

    // Header buttons
    document.getElementById("btn-clear")?.addEventListener("click", () => this.handleClear());
    document.getElementById("btn-import-nodes")?.addEventListener("click", () => this.handleImportNodes());
    document.getElementById("btn-import-tree")?.addEventListener("click", () => this.handleImportTree());
    document.getElementById("btn-export")?.addEventListener("click", () => this.handleExport());

    // Toolbar buttons
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
      App.editor.zoomIn();
      App.showMessage("放大");
    });

    document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
      App.editor.zoomOut();
      App.showMessage("缩小");
    });

    document.getElementById("btn-zoom-reset")?.addEventListener("click", () => {
      App.editor.zoomReset();
      App.showMessage("重置缩放");
    });

    document.getElementById("btn-center-view")?.addEventListener("click", () => {
      App.editor.centerView();
      App.showMessage("居中视图");
    });

    document.getElementById("btn-fit-view")?.addEventListener("click", () => {
      App.editor.fitToView();
      App.showMessage("适应画布");
    });

    document.getElementById("btn-toggle-layout")?.addEventListener("click", () => {
      const mode = App.editor.toggleLayoutMode();
      const modeText = mode === "horizontal" ? "左右布局" : "上下布局";
      App.showMessage(`切换到${modeText}`);

      const btn = document.getElementById("btn-toggle-layout");
      if (btn) {
        btn.textContent = mode === "horizontal" ? "⇄" : "⇅";
        btn.title = mode === "horizontal" ? "切换到上下布局" : "切换到左右布局";
      }
    });

    // Sidebar buttons
    document.getElementById("btn-add-custom-node")?.addEventListener("click", () => this.handleAddCustomNode());

    // Sidebar toggle
    document.getElementById("btn-sidebar-toggle")?.addEventListener("click", () => this.toggleSidebar());

    // Editor event callbacks
    App.editor.onNodeCreated = (id) => {
      console.log("Node created:", id);
      this.updateHintVisibility();
    };

    App.editor.onNodeRemoved = (id) => {
      console.log("Node removed:", id);
      this.updateHintVisibility();
    };

    App.editor.onNodeSelected = (id) => {
      console.log("Node selected:", id);
    };

    // Mouse position tracking
    document.addEventListener("mousemove", (e) => {
      const cursorPos = document.getElementById("cursor-position");
      if (cursorPos) {
        cursorPos.textContent = `X: ${e.clientX}, Y: ${e.clientY}`;
      }
    });
  },

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      sidebar.classList.toggle("collapsed");
    }
  },

  /**
   * Setup modal event handlers
   */
  setupModalHandlers() {
    // Custom Node Modal
    document.getElementById("btn-save-node")?.addEventListener("click", () => this.handleSaveCustomNode());
    document.getElementById("btn-cancel-node")?.addEventListener("click", () => this.closeModal("custom-node-modal"));

    // Import Nodes Modal
    document.getElementById("btn-confirm-import-nodes")?.addEventListener("click", () => this.handleConfirmImportNodes());
    document.getElementById("btn-cancel-import-nodes")?.addEventListener("click", () => this.closeModal("import-nodes-modal"));

    // Import Tree Modal
    document.getElementById("btn-confirm-import-tree")?.addEventListener("click", () => this.handleConfirmImportTree());
    document.getElementById("btn-cancel-import-tree")?.addEventListener("click", () => this.closeModal("import-tree-modal"));

    // Export Modal
    document.getElementById("btn-copy-tree")?.addEventListener("click", () => this.handleCopyTree());
    document.getElementById("btn-copy-nodes")?.addEventListener("click", () => this.handleCopyNodes());
    document.getElementById("btn-download-json")?.addEventListener("click", () => this.handleDownloadJson());
    document.getElementById("btn-close-export")?.addEventListener("click", () => this.closeModal("export-modal"));

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
  },

  /**
   * Load node templates to sidebar
   */
  loadNodeTemplates() {
    const compositeContainer = document.getElementById("composite-nodes");
    const actionContainer = document.getElementById("action-nodes");
    const decoratorContainer = document.getElementById("decorator-nodes");

    if (!compositeContainer || !actionContainer || !decoratorContainer) {
      console.error("Node containers not found");
      return;
    }

    // Load composite nodes
    const compositeNodes = App.nodeTemplates.getTemplatesByType(NodeType.COMPOSITE);
    compositeNodes.forEach((template) => {
      compositeContainer.appendChild(this.createNodeItem(template));
    });

    // Load action nodes
    const actionNodes = App.nodeTemplates.getTemplatesByType(NodeType.ACTION);
    actionNodes.forEach((template) => {
      actionContainer.appendChild(this.createNodeItem(template));
    });

    // Load decorator nodes
    const decoratorNodes = App.nodeTemplates.getTemplatesByType(NodeType.DECORATOR);
    decoratorNodes.forEach((template) => {
      decoratorContainer.appendChild(this.createNodeItem(template));
    });
  },

  /**
   * Create a node item element for sidebar
   */
  createNodeItem(template) {
    const div = document.createElement("div");
    div.className = `node-item ${App.nodeTemplates.getTypeClassName(template.type)}`;
    div.draggable = true;
    div.dataset.nodeType = template.name;

    const nameSpan = document.createElement("span");
    nameSpan.className = "node-item-name";
    nameSpan.textContent = `${template.icon} ${template.name}`;

    div.appendChild(nameSpan);

    if (template.ports && template.ports.length > 0) {
      const badge = document.createElement("span");
      badge.className = "node-item-badge";
      badge.textContent = `${template.ports.length}`;
      badge.title = "Has ports";
      div.appendChild(badge);
    }

    return div;
  },

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    const nodeItems = document.querySelectorAll(".node-item");

    nodeItems.forEach((item) => {
      item.addEventListener("dragstart", (e) => this.handleDragStart(e));
      item.addEventListener("dragend", (e) => this.handleDragEnd(e));
    });

    const drawflowContainer = document.getElementById("drawflow");
    if (drawflowContainer) {
      drawflowContainer.addEventListener("dragover", (e) => this.handleDragOver(e));
      drawflowContainer.addEventListener("drop", (e) => this.handleDrop(e));
    }
  },

  handleDragStart(e) {
    this.draggedNodeType = e.target.dataset.nodeType;
    e.dataTransfer.effectAllowed = "copy";
    e.target.style.opacity = "0.5";
  },

  handleDragEnd(e) {
    e.target.style.opacity = "1";
  },

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  },

  handleDrop(e) {
    e.preventDefault();

    if (!this.draggedNodeType) return;

    const drawflowContainer = document.getElementById("drawflow");
    const rect = drawflowContainer.getBoundingClientRect();

    const posX = (e.clientX - rect.left - App.editor.editor.canvas_x) / App.editor.editor.zoom;
    const posY = (e.clientY - rect.top - App.editor.editor.canvas_y) / App.editor.editor.zoom;

    const nodeId = App.editor.addNode(this.draggedNodeType, posX, posY);

    if (nodeId) {
      App.showMessage(`已添加节点: ${this.draggedNodeType}`);
    }

    this.draggedNodeType = null;
    this.updateHintVisibility();
  },

  /**
   * Setup hint visibility controller
   */
  setupHintVisibility() {
    this.updateHintVisibility();
  },

  /**
   * Update hint visibility based on node count
   */
  updateHintVisibility() {
    const drawflowContainer = document.getElementById("drawflow");
    if (!drawflowContainer) return;

    const nodeCount = App.editor ? App.editor.getNodeCount() : 0;

    if (nodeCount > 0) {
      drawflowContainer.classList.add("has-nodes");
    } else {
      drawflowContainer.classList.remove("has-nodes");
    }

    // Update status bar node/connection count
    this.updateStatusBarStats();
  },

  /**
   * Update status bar with node and connection count
   */
  updateStatusBarStats() {
    const statsEl = document.getElementById("status-stats");
    if (!statsEl || !App.editor) return;

    const nodeCount = App.editor.getNodeCount();
    const nodes = App.editor.getAllNodes();
    let connCount = 0;
    Object.values(nodes).forEach((node) => {
      if (node.outputs) {
        Object.values(node.outputs).forEach((output) => {
          if (output.connections) {
            connCount += output.connections.length;
          }
        });
      }
    });

    statsEl.textContent = `节点: ${nodeCount} | 连接: ${connCount}`;
  },

  /**
   * Handle clear button
   */
  handleClear() {
    if (App.editor.getNodeCount() === 0) {
      App.showMessage("画布已经是空的");
      return;
    }

    if (confirm("确定要清空画布吗？此操作无法撤销。")) {
      App.editor.clear();
      App.showMessage("画布已清空");
      this.updateHintVisibility();
    }
  },

  /**
   * Handle import nodes button
   */
  handleImportNodes() {
    this.openModal("import-nodes-modal");
    document.getElementById("nodes-json").value = "";
  },

  /**
   * Handle confirm import nodes
   */
  handleConfirmImportNodes() {
    const jsonText = document.getElementById("nodes-json").value.trim();

    if (!jsonText) {
      App.showMessage("请输入JSON数据", "error");
      return;
    }

    try {
      const nodesData = JSON.parse(jsonText);
      App.nodeTemplates.importFromJSON(nodesData);

      // Reload node templates in sidebar
      document.getElementById("composite-nodes").innerHTML = "";
      document.getElementById("action-nodes").innerHTML = "";
      document.getElementById("decorator-nodes").innerHTML = "";
      this.loadNodeTemplates();
      this.setupDragAndDrop();

      this.closeModal("import-nodes-modal");
      App.showMessage("节点定义导入成功");
    } catch (error) {
      console.error("Import error:", error);
      App.showMessage("导入失败: " + error.message, "error");
    }
  },

  /**
   * Handle import tree button
   */
  handleImportTree() {
    this.openModal("import-tree-modal");
    document.getElementById("tree-json").value = "";
  },

  /**
   * Handle confirm import tree
   */
  handleConfirmImportTree() {
    const jsonText = document.getElementById("tree-json").value.trim();

    if (!jsonText) {
      App.showMessage("请输入JSON数据", "error");
      return;
    }

    try {
      const treeData = JSON.parse(jsonText);
      App.editor.importBehaviorTree(treeData);

      this.closeModal("import-tree-modal");
      App.showMessage("行为树导入成功");
      this.updateHintVisibility();
    } catch (error) {
      console.error("Import error:", error);
      App.showMessage("导入失败: " + error.message, "error");
    }
  },

  /**
   * Handle export button
   */
  handleExport() {
    if (App.editor.getNodeCount() === 0) {
      App.showMessage("画布为空，无法导出", "error");
      return;
    }

    try {
      const treeData = App.editor.exportBehaviorTree();
      const treeJson = JSON.stringify(treeData, null, 2);

      document.getElementById("export-tree-json").value = treeJson;

      this.openModal("export-modal");
      App.showMessage("导出成功");
    } catch (error) {
      console.error("Export error:", error);
      App.showMessage("导出失败: " + error.message, "error");
    }
  },

  /**
   * Handle copy tree JSON
   */
  handleCopyTree() {
    const textarea = document.getElementById("export-tree-json");
    this.copyToClipboard(textarea.value);
    App.showMessage("树结构已复制到剪贴板");
  },

  /**
   * Handle copy nodes JSON
   */
  handleCopyNodes() {
    const textarea = document.getElementById("export-nodes-json");
    if (textarea) {
      this.copyToClipboard(textarea.value);
      App.showMessage("节点定义已复制到剪贴板");
    }
  },

  /**
   * Handle download JSON
   */
  handleDownloadJson() {
    const treeJson = document.getElementById("export-tree-json").value;
    this.downloadFile("behavior_tree.json", treeJson);
    App.showMessage("文件已下载");
  },

  /**
   * Handle add custom node button
   */
  handleAddCustomNode() {
    this.openModal("custom-node-modal");
    document.getElementById("node-name").value = "";
    document.getElementById("node-type").value = "1";
    document.getElementById("node-ports").value = "";
  },

  /**
   * Handle save custom node
   */
  handleSaveCustomNode() {
    const name = document.getElementById("node-name").value.trim();
    const type = parseInt(document.getElementById("node-type").value);
    const portsText = document.getElementById("node-ports").value.trim();

    if (!name) {
      App.showMessage("请输入节点名称", "error");
      return;
    }

    let ports = null;
    if (portsText) {
      try {
        ports = JSON.parse(portsText);
      } catch (error) {
        App.showMessage("端口配置JSON格式错误", "error");
        return;
      }
    }

    App.nodeTemplates.addTemplate({
      name: name,
      type: type,
      description: `自定义节点: ${name}`,
      icon: App.nodeTemplates.getIconForType(type),
      ports: ports,
    });

    // Reload sidebar
    document.getElementById("composite-nodes").innerHTML = "";
    document.getElementById("action-nodes").innerHTML = "";
    document.getElementById("decorator-nodes").innerHTML = "";
    this.loadNodeTemplates();
    this.setupDragAndDrop();

    this.closeModal("custom-node-modal");
    App.showMessage(`节点 "${name}" 已添加`);
  },

  /**
   * Open modal
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
    }
  },

  /**
   * Close modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
    }
  },

  /**
   * Collapse all nodes in the editor
   */
  collapseAllNodes() {
    const nodes = App.editor.getAllNodes();
    Object.keys(nodes).forEach((nodeId) => {
      const node = App.editor.getNode(nodeId);
      if (node && !node.data.collapsed) {
        App.editor.toggleSubtree(nodeId);
      }
    });
  },

  /**
   * Expand all nodes in the editor
   */
  expandAllNodes() {
    const nodes = App.editor.getAllNodes();
    Object.keys(nodes).forEach((nodeId) => {
      const node = App.editor.getNode(nodeId);
      if (node && node.data.collapsed) {
        App.editor.toggleSubtree(nodeId);
      }
    });
  },

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  },

  /**
   * Download text as file
   */
  downloadFile(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
