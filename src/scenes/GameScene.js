export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init(data) {
    if (!data || !data.team) {
      console.error("No team specified");
      this.team = "red"; // Default fallback
    } else {
      this.team = data.team;
    }
    this.bullets = null;
    this.lastFired = 0;
    this.fireRate = 100;
  }

  create() {
    // Create a simple tilemap programmatically
    const width = 25;
    const height = 19;

    // Create a simple map data array
    const mapData = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Ground at bottom
        if (y === height - 1) mapData.push(1);
        // Walls on sides
        else if (x === 0 || x === width - 1) mapData.push(1);
        // Platforms
        else if (y === 15 && x > 5 && x < 10) mapData.push(1);
        else if (y === 12 && x > 15 && x < 20) mapData.push(1);
        // Empty space
        else mapData.push(0);
      }
    }

    // Create tilemap with explicit dimensions
    this.map = this.make.tilemap({
      data: mapData,
      tileWidth: 32,
      tileHeight: 32,
      width: width,
      height: height,
    });

    // Add tileset with explicit dimensions
    const tileset = this.map.addTilesetImage("tiles", "tiles", 32, 32, 0, 0);
    if (!tileset) {
      console.error("Failed to create tileset");
      return;
    }

    // Create layer with explicit position
    this.groundLayer = this.map.createLayer(0, tileset, 0, 0);
    if (!this.groundLayer) {
      console.error("Failed to create ground layer");
      return;
    }

    // Set collisions for specific tiles
    this.groundLayer.setCollision([1]);

    // Create bullet group
    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 20,
    });

    // Set spawn points
    const spawnY = height * 32 - 200;
    this.spawnPoints = {
      red: { x: 100, y: spawnY },
      blue: { x: width * 32 - 100, y: spawnY },
    };

    // Create player with error checking
    const spawnPoint = this.spawnPoints[this.team];
    if (!spawnPoint) {
      console.error("Invalid spawn point");
      return;
    }

    this.player = this.physics.add.sprite(
      spawnPoint.x,
      spawnPoint.y,
      `${this.team}_soldier`
    );

    if (!this.player) {
      console.error("Failed to create player");
      return;
    }

    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);

    // Create weapon
    this.weapon = this.add.sprite(0, 0, "rifle");
    this.weapon.setOrigin(0, 0.5);

    // Create flags
    this.flags = {
      red: this.physics.add.sprite(100, spawnY, "red_flag"),
      blue: this.physics.add.sprite(width * 32 - 100, spawnY, "blue_flag"),
    };

    // Set up collisions with error checking
    if (this.groundLayer && this.groundLayer.tilemapLayer) {
      this.physics.add.collider(this.player, this.groundLayer);
      this.physics.add.collider(this.flags.red, this.groundLayer);
      this.physics.add.collider(this.flags.blue, this.groundLayer);
      this.physics.add.collider(this.bullets, this.groundLayer, (bullet) => {
        bullet.destroy();
      });
    }

    // Set world bounds
    this.physics.world.setBounds(0, 0, width * 32, height * 32);

    // Set up camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, width * 32, height * 32);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Mouse input for shooting
    this.input.on("pointerdown", (pointer) => {
      this.shoot(pointer);
    });
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

  update() {
    if (!this.player.active) return;

    // Player movement
    const onGround = this.player.body.onFloor();
    const moveSpeed = 160;
    const jumpForce = -330;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-moveSpeed);
      if (!this.player.flipX) this.player.flipX = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(moveSpeed);
      if (this.player.flipX) this.player.flipX = false;
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown && onGround) {
      this.player.setVelocityY(jumpForce);
    }

    // Update weapon position and rotation
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      this.input.activePointer.worldX,
      this.input.activePointer.worldY
    );

    this.weapon.setPosition(this.player.x, this.player.y);
    this.weapon.rotation = angle;

    // Remove animation playing for now until we fix it
    // We'll just flip the sprite based on direction
  }
}
