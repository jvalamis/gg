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

    // Add team selection buttons
    const redButton = this.add
      .text(400, 300, "Join Red Team", {
        fontSize: "24px",
        fill: "#ff0000",
        backgroundColor: "#333",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive();

    const blueButton = this.add
      .text(400, 350, "Join Blue Team", {
        fontSize: "24px",
        fill: "#0000ff",
        backgroundColor: "#333",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive();

    // Handle team selection
    redButton.on("pointerdown", () => {
      this.scene.start("GameScene", { team: "red" });
    });

    blueButton.on("pointerdown", () => {
      this.scene.start("GameScene", { team: "blue" });
    });
  }
}
