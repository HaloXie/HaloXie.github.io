import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const source = await readFile(new URL('./controls.ts', import.meta.url), 'utf8');
await writeFile(new URL('./controls.mjs', import.meta.url), stripTypeScriptTypes(source));
