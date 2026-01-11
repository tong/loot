
const PORT = 8888;

const activeListeners = {};

const socket = new WebSocket(`ws://localhost:${PORT}`);
socket.onopen = () => {
  console.log('anal connected');
  socket.send(JSON.stringify({
    type: 'init', payload: {
      url: window.location.href,
      agent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      referrer: document.referrer
    }
  }));
};
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
  switch (message.type) {
    case 'execute':
      console.log('executing code:', message.payload);
      try {
        eval(message.payload);
      } catch (e) {
        console.error("error executing payload:", e);
      }
      break;
    case 'subscribe':
      const eventType = message.payload;
      if (activeListeners[eventType]) {
        console.log(`Already subscribed to event=${eventType}`);
        return;
      }
      console.log(`subscribing to event=${eventType}`);
      const handler = e => {
        const eventMessage = {
          type: 'event',
          payload: {
            event: eventType,
            //TODO: event related data
            // x: e.clientX,
            // y: e.clientY,
            // target: e.target.tagName
          },
        };
        socket.send(JSON.stringify(eventMessage));
      };
      activeListeners[eventType] = handler;
      document.addEventListener(eventType, handler);
      /*
            console.log(`subscribing to ${eventType} events`);
            document.addEventListener(eventType, e => {
              const eventMessage = {
                type: 'event',
                payload: {
                  event: eventType,
                  x: e.clientX,
                  y: e.clientY,
                  target: e.target.tagName
                }
              };
              socket.send(JSON.stringify(eventMessage));
            });
            */
      break;
    case 'unsubscribe':
      const eventTypeToUnsub = message.payload;
      const listener = activeListeners[eventTypeToUnsub];
      if (listener) {
        console.log(`Unsubscribing from event=${eventTypeToUnsub}`);
        document.removeEventListener(eventTypeToUnsub, listener);
        delete activeListeners[eventTypeToUnsub];
      } else {
        console.log(`Not currently subscribed to event=${eventTypeToUnsub}`);
      }
      break;
    default:
      console.log(`Unknown message type=${message.type}`);
  }
};
socket.onclose = () => {
  console.log('disconnected');
};
socket.onerror = (error) => {
  console.error(error);
};
