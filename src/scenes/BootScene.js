import { createPlaceholderSprites } from "../utils/spriteGenerator.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // Load character sprite
    this.load.spritesheet(
      "soldier",
      "https://labs.phaser.io/assets/sprites/dude.png",
      { frameWidth: 32, frameHeight: 48 }
    );

    // Generate placeholder sprites
    const sprites = createPlaceholderSprites();

    // Load generated sprites into Phaser
    this.textures.addBase64("red_soldier", sprites.redSoldier);
    this.textures.addBase64("blue_soldier", sprites.blueSoldier);
    this.textures.addBase64("red_flag", sprites.redFlag);
    this.textures.addBase64("blue_flag", sprites.blueFlag);
    this.textures.addBase64("rifle", sprites.rifle);
    this.textures.addBase64("bullet", sprites.bullet);

    // Create a simple tileset
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#666666";
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = "#999999";
    ctx.strokeRect(0, 0, 32, 32);

    this.textures.addBase64("tiles", canvas.toDataURL());
  }

  create() {
    // Create animations for red team
    this.anims.create({
      key: "red_idle",
      frames: [{ key: "red_soldier" }],
      frameRate: 1,
    });

    this.anims.create({
      key: "red_run",
      frames: [{ key: "red_soldier" }],
      frameRate: 1,
    });

    // Create animations for blue team
    this.anims.create({
      key: "blue_idle",
      frames: [{ key: "blue_soldier" }],
      frameRate: 1,
    });

    this.anims.create({
      key: "blue_run",
      frames: [{ key: "blue_soldier" }],
      frameRate: 1,
    });

    this.scene.start("MenuScene");
  }
}
