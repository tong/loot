"use strict";

import process from 'process';
import * as readline from 'readline';
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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "anal < "
  });
  rl.prompt();
  rl.on("line", (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }
    const parts = input.split(/\s+/);
    const command = parts[0];
    const target = parts[1];
    let eventType = '';
    let payload = '';
    if (command === "execute") {
      payload = parts.slice(2).join(' ');
    } else if (command === "subscribe" || command === "unsubscribe") {
      eventType = parts[2];
    }
    switch (command) {
      case "clients":
        if (clients.size === 0) {
          console.info("0 clients connected");
        } else {
          for (const client of clients.values()) {
            console.info(` - ${client.getInfo()}`);
          }
        }
        break;
      case "subscribe":
      case "sub":
        if (!target || !eventType) {
          console.warn("Usage: subscribe <id|all> <event>");
          break;
        }
        if (target === "all") {
          Client.broadcast(clients, "subscribe", eventType);
        } else {
          const client = getTarget(target, clients);
          if (client) {
            console.info(`Subscribing client=${client.id}:event:${eventType}`);
            client.send('subscribe', eventType);
          }
        }
        break;
      case "unsubscribe":
      case "unsub":
        if (!target || !eventType) {
          console.warn("Usage: unsubscribe <id|all> <event>");
          break;
        }
        if (target === "all") {
          // console.info(`Unsubscribing ALL from event=${eventType}`);
          Client.broadcast(clients, "unsubscribe", eventType);
        } else {
          const client = getTarget(target, clients);
          if (client) {
            console.info(`Unsubscribing client=${client.id}:event=${eventType}`);
            client.send('unsubscribe', eventType);
          }
        }
        break;
      case "execute":
      case "exe":
        console.log(target, payload);
        if (!target || !payload) {
          console.warn("Usage: execute <id|all> <js>");
          break;
        }
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
        break;
      case "help":
      case "h":
        console.log('  clients       - List all connected clients');
        console.log('  execute <id|all> <js>  - Run js code on client(s)');
        console.log('  subscribe <id|all> <eventType> - Subscribe client(s) to a event');
        console.log('  unsubscribe <id|all> <eventType> - Unsubscribe client(s) from event');
        break;
      case "exit":
      case "quit":
        process.exit(0);
      default:
        console.log(`Unknown command [${command}] target=${target} payload=${payload}`);
    }
    rl.prompt();
  }).on("close", () => {
    console.log("Exiting REPL");
    process.exit(0);
  });
}

export { startRepl };
