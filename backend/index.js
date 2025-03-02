import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';

const wss = new WebSocketServer({ port: 8080 });

let rooms = {};
let receiverIdRooms = {};
let socketsToUserids = {};
let useridsToSockets = {};

wss.on('connection', function connection(ws) {
  const userId = uuid();
  useridsToSockets[userId] = ws;
  socketsToUserids[ws] = userId;
  receiverIdRooms[userId] = [];

  // Notify user of their assigned unique ID
  ws.send(JSON.stringify({ type: 'userIdAssigned', userId }));

  ws.on('message', function message(data) {
    const message = JSON.parse(data);

    if (message.type === 'checkRoom') {
      const { roomId } = message;
      const exists = rooms[roomId] ? true : false;
      ws.send(JSON.stringify({ type: 'roomExists', roomId, exists }));
    }

    // Create Room
    else if (message.type === 'createRoom') {
      const roomId = userId;
      rooms[roomId] = [userId]; // Auto-add creator
      receiverIdRooms[userId].push(roomId);
      ws.send(JSON.stringify({ type: 'roomCreated', roomId }));
      console.log(`Room edrtfgybhjnmdrdtfygjghnm ${roomId} created by ${userId}`);
    }

    // Join Room
    else if (message.type === 'joinRoom') {
      const { roomId } = message;
      if (!rooms[roomId]) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Room does not exist' }));
      }
      if (!rooms[roomId].includes(userId)) {
        rooms[roomId].push(userId);
      }
      receiverIdRooms[userId].push(roomId);
      ws.send(JSON.stringify({ type: 'roomJoined', roomId, users: rooms[roomId]}));
      console.log(`User ${userId} joined room ${roomId}`);

      // Notify other users
      rooms[roomId].forEach(receiverId => {
        if (receiverId !== userId) {
          const receiverSocket = useridsToSockets[receiverId];
          if (receiverSocket) {
            receiverSocket.send(JSON.stringify({
              type: "new-member",
              senderId: userId,
              users: rooms[roomId],
            }));
          }
        }
      });
    }

    // ICE Candidate Exchange
    else if (message.type === 'exchangeCandidate') {
      const { roomId, candidate, senderId } = message;
      if (!roomId || !candidate) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Invalid ICE candidate exchange' }));
      }
      if (!rooms[roomId]) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Room does not exist' }));
      }

      // Send ICE candidates to all peers
      rooms[roomId].forEach(receiverId => {
        if (receiverId !== senderId) {
          useridsToSockets[receiverId]?.send(JSON.stringify({ type: "ice-candidate", candidate, senderId }));
        }
      });

      console.log(`ICE candidate exchanged in room ${roomId}`);
    }
  });

  // Handle user disconnection
  ws.on('close', () => {
    Object.keys(rooms).forEach(roomId => {
      rooms[roomId] = rooms[roomId].filter(id => id !== userId);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    });

    
    console.log(`User ${userId} disconnected`);
  });
});
