export class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.peer = null;
    this.connection = null;
    this.players = new Map();
    this.playerId = null;
    this.lastPositionUpdate = 0;
    this.positionUpdateInterval = 50;
    this.lastPosition = null;
    this.positionThreshold = 1;
    this.onPlayerJoin = null;
    this.isHost = false;
    this.isConnected = false;
    this.queuedJoinResponse = null;
    this.queuedPlayers = [];
  }

  init() {
    console.log("Initializing NetworkManager");
    this.peer = new Peer();

    this.peer.on("open", (id) => {
      console.log("Connected with ID:", id);
      this.playerId = id;
    });

    // Handle incoming connections for host
    this.peer.on("connection", (conn) => {
      console.log("Host: Received connection from:", conn.peer);
      this.isHost = true;
      this.connection = conn;

      // Set up connection handlers immediately
      conn.on("open", () => {
        console.log("Host: Connection opened with peer");
        this.setupConnection(conn);

        // Important: Wait a short moment before starting game
        setTimeout(() => {
          if (this.onPlayerJoin) {
            console.log("Host: Starting game!");
            this.onPlayerJoin();
          } else {
            console.warn("Host: No onPlayerJoin callback set!");
          }
        }, 100);
      });

      conn.on("error", (err) => {
        console.error("Host: Connection error:", err);
      });
    });

    this.peer.on("error", (err) => {
      console.error("Peer error:", err);
    });
  }

  connect(hostId) {
    console.log("Client: Connecting to host:", hostId);
    const conn = this.peer.connect(hostId, {
      reliable: true,
    });

    conn.on("open", () => {
      console.log("Client: Connection opened with host");
      this.connection = conn;
      this.isConnected = true;
      this.setupConnection(conn);
    });

    conn.on("error", (err) => {
      console.error("Client: Connection error:", err);
    });
  }

  setupConnection(conn) {
    console.log("Setting up connection");
    this.connection = conn;
    this.isConnected = true;

    // Send initial state
    this.sendState({
      type: "join",
      id: this.playerId,
      x: this.scene?.player?.x || 0,
      y: this.scene?.player?.y || 0,
      team: this.scene?.team || "unknown",
    });

    conn.on("data", (data) => {
      console.log(`${this.isHost ? "Host" : "Client"} received:`, data);
      this.handleGameData(data);
    });

    conn.on("close", () => {
      console.log("Connection closed");
      this.isConnected = false;
    });

    // Start state sync if host
    if (this.isHost) {
      this.startStateSync();
    }
  }

  handleGameData(data) {
    switch (data.type) {
      case "join":
        console.log("Received join data:", data);
        this.addPlayer(data);
        // Send current game state to new player if we're host
        if (this.isHost && this.scene?.player) {
          this.sendGameState();
        }
        break;
      case "gameState":
        this.syncGameState(data.state);
        break;
      case "shoot":
        this.handleShoot(data);
        break;
      case "rocketHit":
        this.handleRocketHit(data);
        break;
      case "bulletHit":
        this.handleBulletHit(data);
        break;
      case "damage":
        this.handleDamage(data);
        break;
      case "flagCapture":
        this.handleFlagCapture(data);
        break;
    }
  }

  addPlayer(data) {
    console.log("Adding player:", data);
    if (!this.scene?.physics) {
      console.log("Scene not ready, queuing player add:", data);
      this.queuedPlayers = this.queuedPlayers || [];
      this.queuedPlayers.push(data);
      return;
    }

    if (!this.players.has(data.id) && data.id !== this.playerId) {
      // Get correct spawn point based on team
      const playerTeam = this.isHost ? "blue" : "red"; // Opposite of host's team
      const spawnPoint = this.scene.spawnPoints[playerTeam];

      // Create player sprite at spawn point
      const sprite = this.scene.physics.add.sprite(
        spawnPoint.x,
        spawnPoint.y,
        `${playerTeam}_soldier`
      );

      // Enable physics properly
      sprite.setBounce(0.2);
      sprite.setCollideWorldBounds(true);
      sprite.body.setGravityY(300);

      // Add collision with ground layer
      if (this.scene.groundLayer) {
        this.scene.physics.add.collider(sprite, this.scene.groundLayer);
      }

      // Add collision with bullets
      this.scene.physics.add.overlap(
        this.scene.bullets,
        sprite,
        (player, bullet) => {
          if (bullet.owner !== sprite) {
            bullet.destroy();
            this.sendBulletHit(data.id, bullet.x, bullet.y, 10);
          }
        }
      );

      // Add collision with rockets
      this.scene.physics.add.overlap(
        this.scene.rockets,
        sprite,
        (player, rocket) => {
          if (rocket.owner !== sprite) {
            const explosionX = rocket.x;
            const explosionY = rocket.y;
            this.scene.createExplosion(explosionX, explosionY, rocket.owner);
            rocket.destroy();
            this.sendRocketHit(
              explosionX,
              explosionY,
              data.id,
              this.scene.rocketDamage
            );
          }
        }
      );

      // Create UI container for this player
      const uiContainer = this.scene.add.container(sprite.x, sprite.y - 50);

      // Add name text
      const nameText = this.scene.add
        .text(0, 0, data.name || "Player", {
          fontSize: "14px",
          fill: "#fff",
          stroke: "#000",
          strokeThickness: 2,
        })
        .setOrigin(0.5);

      // Add health bar background
      const healthBarBg = this.scene.add.rectangle(0, 15, 50, 6, 0x000000);

      // Add health bar
      const healthBar = this.scene.add.rectangle(0, 15, 50, 6, 0x00ff00);

      uiContainer.add([nameText, healthBarBg, healthBar]);

      // Create weapon sprites
      const weapons = {
        rifle: this.scene.add.sprite(sprite.x, sprite.y, "rifle"),
        rocketLauncher: this.scene.add.sprite(
          sprite.x,
          sprite.y,
          "rocketLauncher"
        ),
      };

      Object.values(weapons).forEach((weapon) => {
        weapon.setOrigin(0, 0.5);
        weapon.setVisible(false);
      });
      weapons.rifle.setVisible(true); // Default weapon

      // Store everything with the player
      this.players.set(data.id, {
        sprite,
        ui: uiContainer,
        nameText,
        healthBar,
        healthBarBg,
        weapons,
        health: 100,
        currentWeapon: "rifle",
        team: playerTeam,
      });

      console.log("Player added successfully:", data.id);
      console.log("Current players:", this.players);

      // Send initial state to new player if we're the host
      if (this.isHost) {
        this.sendGameState();
      }
    }
  }

  updatePlayerState(data) {
    if (data.id === this.playerId) return;

    const player = this.players.get(data.id);
    if (player) {
      // Update sprite position and rotation
      player.sprite.x = data.x;
      player.sprite.y = data.y;
      player.sprite.rotation = data.rotation;

      // Update UI position
      player.ui.setPosition(data.x, data.y - 50);

      // Update weapon position and rotation
      Object.values(player.weapons).forEach((weapon) => {
        weapon.setPosition(data.x, data.y);
        weapon.rotation = data.rotation;
      });

      // Update health if provided
      if (data.health !== undefined) {
        player.health = data.health;
        player.healthBar.width = 50 * (data.health / 100);

        // Update health bar color
        if (data.health > 60) {
          player.healthBar.setFillStyle(0x00ff00);
        } else if (data.health > 30) {
          player.healthBar.setFillStyle(0xffff00);
        } else {
          player.healthBar.setFillStyle(0xff0000);
        }
      }

      // Update weapon if provided
      if (data.currentWeapon && data.currentWeapon !== player.currentWeapon) {
        Object.values(player.weapons).forEach((w) => w.setVisible(false));
        player.weapons[data.currentWeapon].setVisible(true);
        player.currentWeapon = data.currentWeapon;
      }
    } else if (this.scene?.physics) {
      this.addPlayer({
        ...data,
        team: this.isHost ? "blue" : "red",
      });
    }
  }

  sendState(data) {
    if (this.connection?.open) {
      try {
        this.connection.send(data);
      } catch (err) {
        console.error("Error sending state:", err);
      }
    }
  }

  update() {
    if (this.scene.player) {
      this.sendState({
        type: "state",
        id: this.playerId,
        x: this.scene.player.x,
        y: this.scene.player.y,
        rotation: this.scene.player.rotation,
      });
    }
  }

  handleShoot(data) {
    const player = this.players.get(data.id);
    if (player) {
      // Create bullet/rocket based on weapon type
      const projectile =
        data.weapon === "rifle"
          ? this.scene.bullets.get(player.x, player.y)
          : this.scene.rockets.get(player.x, player.y);

      if (projectile) {
        projectile.setActive(true).setVisible(true);
        projectile.rotation = data.angle;
        this.scene.physics.velocityFromRotation(
          data.angle,
          data.speed,
          projectile.body.velocity
        );
      }
    }
  }

  handleBulletHit(data) {
    // Create hit effect at position
    if (this.scene) {
      // Create bullet impact effect
      const hitEffect = this.scene.add.circle(data.x, data.y, 5, 0xffff00, 0.8);

      // Add particle effect
      const particles = this.scene.add.particles(data.x, data.y, "bullet", {
        speed: { min: 50, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        lifespan: 300,
        quantity: 5,
        tint: 0xffff00,
      });

      // Clean up effects
      this.scene.time.delayedCall(300, () => {
        hitEffect.destroy();
        particles.destroy();
      });
    }
  }

  handleDamage(data) {
    const target =
      data.targetId === this.playerId
        ? this.scene.player
        : this.players.get(data.targetId);

    if (target) {
      // Flash the damaged player red
      this.scene.tweens.add({
        targets: target,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        repeat: 1,
        tint: 0xff0000,
      });

      // Show damage number
      const damageText = this.scene.add
        .text(target.x, target.y - 20, `-${data.amount}`, {
          fontSize: "20px",
          fill: "#ff0000",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      // Animate damage number floating up
      this.scene.tweens.add({
        targets: damageText,
        y: target.y - 50,
        alpha: 0,
        duration: 800,
        onComplete: () => damageText.destroy(),
      });

      // Add blood particle effect
      const particles = this.scene.add.particles(target.x, target.y, "bullet", {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        lifespan: 500,
        quantity: 10,
        tint: 0xff0000,
      });

      // Clean up particles
      this.scene.time.delayedCall(500, () => particles.destroy());
    }
  }

  handleFlagCapture(data) {
    const flag = this.scene.flags[data.flagTeam];
    if (flag) {
      flag.x = this.scene.flagBasePositions[data.flagTeam].x;
      flag.y = this.scene.flagBasePositions[data.flagTeam].y;
      this.scene.scores[data.team].captures++;
      this.scene.updateScoreDisplay();
    }
  }

  sendPlayerPosition() {
    const now = Date.now();
    if (
      this.scene?.player &&
      this.connection?.open &&
      now - this.lastPositionUpdate > this.positionUpdateInterval
    ) {
      const currentPos = {
        x: Math.round(this.scene.player.x),
        y: Math.round(this.scene.player.y),
        rotation: this.scene.player.rotation,
        health: this.scene.health,
        currentWeapon: this.scene.currentWeapon,
      };

      if (
        !this.lastPosition ||
        Math.abs(currentPos.x - this.lastPosition.x) > this.positionThreshold ||
        Math.abs(currentPos.y - this.lastPosition.y) > this.positionThreshold ||
        Math.abs(currentPos.rotation - this.lastPosition.rotation) > 0.1 ||
        currentPos.health !== this.lastPosition.health ||
        currentPos.currentWeapon !== this.lastPosition.currentWeapon
      ) {
        this.sendState({
          type: "state",
          id: this.playerId,
          ...currentPos,
          team: this.scene.team,
          name: this.scene.character?.name,
        });

        this.lastPosition = currentPos;
      }

      this.lastPositionUpdate = now;
    }
  }

  sendShoot(weapon, angle, speed) {
    this.sendState({
      type: "shoot",
      id: this.playerId,
      weapon,
      angle,
      speed,
    });
  }

  sendFlagPickup(flagTeam) {
    this.sendState({
      type: "flagPickup",
      id: this.playerId,
      flagTeam,
    });
  }

  sendFlagCapture(flagTeam) {
    this.sendState({
      type: "flagCapture",
      id: this.playerId,
      flagTeam,
      team: this.scene.team,
    });
  }

  sendFlagReturn(flagTeam) {
    this.sendState({
      type: "flagReturn",
      id: this.playerId,
      flagTeam,
    });
  }

  sendPlayerDeath(x, y, hadFlag, flagTeam) {
    this.sendState({
      type: "playerDeath",
      id: this.playerId,
      x,
      y,
      hadFlag,
      flagTeam,
    });
  }

  sendPlayerRespawn(x, y) {
    this.sendState({
      type: "playerRespawn",
      id: this.playerId,
      x,
      y,
    });
  }

  sendPowerupCollect() {
    this.sendState({
      type: "powerupCollect",
      id: this.playerId,
    });
  }

  sendPowerupRespawn() {
    this.sendState({
      type: "powerupRespawn",
      id: this.playerId,
    });
  }

  sendDamage(targetId, amount, x, y) {
    this.sendState({
      type: "damage",
      targetId: targetId,
      amount: amount,
      x: x,
      y: y,
      attackerId: this.playerId,
    });
  }

  sendBulletHit(targetId, x, y, damage) {
    // Send both bullet hit effect and damage
    this.sendState({
      type: "bulletHit",
      x: x,
      y: y,
    });

    this.sendDamage(targetId, damage, x, y);
  }

  // Add method to set scene
  setScene(scene) {
    this.scene = scene;
    // Send queued join response if exists
    if (this.queuedJoinResponse && this.isHost) {
      this.sendState({
        type: "join",
        id: this.playerId,
        x: this.scene.player.x,
        y: this.scene.player.y,
        team: this.scene.team,
      });
      this.queuedJoinResponse = null;
    }
  }

  // Add method to process queued players
  processQueuedPlayers() {
    if (this.queuedPlayers?.length > 0) {
      console.log("Processing queued players");
      this.queuedPlayers.forEach((data) => this.addPlayer(data));
      this.queuedPlayers = [];
    }
  }

  handleRocketHit(data) {
    if (this.scene) {
      // Create explosion effect
      const explosion = this.scene.add.circle(
        data.x,
        data.y,
        120,
        0xff0000,
        0.5
      );

      // Add explosion particles
      const particles = this.scene.add.particles(data.x, data.y, "bullet", {
        speed: { min: 100, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 500,
        quantity: 20,
        tint: 0xff4400,
      });

      // Fade out and destroy explosion
      this.scene.tweens.add({
        targets: explosion,
        alpha: 0,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          explosion.destroy();
          particles.destroy();
        },
      });

      // Screen shake
      this.scene.cameras.main.shake(200, 0.01);
    }
  }

  // Add method to send rocket hit
  sendRocketHit(x, y, targetId, damage) {
    this.sendState({
      type: "rocketHit",
      x,
      y,
      targetId,
      damage,
    });

    // Also send damage
    this.sendDamage(targetId, damage, x, y);
  }

  // Add method to send complete game state
  sendGameState() {
    if (!this.scene) return;

    const gameState = {
      scores: this.scene.scores,
      flags: {
        red: {
          x: this.scene.flags.red.x,
          y: this.scene.flags.red.y,
          atBase: this.scene.flagsAtBase.red,
        },
        blue: {
          x: this.scene.flags.blue.x,
          y: this.scene.flags.blue.y,
          atBase: this.scene.flagsAtBase.blue,
        },
      },
      powerUp: {
        active: this.scene.powerUpActive,
        visible: this.scene.powerUpSprite?.visible,
        x: this.scene.powerUpSprite?.x,
        y: this.scene.powerUpSprite?.y,
      },
      players: Array.from(this.players.entries()).map(([id, player]) => ({
        id,
        x: player.sprite.x,
        y: player.sprite.y,
        rotation: player.sprite.rotation,
        health: player.health,
        team: player.team,
        currentWeapon: player.currentWeapon,
        name: player.nameText.text,
      })),
    };

    this.sendState({
      type: "gameState",
      state: gameState,
    });
  }

  // Add method to sync received game state
  syncGameState(state) {
    if (!this.scene) return;

    // Update scores
    this.scene.scores = state.scores;
    this.scene.updateScoreDisplay();

    // Update flags
    Object.entries(state.flags).forEach(([team, flagData]) => {
      const flag = this.scene.flags[team];
      flag.x = flagData.x;
      flag.y = flagData.y;
      this.scene.flagsAtBase[team] = flagData.atBase;
    });

    // Update power-up
    if (state.powerUp) {
      this.scene.powerUpActive = state.powerUp.active;
      if (this.scene.powerUpSprite) {
        this.scene.powerUpSprite.setVisible(state.powerUp.visible);
        this.scene.powerUpSprite.setPosition(state.powerUp.x, state.powerUp.y);
      }
    }

    // Update players
    state.players.forEach((playerData) => {
      if (playerData.id !== this.playerId) {
        const player = this.players.get(playerData.id);
        if (player) {
          player.sprite.x = playerData.x;
          player.sprite.y = playerData.y;
          player.sprite.rotation = playerData.rotation;
          player.health = playerData.health;
          player.currentWeapon = playerData.currentWeapon;
          this.updatePlayerUI(player);
        } else {
          this.addPlayer(playerData);
        }
      }
    });
  }

  // Add periodic state sync for host
  startStateSync() {
    if (this.isHost) {
      this.stateSyncInterval = setInterval(() => {
        this.sendGameState();
      }, 1000); // Sync every second
    }
  }

  stopStateSync() {
    if (this.stateSyncInterval) {
      clearInterval(this.stateSyncInterval);
    }
  }

  // Add helper method to update player UI
  updatePlayerUI(player) {
    // Update health bar
    const healthPercentage = player.health / 100;
    player.healthBar.width = 50 * healthPercentage;

    // Update health bar color
    if (healthPercentage > 0.6) {
      player.healthBar.setFillStyle(0x00ff00);
    } else if (healthPercentage > 0.3) {
      player.healthBar.setFillStyle(0xffff00);
    } else {
      player.healthBar.setFillStyle(0xff0000);
    }

    // Update weapons
    Object.values(player.weapons).forEach((w) => w.setVisible(false));
    if (player.weapons[player.currentWeapon]) {
      player.weapons[player.currentWeapon].setVisible(true);
    }
  }
}
