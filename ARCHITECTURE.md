# 项目架构文档

## 概述

行为树编辑器是一个基于 Drawflow 的可视化行为树编辑工具，采用纯前端架构，使用原生 JavaScript 实现。

## 技术栈

- **HTML5**: 页面结构
- **CSS3**: 样式和布局（CSS Variables, Flexbox, Grid）
- **JavaScript ES6+**: 应用逻辑
- **Drawflow**: 可视化节点编辑器核心库
- **Node.js**: 开发服务器（可选）

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────┐
│           User Interface Layer (UI)             │
│  (HTML + CSS + Modal Dialogs + Event Handlers) │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│         Application Layer (main.js)             │
│   (UI Logic, Event Coordination, User Actions)  │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────────┐   ┌────────▼────────────┐
│  Editor Layer    │   │   Data Layer        │
│  (editor.js)     │◄──┤ (behaviorTree.js)   │
│  Drawflow Wrapper│   │ Data Transformation │
└───────┬──────────┘   └────────┬────────────┘
        │                       │
        │              ┌────────▼────────────┐
        │              │  Template Layer     │
        │              │ (nodeTemplates.js)  │
        │              │   Node Definitions  │
        │              └─────────────────────┘
        │
┌───────▼──────────┐
│  Drawflow Core   │
│  (External Lib)  │
└──────────────────┘
```

## 核心模块

### 1. nodeTemplates.js - 节点模板管理

**职责**:
- 定义所有可用的行为树节点类型
- 管理节点模板库（增删改查）
- 提供节点类型的元数据（图标、颜色、描述等）
- 处理节点模板的导入导出

**核心类**:
```javascript
class NodeTemplates {
  - templates: Map<string, Template>
  - addTemplate(template)
  - getTemplate(id)
  - getAllTemplates()
  - getTemplatesByType(type)
  - importFromJSON(data)
  - exportToJSON()
}
```

**数据结构**:
```javascript
Template {
  id: string,           // 唯一标识
  name: string,         // 显示名称
  type: number,         // 0=Composite, 1=Action, 2=Decorator
  description: string,  // 描述信息
  icon: string,         // 表情符号图标
  ports: Array|null     // 端口配置
}
```

### 2. behaviorTree.js - 行为树数据转换

**职责**:
- 在 Drawflow 格式和行为树 JSON 格式之间转换
- 验证行为树结构的正确性
- 计算行为树统计信息
- 生成节点的 HTML 内容

**核心类**:
```javascript
class BehaviorTree {
  - convertToTreeJSON(drawflowData)    // Drawflow → Tree JSON
  - convertFromTreeJSON(treeData)      // Tree JSON → Drawflow
  - validateTree(treeData)             // 验证树结构
  - getTreeStatistics(treeData)        // 获取统计信息
}
```

**数据格式转换**:

Drawflow 格式 (内部使用):
```javascript
{
  drawflow: {
    Home: {
      data: {
        1: {
          id: 1,
          name: "Selector",
          data: { nodeType, status, ports },
          inputs: {...},
          outputs: {...},
          pos_x: 100,
          pos_y: 100
        }
      }
    }
  }
}
```

行为树 JSON 格式 (导出/导入):
```javascript
{
  root: {
    name: "Selector",
    type: 0,
    status: 3,
    children: [...]
  }
}
```

### 3. editor.js - 编辑器核心逻辑

**职责**:
- 封装 Drawflow API
- 管理节点的创建、删除、更新
- 处理选择、复制、粘贴等编辑操作
- 提供画布操作（缩放、平移、居中）
- 导入导出功能

**核心类**:
```javascript
class BehaviorTreeEditor {
  - editor: Drawflow           // Drawflow 实例
  - nodeIdCounter: number      // 节点 ID 计数器
  - selectedNodes: Set         // 选中的节点
  - clipboard: Object          // 剪贴板数据

  // 初始化
  - initialize()
  - setupEventListeners()

  // 节点操作
  - addNode(nodeType, x, y, data)
  - removeNode(nodeId)
  - updateNodeStatus(nodeId, status)
  - updateNodeData(nodeId, data)
  - generateNodeHTML(template, data)

  // 编辑操作
  - selectNode(nodeId)
  - clearSelection()
  - copySelection()
  - pasteSelection()
  - deleteSelection()

  // 画布操作
  - zoomIn() / zoomOut() / zoomReset()
  - centerView()

  // 数据操作
  - export() / import(data)
  - exportBehaviorTree()
  - importBehaviorTree(treeData)
  - validateTree()
  - getStatistics()
}
```

### 4. main.js - 应用程序入口

**职责**:
- 初始化应用程序
- 设置 UI 事件处理器
- 协调各模块间的交互
- 处理用户操作（按钮点击、快捷键等）
- 管理模态对话框
- 实现拖放功能

**主要功能**:
```javascript
// 初始化
- initializeApplication()
- setupUIHandlers()
- setupKeyboardShortcuts()
- setupDragAndDrop()

// UI 处理
- handleClear()
- handleImportNodes()
- handleImportTree()
- handleExport()
- handleAddCustomNode()

// 工具函数
- openModal() / closeModal()
- showMessage()
- copyToClipboard()
- downloadFile()
```

## 数据流

### 创建节点流程

```
用户拖拽节点
    ↓
handleDrop()
    ↓
editor.addNode(type, x, y)
    ↓
nodeTemplates.getTemplate(type)
    ↓
editor.generateNodeHTML()
    ↓
drawflow.addNode()
    ↓
触发 nodeCreated 事件
    ↓
更新 UI (节点计数)
```

### 导出流程

```
用户点击导出
    ↓
handleExport()
    ↓
editor.exportBehaviorTree()
    ↓
editor.export() (Drawflow 格式)
    ↓
behaviorTree.convertToTreeJSON()
    ↓
遍历构建树结构
    ↓
nodeTemplates.exportToJSON()
    ↓
显示在模态对话框
    ↓
用户复制或下载
```

### 导入流程

```
用户粘贴 JSON
    ↓
handleConfirmImportTree()
    ↓
JSON.parse()
    ↓
editor.importBehaviorTree(data)
    ↓
behaviorTree.convertFromTreeJSON()
    ↓
递归转换节点
    ↓
计算节点位置
    ↓
editor.import(drawflowData)
    ↓
drawflow.import()
    ↓
画布显示树结构
```

## 事件系统

### Drawflow 事件

```javascript
editor.on('nodeCreated', callback)      // 节点创建
editor.on('nodeRemoved', callback)      // 节点删除
editor.on('nodeSelected', callback)     // 节点选中
editor.on('connectionCreated', callback) // 连接创建
editor.on('connectionRemoved', callback) // 连接删除
editor.on('zoom', callback)             // 缩放变化
editor.on('click', callback)            // 画布点击
```

### 自定义事件

通过回调函数机制:
```javascript
editor.onNodeCreated = (id) => { ... }
editor.onNodeRemoved = (id) => { ... }
editor.onNodeSelected = (id) => { ... }
```

## 样式架构

### CSS 变量系统

```css
:root {
  /* 颜色 */
  --primary-color: #4a90e2;
  --composite-color: #9b59b6;
  --action-color: #3498db;
  --decorator-color: #e67e22;

  /* 背景 */
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;

  /* 尺寸 */
  --header-height: 60px;
  --sidebar-width: 280px;
  --spacing-md: 16px;
}
```

### 样式组织

```
css/
├── main.css              # 主样式
│   ├── Reset & Base
│   ├── Header
│   ├── Sidebar
│   ├── Editor
│   ├── Modals
│   ├── Forms
│   └── Utilities
│
└── drawflow.custom.css   # Drawflow 自定义
    ├── Node Styles
    ├── Connection Styles
    ├── Status Indicators
    ├── Animations
    └── Context Menu
```

## 节点类型系统

### 类型定义

```javascript
NodeType = {
  COMPOSITE: 0,   // 组合节点
  ACTION: 1,      // 动作节点
  DECORATOR: 2    // 装饰器节点
}

NodeStatus = {
  IDLE: 0,        // 空闲
  RUNNING: 1,     // 运行中
  SUCCESS: 2,     // 成功
  FAILURE: 3      // 失败
}
```

### 节点约束

| 节点类型 | 可有输入 | 可有输出 | 子节点数 |
|---------|---------|---------|---------|
| Composite | ✓ | ✓ | 多个 |
| Action | ✓ | ✗ | 0 |
| Decorator | ✓ | ✓ | 通常 1 个 |

## 扩展点

### 1. 添加新节点类型

编辑 `nodeTemplates.js`:
```javascript
this.addTemplate({
  id: 'NewNode',
  name: 'NewNode',
  type: NodeType.ACTION,
  description: '新节点描述',
  icon: '🆕',
  ports: [...]
});
```

### 2. 自定义样式

修改 CSS 变量:
```css
:root {
  --primary-color: #your-color;
  --composite-color: #your-color;
}
```

### 3. 扩展数据格式

修改 `behaviorTree.js` 中的转换逻辑:
```javascript
convertToTreeJSON(drawflowData) {
  // 添加自定义字段
  treeNode.customData = ...;
}
```

### 4. 添加验证规则

在 `behaviorTree.js` 中扩展 `validateNode()`:
```javascript
validateNode(node, errors, warnings) {
  // 添加自定义验证逻辑
  if (customCondition) {
    errors.push('Custom error');
  }
}
```

## 性能考虑

### 优化策略

1. **虚拟滚动**: 大量节点时考虑实现虚拟滚动
2. **延迟加载**: 节点模板按需加载
3. **事件节流**: 鼠标移动事件使用节流
4. **局部更新**: 只更新变化的节点，避免全量刷新
5. **WebWorker**: 复杂计算可移到 Worker 线程

### 当前限制

- 建议节点数 < 500
- 连接数 < 1000
- 递归深度 < 50

## 浏览器兼容性

### 最低要求

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### 使用的现代特性

- ES6+ (Class, Arrow Functions, Template Strings)
- CSS Variables
- Flexbox & Grid
- Drag and Drop API
- Canvas API (Drawflow)

## 安全考虑

### 输入验证

- JSON 解析使用 try-catch
- 节点名称过滤特殊字符
- 防止 XSS: 使用 textContent 而非 innerHTML

### 数据隐私

- 纯前端应用，数据不上传服务器
- 导出数据保存在本地
- 无第三方跟踪

## 测试策略

### 单元测试 (建议)

```javascript
// nodeTemplates.spec.js
test('addTemplate should add new template', () => {
  const templates = new NodeTemplates();
  templates.addTemplate({...});
  expect(templates.hasTemplate('id')).toBe(true);
});
```

### 集成测试 (建议)

```javascript
// editor.spec.js
test('should create node and export correctly', () => {
  const editor = new BehaviorTreeEditor('test');
  editor.initialize();
  editor.addNode('Selector', 100, 100);
  const tree = editor.exportBehaviorTree();
  expect(tree.root.name).toBe('Selector');
});
```

### 手动测试清单

- [ ] 创建各类型节点
- [ ] 连接节点
- [ ] 删除节点和连接
- [ ] 导出导入功能
- [ ] 缩放和平移
- [ ] 键盘快捷键
- [ ] 自定义节点创建
- [ ] 浏览器兼容性

## 部署

### 静态托管

项目可部署到:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- 任何静态文件服务器

### 构建步骤

```bash
# 无需构建，直接部署以下文件:
- index.html
- css/
- js/
- examples/
```

## 未来改进

### 短期 (v1.1)

- [ ] 撤销/重做功能
- [ ] 节点搜索
- [ ] 小地图导航
- [ ] 导出为图片

### 中期 (v1.2)

- [ ] 多选框选
- [ ] 节点分组
- [ ] 主题切换
- [ ] 自动布局

### 长期 (v2.0)

- [ ] 实时协作编辑
- [ ] 行为树调试器
- [ ] 版本历史
- [ ] 云端保存

## 贡献指南

### 代码风格

- 使用 2 空格缩进
- 使用驼峰命名法
- 添加 JSDoc 注释
- 保持函数简洁 (< 50 行)

### 提交规范

```
type(scope): subject

- feat: 新功能
- fix: 修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建
```

### Pull Request 流程

1. Fork 项目
2. 创建功能分支
3. 编写代码和测试
4. 提交 PR
5. 代码审查
6. 合并

## 许可证

MIT License - 详见 LICENSE 文件

---

**文档版本**: 1.0.0
**最后更新**: 2024
**维护者**: Project Team
