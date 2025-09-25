const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Function to create a cannabis leaf icon
function createIcon(size, backgroundColor, foregroundColor) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  // Draw a stylized cannabis leaf
  ctx.fillStyle = foregroundColor;
  
  // Center circle
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.15;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw leaf parts
  const leafCount = 7;
  const leafLength = size * 0.35;
  const leafWidth = size * 0.15;
  
  for (let i = 0; i < leafCount; i++) {
    const angle = (i * 2 * Math.PI / leafCount) - Math.PI / 2;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    
    // Draw leaf
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      leafWidth, leafLength * 0.3,
      leafWidth, leafLength * 0.7,
      0, leafLength
    );
    ctx.bezierCurveTo(
      -leafWidth, leafLength * 0.7,
      -leafWidth, leafLength * 0.3,
      0, 0
    );
    ctx.fill();
    
    ctx.restore();
  }
  
  // Add "POS" text
  const fontSize = size * 0.2;
  ctx.fillStyle = backgroundColor;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POS', centerX, centerY);

  return canvas;
}

// Create app icon (1024x1024)
const iconCanvas = createIcon(1024, '#121212', '#D4AF37');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconCanvas.toBuffer('image/png'));

// Create adaptive icon (1024x1024)
const adaptiveIconCanvas = createIcon(1024, '#121212', '#D4AF37');
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIconCanvas.toBuffer('image/png'));

// Create favicon (192x192)
const faviconCanvas = createIcon(192, '#121212', '#D4AF37');
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), faviconCanvas.toBuffer('image/png'));

// Create splash screen (2048x2048)
const splashCanvas = createCanvas(2048, 2048);
const splashCtx = splashCanvas.getContext('2d');

// Background
splashCtx.fillStyle = '#121212';
splashCtx.fillRect(0, 0, 2048, 2048);

// Draw icon in the center
const iconSize = 1024;
const iconX = (2048 - iconSize) / 2;
const iconY = (2048 - iconSize) / 2;

// Draw the icon
const tempCanvas = createIcon(iconSize, '#121212', '#D4AF37');
splashCtx.drawImage(tempCanvas, iconX, iconY);

// Add app name
splashCtx.fillStyle = '#D4AF37';
splashCtx.font = 'bold 120px Arial';
splashCtx.textAlign = 'center';
splashCtx.textBaseline = 'middle';
splashCtx.fillText('Cannabis POS', 1024, 1500);

fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashCanvas.toBuffer('image/png'));

console.log('Icons created successfully!');