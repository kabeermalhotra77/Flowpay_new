import fs from 'fs';
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.scripts = pkg.scripts || {};
if (!pkg.scripts['verify:phase0']) {
  pkg.scripts['verify:phase0'] = 'bash scripts/phase0-assert.sh';
}
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
console.log('package.json updated: scripts.verify:phase0');
