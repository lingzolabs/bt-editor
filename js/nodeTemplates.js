/**
 * Node Templates for Behavior Tree Editor
 * Defines all available node types and their configurations
 */

// Node type constants
const NodeType = {
  COMPOSITE: 0, // Composite nodes (Sequence, Selector, Parallel, etc.)
  ACTION: 1, // Action/Leaf nodes
  DECORATOR: 2, // Decorator nodes (Inverter, Repeater, etc.)
};

// Node status constants
const NodeStatus = {
  IDLE: 0,
  RUNNING: 1,
  SUCCESS: 2,
  FAILURE: 3,
};

// Port mode constants
const PortMode = {
  INPUT: 0,
  OUTPUT: 1,
};

/**
 * Default node templates library
 */
class NodeTemplates {
  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default behavior tree node templates
   */
  initializeDefaultTemplates() {
    // ========== COMPOSITE NODES ==========

    this.addTemplate({
      name: "Sequence",
      type: NodeType.COMPOSITE,
      description: "顺序执行子节点，全部成功才成功",
      icon: "➡️",
      ports: null,
    });

    this.addTemplate({
      name: "Selector",
      type: NodeType.COMPOSITE,
      description: "选择执行子节点，一个成功即成功",
      icon: "🔀",
      ports: null,
    });

    this.addTemplate({
      name: "Parallel",
      type: NodeType.COMPOSITE,
      description: "并行执行所有子节点",
      icon: "⚡",
      ports: null,
    });

    this.addTemplate({
      name: "RandomSelector",
      type: NodeType.COMPOSITE,
      description: "随机选择一个子节点执行",
      icon: "🎲",
      ports: null,
    });

    this.addTemplate({
      name: "RandomSequence",
      type: NodeType.COMPOSITE,
      description: "随机顺序执行子节点",
      icon: "🔀",
      ports: null,
    });

    // ========== ACTION NODES ==========

    this.addTemplate({
      name: "AlwaysSuccess",
      type: NodeType.ACTION,
      description: "总是返回成功",
      icon: "✅",
      ports: null,
    });

    this.addTemplate({
      name: "AlwaysFailure",
      type: NodeType.ACTION,
      description: "总是返回失败",
      icon: "❌",
      ports: null,
    });

    this.addTemplate({
      name: "Wait",
      type: NodeType.ACTION,
      description: "等待指定时间",
      icon: "⏱️",
      ports: [{ name: "duration", type_name: "float", mode: PortMode.INPUT }],
    });

    this.addTemplate({
      name: "Log",
      type: NodeType.ACTION,
      description: "输出日志信息",
      icon: "📝",
      ports: [{ name: "message", type_name: "string", mode: PortMode.INPUT }],
    });

    this.addTemplate({
      name: "MySimpleAction",
      type: NodeType.ACTION,
      description: "自定义简单动作",
      icon: "🎯",
      ports: null,
    });

    // ========== DECORATOR NODES ==========

    this.addTemplate({
      name: "Inverter",
      type: NodeType.DECORATOR,
      description: "反转子节点的返回结果",
      icon: "🔄",
      ports: null,
    });

    this.addTemplate({
      name: "Repeater",
      type: NodeType.DECORATOR,
      description: "重复执行子节点N次",
      icon: "🔁",
      ports: [{ name: "count", type_name: "int", mode: PortMode.INPUT }],
    });

    this.addTemplate({
      name: "Delay",
      type: NodeType.DECORATOR,
      description: "延迟执行子节点",
      icon: "⏳",
      ports: [{ name: "delay", type_name: "int", mode: PortMode.INPUT }],
    });

    this.addTemplate({
      name: "UntilSuccess",
      type: NodeType.DECORATOR,
      description: "重复执行直到成功",
      icon: "🎯",
      ports: null,
    });

    this.addTemplate({
      name: "UntilFailure",
      type: NodeType.DECORATOR,
      description: "重复执行直到失败",
      icon: "🚫",
      ports: null,
    });

    this.addTemplate({
      name: "ForceSuccess",
      type: NodeType.DECORATOR,
      description: "强制返回成功",
      icon: "💪",
      ports: null,
    });

    this.addTemplate({
      name: "ForceFailure",
      type: NodeType.DECORATOR,
      description: "强制返回失败",
      icon: "🛑",
      ports: null,
    });

    this.addTemplate({
      name: "Timeout",
      type: NodeType.DECORATOR,
      description: "超时限制",
      icon: "⏰",
      ports: [{ name: "timeout", type_name: "float", mode: PortMode.INPUT }],
    });
  }

  /**
   * Add a node template
   * @param {Object} template - Node template definition
   */
  addTemplate(template) {
    if (!template.name) {
      console.error("Template must have id and name");
      return;
    }
    if (this.templates.has(template.name)) {
      console.error(`Template with name ${template.name} already exists`);
      return;
    }

    this.templates.set(template.name, {
      name: template.name,
      type: template.type !== undefined ? template.type : NodeType.ACTION,
      description: template.description || "",
      icon: template.icon || "📦",
      ports: template.ports || null,
      status: NodeStatus.IDLE,
    });
  }

  /**
   * Get a template by name
   * @param {string} name - Template name
   * @returns {Object|null} Template object or null
   */
  getTemplate(name) {
    return this.templates.get(name) || null;
  }

  /**
   * Get all templates
   * @returns {Array} Array of all templates
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by type
   * @param {number} type - Node type
   * @returns {Array} Array of templates of specified type
   */
  getTemplatesByType(type) {
    return this.getAllTemplates().filter((t) => t.type === type);
  }

  /**
   * Remove a template
   * @param {string} name - Template name
   */
  removeTemplate(name) {
    this.templates.delete(name);
  }

  /**
   * Check if template exists
   * @param {string} name - Template name
   * @returns {boolean}
   */
  hasTemplate(name) {
    return this.templates.has(name);
  }

  /**
   * Import templates from JSON
   * @param {Object} nodesData - Nodes data in JSON format
   */
  importFromJSON(nodesData) {
    if (!nodesData || !nodesData.nodes) {
      console.error("Invalid nodes data format");
      return;
    }

    nodesData.nodes.forEach((node) => {
      this.addTemplate({
        name: node.name,
        type: node.type,
        description: `${node.desc | node.name}`,
        icon: this.getIconForType(node.type),
        ports: node.ports,
      });
    });
  }

  /**
   * Export templates to JSON format
   * @returns {Object} Nodes data in JSON format
   */
  exportToJSON() {
    const nodes = this.getAllTemplates().map((template) => ({
      name: template.name,
      type: template.type,
      ports: template.ports,
    }));

    return { nodes };
  }

  /**
   * Get default icon for node type
   * @param {number} type - Node type
   * @returns {string} Icon emoji
   */
  getIconForType(type) {
    switch (type) {
      case NodeType.COMPOSITE:
        return "🔀";
      case NodeType.ACTION:
        return "🎯";
      case NodeType.DECORATOR:
        return "🎭";
      default:
        return "📦";
    }
  }

  /**
   * Get CSS class name for node type
   * @param {number} type - Node type
   * @returns {string} CSS class name
   */
  getTypeClassName(type) {
    switch (type) {
      case NodeType.COMPOSITE:
        return "node-composite";
      case NodeType.ACTION:
        return "node-action";
      case NodeType.DECORATOR:
        return "node-decorator";
      default:
        return "unknown";
    }
  }

  /**
   * Get human-readable type name
   * @param {number} type - Node type
   * @returns {string} Type name
   */
  getTypeName(type) {
    switch (type) {
      case NodeType.COMPOSITE:
        return "组合节点";
      case NodeType.ACTION:
        return "动作节点";
      case NodeType.DECORATOR:
        return "装饰器";
      default:
        return "未知";
    }
  }

  /**
   * Get status color
   * @param {number} status - Node status
   * @returns {string} CSS class name
   */
  getStatusClassName(status) {
    return `status-${status}`;
  }

  /**
   * Get human-readable status name
   * @param {number} status - Node status
   * @returns {string} Status name
   */
  getStatusName(status) {
    switch (status) {
      case NodeStatus.IDLE:
        return "空闲";
      case NodeStatus.RUNNING:
        return "运行中";
      case NodeStatus.SUCCESS:
        return "成功";
      case NodeStatus.FAILURE:
        return "失败";
      default:
        return "未知";
    }
  }
}

// Create global instance
const nodeTemplates = new NodeTemplates();
