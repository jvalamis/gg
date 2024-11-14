// Simple utility to generate placeholder sprites
export function createPlaceholderSprites() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Soldier sprite (32x32)
  canvas.width = 32;
  canvas.height = 32;

  function drawSoldier(color) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Body
    ctx.fillStyle = "#ffffff"; // Make base sprite white so it can be tinted
    ctx.beginPath();
    ctx.ellipse(16, 20, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(16, 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // Gun mount point
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(16, 16, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Create red soldier
  drawSoldier("#ff0000");
  const redSoldierData = canvas.toDataURL();

  // Create blue soldier
  drawSoldier("#0000ff");
  const blueSoldierData = canvas.toDataURL();

  // Flag (32x48) - making flags bigger and more visible
  canvas.width = 32;
  canvas.height = 48;

  function drawFlag(color) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Flag pole
    ctx.fillStyle = "#999999";
    ctx.fillRect(2, 0, 4, 48);

    // Flag part
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(6, 4); // Start at top of flag
    ctx.lineTo(28, 4); // Top edge
    ctx.lineTo(28, 20); // Right edge
    ctx.lineTo(6, 20); // Bottom edge
    ctx.closePath();
    ctx.fill();

    // Base
    ctx.fillStyle = "#666666";
    ctx.fillRect(0, 44, 8, 4);
  }

  // Create red flag
  drawFlag("#ff0000");
  const redFlagData = canvas.toDataURL();

  // Create blue flag
  drawFlag("#0000ff");
  const blueFlagData = canvas.toDataURL();

  // Weapon (24x8)
  canvas.width = 24;
  canvas.height = 8;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 2, 24, 4);
  const rifleData = canvas.toDataURL();

  // Bullet (4x4)
  canvas.width = 4;
  canvas.height = 4;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffff00";
  ctx.fillRect(0, 0, 4, 4);
  const bulletData = canvas.toDataURL();

  // Rocket Launcher (32x12)
  canvas.width = 32;
  canvas.height = 12;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Main body
  ctx.fillStyle = "#444444";
  ctx.fillRect(0, 2, 32, 8);

  // Launcher tip
  ctx.fillStyle = "#666666";
  ctx.beginPath();
  ctx.arc(32, 6, 4, 0, Math.PI * 2);
  ctx.fill();
  const rocketLauncherData = canvas.toDataURL();

  // Rocket (16x16) - doubled from 8x8
  canvas.width = 16;
  canvas.height = 16;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rocket body
  ctx.fillStyle = "#ff4444";
  ctx.fillRect(0, 4, 16, 8);

  // Rocket tip
  ctx.beginPath();
  ctx.moveTo(16, 8);
  ctx.lineTo(12, 0);
  ctx.lineTo(12, 16);
  ctx.fill();

  const rocketData = canvas.toDataURL();

  return {
    redSoldier: redSoldierData,
    blueSoldier: blueSoldierData,
    redFlag: redFlagData,
    blueFlag: blueFlagData,
    rifle: rifleData,
    bullet: bulletData,
    rocketLauncher: rocketLauncherData,
    rocket: rocketData,
  };
}
