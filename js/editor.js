/**
 * Behavior Tree Editor Core
 * Handles Drawflow editor initialization and interactions
 */

class BehaviorTreeEditor {
  constructor(containerId) {
    this.containerId = containerId;
    this.editor = null;
    this.nodeIdCounter = 1;
    this.nodeTemplates = nodeTemplates;
    this.behaviorTree = behaviorTree;
    this.selectedNodes = new Set();
    this.clipboard = null;
    this.layoutMode = "horizontal"; // 'horizontal' or 'vertical'

    // Event handlers
    this.onNodeCreated = null;
    this.onNodeRemoved = null;
    this.onNodeSelected = null;
    this.onConnectionCreated = null;
    this.onConnectionRemoved = null;
    this.onZoomChange = null;
  }

  /**
   * Initialize the editor
   */
  initialize() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container ${this.containerId} not found`);
      return false;
    }

    // Initialize Drawflow
    this.editor = new Drawflow(container);

    // Drawflow 配置
    this.editor.reroute = true;
    this.editor.reroute_fix_curvature = true;
    this.editor.force_first_input = false;
    this.editor.useuuid = false;

    // 启用画布拖拽 - 确保这些设置正确
    this.editor.editor_mode = "edit"; // 编辑模式
    this.editor.zoom_value = 1;
    this.editor.zoom_last_value = 1;

    this.editor.start();

    // Add default module
    this.editor.addModule("Home");
    this.editor.changeModule("Home");

    // Setup event listeners
    this.setupEventListeners();

    // Setup custom zoom handling to fix zoom issues
    this.setupCustomZoomHandling();

    // Apply default layout mode
    this.applyLayoutMode();

    console.log("Behavior Tree Editor initialized");
    return true;
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Node events
    this.editor.on("nodeCreated", (id) => {
      console.log("Node created:", id);
      if (this.onNodeCreated) {
        this.onNodeCreated(id);
      }
      this.updateNodeCount();
    });

    this.editor.on("nodeRemoved", (id) => {
      console.log("Node removed:", id);
      if (this.onNodeRemoved) {
        this.onNodeRemoved(id);
      }
      this.updateNodeCount();
    });

    this.editor.on("nodeSelected", (id) => {
      console.log("Node selected:", id);
      if (this.onNodeSelected) {
        this.onNodeSelected(id);
      }
    });

    // Connection events
    this.editor.on("connectionCreated", (connection) => {
      console.log("Connection created:", connection);

      // 行为树规则：每个节点的输入端口只能有一个连接
      // 延迟验证，因为连接刚创建时已经在 connections 数组中
      setTimeout(() => {
        if (!this.validateSingleInput(connection)) {
          // 如果输入端已有连接，移除新创建的连接
          console.warn("Input can only have one connection in behavior tree");
          this.editor.removeSingleConnection(
            connection.output_id,
            connection.input_id,
            connection.output_class,
            connection.input_class,
          );
          this.showConnectionError();
          return;
        }

        if (this.onConnectionCreated) {
          this.onConnectionCreated(connection);
        }
      }, 0);
    });

    this.editor.on("connectionRemoved", (connection) => {
      console.log("Connection removed:", connection);
      if (this.onConnectionRemoved) {
        this.onConnectionRemoved(connection);
      }
    });

    // Click on canvas
    this.editor.on("click", (e) => {
      // Clear selection when clicking on canvas
      if (e.target.classList.contains("drawflow")) {
        this.clearSelection();
      }
    });

    // Context menu
    this.editor.on("contextmenu", (e) => {
      e.preventDefault();
      // Will be handled by main.js
    });
  }

  /**
   * Setup custom zoom handling to prevent nodes from disappearing
   */
  setupCustomZoomHandling() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const precanvas = this.editor.precanvas;
    if (!precanvas) return;

    // Override wheel event for better zoom control
    precanvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get mouse position relative to container
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate position in canvas coordinates (before zoom)
        const canvasX = (mouseX - this.editor.canvas_x) / this.editor.zoom;
        const canvasY = (mouseY - this.editor.canvas_y) / this.editor.zoom;

        // Calculate new zoom with smoother steps (multiplicative is better than additive)
        const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
        const oldZoom = this.editor.zoom;
        let newZoom = oldZoom * zoomFactor;

        // Clamp zoom to reasonable range
        newZoom = Math.max(0.1, Math.min(newZoom, 2));

        // Round to avoid floating point accumulation errors
        newZoom = Math.round(newZoom * 1000) / 1000;

        if (newZoom === oldZoom) return;

        // Calculate new canvas position to keep mouse point stable
        const newCanvasX = mouseX - canvasX * newZoom;
        const newCanvasY = mouseY - canvasY * newZoom;

        // Apply new zoom and position
        this.editor.zoom = newZoom;
        this.editor.zoom_last_value = newZoom;
        this.editor.canvas_x = newCanvasX;
        this.editor.canvas_y = newCanvasY;

        // Update transform
        this.editor.precanvas.style.transform = `translate(${newCanvasX}px, ${newCanvasY}px) scale(${newZoom})`;

        // Log for debugging
        console.log(
          `Zoom: ${newZoom.toFixed(3)}, Canvas: (${Math.round(newCanvasX)}, ${Math.round(newCanvasY)})`,
        );

        // Dispatch zoom event
        this.editor.dispatch("zoom", newZoom);
      },
      { passive: false },
    );
  }

  /**
   * Get all nodes in current module
   * Validate that input can only have one connection
   * @param {Object} connection - Connection object
   * @returns {boolean} True if valid
   */
  validateSingleInput(connection) {
    const inputNode = this.editor.getNodeFromId(connection.input_id);
    if (!inputNode) return true;

    // 检查输入端口的现有连接
    const inputKey = connection.input_class;
    const input = inputNode.inputs[inputKey];

    if (!input) return true;

    // 如果已经有超过1个连接，返回 false
    // 因为当前连接已经创建，所以检查是否 > 1
    if (input.connections && input.connections.length > 1) {
      return false;
    }

    return true;
  }

  /**
   * Show connection error message
   */
  showConnectionError() {
    // 触发全局消息显示
    if (window.showMessage) {
      window.showMessage("行为树节点的输入端口只能有一个连接", "error");
    }
  }

  /**
   * Add a node to the canvas
   * @param {string} nodeType - Node type from template
   * @param {number} posX - X position
   * @param {number} posY - Y position
   * @param {Object} additionalData - Additional node data
   * @returns {number} Node ID
   */
  addNode(nodeType, posX, posY, additionalData = {}) {
    const template = this.nodeTemplates.getTemplate(nodeType);

    if (!template) {
      console.error(`Template ${nodeType} not found`);
      return null;
    }

    // Prepare node data
    const nodeData = {
      nodeType: nodeType,
      status: additionalData.status || NodeStatus.IDLE,
      ports: additionalData.ports || {},
    };

    // Generate HTML content
    const html = this.generateNodeHTML(template, nodeData);

    // Determine number of inputs and outputs based on node type
    // 行为树规则：每个节点只能有一个父节点（一个输入）
    let inputs = 1;
    let outputs = 1;

    // Root composite nodes might not need input
    if (template.type === NodeType.COMPOSITE && this.getNodeCount() === 0) {
      inputs = 0;
    }

    // Action nodes don't have outputs (leaf nodes)
    if (template.type === NodeType.ACTION) {
      outputs = 0;
    }

    // Add node to editor
    const nodeId = this.editor.addNode(
      nodeType,
      inputs,
      outputs,
      posX,
      posY,
      `node-${this.nodeTemplates.getTypeClassName(template.type)}`,
      nodeData,
      html,
    );

    this.nodeIdCounter = Math.max(this.nodeIdCounter, nodeId + 1);

    // 添加节点后立即设置拖拽优化
    this.optimizeNodeDragging(nodeId);

    // 设置端口值输入事件监听
    this.setupPortInputListeners(nodeId);

    return nodeId;
  }

  /**
   * Setup port input listeners for a node
   * @param {number} nodeId - Node ID
   */
  setupPortInputListeners(nodeId) {
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (!nodeElement) return;

    const inputs = nodeElement.querySelectorAll(".port-value-input");
    inputs.forEach((input) => {
      // 使用 input 事件实时保存（每次输入都保存）
      const updatePortValue = (e) => {
        const portName = e.target.dataset.portName;
        const value = e.target.value;

        // 更新节点数据
        const node = this.getNode(nodeId);
        if (node) {
          if (!node.data.ports) {
            node.data.ports = {};
          }
          node.data.ports[portName] = value;

          // 更新 title 显示完整值
          e.target.title = value || portName;

          console.log(`Updated port ${portName} = ${value} for node ${nodeId}`);
        }
      };

      // 监听 input 事件（实时保存）
      input.addEventListener("input", updatePortValue);

      // 也监听 change 事件（失去焦点时）
      input.addEventListener("change", updatePortValue);

      // 监听 blur 事件确保保存
      input.addEventListener("blur", updatePortValue);

      // 阻止事件冒泡，避免触发节点拖拽
      input.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });

      // 阻止键盘事件冒泡
      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
      });
    });
  }

  /**
   * Optimize node dragging performance
   * @param {number} nodeId - Node ID
   */
  optimizeNodeDragging(nodeId) {
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (!nodeElement) return;

    // 添加 will-change 属性优化渲染性能
    nodeElement.style.willChange = "transform";

    // 使用 CSS transform 而不是 position 来提高性能
    nodeElement.style.transform = "translateZ(0)";

    // 减少重绘
    nodeElement.style.backfaceVisibility = "hidden";
  }

  /**
   * Generate HTML for a node
   * @param {Object} template - Node template
   * @param {Object} nodeData - Node data
   * @returns {string} HTML string
   */
  generateNodeHTML(template, nodeData) {
    let html = `
            <div class="drawflow-node-header">
                <span class="node-icon">${template.icon}</span>
                <span class="node-title">${template.name}</span>
                <span class="node-status ${this.nodeTemplates.getStatusClassName(nodeData.status)}"></span>
            </div>
            <div class="drawflow-node-body">
        `;

    // Add description
    if (template.description) {
      html += `<div class="node-description">${template.description}</div>`;
    }

    // Add ports configuration with editable values
    if (template.ports && template.ports.length > 0) {
      html += '<ul class="node-ports-list">';
      template.ports.forEach((port) => {
        const value = nodeData.ports[port.name] || "";
        html += `
                    <li class="node-port-item">
                        <span class="port-name">${port.name}:</span>
                        <input type="text"
                               class="port-value-input"
                               data-port-name="${port.name}"
                               value="${value}"
                               placeholder="${port.type_name}"
                               title="${value || port.name + " (" + port.type_name + ")"}"
                               spellcheck="false"
                               autocomplete="off">
                    </li>
                `;
      });
      html += "</ul>";
    }

    html += `
            </div>
            <div class="drawflow-node-footer">
                <span class="node-type-badge">${this.nodeTemplates.getTypeName(template.type)}</span>
            </div>
        `;

    return html;
  }

  /**
   * Remove a node
   * @param {number} nodeId - Node ID
   */
  removeNode(nodeId) {
    this.editor.removeNodeId(`node-${nodeId}`);
  }

  /**
   * Update node status
   * @param {number} nodeId - Node ID
   * @param {number} status - New status
   */
  updateNodeStatus(nodeId, status) {
    const node = this.editor.getNodeFromId(nodeId);
    if (!node) return;

    node.data.status = status;

    // Update visual status indicator
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (nodeElement) {
      const statusElement = nodeElement.querySelector(".node-status");
      if (statusElement) {
        // Remove all status classes
        statusElement.className = "node-status";
        // Add new status class
        statusElement.classList.add(
          this.nodeTemplates.getStatusClassName(status),
        );
      }
    }
  }

  /**
   * Update node data
   * @param {number} nodeId - Node ID
   * @param {Object} newData - New data to merge
   */
  updateNodeData(nodeId, newData) {
    const node = this.editor.getNodeFromId(nodeId);
    if (!node) return;

    Object.assign(node.data, newData);

    // Regenerate HTML if needed
    const template = this.nodeTemplates.getTemplate(node.data.nodeType);
    if (template) {
      const html = this.generateNodeHTML(template, node.data);
      const nodeElement = document.getElementById(`node-${nodeId}`);
      if (nodeElement) {
        const contentElement = nodeElement.querySelector(
          ".drawflow_content_node",
        );
        if (contentElement) {
          contentElement.innerHTML = html;
          // 重新设置端口输入监听器
          this.setupPortInputListeners(nodeId);
        }
      }
    }
  }

  /**
   * Get node by ID
   * @param {number} nodeId - Node ID
   * @returns {Object|null} Node object
   */
  getNode(nodeId) {
    return this.editor.getNodeFromId(nodeId);
  }

  /**
   * Get all nodes
   * @returns {Object} All nodes
   */
  getAllNodes() {
    return this.editor.drawflow.drawflow.Home.data;
  }

  /**
   * Get node count
   * @returns {number} Number of nodes
   */
  getNodeCount() {
    return Object.keys(this.getAllNodes()).length;
  }

  /**
   * Update node count display
   */
  updateNodeCount() {
    const countElement = document.getElementById("node-count");
    if (countElement) {
      countElement.textContent = `节点: ${this.getNodeCount()}`;
    }
  }

  /**
   * Clear all nodes
   */
  clear() {
    this.editor.clear();
    this.nodeIdCounter = 1;
    this.selectedNodes.clear();
    this.updateNodeCount();
  }

  /**
   * Export to JSON
   * @returns {Object} Editor data
   */
  export() {
    return this.editor.export();
  }

  /**
   * Import from JSON
   * @param {Object} data - Editor data
   */
  import(data) {
    this.clear();
    this.editor.import(data);
    this.updateNodeCount();

    // 为所有导入的节点设置端口输入监听器
    const nodes = this.getAllNodes();
    Object.keys(nodes).forEach((nodeId) => {
      this.setupPortInputListeners(parseInt(nodeId));
    });
  }

  /**
   * Export to Behavior Tree JSON format
   * @returns {Object} Behavior tree JSON
   */
  exportBehaviorTree() {
    const drawflowData = this.export();
    return this.behaviorTree.convertToTreeJSON(drawflowData);
  }

  /**
   * Import from Behavior Tree JSON format
   * @param {Object} treeData - Behavior tree JSON
   */
  importBehaviorTree(treeData) {
    const drawflowData = this.behaviorTree.convertFromTreeJSON(treeData);
    if (drawflowData) {
      this.import(drawflowData);
      // Auto fit view after import to show all nodes
      setTimeout(() => {
        this.fitToView();
      }, 100);
    }
  }

  /**
   * Toggle layout mode between horizontal and vertical
   */
  toggleLayoutMode() {
    this.layoutMode =
      this.layoutMode === "horizontal" ? "vertical" : "horizontal";
    this.applyLayoutMode();
    this.rearrangeNodes();
    console.log(`Layout mode changed to: ${this.layoutMode}`);
    return this.layoutMode;
  }

  /**
   * Get current layout mode
   */
  getLayoutMode() {
    return this.layoutMode;
  }

  /**
   * Set layout mode
   */
  setLayoutMode(mode) {
    if (mode !== "horizontal" && mode !== "vertical") {
      console.error('Invalid layout mode. Use "horizontal" or "vertical"');
      return;
    }
    this.layoutMode = mode;
    this.applyLayoutMode();
  }

  /**
   * Apply layout mode to all nodes
   */
  applyLayoutMode() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Find the actual drawflow element (created by Drawflow library)
    const drawflowElement = container.querySelector(".drawflow");
    const targetElement = drawflowElement || container;

    // Toggle CSS class on the drawflow element
    if (this.layoutMode === "vertical") {
      targetElement.classList.add("layout-vertical");
      targetElement.classList.remove("layout-horizontal");
      container.classList.add("layout-vertical");
      container.classList.remove("layout-horizontal");
    } else {
      targetElement.classList.add("layout-horizontal");
      targetElement.classList.remove("layout-vertical");
      container.classList.add("layout-horizontal");
      container.classList.remove("layout-vertical");
    }

    console.log(
      `Applied layout mode: ${this.layoutMode} to element`,
      targetElement,
    );

    // Force redraw of connections by updating the canvas
    if (this.editor && this.editor.precanvas) {
      const nodes = this.getAllNodes();
      Object.keys(nodes).forEach((nodeId) => {
        this.editor.updateConnectionNodes(`node-${nodeId}`);
      });
    }
  }

  /**
   * Rearrange nodes based on current layout mode
   */
  rearrangeNodes() {
    const nodes = this.getAllNodes();
    const nodeArray = Object.values(nodes);

    if (nodeArray.length === 0) return;

    // Build tree structure from connections
    const rootNodes = this.findRootNodes(nodeArray);

    if (rootNodes.length === 0) {
      // No clear root, arrange all nodes in a grid
      this.arrangeNodesInGrid(nodeArray);
      this.refreshCanvas();
      return;
    }

    // Arrange from each root
    rootNodes.forEach((rootNode, index) => {
      const startX = 400 + index * 800;
      const startY = 50;
      this.arrangeTreeFromNode(rootNode, startX, startY, 0);
    });

    // Refresh canvas to show updated positions
    this.refreshCanvas();

    // Fit view after rearrangement
    setTimeout(() => {
      this.fitToView();
    }, 100);
  }

  /**
   * Find root nodes (nodes with no inputs)
   */
  findRootNodes(nodeArray) {
    return nodeArray.filter((node) => {
      const hasInput = Object.values(node.inputs || {}).some(
        (input) => input.connections && input.connections.length > 0,
      );
      return !hasInput;
    });
  }

  /**
   * Arrange tree structure from a node recursively
   */
  arrangeTreeFromNode(node, x, y, depth) {
    // Update node position in Drawflow's internal data structure
    const drawflowNode = this.editor.drawflow.drawflow.Home.data[node.id];
    if (drawflowNode) {
      drawflowNode.pos_x = x;
      drawflowNode.pos_y = y;
    }

    // Get child nodes
    const children = this.getChildNodes(node);

    if (children.length === 0) return;

    if (this.layoutMode === "vertical") {
      // Vertical layout: children below parent
      const childY = y + 200; // Vertical spacing
      const totalWidth = children.length * 300; // Horizontal spacing per child
      const startX = x - totalWidth / 2 + 150; // Center children under parent

      children.forEach((child, index) => {
        const childX = startX + index * 300;
        this.arrangeTreeFromNode(child, childX, childY, depth + 1);
      });
    } else {
      // Horizontal layout: children to the right of parent
      const childX = x + 350; // Horizontal spacing
      const totalHeight = children.length * 200; // Vertical spacing per child
      const startY = y - totalHeight / 2 + 100; // Center children beside parent

      children.forEach((child, index) => {
        const childY = startY + index * 200;
        this.arrangeTreeFromNode(child, childX, childY, depth + 1);
      });
    }
  }

  /**
   * Get child nodes of a node
   */
  getChildNodes(node) {
    const children = [];

    if (!node.outputs) return children;

    Object.values(node.outputs).forEach((output) => {
      if (output.connections) {
        output.connections.forEach((conn) => {
          const childNode = this.editor.getNodeFromId(conn.node);
          if (childNode) {
            children.push(childNode);
          }
        });
      }
    });

    return children;
  }

  /**
   * Arrange nodes in a simple grid (fallback)
   */
  arrangeNodesInGrid(nodeArray) {
    const cols = Math.ceil(Math.sqrt(nodeArray.length));
    const spacing = 300;

    nodeArray.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = 100 + col * spacing;
      const y = 100 + row * spacing;

      const drawflowNode = this.editor.drawflow.drawflow.Home.data[node.id];
      if (drawflowNode) {
        drawflowNode.pos_x = x;
        drawflowNode.pos_y = y;
      }
    });
  }

  /**
   * Refresh canvas to update node positions and connections
   */
  refreshCanvas() {
    if (!this.editor || !this.editor.precanvas) return;

    // Get all nodes from Drawflow's data structure
    const drawflowData = this.editor.drawflow.drawflow.Home.data;

    // Update DOM elements for each node
    Object.keys(drawflowData).forEach((nodeId) => {
      const node = drawflowData[nodeId];
      const nodeElement = document.getElementById(`node-${nodeId}`);

      if (nodeElement && node) {
        // Update node position in DOM
        nodeElement.style.left = node.pos_x + "px";
        nodeElement.style.top = node.pos_y + "px";
      }
    });

    // Clear and redraw all connections
    // First, collect all connections
    const allConnections = [];
    Object.keys(drawflowData).forEach((nodeId) => {
      const node = drawflowData[nodeId];
      if (node.outputs) {
        Object.keys(node.outputs).forEach((outputKey) => {
          const output = node.outputs[outputKey];
          if (output.connections && output.connections.length > 0) {
            output.connections.forEach((conn) => {
              allConnections.push({
                outputNode: nodeId,
                outputClass: outputKey,
                inputNode: conn.node,
                inputClass: conn.output,
              });
            });
          }
        });
      }
    });

    // Update connection positions for all connections
    allConnections.forEach((conn) => {
      this.editor.updateConnectionNodes(`node-${conn.outputNode}`);
      this.editor.updateConnectionNodes(`node-${conn.inputNode}`);
    });
  }

  /**
   * Zoom in
   */
  zoomIn() {
    this.editor.zoom_in();
    this.updateCanvasTransform();
  }

  /**
   * Zoom out
   */
  zoomOut() {
    this.editor.zoom_out();
    this.updateCanvasTransform();
  }

  /**
   * Reset zoom
   */
  zoomReset() {
    this.editor.zoom_reset();
    this.updateCanvasTransform();
  }

  /**
   * Update canvas transform
   * Ensures the transform is correctly applied after zoom changes
   */
  updateCanvasTransform() {
    if (this.editor && this.editor.precanvas) {
      this.editor.precanvas.style.transform = `translate(${this.editor.canvas_x}px, ${this.editor.canvas_y}px) scale(${this.editor.zoom})`;
    }
  }

  /**
   * Center view
   */
  centerView() {
    // Get canvas dimensions
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate nodes center
    const nodes = this.getAllNodes();
    const nodeArray = Object.values(nodes);

    if (nodeArray.length === 0) return;

    let sumX = 0;
    let sumY = 0;

    nodeArray.forEach((node) => {
      sumX += node.pos_x;
      sumY += node.pos_y;
    });

    const avgX = sumX / nodeArray.length;
    const avgY = sumY / nodeArray.length;

    // Calculate offset
    const offsetX = centerX - avgX * this.editor.zoom;
    const offsetY = centerY - avgY * this.editor.zoom;

    // Apply offset
    this.editor.canvas_x = offsetX;
    this.editor.canvas_y = offsetY;
    this.editor.precanvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${this.editor.zoom})`;
  }

  /**
   * Fit all nodes to view
   * Automatically adjust zoom and position to show all nodes
   */
  fitToView() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const nodes = this.getAllNodes();
    const nodeArray = Object.values(nodes);

    if (nodeArray.length === 0) {
      // No nodes, reset to center
      this.editor.canvas_x = 0;
      this.editor.canvas_y = 0;
      this.editor.zoom = 1;
      this.editor.zoom_last_value = 1;
      this.editor.precanvas.style.transform = `translate(0px, 0px) scale(1)`;
      return;
    }

    // Calculate bounding box of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const nodeWidth = 250; // Approximate node width
    const nodeHeight = 150; // Approximate node height

    nodeArray.forEach((node) => {
      minX = Math.min(minX, node.pos_x);
      minY = Math.min(minY, node.pos_y);
      maxX = Math.max(maxX, node.pos_x + nodeWidth);
      maxY = Math.max(maxY, node.pos_y + nodeHeight);
    });

    // Calculate center and size
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // Calculate container size
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // Calculate zoom to fit (with padding)
    const padding = 100;
    const zoomX = (containerWidth - padding * 2) / contentWidth;
    const zoomY = (containerHeight - padding * 2) / contentHeight;
    let zoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 1x

    // Clamp zoom to reasonable range
    zoom = Math.max(0.1, Math.min(zoom, 2));

    // Calculate offset to center content
    const offsetX = containerWidth / 2 - contentCenterX * zoom;
    const offsetY = containerHeight / 2 - contentCenterY * zoom;

    // Apply zoom and offset
    this.editor.zoom = zoom;
    this.editor.zoom_last_value = zoom;
    this.editor.canvas_x = offsetX;
    this.editor.canvas_y = offsetY;
    this.editor.precanvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;

    console.log(
      `Fit to view: zoom=${zoom.toFixed(2)}, offset=(${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`,
    );
  }

  /**
   * Select node
   * @param {number} nodeId - Node ID
   */
  selectNode(nodeId) {
    this.selectedNodes.add(nodeId);
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (nodeElement) {
      nodeElement.classList.add("selected");
    }
  }

  /**
   * Deselect node
   * @param {number} nodeId - Node ID
   */
  deselectNode(nodeId) {
    this.selectedNodes.delete(nodeId);
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (nodeElement) {
      nodeElement.classList.remove("selected");
    }
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedNodes.forEach((nodeId) => {
      this.deselectNode(nodeId);
    });
    this.selectedNodes.clear();
  }

  /**
   * Get selected nodes
   * @returns {Array} Array of selected node IDs
   */
  getSelectedNodes() {
    return Array.from(this.selectedNodes);
  }

  /**
   * Copy selected nodes to clipboard
   */
  copySelection() {
    const selected = this.getSelectedNodes();
    if (selected.length === 0) return;

    const nodes = [];
    selected.forEach((nodeId) => {
      const node = this.getNode(nodeId);
      if (node) {
        nodes.push(JSON.parse(JSON.stringify(node)));
      }
    });

    this.clipboard = { nodes };
    console.log("Copied nodes to clipboard:", this.clipboard);
  }

  /**
   * Paste nodes from clipboard
   */
  pasteSelection() {
    if (!this.clipboard || !this.clipboard.nodes) return;

    const offset = 50;
    this.clearSelection();

    this.clipboard.nodes.forEach((node) => {
      const newId = this.addNode(
        node.data.nodeType,
        node.pos_x + offset,
        node.pos_y + offset,
        node.data,
      );
      this.selectNode(newId);
    });
  }

  /**
   * Delete selected nodes
   */
  deleteSelection() {
    const selected = this.getSelectedNodes();
    selected.forEach((nodeId) => {
      this.removeNode(nodeId);
    });
    this.clearSelection();
  }

  /**
   * Validate current tree
   * @returns {Object} Validation result
   */
  validateTree() {
    const treeData = this.exportBehaviorTree();
    if (!treeData) {
      return {
        valid: false,
        errors: ["Failed to export tree"],
        warnings: [],
      };
    }

    return this.behaviorTree.validateTree(treeData);
  }

  /**
   * Get tree statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const treeData = this.exportBehaviorTree();
    if (!treeData) return null;

    return this.behaviorTree.getTreeStatistics(treeData);
  }
}
