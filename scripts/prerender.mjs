// Injects the server-rendered app into dist/index.html (run after the client and SSR builds).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const htmlPath = resolve(root, 'dist/index.html');
const { render } = await import(pathToFileURL(resolve(root, 'dist-ssr/entry-server.js')).href);

const PLACEHOLDER = '<div id="root"></div>';
const html = readFileSync(htmlPath, 'utf8');
const count = html.split(PLACEHOLDER).length - 1;
if (count !== 1) {
  console.error(`prerender: expected the ${PLACEHOLDER} placeholder once in dist/index.html, found it ${count} times`);
  process.exit(1);
}
writeFileSync(htmlPath, html.replace(PLACEHOLDER, `<div id="root">${render()}</div>`));
console.log('prerender: dist/index.html now contains the rendered page');
