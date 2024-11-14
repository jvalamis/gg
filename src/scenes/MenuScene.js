export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    // Add title text
    this.add
      .text(400, 200, "GG - Soldat Clone", {
        fontSize: "32px",
        fill: "#fff",
      })
      .setOrigin(0.5);

    // Host game button
    const hostButton = this.add
      .text(400, 300, "Host Game", {
        fontSize: "24px",
        fill: "#ffffff",
        backgroundColor: "#333",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive();

    // Join game button
    const joinButton = this.add
      .text(400, 350, "Join Game", {
        fontSize: "24px",
        fill: "#ffffff",
        backgroundColor: "#333",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive();

    hostButton.on("pointerdown", () => {
      this.scene.start("GameScene", {
        isHost: true,
        team: "red",
      });
    });

    joinButton.on("pointerdown", () => {
      // Show dialog to enter host's peer ID
      const peerId = prompt("Enter host's game ID:");
      if (peerId) {
        this.scene.start("GameScene", {
          isHost: false,
          team: "blue",
          peerId: peerId,
        });
      }
    });
  }
}
