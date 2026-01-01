/**
 * Extension Build Script
 * 
 * This script builds the Chrome extension and renames the output directory
 * to extensions-{version} format under the release folder.
 * The version is automatically read from package.json.
 * 
 * Usage: node scripts/build-extension.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read version from package.json
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

// Define paths
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const extensionDir = path.join(releaseDir, 'extensions');

console.log(`\n[BUILD] Starting extension build v${version}...\n`);

// 1. Run Vite build
try {
    console.log('[BUILD] Running vite build...');
    execSync('npx vite build', {
        cwd: rootDir,
        stdio: 'inherit'
    });
    console.log('[BUILD] Vite build completed\n');
} catch (error) {
    console.error('[ERROR] Build failed:', error.message);
    process.exit(1);
}

// 2. Ensure release directory exists
if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
}

// 3. Remove old extensions directory in release folder
const extPath = path.join(releaseDir, 'extensions');
if (fs.existsSync(extPath)) {
    console.log('[BUILD] Removing old directory: release/extensions');
    fs.rmSync(extPath, { recursive: true, force: true });
}

// 4. Move dist to release/extensions-{version}
if (fs.existsSync(distDir)) {
    console.log('[BUILD] Moving dist -> release/extensions');
    fs.renameSync(distDir, extensionDir);
    console.log('\n[DONE] Build complete! Output directory: release/extensions');
    console.log(`[PATH] ${extensionDir}\n`);
} else {
    console.error('[ERROR] dist directory does not exist');
    process.exit(1);
}
