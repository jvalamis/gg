import { config } from "../config.js";
import Phaser from "phaser";

// Log config to verify it's loaded
console.log("Game config loaded:", {
  port: config.port,
  // Don't log the secret in production!
  secretFirstChar: config.gameSecret.charAt(0) + "...",
});

const gameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(gameConfig);

let player;
let cursors;
let platforms;

function preload() {
  // Load assets
  this.load.image("sky", "https://labs.phaser.io/assets/skies/space3.png");
  this.load.image(
    "ground",
    "https://labs.phaser.io/assets/sprites/platform.png"
  );
  this.load.spritesheet(
    "soldier",
    "https://labs.phaser.io/assets/sprites/dude.png",
    { frameWidth: 32, frameHeight: 48 }
  );
}

function create() {
  // Add background
  this.add.image(400, 300, "sky");

  // Add platforms
  platforms = this.physics.add.staticGroup();
  platforms.create(400, 568, "ground").setScale(2).refreshBody();
  platforms.create(600, 400, "ground");
  platforms.create(50, 250, "ground");
  platforms.create(750, 220, "ground");

  // Add player
  player = this.physics.add.sprite(100, 450, "soldier");
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);

  // Player animations
  this.anims.create({
    key: "left",
    frames: this.anims.generateFrameNumbers("soldier", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: "turn",
    frames: [{ key: "soldier", frame: 4 }],
    frameRate: 20,
  });

  this.anims.create({
    key: "right",
    frames: this.anims.generateFrameNumbers("soldier", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });

  // Add collider
  this.physics.add.collider(player, platforms);

  // Input
  cursors = this.input.keyboard.createCursorKeys();

  // Follow player with camera
  this.cameras.main.startFollow(player);
}

function update() {
  // Player movement
  if (cursors.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play("left", true);
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
    player.anims.play("right", true);
  } else {
    player.setVelocityX(0);
    player.anims.play("turn");
  }

  if (cursors.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  // Rotate player towards mouse
  let angle = Phaser.Math.Angle.Between(
    player.x,
    player.y,
    this.input.activePointer.worldX,
    this.input.activePointer.worldY
  );
  player.rotation = angle;
}
