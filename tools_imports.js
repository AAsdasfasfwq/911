// static check: every named import exists as an export in the target module
const fs = require('fs'), path = require('path');
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })('src');
const exportsOf = (f) => {
  const s = fs.readFileSync(f, 'utf8'); const ex = new Set();
  for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z0-9_$]+)/g)) ex.add(m[1]);
  for (const m of s.matchAll(/export\s*\{([^}]+)\}/g)) for (const n of m[1].split(',')) { const x = n.trim().split(/\s+as\s+/); ex.add((x[1] || x[0]).trim()); }
  if (/export\s+default/.test(s)) ex.add('default');
  return ex;
};
let bad = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/import\s+(?:([A-Za-z0-9_$]+)\s*,?\s*)?(?:\{([^}]+)\})?\s*(?:\*\s+as\s+\w+\s*)?from\s+'(\.[^']+)'/g)) {
    const target = path.join(path.dirname(f), m[3]);
    if (!fs.existsSync(target)) { console.log(`${f}: missing module ${m[3]}`); bad++; continue; }
    const ex = exportsOf(target);
    if (m[1] && !ex.has('default')) { console.log(`${f}: no default export in ${m[3]}`); bad++; }
    if (m[2]) for (const n of m[2].split(',')) { const name = n.trim().split(/\s+as\s+/)[0].trim(); if (name && !ex.has(name)) { console.log(`${f}: '${name}' not exported by ${m[3]}`); bad++; } }
  }
}
console.log(bad ? `${bad} import problems` : 'imports OK');
