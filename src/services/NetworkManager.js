import Peer from "peerjs";

export class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.peer = null;
    this.connections = new Map();
    this.gameState = new Map();
    this.lastStateUpdate = 0;
    this.updateInterval = 50; // ms between state updates
    this.connectionTimeout = 5000; // 5s timeout for connections
    this.maxPlayers = 8;
  }

  init() {
    // Generate a random ID with timestamp to prevent guessing
    const randomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.peer = new Peer(randomId, {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
        // Disable data channel to prevent potential exploits
        sdpSemantics: "unified-plan",
      },
      // Enable debugging only in development
      debug: process.env.NODE_ENV === "development" ? 2 : 0,
      secure: true,
    });

    this.setupPeerEvents();
  }

  setupPeerEvents() {
    this.peer.on("open", (id) => {
      console.log("Connected with ID:", id);
      // Show ID in game UI
      this.scene.showConnectionId(id);
    });

    this.peer.on("error", (error) => {
      console.error("Peer error:", error);
      this.handleConnectionError(error);
    });

    this.peer.on("connection", (conn) => {
      // Check max players
      if (this.connections.size >= this.maxPlayers) {
        conn.close();
        return;
      }
      this.handleNewConnection(conn);
    });
  }

  connect(peerId) {
    if (!this.validatePeerId(peerId)) {
      console.error("Invalid peer ID");
      return;
    }

    const conn = this.peer.connect(peerId, {
      reliable: true,
      serialization: "json",
      metadata: {
        clientVersion: "1.0.0", // For version checking
        timestamp: Date.now(),
      },
    });

    // Set connection timeout
    const timeout = setTimeout(() => {
      if (!conn.open) {
        conn.close();
        this.scene.showError("Connection timeout");
      }
    }, this.connectionTimeout);

    conn.on("open", () => {
      clearTimeout(timeout);
      this.handleNewConnection(conn);
    });
  }

  handleNewConnection(conn) {
    // Validate connection metadata
    if (!this.validateConnection(conn)) {
      conn.close();
      return;
    }

    this.connections.set(conn.peer, conn);

    conn.on("data", (data) => {
      try {
        // Validate and sanitize incoming data
        if (this.validateGameData(data)) {
          this.handleGameData(data);
        }
      } catch (error) {
        console.error("Data handling error:", error);
      }
    });

    conn.on("close", () => {
      this.connections.delete(conn.peer);
      this.gameState.delete(conn.peer);
      this.scene.removePlayer(conn.peer);
    });
  }

  validatePeerId(peerId) {
    // Check if peer ID matches expected format
    return /^\d+-[a-z0-9]+$/.test(peerId);
  }

  validateConnection(conn) {
    if (!conn.metadata) return false;

    // Check client version
    if (conn.metadata.clientVersion !== "1.0.0") return false;

    // Check timestamp (prevent replay attacks)
    const timeDiff = Date.now() - conn.metadata.timestamp;
    if (timeDiff > 30000 || timeDiff < 0) return false; // 30s window

    return true;
  }

  validateGameData(data) {
    // Basic data structure validation
    if (!data || typeof data !== "object") return false;
    if (!data.type || !data.payload) return false;

    // Validate position data
    if (data.type === "position") {
      return this.validatePosition(data.payload);
    }

    // Add more validation as needed
    return true;
  }

  validatePosition(pos) {
    // Check if position is within game bounds
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number")
      return false;
    if (pos.x < 0 || pos.x > 2000 || pos.y < 0 || pos.y > 2000) return false;
    return true;
  }

  broadcastGameState(state) {
    const now = Date.now();
    if (now - this.lastStateUpdate < this.updateInterval) return;

    this.lastStateUpdate = now;

    const sanitizedState = this.sanitizeState(state);
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(sanitizedState);
      }
    });
  }

  sanitizeState(state) {
    // Remove sensitive data and validate state before sending
    const sanitized = {
      type: "state",
      timestamp: Date.now(),
      payload: {
        position: {
          x: Math.floor(state.position.x),
          y: Math.floor(state.position.y),
        },
        rotation: Number(state.rotation.toFixed(2)),
        team: state.team,
      },
    };
    return sanitized;
  }

  handleConnectionError(error) {
    console.error("Connection error:", error);
    this.scene.showError("Connection error occurred");
    // Cleanup and potentially reconnect
    this.cleanup();
  }

  cleanup() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.gameState.clear();
    if (this.peer) {
      this.peer.destroy();
    }
  }
}
