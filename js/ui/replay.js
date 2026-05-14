/**
 * ReplayController - Manages log replay and WebSocket live viewing
 */
class ReplayController {
  constructor() {
    this._focusAnimFrame = null;
    this._lastFocusTarget = null;
  }

  /**
   * Initialize the replay panel and all related event handlers
   */
  init() {
    // Initialize LogPlayer & WSViewer
    App.logPlayer = new LogPlayer();
    App.wsViewer = new WSViewer();

    // Panel toggle buttons
    document.getElementById('btn-replay-toggle')?.addEventListener('click', () => this.togglePanel());
    document.getElementById('btn-close-replay')?.addEventListener('click', () => this.togglePanel());

    // File input
    document.getElementById('replay-file-input')?.addEventListener('change', (e) => this.handleFileLoad(e));
    document.getElementById('btn-load-example')?.addEventListener('click', () => this.handleLoadExample());

    // Playback controls
    document.getElementById('btn-replay-play')?.addEventListener('click', () => this.handlePlayPause());
    document.getElementById('btn-replay-stop')?.addEventListener('click', () => this.handleStop());
    document.getElementById('btn-replay-step-fwd')?.addEventListener('click', () => this.handleStepFwd());
    document.getElementById('btn-replay-step-back')?.addEventListener('click', () => this.handleStepBack());
    document.getElementById('tick-slider')?.addEventListener('input', (e) => this.handleTickSliderChange(e));
    document.getElementById('speed-select')?.addEventListener('change', (e) => this.handleSpeedChange(e));

    // WebSocket
    document.getElementById('btn-ws-connect')?.addEventListener('click', () => this.handleWSConnect());

    // LogPlayer callbacks
    App.logPlayer.onTickChange = (tick, events) => {
      this.applyTickState(tick);
    };

    App.logPlayer.onStateChange = (state) => {
      this.updateReplayUI(state);
    };

    App.logPlayer.onLoaded = (treeDef) => {
      if (treeDef) {
        this.loadTreeForReplay(treeDef);
      }
    };

    // WSViewer callbacks
    App.wsViewer.onEvent = (event) => {
      this.handleWSEvent(event);
    };

    App.wsViewer.onStateChange = (state) => {
      this.updateWSStatus(state);
    };
  }

  /**
   * Toggle replay panel visibility
   */
  togglePanel() {
    const panel = document.getElementById('replay-panel');
    if (panel) {
      panel.classList.toggle('collapsed');
    }
  }

  /**
   * Handle file load for replay
   */
  handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      App.logPlayer.load(text);
      App.showMessage(`日志加载成功: ${App.logPlayer.getTickCount()} ticks`, 'success');
    };
    reader.readAsText(file);
  }

  /**
   * Handle load example log
   */
  async handleLoadExample() {
    try {
      App.showMessage('正在加载示例日志...');
      const response = await fetch('/api/logs/bt_log.jsonl');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      App.logPlayer.load(text);
      App.showMessage(`示例日志加载成功: ${App.logPlayer.getTickCount()} ticks`, 'success');
    } catch (error) {
      App.showMessage('加载示例失败: ' + error.message, 'error');
    }
  }

  /**
   * Load tree definition for replay mode
   */
  loadTreeForReplay(treeDef) {
    App.isReplayMode = true;

    // Register node types from tree that aren't in templates
    this.registerTreeNodeTypes(treeDef.root);

    // Import tree into editor
    App.editor.importBehaviorTree(treeDef);

    // Build nid -> drawflow node ID mapping
    App.replayNidMap.clear();
    this.buildNidMapFromTree(treeDef.root, App.replayNidMap);

    // Expand all nodes for visibility
    Panels.expandAllNodes();

    // Reset all node visual states
    this.resetAllNodeVisuals();

    Panels.updateHintVisibility();
    App.showMessage(`树已加载: ${App.replayNidMap.size} 个节点`, 'success');
  }

  /**
   * Register node types from tree definition that don't exist in templates
   */
  registerTreeNodeTypes(node) {
    if (!node) return;

    if (!App.nodeTemplates.hasTemplate(node.name)) {
      App.nodeTemplates.addTemplate({
        name: node.name,
        type: node.type !== undefined ? node.type : NodeType.ACTION,
        description: node.name,
        icon: App.nodeTemplates.getIconForType(node.type !== undefined ? node.type : NodeType.ACTION),
        ports: node.ports ? Object.keys(node.ports).map(k => ({ name: k, type_name: 'any', mode: 0 })) : null,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        this.registerTreeNodeTypes(child);
      }
    }
  }

  /**
   * Build nid -> drawflow node ID mapping via DFS pre-order traversal
   */
  buildNidMapFromTree(root, map) {
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
   */
  applyTickState(tick) {
    const prevTick = App.logPlayer._prevAppliedTick ?? 0;
    let transitions;
    let runningNodeIds = [];

    if (tick === prevTick + 1) {
      // Sequential: apply only this tick's transitions (fast)
      transitions = App.logPlayer.applyTickTransitions(tick);
      for (const tr of transitions) {
        const drawflowId = App.replayNidMap.get(tr.nid);
        if (drawflowId == null) continue;
        this.updateNodeReplayVisual(drawflowId, tr.statusInt);
        if (tr.statusInt === 1) runningNodeIds.push(drawflowId);
      }
    } else {
      // Seeking: rebuild full state
      const states = App.logPlayer.getStateAtTick(tick);
      for (const [nid, status] of states) {
        const drawflowId = App.replayNidMap.get(nid);
        if (drawflowId == null) continue;
        this.updateNodeReplayVisual(drawflowId, status);
        if (status === 1) runningNodeIds.push(drawflowId);
      }
      transitions = [];
    }

    App.logPlayer._prevAppliedTick = tick;

    // Auto-focus on the deepest running node
    if (runningNodeIds.length > 0) {
      const focusTarget = runningNodeIds[runningNodeIds.length - 1];
      this.smoothFocusNode(focusTarget);
    }

    // Update info display
    const result = App.logPlayer.getTickResult(tick);
    const infoEl = document.getElementById('replay-tick-info');
    if (infoEl) {
      let resultHtml = '';
      if (result) {
        const cls = `result-${result.toLowerCase()}`;
        resultHtml = ` | 结果: <span class="${cls}">${result}</span>`;
      }
      infoEl.innerHTML = `Tick ${tick} / ${App.logPlayer.maxTick}${resultHtml}`;
    }
  }

  /**
   * Update a single node's visual state for replay
   */
  updateNodeReplayVisual(drawflowId, status) {
    const nodeEl = document.getElementById(`node-${drawflowId}`);
    if (!nodeEl) return;

    nodeEl.classList.remove('replay-idle', 'replay-running', 'replay-success', 'replay-failure');

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
  flashNode(drawflowId, status) {
    const nodeEl = document.getElementById(`node-${drawflowId}`);
    if (!nodeEl) return;

    nodeEl.classList.remove('replay-flash-running', 'replay-flash-success', 'replay-flash-failure');
    void nodeEl.offsetWidth;

    switch (status) {
      case 1: nodeEl.classList.add('replay-flash-running'); break;
      case 2: nodeEl.classList.add('replay-flash-success'); break;
      case 3: nodeEl.classList.add('replay-flash-failure'); break;
    }

    setTimeout(() => {
      nodeEl.classList.remove('replay-flash-running', 'replay-flash-success', 'replay-flash-failure');
    }, 500);
  }

  /**
   * Smoothly pan the canvas to focus on a specific node
   */
  smoothFocusNode(drawflowId) {
    if (this._lastFocusTarget === drawflowId) return;
    this._lastFocusTarget = drawflowId;

    if (this._focusAnimFrame) cancelAnimationFrame(this._focusAnimFrame);
    this._focusAnimFrame = requestAnimationFrame(() => {
      this._focusAnimFrame = null;
      this._doFocusNode(drawflowId);
    });
  }

  _doFocusNode(drawflowId) {
    const container = document.getElementById('drawflow');
    if (!container || !App.editor || !App.editor.editor) return;

    const nodeData = App.editor.editor.drawflow?.drawflow?.Home?.data?.[drawflowId];
    if (!nodeData) return;

    const zoom = App.editor.editor.zoom;
    const containerRect = container.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;

    const nodeW = 240;
    const nodeH = 100;
    const nodeCX = nodeData.pos_x + nodeW / 2;
    const nodeCY = nodeData.pos_y + nodeH / 2;

    const screenX = nodeCX * zoom + App.editor.editor.canvas_x;
    const screenY = nodeCY * zoom + App.editor.editor.canvas_y;

    const marginX = cw * 0.2;
    const marginY = ch * 0.2;
    if (screenX > marginX && screenX < cw - marginX &&
        screenY > marginY && screenY < ch - marginY) {
      return;
    }

    const targetCanvasX = cw / 2 - nodeCX * zoom;
    const targetCanvasY = ch / 2 - nodeCY * zoom;

    const lerp = 0.35;
    const newX = App.editor.editor.canvas_x + (targetCanvasX - App.editor.editor.canvas_x) * lerp;
    const newY = App.editor.editor.canvas_y + (targetCanvasY - App.editor.editor.canvas_y) * lerp;

    App.editor.editor.canvas_x = newX;
    App.editor.editor.canvas_y = newY;
    App.editor.editor.zoom_refresh();
  }

  /**
   * Reset all node visual states to idle
   */
  resetAllNodeVisuals() {
    const nodes = App.editor.getAllNodes();
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
  updateReplayUI(state) {
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
  handlePlayPause() {
    if (!App.logPlayer.isLoaded()) {
      App.showMessage('请先加载日志文件', 'warning');
      return;
    }
    if (App.logPlayer.isPlaying) {
      App.logPlayer.pause();
    } else {
      App.logPlayer.play();
    }
  }

  handleStop() {
    App.logPlayer.stop();
    this.resetAllNodeVisuals();
  }

  handleStepFwd() {
    if (!App.logPlayer.isLoaded()) return;
    App.logPlayer.stepForward();
  }

  handleStepBack() {
    if (!App.logPlayer.isLoaded()) return;
    App.logPlayer.stepBackward();
  }

  handleTickSliderChange(e) {
    const tick = parseInt(e.target.value);
    App.logPlayer.seekToTick(tick);
  }

  handleSpeedChange(e) {
    const speed = parseFloat(e.target.value);
    App.logPlayer.setSpeed(speed);
  }

  // ============================================================
  // WEBSOCKET VIEWER
  // ============================================================

  /**
   * Handle WS connect/disconnect button
   */
  handleWSConnect() {
    const urlInput = document.getElementById('ws-url');
    const btn = document.getElementById('btn-ws-connect');

    if (App.wsViewer.getIsConnected()) {
      App.wsViewer.disconnect();
      btn.textContent = '连接';
    } else {
      const url = urlInput.value.trim();
      if (!url) {
        App.showMessage('请输入 WebSocket URL', 'warning');
        return;
      }
      App.wsViewer.autoReconnect = true;
      App.wsViewer.connect(url);
      btn.textContent = '断开';
    }
  }

  /**
   * Handle incoming WebSocket events
   */
  handleWSEvent(event) {
    switch (event.type) {
      case 'tree':
        this.loadTreeForReplay(event.data);
        App.logPlayer.treeDefinition = event.data;
        App.logPlayer.buildNidMapping(event.data.root);
        break;

      case 'tick_begin':
        break;

      case 'transition':
        const drawflowId = App.replayNidMap.get(event.nid);
        if (drawflowId != null) {
          const status = LogPlayer.parseStatus(event.to);
          this.updateNodeReplayVisual(drawflowId, status);
          this.flashNode(drawflowId, status);
        }
        break;

      case 'tick_end':
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
  updateWSStatus(state) {
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
      App.showMessage('WebSocket 已连接', 'success');
    }
  }
}
