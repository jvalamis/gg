import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const players = new Map();

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join-game", ({ team }) => {
    players.set(socket.id, {
      id: socket.id,
      team,
      x: team === "red" ? 100 : 700,
      y: 400,
    });

    // Broadcast new player to everyone
    io.emit("player-joined", { id: socket.id, team });

    // Send existing players to new player
    socket.emit("players-sync", Array.from(players.values()));
  });

  socket.on("player-move", (position) => {
    const player = players.get(socket.id);
    if (player) {
      player.x = position.x;
      player.y = position.y;
      socket.broadcast.emit("player-moved", {
        id: socket.id,
        x: position.x,
        y: position.y,
      });
    }
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    io.emit("player-left", socket.id);
  });
});

httpServer.listen(3000);
