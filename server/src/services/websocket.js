import { v4 as uuidv4 } from 'uuid';

const clients = new Map();
const subscriptions = new Map();

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);

    console.log(`WebSocket client connected: ${clientId}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(clientId, ws, data);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      // Remove subscriptions for this client
      for (const [topic, subscribers] of subscriptions.entries()) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          subscriptions.delete(topic);
        }
      }
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));
  });

  // Start heartbeat interval
  setInterval(() => {
    for (const [clientId, ws] of clients.entries()) {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }
  }, 30000);

  console.log('WebSocket server initialized');
}

function handleMessage(clientId, ws, data) {
  switch (data.type) {
    case 'subscribe':
      subscribe(clientId, data.topic);
      ws.send(JSON.stringify({ type: 'subscribed', topic: data.topic }));
      break;

    case 'unsubscribe':
      unsubscribe(clientId, data.topic);
      ws.send(JSON.stringify({ type: 'unsubscribed', topic: data.topic }));
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${data.type}` }));
  }
}

function subscribe(clientId, topic) {
  if (!subscriptions.has(topic)) {
    subscriptions.set(topic, new Set());
  }
  subscriptions.get(topic).add(clientId);
}

function unsubscribe(clientId, topic) {
  if (subscriptions.has(topic)) {
    subscriptions.get(topic).delete(clientId);
  }
}

// Broadcast to all clients subscribed to a topic
export function broadcast(topic, data) {
  const subscribers = subscriptions.get(topic);
  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'message',
    topic,
    data,
    timestamp: new Date().toISOString()
  });

  for (const clientId of subscribers) {
    const ws = clients.get(clientId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

// Broadcast to all connected clients
export function broadcastAll(type, data) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  for (const [clientId, ws] of clients.entries()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}

// Send to specific client
export function sendToClient(clientId, type, data) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
}

// Topics for subscriptions
export const TOPICS = {
  DEVICES: 'devices',
  DEVICE_METRICS: (deviceId) => `metrics:${deviceId}`,
  TRAINING: (roundId) => `training:${roundId}`,
  ANOMALIES: 'anomalies',
  NOTIFICATIONS: (userId) => `notifications:${userId}`
};
