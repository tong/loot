"use strict";

import process from 'process';

const config = {
  host: "0.0.0.0",
  port: 8888
};

process.argv.forEach((arg, index) => {
  if (arg === "--host" && process.argv[index + 1]) {
    config.host = process.argv[index + 1];
  }
  if (arg === "--port" && process.argv[index + 1]) {
    const parsedPort = parseInt(process.argv[index + 1], 10);
    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
      config.port = parsedPort;
    } else {
      console.error(`Invalid port value`);
      process.exit(1);
    }
  }
});

export default config;
