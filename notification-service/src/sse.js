const clients = new Map();

function addClient(userId, res) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);
  res.on("close", () => {
    clients.get(userId)?.delete(res);
    if (clients.get(userId)?.size === 0) {
      clients.delete(userId);
    }
  });
}

function broadcast(userId, data) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of userClients) {
    try {
      res.write(payload);
    } catch (e) {
      userClients.delete(res);
    }
  }
  if (userClients.size === 0) {
    clients.delete(userId);
  }
}

function broadcastToAll(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const [userId, userClients] of clients) {
    for (const res of userClients) {
      try {
        res.write(payload);
      } catch (e) {
        userClients.delete(res);
      }
    }
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

function getClientCount() {
  let count = 0;
  for (const userClients of clients.values()) {
    count += userClients.size;
  }
  return count;
}

module.exports = { addClient, broadcast, broadcastToAll, getClientCount };
