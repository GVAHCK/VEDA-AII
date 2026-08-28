const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log(' VedaAI Environment & Windows Filesystem Diagnostic Report');
console.log('======================================================================\n');

// 1. Core Runtime Versions
console.log('--- RUNTIME VERSIONS ---');
console.log(`Node.js Version:      ${process.version}`);
console.log(`Platform / Arch:      ${process.platform} (${process.arch})`);
console.log(`OS Release:           ${os.type()} ${os.release()} (${os.version()})`);

let nextVersion = 'unknown';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  nextVersion = pkg.dependencies?.next || 'unknown';
} catch {}
console.log(`Next.js Version:      ${nextVersion}`);

// 2. Project Directory & OneDrive Detection
const projectDir = path.resolve(__dirname, '..');
console.log(`\n--- DIRECTORY & ONEDRIVE STATUS ---`);
console.log(`Project Directory:    ${projectDir}`);

const isOneDrivePath = projectDir.toLowerCase().includes('onedrive');
console.log(`OneDrive Path:        ${isOneDrivePath ? 'YES (Active Sync Folder)' : 'NO'}`);

if (isOneDrivePath) {
  console.log(`[NOTE] OneDrive Files On-Demand attaches NTFS Reparse Tags (0x00400000) to cached files.`);
  console.log(`       Node's fs.readlink() on non-symlink reparse points produces EINVAL (-4071).`);
}

// 3. Cache & Build Artifacts Status
console.log(`\n--- BUILD CACHE STATUS ---`);
const nextDir = path.join(projectDir, '.next');
const nodeCache = path.join(projectDir, 'node_modules', '.cache');

console.log(`.next directory:      ${fs.existsSync(nextDir) ? 'EXISTS' : 'CLEAN (Not Present)'}`);
console.log(`node_modules/.cache:  ${fs.existsSync(nodeCache) ? 'EXISTS' : 'CLEAN (Not Present)'}`);

// 4. Windows NTFS Reparse / Symlink Inspection
console.log(`\n--- WINDOWS FILESYSTEM INSPECTION ---`);
if (process.platform === 'win32') {
  try {
    const lstatResult = fs.lstatSync(projectDir);
    console.log(`Project Dir IsSymbolicLink: ${lstatResult.isSymbolicLink()}`);
    console.log(`Project Dir IsDirectory:    ${lstatResult.isDirectory()}`);
  } catch (err) {
    console.log(`Lstat error: ${err.message}`);
  }

  try {
    const fsutilOutput = execSync(`fsutil file queryfileid "${projectDir}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    console.log(`NTFS File ID:         ${fsutilOutput.trim()}`);
  } catch {
    console.log(`fsutil check:         Not available (standard user permissions)`);
  }
}

console.log('\n======================================================================');
console.log('DIAGNOSTIC STATUS: READY');
console.log('======================================================================');
