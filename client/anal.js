
const PORT = 8888;
const socket = new WebSocket(`ws://localhost:${PORT}`);
socket.onopen = () => {
  console.log('connected');
  //socket.send("hello!");
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
      break;
    default:
      console.log('unknown message type:', message.type);
  }
};
socket.onclose = () => {
  console.log('disconnected');
};
socket.onerror = (error) => {
  console.error(error);
};
