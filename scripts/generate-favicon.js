const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const ico = require('node-ico');

async function generateFavicon() {
  try {
    // Create a canvas for the favicon
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    
    // Fill with primary color background
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw the lightning bolt
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(13, 2);
    ctx.lineTo(3, 14);
    ctx.lineTo(12, 14);
    ctx.lineTo(11, 22);
    ctx.lineTo(21, 10);
    ctx.lineTo(12, 10);
    ctx.closePath();
    ctx.fill();
    
    // Save as PNG
    const pngBuffer = canvas.toBuffer('image/png');
    const pngPath = path.join(__dirname, '..', 'public', 'favicon.png');
    fs.writeFileSync(pngPath, pngBuffer);
    console.log('PNG favicon created successfully');
    
    // Convert to ICO (16x16 and 32x32)
    const icoBuf = await ico.from([
      { input: pngBuffer, size: 16 },
      { input: pngBuffer, size: 32 }
    ]);
    
    const icoPath = path.join(__dirname, '..', 'public', 'favicon.ico');
    fs.writeFileSync(icoPath, icoBuf);
    console.log('ICO favicon created successfully');
    
  } catch (error) {
    console.error('Error generating favicon:', error);
  }
}

generateFavicon();
