import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('extension');
const destDir = path.resolve('dist/extension');

const filesToCopy = [
  'manifest.json',
  'popup.html',
  'popup.js',
];

// Copy favicon.svg as icon.svg
if (fs.existsSync(path.join(path.resolve('public'), 'favicon.svg'))) {
  fs.copyFileSync(
    path.join(path.resolve('public'), 'favicon.svg'),
    path.join(destDir, 'icon.svg')
  );
  console.log('Copied icon.svg to dist/extension');
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

filesToCopy.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to dist/extension`);
  } else {
    console.warn(`Warning: ${file} not found in extension/`);
  }
});

