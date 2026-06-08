/**
 * Fail fast with a clear message when react-router packages are missing or incomplete.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredFiles = [
  'node_modules/react-router-dom/dist/index.js',
  'node_modules/react-router-dom/dist/index.d.ts',
  'node_modules/react-router/dist/index.js',
  'node_modules/@remix-run/router/dist/router.js',
];

const missing = requiredFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));

if (missing.length > 0) {
  console.error('\n[frontend] Router dependencies are missing or corrupted:\n');
  missing.forEach((file) => console.error(`  - ${file}`));
  console.error('\nFix: cd frontend && rm -rf node_modules && npm install\n');
  process.exit(1);
}
