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

      // Container for game ID and waiting text
      const idContainer = this.add.container(400, 400);

      // Show game ID when peer connection is open
      networkManager.peer.on("open", (id) => {
        console.log("Host: Got peer ID:", id);

        // Game ID text
        const gameIdText = this.add
          .text(0, 0, `Game ID: ${id}`, {
            fontSize: "24px",
            fill: "#fff",
            stroke: "#000",
            strokeThickness: 4,
          })
          .setOrigin(0.5);

        // Copy button with background
        const copyButton = this.add
          .text(120, 0, "Copy ID", {
            fontSize: "20px",
            fill: "#fff",
            backgroundColor: "#444",
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0, 0.5)
          .setInteractive({ useHandCursor: true })
          .on("pointerover", () =>
            copyButton.setStyle({ backgroundColor: "#555" })
          )
          .on("pointerout", () =>
            copyButton.setStyle({ backgroundColor: "#444" })
          )
          .on("pointerdown", () => {
            // Fallback copy method
            const textArea = document.createElement("textarea");
            textArea.value = id;
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand("copy");
              copyButton.setText("Copied!");
              copyButton.setStyle({ backgroundColor: "#228B22" });
              this.time.delayedCall(1000, () => {
                copyButton.setText("Copy ID");
                copyButton.setStyle({ backgroundColor: "#444" });
              });
            } catch (err) {
              console.error("Copy failed:", err);
              copyButton.setText("Copy Failed");
              copyButton.setStyle({ backgroundColor: "#FF0000" });
            }
            document.body.removeChild(textArea);
          });

        // Waiting text
        const waitingText = this.add
          .text(0, 50, "Waiting for player to join...", {
            fontSize: "24px",
            fill: "#fff",
            stroke: "#000",
            strokeThickness: 4,
          })
          .setOrigin(0.5);

        idContainer.add([gameIdText, copyButton, waitingText]);
      });

      // Set up onPlayerJoin callback
      networkManager.onPlayerJoin = () => {
        console.log("Host: Player joined, starting game!");
        this.scene.start("CharacterSelectScene", {
          isHost: true,
          team: "red",
          networkManager: networkManager,
        });
      };
    });

    joinButton.on("pointerdown", () => {
      const peerId = prompt("Enter host's game ID:");
      if (peerId) {
        console.log("Client: Attempting to join game:", peerId);
        const networkManager = new NetworkManager();
        networkManager.init();

        // Wait for peer to be ready before connecting
        networkManager.peer.on("open", () => {
          networkManager.connect(peerId);

          this.scene.start("CharacterSelectScene", {
            isHost: false,
            team: "blue",
            networkManager: networkManager,
          });
        });
      }
    });
  }
}
