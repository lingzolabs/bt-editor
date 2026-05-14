/**
 * WebSocket Viewer - Receives live behavior tree events via WebSocket
 */
class WSViewer {
  constructor() {
    this.ws = null;
    this.url = '';
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.reconnectTimer = null;
    this.autoReconnect = true;

    // Callbacks
    this.onEvent = null; // (event) => {}
    this.onStateChange = null; // ({isConnected, url}) => {}
    this.onError = null; // (error) => {}
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL (e.g., ws://localhost:3001)
   */
  connect(url) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[WSViewer] Already connected');
      return;
    }

    this.url = url;
    this.reconnectAttempts = 0;
    this._connect();
  }

  /**
   * Internal connect method
   */
  _connect() {
    try {
      console.log(`[WSViewer] Connecting to ${this.url}...`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log(`[WSViewer] Connected to ${this.url}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emitStateChange();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onEvent) {
            this.onEvent(data);
          }
        } catch (e) {
          console.warn('[WSViewer] Failed to parse message:', event.data, e);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[WSViewer] Disconnected (code: ${event.code})`);
        this.isConnected = false;
        this.emitStateChange();

        // Auto-reconnect if not manually disconnected
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WSViewer] WebSocket error:', error);
        if (this.onError) {
          this.onError(error);
        }
      };
    } catch (e) {
      console.error('[WSViewer] Failed to create WebSocket:', e);
      if (this.onError) {
        this.onError(e);
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.autoReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.emitStateChange();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WSViewer] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, delay);
  }

  /**
   * Emit state change callback
   */
  emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        isConnected: this.isConnected,
        url: this.url,
        reconnectAttempts: this.reconnectAttempts,
      });
    }
  }

  /**
   * Check if connected
   */
  getIsConnected() {
    return this.isConnected;
  }
}
