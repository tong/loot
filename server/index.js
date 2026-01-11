const { WebSocketServer } = require('ws');

const log = {
  info: (...args) => {
    const ts = new Date().toISOString();
    console.info(`${ts}`, ...args);
  },
  warn: (...args) => {
    const ts = new Date().toISOString();
    console.warn(`${ts}`, ...args);
  },
  error: (...args) => {
    const ts = new Date().toISOString();
    console.error(`${ts}`, ...args);
  }
};

let HOST = '0.0.0.0';
let PORT = 8888;

process.argv.forEach((arg, index) => {
  if (arg === "--host" && process.argv[index + 1]) {
    HOST = process.argv[index + 1];
  }
  if (arg === "--port" && process.argv[index + 1]) {
    const parsedPort = parseInt(process.argv[index + 1], 10);
    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
      PORT = parsedPort;
    } else {
      console.error(`Invalid port value`);
      process.exit(1);
    }
  }
});

class Client {
  constructor(id, ws, ip, initPayload) {
    this.id = id
    this.ws = ws;
    this.ip = ip;
    this.url = initPayload.url;
    this.agent = initPayload.agent;
    this.connectionTime = new Date();
  }
  getInfo() {
    return `id=${this.id} ip=${this.ip} url=${this.url}`;
  }
  send(type, payload) {
    if (this.ws.readyState !== this.ws.constructor.OPEN) {
      console.error(`Cannot send data to client=${this.id}, not connected`);
      return;
    }
    const msg = { type, payload };
    this.ws.send(JSON.stringify(msg));
  }
  static broadcast(clients, type, payload) {
    const str = JSON.stringify({ type, payload });
    for (const client of clients.values()) {
      if (client.ws.readyState === client.ws.constructor.OPEN) {
        client.ws.send(str);
      }
    }
  }
}

/*
function getTargets(target, clients) {
  if (target === "all") {
    return [...clients.values()];
  } else {
    const clientId = parseInt(target, 10);
    if (isNaN(clientId)) {
      console.warn(`Invalid target id`);
      return [];
    }
    const client = clients.get(clientId);
    if (!client) {
      console.warn(`client=${clientId} not found`);
      return [];
    }
    return [client];
  }
}
*/
function getTarget(id, clients) {
  const clientId = parseInt(id, 10);
  if (isNaN(clientId)) {
    console.warn(`Invalid client id`);
    return null;
  }
  const client = clients.get(clientId);
  if (!client) {
    console.warn(`client=${clientId} not found`);
    return null;
  }
  return client;
}


const wss = new WebSocketServer({ port: PORT });
const clients = new Map();
let nextClientId = 1;

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  log.info(`client [${ip}] connected`);

  // const clientId = nextClientId++;
  // clients.set(clientId, ws);
  // ws.id = clientId;
  //console.log(`client [${clientId}] connected`);

  // const executeCommand = {
  //   type: 'execute',
  //   payload: "document.body.style.backgroundColor = 'blue';"
  // };
  // ws.send(JSON.stringify(executeCommand));

  //const subscribeCommnand = { type: 'subscribe', payload: 'click' };
  //ws.send(JSON.stringify(subscribeCommnand));

  ws.on('message', messageRaw => {
    // console.log(`message from client: ${messageRaw.toString()}`);
    const message = JSON.parse(messageRaw);
    switch (message.type) {
      case 'init':
        const clientId = nextClientId++;
        ws.id = clientId;
        const client = new Client(clientId, ws, ip, message.payload);
        clients.set(clientId, client);
        log.info(`client init: ${client.getInfo()}`);
        break;
      case 'event':
        log.info('received event from client:', message.payload);
        break;
      default:
        log.warn('received unhandled message type:', message.payload);
    }
  });
  ws.on('close', () => {
    if (ws.id) {
      log.info(`client [${ws.id}] disconnected`);
      clients.delete(ws.id);
    } else {
      log.warn('An uninitialzed client disconnected');
    }
  });
  ws.on('error', error => {
    log.error('websocket error', error);
  });
});
log.info(`Server started on ${HOST}:${PORT}`);


process.stdin.on('data', data => {
  const input = data.toString().trim();
  const parts = input.split(/\s+/);
  const command = parts[0];
  const target = parts[1];
  let eventType = '';
  let payload = '';
  if (command === "execute") {
    payload = parts.splice(2).join(' ');
  } else if (command === "subscribe" || command === "unsubscribe") {
    eventType = parts[2];
  }

  if (command === "clients") {
    if (clients.size === 0) {
      console.info("0 clients connected");
      return;
    }
    for (const client of clients.values()) {
      console.info(` - ${client.getInfo()}`);
    }
    return;
  }
  if (command === "subscribe" && target && eventType) {
    if (target === "all") {
      Client.broadcast(clients, "subscribe", eventType);
    } else {
      const client = getTarget(target, clients);
      if (client) {
        log.info(`Subscribing client=${client.id}:event:${eventType}`);
        client.send('subscribe', eventType);
      }
    }
    return;
  }
  if (command === "unsubscribe" && target && eventType) {
    if (target === "all") {
      log.info(`Unsubscribing ALL from event=${eventType}`);
      Client.broadcast(clients, "unsubscribe", eventType);
    } else {
      const client = getTarget(target, clients);
      if (client) {
        log.info(`Unsubscribing client=${client.id}:event=${eventType}`);
        client.send('unsubscribe', eventType);
      }
    }
    return;
  }
  if (command === "execute" && target && payload) {
    if (target === "all") {
      log.info(`Executing on ALL clients: ${payload}`);
      Client.broadcast(clients, 'execute', payload);
    } else {
      const client = getTarget(target, clients);
      if (client) {
        log.info(`Executing client=${client.id}:code=${payload}`);
        client.send('execute', payload);
      }
    }
    return;
  }
  if (command === 'help') {
    console.log('  clients       - List all connected clients');
    console.log('  execute <id|all> <js>  - Run js code on client(s)');
    console.log('  subscribe <id|all> <eventType> - Subscribe client(s) to a event');
    console.log('  unsubscribe <id|all> <eventType> - Unsubscribe client(s) from event');
    //...
    return;
  }
  console.log(`Unknown command [${command}] target=${target} payload=${payload}`);
});
