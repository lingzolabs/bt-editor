# 行为树编辑器 (Behavior Tree Editor)

基于 Drawflow 实现的可视化行为树编辑和调试工具。

## 功能特性

✨ **可视化编辑**
- 拖拽式节点创建
- 可视化连接管理
- 实时预览

🌲 **完整的行为树支持**
- 组合节点 (Composite): Sequence, Selector, Parallel 等
- 动作节点 (Action): 叶子节点，执行具体动作
- 装饰器节点 (Decorator): Inverter, Repeater, Delay 等

📊 **导入导出**
- 导出标准 JSON 格式的行为树
- 导出节点定义配置
- 支持从 JSON 导入树结构
- 支持自定义节点库导入

🎨 **现代化界面**
- 暗色主题设计
- 响应式布局
- 直观的操作体验

⚙️ **强大的编辑功能**
- 缩放和平移画布
- 复制粘贴节点
- 键盘快捷键支持
- 自定义节点创建

## 项目结构

```
behaviortree_editor/
├── index.html              # 主 HTML 文件
├── server.js               # 简单的本地开发服务器
├── package.json            # Node.js 项目配置
├── css/                    # 样式文件
│   ├── main.css           # 主样式
│   └── drawflow.custom.css # Drawflow 自定义样式
├── js/                     # JavaScript 文件
│   ├── nodeTemplates.js   # 节点模板定义
│   ├── behaviorTree.js    # 行为树数据结构转换
│   ├── editor.js          # 编辑器核心逻辑
│   └── main.js            # 主应用入口
└── examples/               # 示例文件
    ├── sample_tree.json   # 示例行为树
    └── sample_nodes.json  # 示例节点定义
```

## 快速开始

### 安装依赖

```bash
cd behaviortree_editor
npm install
```

### 启动开发服务器

```bash
npm start
```

然后在浏览器中打开 `http://localhost:3000`

### 或直接打开 HTML 文件

也可以直接在浏览器中打开 `index.html` 文件，无需启动服务器。

## 使用说明

### 1. 创建节点

从左侧节点面板拖拽节点到画布中：

- **组合节点 (紫色)**: 用于控制多个子节点的执行流程
  - `Sequence`: 顺序执行，全部成功才成功
  - `Selector`: 选择执行，一个成功即成功
  - `Parallel`: 并行执行所有子节点

- **动作节点 (蓝色)**: 执行具体动作的叶子节点
  - `AlwaysSuccess`: 总是返回成功
  - `AlwaysFailure`: 总是返回失败
  - `Wait`: 等待指定时间

- **装饰器节点 (橙色)**: 修改子节点行为
  - `Inverter`: 反转子节点结果
  - `Repeater`: 重复执行子节点
  - `Delay`: 延迟执行子节点

### 2. 连接节点

从父节点的输出点（右侧圆点）拖拽到子节点的输入点（左侧圆点）建立连接。

### 3. 导出行为树

点击顶部的 "💾 导出" 按钮，可以导出两种格式：

**行为树结构 (Tree JSON)**:
```json
{
  "root": {
    "name": "Selector",
    "type": 0,
    "status": 3,
    "children": [...]
  }
}
```

**节点定义 (Nodes JSON)**:
```json
{
  "nodes": [
    {
      "id": "Sequence",
      "type": 0,
      "ports": null
    },
    ...
  ]
}
```

### 4. 导入

- **导入节点定义**: 导入自定义节点库，扩展可用节点类型
- **导入行为树**: 从 JSON 文件导入已有的行为树结构

### 5. 键盘快捷键

- `Ctrl/Cmd + S`: 导出
- `Ctrl/Cmd + C`: 复制选中节点
- `Ctrl/Cmd + V`: 粘贴节点
- `Delete/Backspace`: 删除选中节点
- `Escape`: 取消选择

### 6. 自定义节点

点击左侧底部的 "➕ 添加自定义节点" 按钮，可以创建自定义节点：

1. 输入节点名称
2. 选择节点类型
3. 可选：添加端口配置（JSON 格式）

示例端口配置：
```json
[
  {
    "name": "delay",
    "type_name": "int",
    "mode": 0
  }
]
```

## 数据格式说明

### 节点类型 (type)

- `0`: 组合节点 (Composite)
- `1`: 动作节点 (Action)
- `2`: 装饰器节点 (Decorator)

### 节点状态 (status)

- `0`: 空闲 (Idle)
- `1`: 运行中 (Running)
- `2`: 成功 (Success)
- `3`: 失败 (Failure)

### 端口模式 (mode)

- `0`: 输入端口 (Input)
- `1`: 输出端口 (Output)

## 示例

在 `examples/` 目录下提供了示例文件：

- `sample_tree.json`: 完整的示例行为树
- `sample_nodes.json`: 示例节点定义

可以通过 "导入" 功能加载这些示例。

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **可视化库**: [Drawflow](https://github.com/jerosoler/Drawflow) - 可视化节点编辑器
- **后端**: Node.js (仅用于开发服务器)

## 浏览器支持

- Chrome/Edge (推荐)
- Firefox
- Safari
- 其他现代浏览器

## 扩展开发

### 添加新的节点模板

编辑 `js/nodeTemplates.js` 文件，在 `initializeDefaultTemplates()` 方法中添加：

```javascript
this.addTemplate({
    id: 'MyNewNode',
    name: 'MyNewNode',
    type: NodeType.ACTION,
    description: '我的新节点',
    icon: '🎯',
    ports: null
});
```

### 自定义样式

修改 `css/main.css` 或 `css/drawflow.custom.css` 来自定义界面样式。

### 扩展行为树逻辑

`js/behaviorTree.js` 包含了行为树与 Drawflow 之间的转换逻辑，可以根据需要扩展。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024)
- ✅ 初始版本发布
- ✅ 基础节点编辑功能
- ✅ 导入导出支持
- ✅ 自定义节点创建
- ✅ 键盘快捷键
- ✅ 暗色主题界面

## 联系方式

如有问题或建议，请通过 GitHub Issues 联系。

---

**Enjoy building behavior trees! 🌲**
