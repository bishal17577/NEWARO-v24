// Fast syntax check for every TS/TSX file using esbuild (works with any TypeScript version).
// The full type check is `npm run lint`.
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : (/\.tsx?$/.test(entry.name) ? [full] : []);
  });
}

const files = process.argv.slice(2);
if (files.length === 0) files.push(...walk('src'), 'server.ts', 'server/secrets.ts', 'server/emailTemplates.ts');
const errors = [];
for (const file of files) {
  try {
    esbuild.transformSync(fs.readFileSync(file, 'utf8'), {
      loader: file.endsWith('x') ? 'tsx' : 'ts',
      jsx: 'automatic',
      target: 'es2022',
      sourcefile: file,
    });
  } catch (err) {
    errors.push(`${file}: ${(err.errors && err.errors[0] && err.errors[0].text) || err.message}`);
  }
}
console.log(JSON.stringify({ files: files.length, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
