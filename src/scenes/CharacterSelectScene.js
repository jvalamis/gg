export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterSelectScene" });
    this.characters = [
      { name: "Demetrium" },
      { name: "Kevin" },
      { name: "Simon" },
      { name: "Greg" },
      { name: "James" },
      { name: "Brady" },
      { name: "Darren" },
      { name: "Trevor" },
      { name: "Matt" },
    ];
  }

  init(data) {
    this.isHost = data.isHost;
    this.team = data.team;
    this.networkManager = data.networkManager;
  }

  create() {
    // Title
    this.add
      .text(400, 50, "Choose Your Character", {
        fontSize: "32px",
        fill: "#fff",
      })
      .setOrigin(0.5);

    // Create character selection grid
    const startX = 200;
    const startY = 150;
    const spacing = 200;
    const itemsPerRow = 3;

    this.characters.forEach((char, index) => {
      const x = startX + (index % itemsPerRow) * spacing;
      const y = startY + Math.floor(index / itemsPerRow) * spacing;

      // Character name with background
      const nameText = this.add
        .text(x, y, char.name, {
          fontSize: "24px",
          fill: "#fff",
          backgroundColor: "#333",
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5);

      nameText.setInteractive();

      // Hover effects
      nameText.on("pointerover", () => {
        nameText.setStyle({ backgroundColor: "#555" });
      });

      nameText.on("pointerout", () => {
        nameText.setStyle({ backgroundColor: "#333" });
      });

      // Selection
      nameText.on("pointerdown", () => {
        this.selectCharacter(char);
      });
    });
  }

  selectCharacter(character) {
    // Pass networkManager to GameScene
    this.scene.start("GameScene", {
      isHost: this.isHost,
      team: this.team,
      character: character,
      networkManager: this.networkManager,
    });
  }
}
