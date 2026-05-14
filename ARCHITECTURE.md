# 项目架构文档

## 概述

行为树编辑器是一个基于 Drawflow 的可视化行为树编辑工具，采用纯前端架构，使用原生 JavaScript 实现。支持行为树的可视化编辑、JSONL 日志回放查看执行过程、以及 WebSocket 实时在线查看。

## 技术栈

- **HTML5**: 页面结构
- **CSS3**: 样式和布局（CSS Variables, Flexbox, Grid）
- **JavaScript ES6+**: 应用逻辑（IIFE + App 命名空间模式）
- **Drawflow**: 可视化节点编辑器核心库（CDN 全局脚本）
- **Node.js**: 开发服务器（含日志文件 API）

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────┐
│           User Interface Layer (UI)             │
│  (HTML + CSS + Modal Dialogs + Event Handlers) │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│      App Namespace (js/app.js)                  │
│   Global state holder + showMessage utility     │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┼───────────────────────┐
        │           │                       │
┌───────▼────┐ ┌────▼───────────┐ ┌─────────▼──────────┐
│  UI Layer  │ │  Editor Layer  │ │   Data Layer        │
│ js/ui/*.js │ │  (editor.js)   │ │ (behaviorTree.js)   │
│            │ │  Drawflow Wrap │ │ Data Transformation │
└────────────┘ └───────┬────────┘ └────────┬────────────┘
                       │                   │
                       │          ┌────────▼────────────┐
                       │          │  Template Layer     │
                       │          │ (nodeTemplates.js)  │
                       │          │   Node Definitions  │
                       │          └─────────────────────┘
                       │
              ┌────────▼────────────┐
              │  Drawflow Core      │
              │  (External Lib CDN) │
              └─────────────────────┘
```

### 模块组织

```
js/
├── app.js              # App 命名空间：全局状态、showMessage
├── nodeTemplates.js    # 节点模板管理（NodeType/NodeStatus/PortMode 常量）
├── behaviorTree.js     # 行为树数据转换（Drawflow ↔ Tree JSON）
├── editor.js           # 编辑器核心（Drawflow 封装）
├── logPlayer.js        # 日志播放器（NDJSON 解析 + tick 回放）
├── wsViewer.js         # WebSocket 查看器（实时事件接收）
├── main.js             # 应用入口（~40行，仅编排初始化）
└── ui/
    ├── canvas.js       # 画布平移（空格键 + 鼠标拖动）
    ├── keyboard.js     # 键盘快捷键（Ctrl+S/C/V、Delete、Escape）
    ├── panels.js       # UI 面板管理（侧边栏、工具栏、模态框、拖放、导入导出）
    └── replay.js       # ReplayController（回放状态、节点视觉、WS 事件、自动聚焦）

css/
├── main.css            # 聚合入口（@import layout + components + replay）
├── layout.css          # 布局：变量、reset、header、sidebar、editor、status-bar、响应式
├── components.css      # 组件：按钮、modal、表单、node-item、scrollbar、工具类
├── replay.css          # 回放：面板布局、播放控件、tick slider、WS 状态、动画
└── drawflow.custom.css # Drawflow 自定义样式
```

### Script 加载顺序

```html
<!-- 1. 外部库 -->
<script src="drawflow.min.js"></script>
<!-- 2. 数据层 -->
<script src="js/nodeTemplates.js"></script>
<script src="js/behaviorTree.js"></script>
<script src="js/editor.js"></script>
<script src="js/logPlayer.js"></script>
<script src="js/wsViewer.js"></script>
<!-- 3. App 命名空间 -->
<script src="js/app.js"></script>
<!-- 4. UI 模块 -->
<script src="js/ui/canvas.js"></script>
<script src="js/ui/keyboard.js"></script>
<script src="js/ui/replay.js"></script>
<script src="js/ui/panels.js"></script>
<!-- 5. 应用入口 -->
<script src="js/main.js"></script>
```

## 核心模块

### App 命名空间 (js/app.js)

**职责**:
- 持有所有共享状态的唯一命名空间
- 提供 `showMessage()` 全局工具函数
- 引用: `App.editor`, `App.logPlayer`, `App.wsViewer`, `App.nodeTemplates`, `App.behaviorTree`
- 回放状态: `App.replayNidMap`, `App.isReplayMode`

### nodeTemplates.js - 节点模板管理

**职责**:
- 定义所有可用的行为树节点类型
- 管理节点模板库（增删改查）
- 提供节点类型的元数据（图标、颜色、描述等）
- 导出常量: `NodeType`, `NodeStatus`, `PortMode`

### behaviorTree.js - 行为树数据转换

**职责**:
- 在 Drawflow 格式和行为树 JSON 格式之间转换
- 验证行为树结构的正确性
- 计算行为树统计信息
- `generateNodeHTML` 委托给 editor 的实现（共享单一 HTML 生成逻辑）

### editor.js - 编辑器核心逻辑

**职责**:
- 封装 Drawflow API
- 管理节点的创建、删除、更新
- 提供 `generateNodeHTML()` 作为唯一的节点 HTML 生成方法
- 处理选择、复制、粘贴等编辑操作
- 提供画布操作（缩放、平移、居中、适应视图）
- 子树折叠/展开管理

### UI 模块 (js/ui/)

| 模块 | 职责 |
|------|------|
| `panels.js` | 侧边栏加载、工具栏事件、模态框、拖放、导入导出、折叠/展开 |
| `replay.js` | ReplayController: 回放加载、播放控制、节点着色、WS 事件、自动聚焦 |
| `keyboard.js` | 键盘快捷键绑定 |
| `canvas.js` | 空格键 + 鼠标画布平移 |

### main.js - 应用入口

**职责**:
- 连接 App 命名空间引用
- 初始化 editor
- 启动各 UI 模块

## 数据流

### 创建节点流程

```
用户拖拽节点 → Panels.handleDrop()
  → App.editor.addNode(type, x, y)
    → App.nodeTemplates.getTemplate(type)
    → editor.generateNodeHTML()
    → drawflow.addNode()
    → 触发 nodeCreated 事件
    → Panels.updateHintVisibility()
```

### 导出流程

```
用户点击导出 → Panels.handleExport()
  → App.editor.exportBehaviorTree()
    → editor.export() (Drawflow 格式)
    → behaviorTree.convertToTreeJSON()
  → 显示在 export modal
```

### 回放流程

```
用户加载日志 → ReplayController.handleFileLoad()
  → App.logPlayer.load(text)
    → onLoaded callback
    → ReplayController.loadTreeForReplay(treeDef)
      → App.editor.importBehaviorTree(treeDef)
      → buildNidMapFromTree()

播放中 → App.logPlayer.onTickChange
  → ReplayController.applyTickState(tick)
    → updateNodeReplayVisual() (CSS class 切换)
    → smoothFocusNode() (画布自动平移)
```

## UI 布局

### 布局结构

```
┌────────────────────────────────────────────────────┐
│ Header [☰ Toggle] [Title]    [回放][清空][导入][导出] │
├──────────┬─────────────────────────────┬───────────┤
│          │ Toolbar                     │           │
│ Sidebar  ├─────────────────────────────┤  Replay   │
│ (可折叠)  │                             │  Panel    │
│          │      Drawflow Canvas        │ (右侧抽屉) │
│          │                             │           │
│          │                             │           │
├──────────┴─────────────────────────────┴───────────┤
│ Status Bar [消息] [节点/连接统计]     [鼠标坐标]      │
└────────────────────────────────────────────────────┘
```

### 响应式行为

- **< 1024px**: 侧边栏收窄至 240px，次要工具栏按钮收入"更多"下拉菜单
- **< 768px**: 侧边栏绝对定位，通过汉堡菜单切换
- **侧边栏折叠**: 点击 ☰ 按钮可完全隐藏侧边栏，编辑器区域自动扩展
- **回放面板**: 从右侧滑出 360px 宽度的抽屉，不遮挡主画布

## 全局状态管理

所有共享状态通过 `App` 命名空间访问，避免裸全局变量：

```javascript
App.editor          // BehaviorTreeEditor 实例
App.logPlayer       // LogPlayer 实例
App.wsViewer        // WSViewer 实例
App.nodeTemplates   // NodeTemplates 实例
App.behaviorTree    // BehaviorTree 实例
App.replayNidMap    // Map<nid, drawflowId>
App.isReplayMode    // boolean
App.showMessage()   // 状态消息函数
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
  --status-bar-height: 32px;
  --toolbar-height: 40px;
}
```

### CSS 文件职责

| 文件 | 内容 |
|------|------|
| `layout.css` | 变量定义、reset、结构布局（header/sidebar/editor/status-bar）、响应式断点 |
| `components.css` | 按钮、模态框、表单、侧边栏节点项、滚动条、工具类 |
| `replay.css` | 回放面板布局、播放控件、滑块、WS 状态、闪烁动画 |
| `drawflow.custom.css` | Drawflow 节点样式、连接线、端口、布局模式（水平/垂直）、回放着色 |

## 节点类型系统

### 类型定义

```javascript
NodeType = { COMPOSITE: 0, ACTION: 1, DECORATOR: 2 }
NodeStatus = { IDLE: 0, RUNNING: 1, SUCCESS: 2, FAILURE: 3 }
```

### 节点约束

| 节点类型 | 可有输入 | 可有输出 | 子节点数 |
|---------|---------|---------|---------|
| Composite | ✓ | ✓ | 多个 |
| Action | ✓ | ✗ | 0 |
| Decorator | ✓ | ✓ | 通常 1 个 |

## 扩展点

### 添加新节点类型

编辑 `nodeTemplates.js` 或运行时通过 UI "添加自定义节点"。

### 自定义样式

修改 `css/layout.css` 中的 CSS 变量。

### 扩展数据格式

修改 `behaviorTree.js` 中的 `convertToTreeJSON` / `convertFromTreeJSON`。

## 性能考虑

- 节点拖拽使用 `will-change: transform` + `translateZ(0)` 优化
- 回放使用增量更新（sequential tick 只更新变化节点）
- 自动聚焦使用 `requestAnimationFrame` 去抖
- CSS 过渡仅在非拖拽状态下启用

## 浏览器兼容性

- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## 部署

```bash
# 无需构建，直接部署以下文件:
- index.html
- css/
- js/
- examples/
```

---

**文档版本**: 2.0.0
**最后更新**: 2024
**维护者**: Project Team
