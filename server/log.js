"use strict";

class Logger {
  static _formatTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${sec}.${ms}`;
  }

  _print(level, message, ...args) {
    const time = Logger._formatTime(new Date());
    let colorCode = '';
    switch (level) {
      case 'info':
        colorCode = '\x1b[36m';
        break;
      case 'warn':
        colorCode = '\x1b[35m';
        break;
      case 'error':
        colorCode = '\x1b[31m';
        break;
      case 'log':
      default:
        colorCode = '\x1b[37m';
        break;
    }
    const resetColor = '\x1b[0m';
    const coloredLevel = `${colorCode}[${level.toUpperCase()}]${resetColor}`;
    const finalFormattedMessage = `[${time}] ${coloredLevel} ${message}`;
    switch (level) {
      case 'info':
        console.info(finalFormattedMessage, ...args);
        break;
      case 'warn':
        console.warn(finalFormattedMessage, ...args);
        break;
      case 'error':
        console.error(finalFormattedMessage, ...args);
        break;
      case 'log':
      default:
        console.log(finalFormattedMessage, ...args);
        break;
    }
  }

  log(message, ...args) {
    this._print('log', message, ...args);
  }

  info(message, ...args) {
    this._print('info', message, ...args);
  }

  warn(message, ...args) {
    this._print('warn', message, ...args);
  }

  error(message, ...args) {
    this._print('error', message, ...args);
  }
}

const log = new Logger();
export { log };
