# 🌲 Behavior Tree Editor

可视化行为树编辑器与调试工具，基于 [Drawflow](https://github.com/jerosoler/Drawflow) 构建。

**[🔗 在线体验 (GitHub Pages)](https://lingzolabs.github.io/bt-editor/)**

![MIT License](https://img.shields.io/badge/license-MIT-green)

## ✨ 功能特性

### 可视化编辑
- 拖拽式创建节点，可视化连接
- 支持左右/上下两种布局切换
- 画布缩放、平移、自动适应视图
- 复制粘贴、键盘快捷键

### 行为树节点
- **组合节点** (紫色): Sequence、Selector、Parallel、RandomSelector、RandomSequence
- **动作节点** (蓝色): AlwaysSuccess、AlwaysFailure、Wait、Log 等
- **装饰器节点** (橙色): Inverter、Repeater、Delay、Timeout 等
- 支持运行时添加**自定义节点**，可配置端口参数

### 导入导出
- 导出标准 JSON 格式的行为树结构和节点定义
- 从 JSON 导入行为树或自定义节点库
- 一键复制到剪贴板或下载文件

### 🎮 日志回放与实时调试
- 加载 `.jsonl` 日志文件，逐帧回放行为树执行过程
- 节点状态实时着色（空闲/运行中/成功/失败）
- 播放/暂停/单步前进/单步后退控制
- 支持 WebSocket 实时连接，接收运行中的行为树状态

## 快速开始

### 在线使用

直接访问 **[GitHub Pages](https://lingzolabs.github.io/bt-editor/)** 即可使用，无需安装。

### 本地运行

```bash
git clone https://github.com/lingzolabs/bt-editor.git
cd bt-editor
npm install
npm start
# 打开 http://localhost:3000
```

本地模式额外支持从 `logs/` 目录加载日志文件的 API。

## 使用说明

### 创建节点
从左侧面板拖拽节点到画布，从父节点输出点拖拽到子节点输入点建立连接。

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+S` | 导出 |
| `Ctrl+C / V` | 复制/粘贴节点 |
| `Delete` | 删除选中 |
| `Esc` | 取消选择 |

### 日志回放

1. 点击工具栏的回放按钮打开回放面板
2. 加载 `.jsonl` 日志文件（或点击"加载示例"）
3. 使用播放控制逐帧查看行为树执行过程

### 日志格式

回放日志为 [JSONL](https://jsonlines.org/) 格式，每行一个 JSON 对象。示例见 `examples/bt_log.jsonl`。

## 项目结构

```
├── index.html                # 主页面
├── server.js                 # 本地开发服务器
├── css/                      # 样式
│   ├── main.css
│   └── drawflow.custom.css
├── js/                       # 核心逻辑
│   ├── main.js              # 应用入口
│   ├── app.js               # 全局状态
│   ├── editor.js            # 编辑器核心
│   ├── behaviorTree.js      # 行为树数据转换
│   ├── nodeTemplates.js     # 节点模板定义
│   ├── logPlayer.js         # 日志回放引擎
│   ├── wsViewer.js          # WebSocket 实时查看
│   └── ui/                  # UI 控制器
├── examples/                 # 示例文件
│   ├── sample_tree.json
│   ├── sample_nodes.json
│   └── bt_log.jsonl
└── .github/workflows/        # CI/CD
    └── deploy.yml
```

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (ES6+)，无需构建工具
- **可视化**: [Drawflow](https://github.com/jerosoler/Drawflow)
- **部署**: GitHub Pages（静态站点）
- **本地服务器**: Node.js（可选，仅用于开发）

## License

[MIT](LICENSE)
