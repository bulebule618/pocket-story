import {access,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const file of ['dist/index.html','dist/app.js','api/entry.js','server/cloud-runtime.mjs'])await access(file);
const config=JSON.parse(await readFile('vercel.json','utf8'));if(config.outputDirectory!=='dist')throw Error('Unexpected output directory');
const check=spawnSync(process.execPath,['scripts/check.mjs'],{stdio:'inherit'});if(check.status)process.exit(check.status);
console.log('Vercel source ready; no local database or runtime files copied into dist.');
