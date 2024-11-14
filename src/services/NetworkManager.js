export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.gameId = null;
  }

  init() {
    this.peer = new Peer();

    this.peer.on("open", (id) => {
      console.log("My peer ID is:", id);
      this.gameId = id;
    });

    this.peer.on("connection", (conn) => {
      this.connection = conn;
      this.setupConnection();
    });
  }

  connect(hostId) {
    this.connection = this.peer.connect(hostId);
    this.gameId = hostId;
    this.setupConnection();
  }

  setupConnection() {
    this.connection.on("open", () => {
      console.log("Connected to peer");
    });

    this.connection.on("data", (data) => {
      console.log("Received:", data);
    });
  }

  getGameId() {
    return this.gameId;
  }
}
