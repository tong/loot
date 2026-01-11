"use strict";

import { WebSocketServer } from 'ws';
import Client from './client.js';

function startServer(config) {

  const wss = new WebSocketServer({ port: config.port, host: config.host });
  const clients = new Map();
  let nextClientId = 1;

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.info(`client [${ip}] connected`);

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
          console.info(`client init: ${client.getInfo()}`);
          break;
        case 'event':
          console.info('received event from client:', message.payload);
          break;
        default:
          console.warn('received unhandled message type:', message.payload);
      }
    });
    ws.on('close', () => {
      if (ws.id) {
        console.info(`client [${ws.id}] disconnected`);
        clients.delete(ws.id);
      } else {
        console.warn('An uninitialzed client disconnected');
      }
    });
    ws.on('error', error => {
      console.error('websocket error', error);
    });
  });
  console.info(`Server started on ${config.host}:${config.port}`);
  return clients;
}
export { startServer };
