export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.gameId = null;
    this.isConnected = false;
  }

  init() {
    this.peer = new Peer();

    this.peer.on("open", (id) => {
      console.log("My peer ID is:", id);
      this.gameId = id;
    });

    this.peer.on("connection", (conn) => {
      console.log("Received connection from:", conn.peer);
      this.connection = conn;
      this.setupConnection();
    });

    this.peer.on("error", (err) => {
      console.error("PeerJS error:", err);
      alert("Connection error: " + err.type);
    });
  }

  connect(hostId) {
    console.log("Attempting to connect to:", hostId);
    try {
      this.connection = this.peer.connect(hostId);
      this.gameId = hostId;
      this.setupConnection();
    } catch (err) {
      console.error("Failed to connect:", err);
      alert("Failed to connect to game");
    }
  }

  setupConnection() {
    if (!this.connection) {
      console.error("No connection to setup");
      return;
    }

    this.connection.on("open", () => {
      console.log("Connection established!");
      this.isConnected = true;
      // Send initial player data
      this.sendData({
        type: "player-joined",
        data: {
          // Add relevant player data here
        },
      });
    });

    this.connection.on("data", (data) => {
      console.log("Received data:", data);
      // Handle different types of game data
      switch (data.type) {
        case "player-position":
          // Handle player position updates
          break;
        case "player-action":
          // Handle player actions (shooting, etc)
          break;
        // Add more cases as needed
      }
    });

    this.connection.on("close", () => {
      console.log("Connection closed");
      this.isConnected = false;
      alert("Connection to game lost");
    });

    this.connection.on("error", (err) => {
      console.error("Connection error:", err);
      this.isConnected = false;
      alert("Connection error occurred");
    });
  }

  sendData(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    } else {
      console.warn("Tried to send data but connection is not open");
    }
  }

  isHost() {
    return this.peer && this.gameId === this.peer.id;
  }

  getGameId() {
    return this.gameId;
  }

  isGameConnected() {
    return this.isConnected;
  }
}
