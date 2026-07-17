const sharp = require('sharp');
const path = require('path');

async function processImage() {
  try {
    const inputPath = path.join(__dirname, 'Logo glass.png');
    const outputPath = path.join(__dirname, 'Logo_glass_cropped.png');
    
    // Read the image, trim empty borders automatically
    await sharp(inputPath)
      .trim()
      .toFile(outputPath);
      
    console.log('Successfully cropped the image borders.');
  } catch (err) {
    console.error('Error cropping image:', err);
  }
}

processImage();
