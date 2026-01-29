"use strict";

import { log } from './log.js';

class Client {
  constructor(id, ws, ip, initPayload) {
    this.id = id
    this.ws = ws;
    this.ip = ip;
    this.url = initPayload.url;
    this.agent = initPayload.agent;
    this.connectionTime = new Date();
  }
  send(type, payload) {
    if (this.ws.readyState !== this.ws.constructor.OPEN) {
      log.error(`Cannot send data to client=${this.id}, not connected`);
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
export default Client;
