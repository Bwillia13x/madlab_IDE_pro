#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const base = path.join(root, 'vscode', 'product.json');
const patch = path.join(root, 'branding', 'product.json');

function deepMerge(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return b.slice();
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    const out = { ...a };
    for (const k of Object.keys(b)) {
      out[k] = deepMerge(a[k], b[k]);
    }
    return out;
  }
  return b === undefined ? a : b;
}

const baseJson = JSON.parse(fs.readFileSync(base, 'utf8'));
const patchJson = JSON.parse(fs.readFileSync(patch, 'utf8'));
const merged = deepMerge(baseJson, patchJson);
fs.writeFileSync(base, JSON.stringify(merged, null, 2));
console.log('[patch-product.mjs] Patched vscode/product.json');


