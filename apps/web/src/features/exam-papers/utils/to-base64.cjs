const fs = require('fs');

const regularBase64 = fs.readFileSync('noto-sans-devanagari-regular.ttf').toString('base64');
const boldBase64 = fs.readFileSync('noto-sans-devanagari-bold.ttf').toString('base64');

fs.writeFileSync('noto-sans-devanagari-regular.b64', regularBase64);
fs.writeFileSync('noto-sans-devanagari-bold.b64', boldBase64);

console.log('Regular font base64 size:', regularBase64.length);
console.log('Bold font base64 size:', boldBase64.length);
console.log('Base64 conversion complete!');
