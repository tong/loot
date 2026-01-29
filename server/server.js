"use strict";

import { WebSocketServer } from 'ws';
import Client from './client.js';
import { log } from './log.js';

function startServer(config) {
  const wss = new WebSocketServer({ port: config.port, host: config.host });
  const clients = new Map();
  let nextClientId = 1;
  wss.on('connection', (ws, req) => {
    log.log('client socket connected');
    const ip = req.socket.remoteAddress;
    ws.on('message', messageRaw => {
      const msg = JSON.parse(messageRaw);
      log.log('message received:', msg);
      switch (msg.type) {
        case 'init':
          const clientId = nextClientId++;
          ws.id = clientId;
          const client = new Client(clientId, ws, ip, msg.payload);
          clients.set(clientId, client);
          log.info(`client ${clientId} init`);
          break;
        case 'event':
          log.info('event:', msg.payload);
          break;
        default:
          log.warn('unhandled message type:', msg.type);
      }
    });
    ws.on('close', () => {
      if (ws.id) {
        clients.delete(ws.id);
        log.info(`client ${ws.id} disconnected`);
      } else {
        log.warn('uninitialzed client disconnected');
      }
    });
    ws.on('error', error => {
      log.error('websocket error', error);
    });
  });
  log.info(`Server started on ${config.host}:${config.port}`);
  return clients;
}
export { startServer };
