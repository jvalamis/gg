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
    ctx.fillStyle = color;
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

  // Flag (16x32)
  canvas.width = 16;
  canvas.height = 32;

  // Red flag
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 16, 2, 16);
  const redFlagData = canvas.toDataURL();

  // Blue flag
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0000ff";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 16, 2, 16);
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

  return {
    redSoldier: redSoldierData,
    blueSoldier: blueSoldierData,
    redFlag: redFlagData,
    blueFlag: blueFlagData,
    rifle: rifleData,
    bullet: bulletData,
  };
}
