import { NetworkManager } from "../services/NetworkManager.js";

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

    // Create NetworkManager when hosting
    hostButton.on("pointerdown", () => {
      const networkManager = new NetworkManager();
      networkManager.init();

      // Show and update the game ID text
      networkManager.peer.on("open", (id) => {
        // Create a persistent game ID display that stays visible
        const gameIdDisplay = this.add
          .text(400, 400, `Game ID: ${id}`, {
            fontSize: "24px",
            fill: "#fff",
            stroke: "#000",
            strokeThickness: 4,
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5);

        // Pass the game ID to the next scene
        this.registry.set("gameId", id);

        // Add copy button
        const copyButton = this.add
          .text(520, 400, "Copy", {
            fontSize: "20px",
            fill: "#fff",
            backgroundColor: "#444",
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0, 0.5)
          .setInteractive();

        copyButton.on("pointerdown", () => {
          navigator.clipboard.writeText(id).then(() => {
            copyButton.setText("Copied!");
            this.time.delayedCall(1000, () => {
              copyButton.setText("Copy");
            });
          });
        });
      });

      this.scene.start("CharacterSelectScene", {
        isHost: true,
        team: "red",
        networkManager: networkManager,
      });
    });

    joinButton.on("pointerdown", () => {
      const peerId = prompt("Enter host's game ID:");
      if (peerId) {
        const networkManager = new NetworkManager();
        networkManager.init();
        networkManager.connect(peerId);

        this.scene.start("CharacterSelectScene", {
          isHost: false,
          team: "blue",
          networkManager: networkManager,
        });
      }
    });
  }
}
