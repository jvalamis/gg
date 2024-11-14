export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  validateState() {
    // List of required properties and their expected types
    const requiredProps = {
      team: "string",
      health: "number",
      player: "object",
      weaponCooldowns: "object",
      currentWeapon: "string",
      aimingMode: "string",
      carryingFlag: "any",
      flagsAtBase: "object",
      canDash: "boolean",
      dashCooldown: "number",
      lastDash: "number",
      dashSpeed: "number",
      deaths: "number",
      cooldowns: "object",
    };

    // Check each property
    for (const [prop, type] of Object.entries(requiredProps)) {
      if (this[prop] === undefined) {
        throw new Error(`Required property '${prop}' is undefined`);
      }
      if (type !== "any" && typeof this[prop] !== type) {
        throw new Error(
          `Property '${prop}' should be type '${type}' but is '${typeof this[
            prop
          ]}'`
        );
      }
    }
  }

  init(data) {
    if (!data || !data.team) {
      throw new Error("No team specified in init data");
    }

    this.team = data.team;
    this.character = data.character || { name: "Unknown" };
    this.health = 100;

    // Store character data
    this.character = data.character || { name: "Unknown", color: "#ff0000" };
    this.health = 100;

    // Separate cooldowns for each weapon
    this.weaponCooldowns = {
      rifle: {
        lastFired: 0,
        cooldown: 100, // 100ms between rifle shots
      },
      rocketLauncher: {
        lastFired: 0,
        cooldown: 3000, // 3s between rocket shots
      },
    };

    this.currentWeapon = "rifle"; // Default weapon
    this.lastRocketFired = 0;
    this.rocketCooldown = 3000; // 3 seconds
    this.rockets = null;

    // Add aiming mode
    this.aimingMode = "keys"; // 'keys' or 'mouse'

    // Add flag carrying state
    this.carryingFlag = null;
    this.flagsAtBase = {
      red: true,
      blue: true,
    };

    // Add dash mechanics
    this.canDash = true;
    this.dashCooldown = 3000; // 3 seconds
    this.lastDash = 0;
    this.dashSpeed = 400; // Speed boost when dashing
    this.dashKey = null;

    // Add death counter
    this.deaths = 0;

    // Add UI elements
    this.cooldowns = {
      rocket: {
        current: 0,
        max: 3000,
      },
      dash: {
        current: 0,
        max: 3000,
      },
    };

    // Add scoring system
    this.scores = {
      red: {
        captures: 0,
        kills: 0,
      },
      blue: {
        captures: 0,
        kills: 0,
      },
    };

    // Win condition
    this.winningScore = 3;

    // Rocket damage
    this.rocketDamage = 50; // Increased from 30

    // Dash distance reduced
    this.dashDistance = 1600; // Reduced from 4800

    // Add power-up state
    this.powerUpActive = false;
    this.powerUpTimer = null;
    this.powerUpRespawnTimer = null;
    this.powerUpSprite = null;
    this.powerUpEffectText = null;
  }

  create() {
    // Create a shorter tilemap
    const width = 40;
    const height = 25;

    // Create a simple map data array
    const mapData = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        // Ground at bottom
        if (y === height - 1) {
          row.push(1);
        }
        // Center structure
        else if (x === width / 2) {
          // Main center opening
          if (y > height - 8 && y < height - 4) {
            row.push(0); // Large ground-level passage
          }
          // Upper center platform opening
          else if (y > height - 15 && y < height - 12) {
            row.push(0); // Upper passage
          } else {
            row.push(1); // Wall sections
          }
        }
        // Center platforms
        else if (Math.abs(x - width / 2) <= 3) {
          // Platforms near center
          if (y === height - 12 || y === height - 4) {
            row.push(1); // Horizontal platforms at passages
          } else {
            row.push(0);
          }
        }
        // Side walls
        else if (x === 0 || x === width - 1) {
          row.push(1);
        }
        // Flag platforms (raised and protected)
        else if (y === height - 8) {
          if ((x > 3 && x < 7) || (x > width - 8 && x < width - 4)) {
            row.push(1); // Flag platforms
          } else {
            row.push(0);
          }
        }
        // Base platforms and ramps
        else if (y === height - 4) {
          if ((x > 2 && x < 8) || (x > width - 9 && x < width - 3)) {
            row.push(1); // Base platforms
          } else {
            row.push(0);
          }
        }
        // Stepping stones and cover
        else if (y === height - 12) {
          if ((x > 8 && x < 11) || (x > width - 12 && x < width - 9)) {
            row.push(1); // Mid-height platforms
          } else {
            row.push(0);
          }
        }
        // High platforms for tactical advantage
        else if (y === height - 16) {
          if ((x > 5 && x < 8) || (x > width - 9 && x < width - 6)) {
            row.push(1); // High platforms
          } else {
            row.push(0);
          }
        } else {
          row.push(0);
        }
      }
      mapData.push(row);
    }

    // Create tilemap
    this.map = this.make.tilemap({
      data: mapData,
      tileWidth: 32,
      tileHeight: 32,
    });

    // Add tileset
    const tiles = this.map.addTilesetImage("tiles");

    // Create layer
    this.groundLayer = this.map.createLayer(0, tiles, 0, 0);

    // Set collisions for ALL tiles with index 1 (the black tiles)
    this.groundLayer.setCollisionByExclusion([0]);

    // Make sure physics world bounds match the map
    this.physics.world.setBounds(0, 0, width * 32, height * 32);

    // Enable debug rendering to see collision boxes
    if (this.game.config.physics.arcade.debug) {
      this.groundLayer.renderDebug(this.add.graphics(), {
        tileColor: null,
        collidingTileColor: new Phaser.Display.Color(243, 134, 48, 128),
        faceColor: new Phaser.Display.Color(40, 39, 37, 255),
      });
    }

    // Create bullet group with physics
    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 20,
      createCallback: (bullet) => {
        bullet.setSize(4, 4);
        bullet.body.onWorldBounds = true;
        bullet.body.allowGravity = false;
      },
    });

    // Create rocket group with physics
    this.rockets = this.physics.add.group({
      defaultKey: "rocket",
      maxSize: 3,
      createCallback: (rocket) => {
        rocket.setSize(8, 8);
        rocket.body.onWorldBounds = true;
        rocket.body.allowGravity = false;
      },
    });

    // Update flag positions to match new platform heights
    const redFlagX = 5 * 32;
    const blueFlagX = (width - 5) * 32;
    const flagY = (height - 11) * 32;

    // Store original flag positions for respawning
    this.flagBasePositions = {
      red: { x: redFlagX, y: flagY },
      blue: { x: blueFlagX, y: flagY },
    };

    // Create flags with physics
    this.flags = {
      red: this.physics.add.sprite(redFlagX, flagY, "red_flag"),
      blue: this.physics.add.sprite(blueFlagX, flagY, "blue_flag"),
    };

    // Set up flag properties
    Object.values(this.flags).forEach((flag) => {
      flag.setCollideWorldBounds(true);
      flag.setBounce(0.1);
      flag.setDragX(100);
      flag.setScale(0.8);
      flag.team = flag.texture.key.split("_")[0]; // 'red' or 'blue'
    });

    // Update spawn points to be on same side as team's flag
    const spawnY = (height - 2) * 32;
    this.spawnPoints = {
      red: { x: redFlagX, y: spawnY },
      blue: { x: blueFlagX, y: spawnY },
    };

    // Create player without tinting
    const spawnPoint = this.spawnPoints[this.team];
    this.player = this.physics.add.sprite(
      spawnPoint.x,
      spawnPoint.y,
      `${this.team}_soldier`
    );
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);

    // Set up camera with deadzone
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, width * 32, height * 32);

    // Add camera deadzone for smoother scrolling
    this.cameras.main.setDeadzone(200, 100);

    // Set world bounds
    this.physics.world.setBounds(0, 0, width * 32, height * 32);

    // Create player UI container
    this.playerUI = this.add.container(this.player.x, this.player.y - 50);

    // Add player name and team color
    const nameColor = this.team === this.team ? "#ffffff" : "#ff0000";
    this.nameText = this.add
      .text(0, 0, this.character.name, {
        fontSize: "14px",
        fill: nameColor,
        backgroundColor: "#000",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    this.playerUI.add(this.nameText);

    // Add health bar background
    this.healthBarBg = this.add.rectangle(0, 15, 50, 6, 0x000000);
    this.playerUI.add(this.healthBarBg);

    // Add health bar
    this.healthBar = this.add.rectangle(0, 15, 50, 6, 0x00ff00);
    this.playerUI.add(this.healthBar);

    // Add rocket cooldown bar (smaller height)
    this.rocketCooldownBg = this.add.rectangle(0, 22, 50, 3, 0x000000);
    this.rocketCooldownBar = this.add.rectangle(0, 22, 50, 3, 0xff4400);
    this.playerUI.add(this.rocketCooldownBg);
    this.playerUI.add(this.rocketCooldownBar);

    // Add dash cooldown bar (smaller height)
    this.dashCooldownBg = this.add.rectangle(0, 26, 50, 3, 0x000000);
    this.dashCooldownBar = this.add.rectangle(0, 26, 50, 3, 0x00ffff);
    this.playerUI.add(this.dashCooldownBg);
    this.playerUI.add(this.dashCooldownBar);

    // Add death counter
    this.deathText = this.add
      .text(16, 70, "Deaths: 0", {
        fontSize: "18px",
        fill: "#fff",
        backgroundColor: "#000",
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0);

    // Create weapons
    this.weapons = {
      rifle: this.add.sprite(0, 0, "rifle"),
      rocketLauncher: this.add.sprite(0, 0, "rocketLauncher"),
    };

    Object.values(this.weapons).forEach((weapon) => {
      weapon.setOrigin(0, 0.5);
    });

    this.weapons.rocketLauncher.setVisible(false);

    // Set up collisions
    this.physics.add.collider(this.player, this.groundLayer, null, null, this);
    this.physics.add.collider(this.flags.red, this.groundLayer);
    this.physics.add.collider(this.flags.blue, this.groundLayer);

    // Set up projectile collisions
    this.physics.add.collider(this.bullets, this.groundLayer, (bullet) => {
      bullet.destroy();
    });

    this.physics.add.collider(this.rockets, this.groundLayer, (rocket) => {
      this.createExplosion(rocket.x, rocket.y, rocket.owner || null);
      rocket.destroy();
    });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.rifleKey = this.input.keyboard.addKey("E");
    this.rocketKey = this.input.keyboard.addKey("Q");

    // Mouse input for shooting
    this.input.on("pointerdown", (pointer) => {
      this.shoot(pointer);
    });

    // Add aiming mode toggle key
    this.toggleAimKey = this.input.keyboard.addKey("T");

    // Add flag pickup overlap
    this.physics.add.overlap(
      this.player,
      Object.values(this.flags),
      this.handleFlagPickup,
      null,
      this
    );

    // Make carried flag more visible
    this.events.on("update", () => {
      if (this.carryingFlag) {
        // Make flag larger when carried
        this.carryingFlag.setScale(1.2);
        // Add glow effect
        this.carryingFlag.setTint(0xffffff);
        // Position above player
        this.carryingFlag.x = this.player.x;
        this.carryingFlag.y = this.player.y - 40;
      }
    });

    // Reset flag appearance when dropped/returned
    const resetFlagAppearance = (flag) => {
      flag.setScale(0.8);
      flag.clearTint();
    };

    // Update handleFlagPickup to handle flag appearance
    const originalHandleFlagPickup = this.handleFlagPickup;
    this.handleFlagPickup = (player, flag) => {
      if (flag.team === this.team && !this.flagsAtBase[flag.team]) {
        // Return flag to base
        flag.x = this.flagBasePositions[flag.team].x;
        flag.y = this.flagBasePositions[flag.team].y;
        this.flagsAtBase[flag.team] = true;
        resetFlagAppearance(flag);
        // ... rest of return logic ...
      } else if (flag.team !== this.team && !this.carryingFlag) {
        // Pick up enemy flag
        this.carryingFlag = flag;
        this.flagsAtBase[flag.team] = false;
        // ... rest of pickup logic ...
      }
    };

    // Add dash key
    this.dashKey = this.input.keyboard.addKey("F");

    // Move score display to bottom center with no background, just outline
    this.scoreText = this.add
      .text(400, 550, "", {
        fontSize: "32px",
        fill: "#fff",
        stroke: "#000", // Black outline
        strokeThickness: 4, // Thick enough to read
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5);

    // Add death counter display at bottom left with no background, just outline
    this.deathCountText = this.add
      .text(16, 550, "", {
        fontSize: "24px",
        fill: "#fff",
        stroke: "#000", // Black outline
        strokeThickness: 3, // Thick enough to read
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0);

    // Set up bullet and rocket collision with players (will add when multiplayer)
    this.physics.add.overlap(this.bullets, this.player, (player, bullet) => {
      // Only take damage from enemy bullets
      if (bullet.owner !== this.player) {
        this.takeDamage(10);
        bullet.destroy();
      }
    });

    this.physics.add.overlap(this.rockets, this.player, (player, rocket) => {
      this.createExplosion(rocket.x, rocket.y, rocket.owner || null);
      this.takeDamage(30);
      rocket.destroy();
    });

    // Create smoke particles
    this.smokeParticles = this.add.particles(0, 0, "bullet", {
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0x666666,
      speed: 50,
      lifespan: 1000,
      blendMode: "ADD",
      frequency: 50,
      emitting: false,
    });

    // Add dash particles
    this.dashParticles = this.add.particles(0, 0, "bullet", {
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: this.team === "red" ? 0xff0000 : 0x0000ff, // Team colored particles
      speed: 100,
      lifespan: 500,
      blendMode: "ADD",
      frequency: 10,
      emitting: false,
      follow: this.player,
    });

    // Add dash trail effect
    this.dashTrail = this.add.graphics();

    // Create death counter for all players
    this.deathCounts = {
      red: 0,
      blue: 0,
    };

    // Add player markers
    this.playerMarkers = {};
    this.createPlayerMarker(this.player, this.team);

    // Add commands help text in bottom right
    const commandsText = [
      "Controls:",
      "E - Fire Rifle",
      "Q - Fire Rocket",
      "F - Dash",
      "T - Toggle Aim Mode",
      "Arrow Keys - Move",
      "Up - Jump",
    ].join("\n");

    this.add
      .text(750, 500, commandsText, {
        fontSize: "16px",
        fill: "#fff",
        stroke: "#000",
        strokeThickness: 4,
        align: "right",
      })
      .setOrigin(1, 1) // Align to bottom right
      .setScrollFactor(0) // Fix to camera
      .setAlpha(0.8); // Slightly transparent

    // Add power-up in center top
    this.createPowerUp();

    // Add power-up timer text (hidden initially)
    this.powerUpTimerText = this.add
      .text(400, 50, "", {
        fontSize: "24px",
        fill: "#f7931a",
        stroke: "#000",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setVisible(false);

    // Show game ID for all players in top-right corner
    const gameId = this.registry.get("gameId");
    if (gameId) {
      // Create a more visible game ID display
      const gameIdText = this.add
        .text(400, 30, `Game ID: ${gameId}`, {
          fontSize: "24px",
          fill: "#fff",
          stroke: "#000",
          strokeThickness: 3,
          backgroundColor: "#333333",
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(1000);

      // Add copy button
      const copyButton = this.add
        .text(gameIdText.x + 150, 30, "Copy", {
          fontSize: "20px",
          fill: "#fff",
          backgroundColor: "#444444",
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1000)
        .setInteractive();

      copyButton.on("pointerdown", () => {
        navigator.clipboard.writeText(gameId).then(() => {
          copyButton.setText("Copied!");
          this.time.delayedCall(1000, () => {
            copyButton.setText("Copy");
          });
        });
      });
    } else {
      console.warn("No game ID found in registry");
    }

    // Validate state after creation
    try {
      this.validateState();
    } catch (error) {
      console.error("Scene validation failed:", error);
      // You might want to handle this differently in production
      throw error;
    }
  }

  shoot(pointer) {
    const time = this.time.now;
    if (time > this.lastFired) {
      const bullet = this.bullets.get(this.player.x, this.player.y);

      if (bullet) {
        bullet.setActive(true).setVisible(true);

        const angle = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          pointer.worldX,
          pointer.worldY
        );

        bullet.rotation = angle;

        // Calculate velocity based on angle
        const speed = 600;
        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);

        this.lastFired = time + this.fireRate;

        // Destroy bullet after 1 second
        this.time.delayedCall(1000, () => {
          if (bullet.active) {
            bullet.destroy();
          }
        });
      }
    }
  }

  createExplosion(x, y, owner) {
    const explosion = this.add.circle(x, y, 120, 0xff0000, 0.5);

    // Check for players in explosion radius
    const explosionRadius = 120;
    const distanceToPlayer = Phaser.Math.Distance.Between(
      x,
      y,
      this.player.x,
      this.player.y
    );

    if (distanceToPlayer <= explosionRadius) {
      // Apply explosion knockback
      const angle = Phaser.Math.Angle.Between(
        x,
        y,
        this.player.x,
        this.player.y
      );
      const force = 300 * (1 - distanceToPlayer / explosionRadius);
      this.physics.velocityFromRotation(
        angle,
        force,
        this.player.body.velocity
      );

      // Only take damage from own rockets or enemy rockets
      // Check if owner exists and has a team property
      const ownerTeam = owner && owner.team ? owner.team : null;
      this.lastDamagedBy = "rocket";
      this.lastAttacker = ownerTeam;
      this.takeDamage(this.rocketDamage);
    }

    // Fade out and destroy explosion
    this.tweens.add({
      targets: explosion,
      alpha: 0,
      duration: 200,
      ease: "Power2",
      onComplete: () => explosion.destroy(),
    });
  }

  switchWeapon(weapon) {
    // Just switch weapons, don't fire
    if (this.currentWeapon !== weapon) {
      // Hide all weapons
      Object.values(this.weapons).forEach((w) => w.setVisible(false));

      // Show selected weapon
      this.weapons[weapon].setVisible(true);
      this.currentWeapon = weapon;
    }

    // Always try to fire when key is pressed
    this.fireWeapon(weapon);
  }

  fireWeapon(weapon) {
    const weaponState = this.weaponCooldowns[weapon];
    const time = this.time.now;

    if (time > weaponState.lastFired) {
      if (weapon === "rifle") {
        const bullet = this.bullets.get(this.player.x, this.player.y);
        if (bullet) {
          bullet.setActive(true).setVisible(true);
          bullet.rotation = this.player.rotation;
          bullet.owner = this.player; // Track bullet owner

          const speed = 600;
          this.physics.velocityFromRotation(
            this.player.rotation,
            speed,
            bullet.body.velocity
          );

          weaponState.lastFired = time + weaponState.cooldown;

          this.time.delayedCall(1000, () => {
            if (bullet.active) {
              bullet.destroy();
            }
          });
        }
      } else if (weapon === "rocketLauncher") {
        const spawnDistance = 40;
        const spawnX =
          this.player.x + Math.cos(this.player.rotation) * spawnDistance;
        const spawnY =
          this.player.y + Math.sin(this.player.rotation) * spawnDistance;

        const rocket = this.rockets.get(spawnX, spawnY);
        if (rocket) {
          rocket
            .setActive(true)
            .setVisible(true)
            .setCollideWorldBounds(true)
            .setScale(2); // Make rocket 2x bigger
          rocket.body.enable = true;
          rocket.rotation = this.player.rotation;
          rocket.owner = this.player;

          // Start smoke trail
          this.smokeParticles.setPosition(rocket.x, rocket.y);
          this.smokeParticles.start();

          // Update smoke trail position
          this.time.addEvent({
            delay: 16,
            repeat: -1,
            callback: () => {
              if (rocket.active) {
                this.smokeParticles.setPosition(rocket.x, rocket.y);
              } else {
                this.smokeParticles.stop();
              }
            },
          });

          const speed = 400;
          this.physics.velocityFromRotation(
            this.player.rotation,
            speed,
            rocket.body.velocity
          );

          // Apply recoil to player
          const recoilSpeed = 200;
          const recoilAngle = this.player.rotation + Math.PI;
          this.physics.velocityFromRotation(
            recoilAngle,
            recoilSpeed,
            this.player.body.velocity
          );

          weaponState.lastFired = time + weaponState.cooldown;
          this.cooldowns.rocket.current = weaponState.cooldown;

          this.time.delayedCall(2000, () => {
            if (rocket.active) {
              this.createExplosion(rocket.x, rocket.y, rocket.owner);
              rocket.destroy();
              this.smokeParticles.stop();
            }
          });
        }
      }
    }
  }

  updatePlayerUI() {
    if (!this.playerUI || !this.healthBar) return; // Add safety check

    // Update UI position to follow player
    this.playerUI.setPosition(this.player.x, this.player.y - 50);

    // Update health bar width based on health percentage
    const healthPercentage = this.health / 100;
    this.healthBar.width = 50 * healthPercentage;

    // Update health bar color based on health level
    if (healthPercentage > 0.6) {
      this.healthBar.setFillStyle(0x00ff00); // Green
    } else if (healthPercentage > 0.3) {
      this.healthBar.setFillStyle(0xffff00); // Yellow
    } else {
      this.healthBar.setFillStyle(0xff0000); // Red
    }

    // Add golden glow to health bar when power-up is active
    if (this.powerUpActive) {
      this.healthBar.setStrokeStyle(2, 0xf7931a);
    } else {
      this.healthBar.setStrokeStyle(0);
    }
  }

  update() {
    if (!this.player.active) return;

    // Handle aim mode toggle
    if (Phaser.Input.Keyboard.JustDown(this.toggleAimKey)) {
      this.aimingMode = this.aimingMode === "keys" ? "mouse" : "keys";
      this.aimModeText.setText(
        `Aim Mode: ${
          this.aimingMode.charAt(0).toUpperCase() + this.aimingMode.slice(1)
        } (Press T to toggle)`
      );
    }

    // Player movement and aiming direction
    const onGround = this.player.body.onFloor();
    const moveSpeed = 160;
    const jumpForce = -330;
    let aimAngle = this.player.rotation; // Keep current rotation if not moving

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-moveSpeed);
      if (!this.player.flipX) this.player.flipX = true;
      if (this.aimingMode === "keys") {
        aimAngle = Math.PI; // Aim left (180 degrees)
      }
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(moveSpeed);
      if (this.player.flipX) this.player.flipX = false;
      if (this.aimingMode === "keys") {
        aimAngle = 0; // Aim right (0 degrees)
      }
    } else {
      this.player.setVelocityX(0);
    }

    // Handle aiming based on mode
    if (this.aimingMode === "keys") {
      // Add diagonal aiming for key mode
      if (this.cursors.up.isDown) {
        if (this.cursors.left.isDown) {
          aimAngle = (-3 * Math.PI) / 4; // Aim up-left (-135 degrees)
        } else if (this.cursors.right.isDown) {
          aimAngle = -Math.PI / 4; // Aim up-right (-45 degrees)
        } else {
          aimAngle = -Math.PI / 2; // Aim straight up (-90 degrees)
        }
      } else if (this.cursors.down.isDown) {
        if (this.cursors.left.isDown) {
          aimAngle = (3 * Math.PI) / 4; // Aim down-left (135 degrees)
        } else if (this.cursors.right.isDown) {
          aimAngle = Math.PI / 4; // Aim down-right (45 degrees)
        } else {
          aimAngle = Math.PI / 2; // Aim straight down (90 degrees)
        }
      }
    } else {
      // Mouse aiming
      aimAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        this.input.activePointer.worldX,
        this.input.activePointer.worldY
      );
    }

    // Handle jumping
    if (this.cursors.up.isDown && onGround) {
      this.player.setVelocityY(jumpForce);
    }

    // Update player and weapon rotation
    this.player.rotation = aimAngle;
    const currentWeaponSprite = this.weapons[this.currentWeapon];
    currentWeaponSprite.setPosition(this.player.x, this.player.y);
    currentWeaponSprite.rotation = aimAngle;

    // Handle weapon switching and firing
    if (Phaser.Input.Keyboard.JustDown(this.rifleKey) || this.rifleKey.isDown) {
      this.switchWeapon("rifle");
    }
    if (Phaser.Input.Keyboard.JustDown(this.rocketKey)) {
      this.switchWeapon("rocketLauncher");
    }

    // Update UI
    this.updatePlayerUI();

    // Update carried flag position and check for capture
    if (this.carryingFlag) {
      this.carryingFlag.x = this.player.x;
      this.carryingFlag.y = this.player.y - 40;

      // Check if player is touching their own flag for instant capture
      const ownFlag = this.flags[this.team];
      const distToOwnFlag = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        ownFlag.x,
        ownFlag.y
      );

      // If touching own flag, instant capture
      if (distToOwnFlag < 32) {
        // Using player hitbox size
        // Handle flag capture
        this.handleFlagCapture();

        // Reset enemy flag position
        this.carryingFlag.x = this.flagBasePositions[this.carryingFlag.team].x;
        this.carryingFlag.y = this.flagBasePositions[this.carryingFlag.team].y;
        this.flagsAtBase[this.carryingFlag.team] = true;
        this.carryingFlag = null;

        // Add capture effect/message
        this.add
          .text(this.player.x, this.player.y - 50, "Flag Captured!", {
            fontSize: "16px",
            fill: "#fff",
          })
          .setOrigin(0.5)
          .destroy({ delay: 1000 });
      }
    }

    // Drop flag on death
    if (this.health <= 0 && this.carryingFlag) {
      this.carryingFlag = null;
    }

    // Handle dashing
    if (Phaser.Input.Keyboard.JustDown(this.dashKey)) {
      this.handleDash();
    }

    // Update cooldown bars
    this.updateCooldowns();

    // Update player markers
    Object.entries(this.playerMarkers).forEach(([playerId, marker]) => {
      const player = playerId === this.player.id ? this.player : null; // Add other players when multiplayer
      if (player) {
        this.updatePlayerMarker(player, marker);
      }
    });
  }

  handleDash() {
    const time = this.time.now;
    if (time > this.lastDash + this.dashCooldown) {
      // Use rocket explosion radius (120) as dash distance
      const dashDistance = 120;
      const targetX =
        this.player.x + Math.cos(this.player.rotation) * dashDistance;
      const targetY =
        this.player.y + Math.sin(this.player.rotation) * dashDistance;

      // Start particle effect at start position
      this.dashParticles.start();

      // Draw dash trail
      this.dashTrail.clear();
      this.dashTrail.lineStyle(
        3,
        this.team === "red" ? 0xff0000 : 0x0000ff,
        0.5
      );
      this.dashTrail.lineBetween(
        this.player.x,
        this.player.y,
        targetX,
        targetY
      );

      // Teleport player
      this.player.setPosition(targetX, targetY);

      // Keep current velocity but reduce it
      const currentVelX = this.player.body.velocity.x * 0.5;
      const currentVelY = this.player.body.velocity.y * 0.5;
      this.player.setVelocity(currentVelX, currentVelY);

      // Visual effects
      this.cameras.main.shake(100, 0.005);
      this.cameras.main.flash(50, 255, 255, 255, true);

      // Clean up effects
      this.time.delayedCall(200, () => {
        this.dashParticles.stop();

        // Fade out trail
        this.tweens.add({
          targets: this.dashTrail,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.dashTrail.clear();
            this.dashTrail.alpha = 1;
          },
        });
      });

      this.lastDash = time;
      this.cooldowns.dash.current = this.dashCooldown;
    }
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.updatePlayerUI();

    if (this.health <= 0) {
      // Increment death counter for the appropriate team
      this.deathCounts[this.team]++;
      this.updateDeathCountDisplay();

      // Handle player death
      this.health = 100;
      const spawnPoint = this.spawnPoints[this.team];
      this.player.setPosition(spawnPoint.x, spawnPoint.y);

      // Drop flag on death
      if (this.carryingFlag) {
        this.carryingFlag.x = this.player.x;
        this.carryingFlag.y = this.player.y;
        this.carryingFlag = null;
      }
    }
  }

  updateCooldowns() {
    const time = this.time.now;

    // Update rocket cooldown - matched to dash cooldown style
    if (this.cooldowns.rocket.current > 0) {
      this.cooldowns.rocket.current = Math.max(
        0,
        this.cooldowns.rocket.current - 16
      );
      const rocketProgress =
        1 - this.cooldowns.rocket.current / this.cooldowns.rocket.max;
      this.rocketCooldownBar.width = 50 * rocketProgress;
    } else {
      this.rocketCooldownBar.width = 50;
    }

    // Update dash cooldown
    if (this.cooldowns.dash.current > 0) {
      this.cooldowns.dash.current = Math.max(
        0,
        this.cooldowns.dash.current - 16
      );
      const dashProgress =
        1 - this.cooldowns.dash.current / this.cooldowns.dash.max;
      this.dashCooldownBar.width = 50 * dashProgress;
    } else {
      this.dashCooldownBar.width = 50;
    }
  }

  handleFlagPickup(player, flag) {
    // Can't pick up your own team's flag unless returning it
    if (flag.team === this.team) {
      if (!this.flagsAtBase[flag.team]) {
        // Return flag to base
        flag.x = this.flagBasePositions[flag.team].x;
        flag.y = this.flagBasePositions[flag.team].y;
        this.flagsAtBase[flag.team] = true;

        // Add return effect/message
        this.add
          .text(player.x, player.y - 50, "Flag Returned!", {
            fontSize: "16px",
            fill: "#fff",
          })
          .setOrigin(0.5)
          .destroy({ delay: 1000 });
      }
      return;
    }

    // Can't pick up enemy flag while carrying one
    if (this.carryingFlag) return;

    // Pick up enemy flag
    this.carryingFlag = flag;
    this.flagsAtBase[flag.team] = false;

    // Add pickup effect/message
    this.add
      .text(player.x, player.y - 50, "Flag Taken!", {
        fontSize: "16px",
        fill: "#fff",
      })
      .setOrigin(0.5)
      .destroy({ delay: 1000 });
  }

  createPlayerMarker(player, team) {
    const markerSize = 10;
    const color = team === "red" ? 0xff0000 : 0x0000ff;

    const marker = this.add.triangle(
      0,
      0,
      0,
      -markerSize,
      markerSize,
      markerSize,
      -markerSize,
      markerSize,
      color
    );
    marker.setAlpha(0.8);
    marker.setScrollFactor(0);

    this.playerMarkers[player.id] = marker;
  }

  updatePlayerMarker(player, marker) {
    const camera = this.cameras.main;
    const isOnScreen = camera.worldView.contains(player.x, player.y);

    if (!isOnScreen) {
      // Calculate marker position at screen edge
      const angle = Phaser.Math.Angle.Between(
        camera.scrollX + camera.width / 2,
        camera.scrollY + camera.height / 2,
        player.x,
        player.y
      );

      const distance = 20;
      const screenX =
        camera.width / 2 + Math.cos(angle) * (camera.width / 2 - distance);
      const screenY =
        camera.height / 2 + Math.sin(angle) * (camera.height / 2 - distance);

      marker.setPosition(screenX, screenY);
      marker.setRotation(angle);
      marker.setVisible(true);
    } else {
      marker.setVisible(false);
    }
  }

  updateDeathCountDisplay() {
    this.deathCountText.setText(
      `Deaths - Red: ${this.deathCounts.red} Blue: ${this.deathCounts.blue}`
    );
  }

  updateScoreDisplay() {
    // Update score display with larger text and team colors
    this.scoreText.setText(
      `RED ${this.scores.red.captures} - BLUE ${this.scores.blue.captures}`
    );
  }

  handleFlagCapture() {
    // Update score when flag is captured
    this.scores[this.team].captures++;
    this.updateScoreDisplay();

    // Check for win condition
    if (this.scores[this.team].captures >= this.winningScore) {
      this.gameWon(this.team);
    }
  }

  gameWon(team) {
    // Create win message
    const winText = this.add
      .text(400, 300, `${team.toUpperCase()} TEAM WINS!`, {
        fontSize: "48px",
        fill: team === "red" ? "#ff0000" : "#0000ff",
        backgroundColor: "#000",
        padding: { x: 20, y: 10 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5);

    // Reset game after delay
    this.time.delayedCall(3000, () => {
      this.scene.start("MenuScene");
    });
  }

  createPowerUp() {
    const x = (this.map.width * 32) / 2; // Center of map
    const y = (this.map.height - 15) * 32; // Top middle platform

    this.powerUpSprite = this.physics.add.sprite(x, y, "powerUp");
    this.powerUpSprite.setScale(1);

    // Add floating animation
    this.tweens.add({
      targets: this.powerUpSprite,
      y: y - 10,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Add rotation
    this.tweens.add({
      targets: this.powerUpSprite,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: "Linear",
    });

    // Add collision with player
    this.physics.add.overlap(
      this.player,
      this.powerUpSprite,
      this.collectPowerUp,
      null,
      this
    );
  }

  collectPowerUp() {
    if (this.powerUpSprite.active) {
      // Hide power-up
      this.powerUpSprite.setActive(false).setVisible(false);

      // Activate power-up effects
      this.powerUpActive = true;
      this.health = 100; // Full heal

      // Store original cooldown and set super fast cooldown
      const originalCooldown = this.weaponCooldowns.rocketLauncher.cooldown;
      this.weaponCooldowns.rocketLauncher.cooldown = 500; // 0.5 seconds

      // Add visual effect to player
      const powerUpGlow = this.add.circle(0, 0, 25, 0xf7931a, 0.3);
      this.playerUI.add(powerUpGlow);

      // Start countdown timer
      let timeLeft = 10;
      this.powerUpTimer = this.time.addEvent({
        delay: 1000,
        callback: () => {
          timeLeft--;
          this.powerUpTimerText
            .setText(`Power-up: ${timeLeft}s`)
            .setVisible(true);

          if (timeLeft <= 0) {
            // Remove power-up effects
            this.powerUpActive = false;
            this.weaponCooldowns.rocketLauncher.cooldown = originalCooldown;
            powerUpGlow.destroy();
            this.powerUpTimerText.setVisible(false);

            // Start respawn timer
            let respawnTime = 20;
            this.powerUpRespawnTimer = this.time.addEvent({
              delay: 1000,
              callback: () => {
                respawnTime--;
                this.powerUpTimerText
                  .setText(`Power-up respawn: ${respawnTime}s`)
                  .setVisible(true);

                if (respawnTime <= 0) {
                  this.powerUpTimerText.setVisible(false);
                  this.powerUpSprite.setActive(true).setVisible(true);
                }
              },
              repeat: 19,
            });
          }
        },
        repeat: 9,
      });
    }
  }
}
