"use strict";

import { WebSocketServer } from 'ws';
import Client from './client.js';

function startServer(config) {
  const wss = new WebSocketServer({ port: config.port, host: config.host });
  const clients = new Map();
  let nextClientId = 1;
  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    ws.on('message', messageRaw => {
      const msg = JSON.parse(messageRaw);
      switch (msg.type) {
        case 'init':
          const clientId = nextClientId++;
          ws.id = clientId;
          const client = new Client(clientId, ws, ip, msg.payload);
          clients.set(clientId, client);
          console.info(`client ${clientId} init`);
          break;
        case 'event':
          console.info('event:', msg.payload);
          break;
        default:
          console.warn('unhandled message type:', msg.payload);
      }
    });
    ws.on('close', () => {
      if (ws.id) {
        clients.delete(ws.id);
        console.info(`client ${ws.id} disconnected`);
      } else {
        console.warn('uninitialzed client disconnected');
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
