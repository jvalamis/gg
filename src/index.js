import { config } from "./config.js";
import BootScene from "./scenes/BootScene.js";
import MenuScene from "./scenes/MenuScene.js";
import GameScene from "./scenes/GameScene.js";

const gameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: config.debug,
    },
  },
  scene: [BootScene, MenuScene, GameScene],
};

const game = new Phaser.Game(gameConfig);
