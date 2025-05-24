const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

const SRC_DIR = '.';
const DEST_DIR = 'dist';

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

async function copyFileWithDir(src, dest) {
  const dir = path.dirname(dest);
  await ensureDir(dir);
  return copyFile(src, dest);
}

async function copyFileAsIs(filename) {
  const src = path.join(SRC_DIR, filename);
  const dest = path.join(DEST_DIR, filename);
  
  if (await fileExists(src)) {
    await copyFileWithDir(src, dest);
    console.log(`Copied: ${filename}`);
    return true;
  }
  return false;
}

async function main() {
  try {
    // Create dist directory
    await ensureDir(DEST_DIR);
    
    console.log('Starting build process...');
    
    // Copy essential files
    await Promise.all([
      'index.html',
      'styles.css',
      'game.js',
      'site.webmanifest',
      'robots.txt',
      'offline.html',
      'sw.js'
    ].map(file => copyFileAsIs(file)));
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
main().catch(console.error);
