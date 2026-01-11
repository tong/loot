"use strict";

import config from './cli.js';
import { startRepl } from './repl.js';
import { startServer } from './server.js';

const clients = startServer(config);
startRepl(clients);
