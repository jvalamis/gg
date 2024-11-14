export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null;
  }

  init() {
    this.peer = new Peer();

    this.peer.on("open", (id) => {
      console.log("My peer ID is:", id);
    });

    this.peer.on("connection", (conn) => {
      this.connection = conn;
      this.setupConnection();
    });
  }

  connect(hostId) {
    this.connection = this.peer.connect(hostId);
    this.setupConnection();
  }

  setupConnection() {
    this.connection.on("open", () => {
      console.log("Connected to peer");
    });

    this.connection.on("data", (data) => {
      // Handle received game data
      console.log("Received:", data);
    });
  }

  sendGameData(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    }
  }
}
