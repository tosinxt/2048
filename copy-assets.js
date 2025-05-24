const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

const sourceDir = '.';
const targetDir = 'dist';

// Files to copy (relative to sourceDir)
const filesToCopy = [
  'favicon.ico',
  'site.webmanifest',
  'robots.txt',
  'offline.html'
];

// Directories to check for assets
const assetDirs = ['icons', 'images'];

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function copyAssets() {
  try {
    // Ensure target directory exists
    await ensureDir(targetDir);

    // Copy individual files
    for (const file of filesToCopy) {
      const sourceFile = path.join(sourceDir, file);
      const targetFile = path.join(targetDir, file);
      
      try {
        await copyFile(sourceFile, targetFile);
        console.log(`Copied: ${file}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn(`Warning: ${file} not found, skipping`);
        } else {
          throw err;
        }
      }
    }

    // Copy asset directories
    for (const assetDir of assetDirs) {
      const sourcePath = path.join(sourceDir, assetDir);
      
      try {
        const stats = await stat(sourcePath);
        if (stats.isDirectory()) {
          await copyDir(sourcePath, path.join(targetDir, assetDir));
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn(`Warning: ${assetDir} directory not found, skipping`);
        } else {
          throw err;
        }
      }
    }

    console.log('Asset copy completed successfully');
  } catch (err) {
    console.error('Error copying assets:', err);
    process.exit(1);
  }
}

async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
      console.log(`Copied: ${path.relative(sourceDir, srcPath)}`);
    }
  }
}

// Run the copy process
copyAssets();
