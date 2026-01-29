"use strict";

const ports = new Set();
let socket = null;
let wsUrl = null;
let isConnecting = false;
let isConnected = false;
let storedInitPayload = null;

const KEEP_ALIVE_INTERVAL_MS = 30 * 1000;
let keepAliveId = setInterval(() => {
  console.log(`SW: keep-alive ping (${new Date().toLocaleTimeString()}). clients: ${ports.size}. ws state: ${socket ? socket.readyState : 'null'}`);
}, KEEP_ALIVE_INTERVAL_MS);


function sendToPort(port, message) {
  if (port) {
    port.postMessage(message);
  }
}

function sendToPorts(message) {
  for (const p of ports) {
    p.postMessage(message);
  }
}

function openSocket(url) {
  if (isConnected || isConnecting) {
    return;
  }
  isConnecting = true;
  wsUrl = url;
  socket = new WebSocket(wsUrl);
  socket.onopen = () => {
    isConnected = true;
    isConnecting = false;
    sendToPorts({ type: "connected", url: wsUrl });
    if (storedInitPayload) {
      socket.send(JSON.stringify({ type: 'init', payload: storedInitPayload }));
      console.log(`SW: sent "init" with payload: ${storedInitPayload}`);
      storedInitPayload = null;
    }
  };
  socket.onmessage = (event) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(event.data);
    } catch (e) {
      console.error(`SW: failed to parse ws message: ${e}, ${event.data}`);
      sendToPorts({ type: "error", error: `invalid ws message: ${event.data}` });
      return;
    }
    console.log(`SW: message received from server: ${parsedMessage}`);
    sendToPorts(parsedMessage);
  };
  socket.onclose = (event) => {
    isConnected = false;
    isConnecting = false;
    sendToPorts({ type: "error", error: `ws closed: ${event.code}` });
  };
  socket.onerror = (error) => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close(1011, "Error occurred");
    }
  };
}

function closeSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    socket.close(1000, "SW requested websocket close");
  }
  socket = null;
  wsUrl = null;
  isConnected = isConnecting = false;
  storedInitPayload = null;
}

onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);
  port.start();
  if (isConnected) {
    sendToPort(port, { type: "connected", url: wsUrl });
  } else if (isConnecting) {
    sendToPort(port, { type: "message", payload: "ws is currently connecting..." });
  }
  port.onmessage = (e) => {
    const msg = e.data;
    switch (msg.type) {
      case "connect":
        if (msg.initPayload) {
          storedInitPayload = msg.initPayload;
        }
        if (isConnected) {
          sendToPort(port, { type: "connected", url: wsUrl });
        } else if (isConnecting) {
          sendToPort(port, { type: "message", payload: "ws is currently connecting..." });
        } else {
          openSocket(msg.url);
        }
        break;
      case "shutdown":
        ports.delete(port);
        break;
      case "send":
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(msg.data);
        } else {
          sendToPort(port, { type: "error", error: "ws not open to send data" });
        }
        break;
      default:
        sendToPort(port, { type: "error", error: `error: unknown message type: ${msg.type}` });
    }
  };
  port.onclose = () => {
    ports.delete(port);
  };
  port.onmessageerror = (error) => {
    console.error(`SW: port message error: ${error}`);
  };
}
