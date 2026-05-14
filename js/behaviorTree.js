/**
 * Behavior Tree Data Structure and Conversion
 * Handles conversion between Drawflow format and Behavior Tree JSON format
 */

class BehaviorTree {
  constructor() {
    this.nodeTemplates = nodeTemplates;
  }

  /**
   * Convert Drawflow data to Behavior Tree JSON format
   * @param {Object} drawflowData - Drawflow export data
   * @returns {Object} Behavior tree in standard format
   */
  convertToTreeJSON(drawflowData) {
    if (
      !drawflowData ||
      !drawflowData.drawflow ||
      !drawflowData.drawflow.Home
    ) {
      console.error("Invalid drawflow data");
      return null;
    }

    const nodes = drawflowData.drawflow.Home.data;

    // Find root node (node with no inputs)
    const rootNode = this.findRootNode(nodes);

    if (!rootNode) {
      console.error("No root node found");
      return null;
    }

    // Build tree structure starting from root
    const tree = this.buildTreeNode(rootNode, nodes);

    return { root: tree };
  }

  /**
   * Find the root node (node with no input connections)
   * @param {Object} nodes - Drawflow nodes
   * @returns {Object|null} Root node or null
   */
  findRootNode(nodes) {
    const nodeArray = Object.values(nodes);

    // Find node with no input connections
    for (let node of nodeArray) {
      const hasInput = Object.values(node.inputs || {}).some(
        (input) => input.connections && input.connections.length > 0,
      );

      if (!hasInput) {
        return node;
      }
    }

    // If all nodes have inputs, return the first node
    return nodeArray.length > 0 ? nodeArray[0] : null;
  }

  /**
   * Build tree node recursively
   * @param {Object} drawflowNode - Drawflow node
   * @param {Object} allNodes - All drawflow nodes
   * @returns {Object} Tree node
   */
  buildTreeNode(drawflowNode, allNodes) {
    const nodeData = drawflowNode.data;
    const template = this.nodeTemplates.getTemplate(nodeData.nodeType);

    const treeNode = {
      name: nodeData.nodeType,
      type: template ? template.type : NodeType.ACTION,
      status: nodeData.status || NodeStatus.IDLE,
    };

    // Add ports data if exists
    // 确保 ports 存在且不为空对象
    if (nodeData.ports && Object.keys(nodeData.ports).length > 0) {
      // 过滤掉空值
      const filteredPorts = {};
      for (let key in nodeData.ports) {
        if (
          nodeData.ports[key] !== null &&
          nodeData.ports[key] !== undefined &&
          nodeData.ports[key] !== ""
        ) {
          filteredPorts[key] = nodeData.ports[key];
        }
      }
      if (Object.keys(filteredPorts).length > 0) {
        treeNode.ports = filteredPorts;
      }
      console.log(`[Export] Node ${nodeData.nodeType} ports:`, filteredPorts);
    } else {
      console.log(
        `[Export] Node ${nodeData.nodeType} has no ports or empty ports`,
      );
    }

    // Get children from output connections
    const children = this.getChildren(drawflowNode, allNodes);

    if (children && children.length > 0) {
      treeNode.children = children;
    }

    return treeNode;
  }

  /**
   * Get children nodes from output connections
   * @param {Object} drawflowNode - Drawflow node
   * @param {Object} allNodes - All drawflow nodes
   * @returns {Array} Array of child tree nodes
   */
  getChildren(drawflowNode, allNodes) {
    const children = [];

    // Get all output connections
    const outputs = drawflowNode.outputs || {};

    for (let outputKey in outputs) {
      const output = outputs[outputKey];
      if (output.connections && output.connections.length > 0) {
        output.connections.forEach((conn) => {
          const childId = conn.node;
          const childNode = allNodes[childId];

          if (childNode) {
            const childTreeNode = this.buildTreeNode(childNode, allNodes);
            children.push(childTreeNode);
          }
        });
      }
    }

    return children;
  }

  /**
   * Convert Behavior Tree JSON to Drawflow format
   * @param {Object} treeData - Behavior tree JSON
   * @returns {Object} Drawflow data structure
   */
  convertFromTreeJSON(treeData) {
    if (!treeData || !treeData.root) {
      console.error("Invalid tree data");
      return null;
    }

    const drawflowData = {
      drawflow: {
        Home: {
          data: {},
        },
      },
    };

    // Reset counter for new import
    this.nodeIdCounter = 1;

    // Calculate tree layout first
    const layoutInfo = this.calculateTreeLayout(treeData.root);

    // Convert tree to drawflow nodes recursively with proper layout
    const startX = 400; // Center starting position
    const startY = 50; // Top starting position

    this.convertTreeNodeToDrawflow(
      treeData.root,
      drawflowData.drawflow.Home.data,
      null,
      startX,
      startY,
      layoutInfo,
    );

    return drawflowData;
  }

  /**
   * Calculate layout information for the tree
   * @param {Object} node - Tree node
   * @returns {Object} Layout information with widths at each level
   */
  calculateTreeLayout(node) {
    const layout = {
      subtreeWidth: 1, // Width in number of leaf nodes
      childLayouts: [],
    };

    if (!node.children || node.children.length === 0) {
      layout.subtreeWidth = 1;
      return layout;
    }

    // Calculate layout for all children
    layout.childLayouts = node.children.map((child) =>
      this.calculateTreeLayout(child),
    );

    // Total width is sum of all children widths
    layout.subtreeWidth = layout.childLayouts.reduce(
      (sum, childLayout) => sum + childLayout.subtreeWidth,
      0,
    );

    return layout;
  }

  /**
   * Convert tree node to drawflow format recursively with improved layout
   * @param {Object} treeNode - Tree node
   * @param {Object} drawflowNodes - Drawflow nodes container
   * @param {number|null} parentId - Parent node ID
   * @param {number} posX - X position (center of this node's subtree)
   * @param {number} posY - Y position
   * @param {Object} layoutInfo - Pre-calculated layout information
   * @returns {number} The node ID that was used
   */
  convertTreeNodeToDrawflow(
    treeNode,
    drawflowNodes,
    parentId,
    posX,
    posY,
    layoutInfo,
  ) {
    const nodeId = this.nodeIdCounter++;
    const template = this.nodeTemplates.getTemplate(treeNode.name);

    // Create drawflow node
    const drawflowNode = {
      id: nodeId,
      name: treeNode.name,
      data: {
        nodeType: treeNode.name,
        status: treeNode.status || NodeStatus.IDLE,
        ports: treeNode.ports || {},
      },
      class: template
        ? this.nodeTemplates.getTypeClassName(template.type)
        : "node-action",
      html: this.generateNodeHTML(treeNode, template),
      typenode: false,
      inputs: {
        input_1: {
          connections: parentId
            ? [{ node: parentId.toString(), input: "output_1" }]
            : [],
        },
      },
      outputs: {
        output_1: {
          connections: [],
        },
      },
      pos_x: posX,
      pos_y: posY,
    };
    if (nodeId == 1) {
      drawflowNode.inputs = {};
    }

    drawflowNodes[nodeId] = drawflowNode;

    // Process children with proper spacing
    if (treeNode.children && treeNode.children.length > 0) {
      const childY = posY + 180; // Vertical spacing between levels
      const nodeSpacing = 280; // Horizontal spacing per leaf node

      // Calculate starting X position for children
      const totalWidth = layoutInfo.subtreeWidth * nodeSpacing;
      let currentX = posX - totalWidth / 2 + nodeSpacing / 2;

      treeNode.children.forEach((child, index) => {
        const childLayout = layoutInfo.childLayouts[index];
        const childWidth = childLayout.subtreeWidth * nodeSpacing;
        const childCenterX = currentX + childWidth / 2 - nodeSpacing / 2;

        // Get the child's node ID before creating it
        const childNodeId = this.nodeIdCounter;

        // Add connection to child
        drawflowNode.outputs.output_1.connections.push({
          node: childNodeId.toString(),
          output: "input_1",
        });

        // Recursively convert child
        this.convertTreeNodeToDrawflow(
          child,
          drawflowNodes,
          nodeId,
          childCenterX,
          childY,
          childLayout,
        );

        // Move to next child's starting position
        currentX += childWidth;
      });
    }

    return nodeId;
  }

  /**
   * Generate HTML for node - delegates to editor's generateNodeHTML when available
   * @param {Object} treeNode - Tree node data
   * @param {Object} template - Node template
   * @returns {string} HTML string
   */
  generateNodeHTML(treeNode, template) {
    if (!template) {
      template = {
        icon: "📦",
        name: treeNode.name,
        type: treeNode.type || NodeType.ACTION,
        description: "",
        ports: treeNode.ports ? Object.keys(treeNode.ports).map(k => ({ name: k, type_name: 'any', mode: 0 })) : null,
      };
    }

    // Delegate to editor's generateNodeHTML if available (provides editable inputs)
    if (App && App.editor && App.editor.generateNodeHTML) {
      const nodeData = {
        nodeType: treeNode.name,
        status: treeNode.status || NodeStatus.IDLE,
        ports: treeNode.ports || {},
        collapsed: false,
      };
      return App.editor.generateNodeHTML(template, nodeData);
    }

    // Fallback (used only if called before editor init)
    let html = `
            <div class="drawflow-node-header">
                <span class="node-icon">${template.icon}</span>
                <span class="node-title">${template.name}</span>
                <button class="btn-collapse" title="折叠/展开子树">-</button>
                <span class="node-status ${this.nodeTemplates.getStatusClassName(treeNode.status || NodeStatus.IDLE)}"></span>
            </div>
            <div class="drawflow-node-body">
        `;

    if (template.description) {
      html += `<div class="node-description">${template.description}</div>`;
    }

    if (treeNode.ports && Object.keys(treeNode.ports).length > 0) {
      html += '<ul class="node-ports-list">';
      for (let portName in treeNode.ports) {
        html += `
                    <li class="node-port-item">
                        <span class="port-name">${portName}:</span>
                        <span class="port-value">${treeNode.ports[portName]}</span>
                    </li>
                `;
      }
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
   * Validate tree structure
   * @param {Object} treeData - Tree data
   * @returns {Object} Validation result
   */
  validateTree(treeData) {
    const errors = [];
    const warnings = [];

    if (!treeData || !treeData.root) {
      errors.push("Tree must have a root node");
      return { valid: false, errors, warnings };
    }

    // Validate recursively
    this.validateNode(treeData.root, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate single node
   * @param {Object} node - Tree node
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateNode(node, errors, warnings) {
    // Check required fields
    if (!node.name) {
      errors.push("Node must have a name");
    }

    if (node.type === undefined) {
      warnings.push(`Node "${node.name}" missing type, defaulting to ACTION`);
    }

    // Check if template exists
    const template = this.nodeTemplates.getTemplate(node.name);
    if (!template) {
      warnings.push(`Node template "${node.name}" not found in library`);
    }

    // Validate children for composite and decorator nodes
    if (node.type === NodeType.COMPOSITE) {
      if (!node.children || node.children.length === 0) {
        warnings.push(`Composite node "${node.name}" has no children`);
      }
    }

    if (node.type === NodeType.DECORATOR) {
      if (!node.children || node.children.length === 0) {
        warnings.push(`Decorator node "${node.name}" has no child`);
      } else if (node.children.length > 1) {
        warnings.push(
          `Decorator node "${node.name}" should have only one child`,
        );
      }
    }

    if (node.type === NodeType.ACTION) {
      if (node.children && node.children.length > 0) {
        errors.push(`Action node "${node.name}" should not have children`);
      }
    }

    // Validate children recursively
    if (node.children) {
      node.children.forEach((child) => {
        this.validateNode(child, errors, warnings);
      });
    }
  }

  /**
   * Get tree statistics
   * @param {Object} treeData - Tree data
   * @returns {Object} Statistics
   */
  getTreeStatistics(treeData) {
    const stats = {
      totalNodes: 0,
      compositeNodes: 0,
      actionNodes: 0,
      decoratorNodes: 0,
      maxDepth: 0,
    };

    if (!treeData || !treeData.root) {
      return stats;
    }

    this.calculateStatistics(treeData.root, stats, 1);

    return stats;
  }

  /**
   * Calculate statistics recursively
   * @param {Object} node - Tree node
   * @param {Object} stats - Statistics object
   * @param {number} depth - Current depth
   */
  calculateStatistics(node, stats, depth) {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    switch (node.type) {
      case NodeType.COMPOSITE:
        stats.compositeNodes++;
        break;
      case NodeType.ACTION:
        stats.actionNodes++;
        break;
      case NodeType.DECORATOR:
        stats.decoratorNodes++;
        break;
    }

    if (node.children) {
      node.children.forEach((child) => {
        this.calculateStatistics(child, stats, depth + 1);
      });
    }
  }
}

// Create global instance
const behaviorTree = new BehaviorTree();
