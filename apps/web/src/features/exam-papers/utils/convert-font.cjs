const wawoff2 = require('wawoff2');
const fs = require('fs');
const path = require('path');

const fontDir = path.join(__dirname, '../../../../node_modules/@fontsource/noto-sans-devanagari/files');
console.log('Font directory:', fontDir);
console.log('Directory exists:', fs.existsSync(fontDir));

async function convert(weightLabel, inputFile, outputFile) {
  const inputPath = path.join(fontDir, inputFile);
  console.log('Reading from:', inputPath);
  console.log('File exists:', fs.existsSync(inputPath));
  
  const woff2Buffer = fs.readFileSync(inputPath);
  console.log('WOFF2 buffer size:', woff2Buffer.length);
  
  const ttfBuffer = await wawoff2.decompress(woff2Buffer);
  fs.writeFileSync(outputFile, ttfBuffer);
  console.log(weightLabel, 'converted, size:', ttfBuffer.length);
}

(async () => {
  try {
    await convert('regular', 'noto-sans-devanagari-devanagari-400-normal.woff2', 'noto-sans-devanagari-regular.ttf');
    await convert('bold', 'noto-sans-devanagari-devanagari-700-normal.woff2', 'noto-sans-devanagari-bold.ttf');
    console.log('Conversion complete!');
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  }
})();
