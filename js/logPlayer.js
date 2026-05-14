/**
 * Log Player - Parses NDJSON behavior tree logs and drives tick-by-tick playback
 */
class LogPlayer {
  constructor() {
    this.treeDefinition = null;
    this.ticks = new Map(); // tick number -> array of events
    this.maxTick = 0;
    this.currentTick = 0;
    this.isPlaying = false;
    this.speed = 1; // ticks per second
    this.playTimer = null;
    this.nidToNodeId = new Map(); // runtime nid -> drawflow node ID
    this.nodeStates = new Map();

    // Callbacks
    this.onTickChange = null; // (tick, events) => {}
    this.onStateChange = null; // ({isPlaying, currentTick, maxTick}) => {}
    this.onLoaded = null; // (treeDefinition) => {}
  }

  /**
   * Status string to NodeStatus int mapping
   */
  static statusMap = {
    'Idle': 0,
    'Running': 1,
    'Success': 2,
    'Failure': 3,
  };

  /**
   * Parse status string to int
   */
  static parseStatus(str) {
    return LogPlayer.statusMap[str] ?? 0;
  }

  /**
   * Load and parse NDJSON text
   * @param {string} jsonlText - NDJSON content
   */
  load(jsonlText) {
    this.reset();

    const lines = jsonlText.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const event = JSON.parse(line);
        
        switch (event.type) {
          case 'tree':
            this.treeDefinition = event.data;
            break;
          case 'tick_begin':
          case 'transition':
          case 'tick_end':
            const tick = event.tick;
            if (!this.ticks.has(tick)) {
              this.ticks.set(tick, []);
            }
            this.ticks.get(tick).push(event);
            this.maxTick = Math.max(this.maxTick, tick);
            break;
        }
      } catch (e) {
        console.warn('Failed to parse log line:', line, e);
      }
    }

    console.log(`[LogPlayer] Loaded: ${this.ticks.size} ticks, maxTick=${this.maxTick}`);
    
    // Build nid mapping from tree definition
    if (this.treeDefinition && this.treeDefinition.root) {
      this.buildNidMapping(this.treeDefinition.root);
      this.initNodeStates();
    }

    if (this.onLoaded) {
      this.onLoaded(this.treeDefinition);
    }

    this.emitStateChange();
  }

  /**
   * Build nid -> drawflow node ID mapping via DFS traversal
   * The tree's nid is assigned in DFS pre-order starting from 0
   * Drawflow assigns node IDs starting from 1 in the same DFS order
   * @param {Object} root - Tree root node
   */
  buildNidMapping(root) {
    this.nidToNodeId.clear();
    let nidCounter = 0;

    const dfs = (node) => {
      const nid = nidCounter;
      const drawflowId = nidCounter + 1; // drawflow IDs start at 1
      this.nidToNodeId.set(nid, drawflowId);
      nidCounter++;

      if (node.children) {
        for (const child of node.children) {
          dfs(child);
        }
      }
    };

    dfs(root);
    console.log(`[LogPlayer] Built nid mapping: ${this.nidToNodeId.size} nodes`);
  }

  /**
   * Initialize all node states to Idle
   */
  initNodeStates() {
    this.nodeStates.clear();
    for (const nid of this.nidToNodeId.keys()) {
      this.nodeStates.set(nid, 0); // Idle
    }
  }

  /**
   * Get the drawflow node ID for a runtime nid
   * @param {number} nid
   * @returns {number|null}
   */
  getDrawflowId(nid) {
    return this.nidToNodeId.get(nid) ?? null;
  }

  /**
   * Get tree definition
   */
  getTreeDefinition() {
    return this.treeDefinition;
  }

  /**
   * Get total number of ticks
   */
  getTickCount() {
    return this.maxTick + 1;
  }

  /**
   * Get events for a specific tick
   * @param {number} tick
   * @returns {Array}
   */
  getEventsForTick(tick) {
    return this.ticks.get(tick) || [];
  }

  /**
   * Get tick result
   * @param {number} tick
   * @returns {string|null}
   */
  getTickResult(tick) {
    const events = this.getEventsForTick(tick);
    const endEvent = events.find(e => e.type === 'tick_end');
    return endEvent ? endEvent.result : null;
  }

  /**
   * Compute cumulative node states at a given tick.
   * Rebuilds from scratch (used for seeking).
   * @param {number} targetTick
   * @returns {Map<number, number>} nid -> status int
   */
  getStateAtTick(targetTick) {
    this.initNodeStates();

    for (let t = 1; t <= targetTick; t++) {
      const events = this.getEventsForTick(t);
      for (const event of events) {
        if (event.type === 'transition') {
          this.nodeStates.set(event.nid, LogPlayer.parseStatus(event.to));
        }
      }
    }

    return this.nodeStates;
  }

  /**
   * Apply only the transitions for a single tick (incremental update).
   * Much faster than getStateAtTick for sequential playback.
   * @param {number} tick
   * @returns {Array} transitions that occurred [{nid, from, to, statusInt}]
   */
  applyTickTransitions(tick) {
    const transitions = [];
    const events = this.getEventsForTick(tick);
    
    for (const event of events) {
      if (event.type === 'transition') {
        const statusInt = LogPlayer.parseStatus(event.to);
        this.nodeStates.set(event.nid, statusInt);
        transitions.push({
          nid: event.nid,
          name: event.name,
          from: event.from,
          to: event.to,
          statusInt,
        });
      }
    }

    return transitions;
  }

  /**
   * Start playback
   */
  play() {
    if (this.isPlaying) return;
    if (this.currentTick >= this.maxTick) {
      this.currentTick = 0;
    }
    
    this.isPlaying = true;
    this.emitStateChange();
    this.scheduleNextTick();
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
    this.emitStateChange();
  }

  /**
   * Stop playback and reset to tick 0
   */
  stop() {
    this.pause();
    this.currentTick = 0;
    this.emitTickChange();
    this.emitStateChange();
  }

  /**
   * Step forward one tick
   */
  stepForward() {
    if (this.currentTick < this.maxTick) {
      this.currentTick++;
      this.emitTickChange();
      this.emitStateChange();
    }
  }

  /**
   * Step backward one tick
   */
  stepBackward() {
    if (this.currentTick > 0) {
      this.currentTick--;
      this.emitTickChange();
      this.emitStateChange();
    }
  }

  /**
   * Seek to a specific tick
   * @param {number} tick
   */
  seekToTick(tick) {
    this.currentTick = Math.max(0, Math.min(tick, this.maxTick));
    this.emitTickChange();
    this.emitStateChange();
  }

  /**
   * Set playback speed
   * @param {number} speed - ticks per second
   */
  setSpeed(speed) {
    this.speed = speed;
    // If playing, restart the timer with new speed
    if (this.isPlaying) {
      if (this.playTimer) {
        clearTimeout(this.playTimer);
      }
      this.scheduleNextTick();
    }
  }

  /**
   * Schedule next tick for playback
   */
  scheduleNextTick() {
    if (!this.isPlaying) return;

    const interval = 1000 / this.speed;
    this.playTimer = setTimeout(() => {
      if (this.currentTick < this.maxTick) {
        this.currentTick++;
        this.emitTickChange();
        this.emitStateChange();
        this.scheduleNextTick();
      } else {
        // Reached end
        this.isPlaying = false;
        this.emitStateChange();
      }
    }, interval);
  }

  /**
   * Reset player state
   */
  reset() {
    this.pause();
    this.treeDefinition = null;
    this.ticks.clear();
    this.maxTick = 0;
    this.currentTick = 0;
    this.nidToNodeId.clear();
    this.nodeStates.clear();
  }

  /**
   * Emit tick change callback
   */
  emitTickChange() {
    if (this.onTickChange) {
      const events = this.getEventsForTick(this.currentTick);
      this.onTickChange(this.currentTick, events);
    }
  }

  /**
   * Emit state change callback
   */
  emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        currentTick: this.currentTick,
        maxTick: this.maxTick,
      });
    }
  }

  /**
   * Check if log is loaded
   */
  isLoaded() {
    return this.treeDefinition !== null && this.ticks.size > 0;
  }
}
