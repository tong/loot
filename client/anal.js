"use strict";

export class Anal {
  static #instance;
  #worker;
  #workerPort;
  #userOnMessageHandler = () => { };

  constructor(url, config = {}) {
    if (Anal.#instance) {
      if (Anal.#instance.config.debug) {
        console.warn("Anal: Singleton instance already exists. Returning existing instance.");
      }
      return Anal.#instance;
    }
    this.url = url;
    this.config = { debug: false, ...config };

    try {
      this.#worker = new SharedWorker("sw.js", { type: "module" });
      this.#workerPort = this.#worker.port;
      this.#workerPort.start();
      this.#workerPort.onmessage = (e) => {
        const msg = e.data;
        if (this.config.debug) {
          console.log("Anal: Received message from worker:", msg);
        }
        if (msg.type === 'execute') {
          try {
            if (this.config.debug) {
              console.log("Anal: Executing code from server:", msg.payload);
            }
            eval(msg.payload);
          } catch (err) {
            console.error('Anal: Error executing code from server:', err);
          }
        }
        this.#userOnMessageHandler(e);
      };
      this.#workerPort.onmessageerror = (e) => {
        console.error("Anal: Message error from worker:", e);
      };
    } catch (e) {
      console.error("Anal: Failed to initialize SharedWorker:", e);
      throw new Error("SharedWorker is not supported or enabled in this browser.");
    }

    Anal.#instance = this;
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
            console.log("Anal: Connection to worker established.");
          }
          cleanup();
          resolve();
        } else if (e.data.type === "error") {
          console.error("Anal: Connection error from worker:", e.data.error);
          cleanup();
          reject(new Error(e.data.error));
        } else if (originalOnMessage) {
          originalOnMessage(e);
        }
      };
      this.#workerPort.onmessageerror = (e) => {
        console.error("Anal: Message error during connect:", e);
        cleanup();
        reject(new Error("Shared worker message error during connect."));
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
        console.log("Anal: Shutdown message sent to worker.");
      }
    } else {
      if (this.config.debug) {
        console.warn("Anal: Not connected to a shared worker.");
      }
    }
  }

  send(data) {
    if (this.#workerPort) {
      this.#workerPort.postMessage({ type: "send", data: data });
    } else {
      console.error("Anal: Cannot send data: Shared Worker port not available.");
    }
  }

  onMessage(callback) {
    if (typeof callback === 'function') {
      this.#userOnMessageHandler = callback;
    } else if (this.config.debug) {
      console.warn("Anal: onMessage callback must be a function.");
    }
  }

  onMessageError(callback) {
    if (this.#workerPort) {
      this.#workerPort.onmessageerror = callback;
    } else if (this.config.debug) {
      console.warn("Anal: Worker port not initialized. Cannot set onMessageError handler.");
    }
  }
}
