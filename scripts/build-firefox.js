const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist-firefox');
const srcDir = path.resolve(__dirname, '../src');

console.log('Cleaning dist-firefox...');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log('Building background script (Firefox)...');
try {
    execSync(`npx -y esbuild "${path.join(srcDir, 'background.firefox.ts')}" --bundle --outfile="${path.join(distDir, 'background.firefox.js')}" --platform=browser --minify`, { stdio: 'inherit' });
} catch (e) {
    console.error('Failed to build background script');
    process.exit(1);
}

console.log('Building content script...');
try {
    execSync(`npx -y esbuild "${path.join(srcDir, 'content-script.ts')}" --bundle --outfile="${path.join(distDir, 'content-script.js')}" --platform=browser --minify`, { stdio: 'inherit' });
} catch (e) {
    console.error('Failed to build content script');
    process.exit(1);
}

console.log('Copying assets...');
const assetDist = path.join(distDir, 'assets');
if (!fs.existsSync(assetDist)) fs.mkdirSync(assetDist);
fs.readdirSync(path.join(srcDir, 'assets')).forEach(file => {
    fs.copyFileSync(path.join(srcDir, 'assets', file), path.join(assetDist, file));
});

console.log('Generating manifest.json (Firefox)...');
const manifestPath = path.join(srcDir, 'manifest.firefox.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Sync version with package.json
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
manifest.version = pkg.version;

// Correct paths for the bundled extension
manifest.background.scripts = ['background.firefox.js'];
manifest.content_scripts[0].js = ['content-script.js'];

fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('✨ Firefox build complete with esbuild!');
