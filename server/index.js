const { WebSocketServer } = require('ws');

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
    return `id: ${this.id}, ip: ${this.ip}, url: ${this.url}`;
  }
}

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
      console.warn(`Invalid port specified, using default ${PORT}`);
    }
  }
});

const wss = new WebSocketServer({ port: PORT });
const clients = new Map();
let nextClientId = 1;

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`client [${ip}] connected`);

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
    console.log(`message from client: ${messageRaw.toString()}`);
    const message = JSON.parse(messageRaw);
    switch (message.type) {
      case 'init':
        console.log('client init message');
        const clientId = nextClientId++;
        ws.id = clientId;
        const client = new Client(clientId, ws, ip, message.payload);
        clients.set(clientId, client);
        console.log(`client session [${clientId}] init -> ${client.getInfo()}`);
        break;
      case 'event':
        console.log('received event from client:', message.payload);
        break;
      default:
        console.log('received unhandled message type:', message.payload);
    }
  });
  ws.on('close', () => {
    if (ws.id) {
      console.log(`client [${ws.id}] disconnected`);
      clients.delete(ws.id);
    } else {
      console.log('An uninitialzed client disconnected');
    }
  });
  ws.on('error', error => {
    console.error('websocket error', error);
  });
});
console.log(`Server started on ${HOST}:${PORT}`);


process.stdin.on('data', data => {
  const input = data.toString().trim();
  const [command, target, ...payloadParts] = input.split(' ');
  const payload = payloadParts.join(' ');
  if (command === "clients") {
    if (clients.size === 0) {
      console.log("No clients connected");
      return;
    }
    console.log("Clients connected:");
    for (const client of clients.values()) {
      console.log(` - ${client.getInfo()}`);
    }
    return;
  }
  if (command === 'help') {
    console.log('Available commands:');
    console.log('  clients       - List all connected clients');
    console.log('  run <id> <js> - Run js code on given client');
    console.log('  run all <js>  - Run js code on all clients');
    return;
  }
  console.log("Unknown command");
});
