import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
export function openStore(directory){mkdirSync(directory,{recursive:true});const db=new DatabaseSync(path.join(directory,'pocket.sqlite'));db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');const migrations=['001_initial.sql','002_request_limits.sql','003_media_access.sql'];let version=db.prepare('PRAGMA user_version').get().user_version;for(;version<migrations.length;version++){db.exec('BEGIN');try{db.exec(readFileSync(new URL('../migrations/'+migrations[version],import.meta.url),'utf8'));db.exec('PRAGMA user_version='+(version+1)+'; COMMIT');}catch(e){db.exec('ROLLBACK');db.close();throw e;}}return db;}
