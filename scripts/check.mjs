import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const dir of ['dist','server','scripts','tests','api'])for(const file of await readdir(dir))if(/\.(js|mjs)$/.test(file)){const result=spawnSync(process.execPath,['--check',dir+'/'+file],{encoding:'utf8'});if(result.status){console.error(result.stderr);process.exit(1);}}
console.log('PASS JavaScript syntax checks');
