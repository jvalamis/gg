import Peer from "peerjs";

export class NetworkManager {
  constructor() {
    this.peer = new Peer();
    this.connections = new Map();
    this.setupPeer();
  }

  setupPeer() {
    this.peer.on("open", (id) => {
      console.log("My peer ID is:", id);
      // Show this ID somewhere for other players to connect
    });

    this.peer.on("connection", (conn) => {
      this.handleConnection(conn);
    });
  }

  connect(peerId) {
    const conn = this.peer.connect(peerId);
    this.handleConnection(conn);
  }

  handleConnection(conn) {
    this.connections.set(conn.peer, conn);

    conn.on("data", (data) => {
      // Handle received game data
      this.handleGameData(data);
    });
  }

  broadcastGameState(state) {
    this.connections.forEach((conn) => {
      conn.send(state);
    });
  }
}
