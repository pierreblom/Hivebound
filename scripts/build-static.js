const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const files = [
  'index.html',
  'styles.css',
  'game-core.js',
  'app.js',
  'manifest.webmanifest',
  'sw.js'
];
const directories = ['assets', 'icons'];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const filename of files) {
  fs.copyFileSync(path.join(root, filename), path.join(output, filename));
}

for (const dirname of directories) {
  fs.cpSync(path.join(root, dirname), path.join(output, dirname), { recursive: true });
}

console.log(`Static game built in ${output}`);
