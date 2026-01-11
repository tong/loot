"use strict";

import Client from './client.js';

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

function startRepl(clients) {
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
          console.info(`Subscribing client=${client.id}:event:${eventType}`);
          client.send('subscribe', eventType);
        }
      }
      return;
    }
    if (command === "unsubscribe" && target && eventType) {
      if (target === "all") {
        console.info(`Unsubscribing ALL from event=${eventType}`);
        Client.broadcast(clients, "unsubscribe", eventType);
      } else {
        const client = getTarget(target, clients);
        if (client) {
          console.info(`Unsubscribing client=${client.id}:event=${eventType}`);
          client.send('unsubscribe', eventType);
        }
      }
      return;
    }
    if (command === "execute" && target && payload) {
      if (target === "all") {
        console.info(`Executing on ALL clients: ${payload}`);
        Client.broadcast(clients, 'execute', payload);
      } else {
        const client = getTarget(target, clients);
        if (client) {
          console.info(`Executing client=${client.id}:code=${payload}`);
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
}

export { startRepl };
