import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {d1Files} from '../server/d1-files.mjs';
test('免费D1素材分块完整读取、容量停止和批次回滚，不使用收费对象存储',async t=>{
 const raw=new DatabaseSync(':memory:');raw.exec('PRAGMA foreign_keys=ON');raw.exec(await readFile(new URL('../cloudflare/migrations/004_media_chunks.sql',import.meta.url),'utf8'));t.after(()=>raw.close());
 const normalize=args=>args.map(x=>x instanceof ArrayBuffer?new Uint8Array(x):x);
 const database={prepare(sql){return {sql,args:[],bind(...args){this.args=normalize(args);return this;},async first(){return raw.prepare(sql).get(...this.args);},async all(){return {results:raw.prepare(sql).all(...this.args)};}};},async batch(items){raw.exec('BEGIN');try{const out=items.map(x=>raw.prepare(x.sql).run(...x.args));raw.exec('COMMIT');return out;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const files=d1Files(database,{mediaBudget:2*1024*1024}),bytes=Buffer.alloc(1100000,77);
 await files.put('image',bytes,'image/png');assert.deepEqual(await files.get('image'),bytes);assert.equal(raw.prepare('SELECT COUNT(*) n FROM media_chunks').get().n,3);
 await assert.rejects(files.put('over-budget',bytes,'image/png'),{status:507});assert.equal(raw.prepare('SELECT COUNT(*) n FROM media_files').get().n,1);
 await assert.rejects(files.put('too-large',Buffer.alloc(4*1024*1024+1),'audio/wav'),{status:413});await assert.rejects(files.get('missing'),{status:404});
 await assert.rejects(database.batch([database.prepare('INSERT INTO media_files VALUES(?,?,?)').bind('rollback',1,'image/png'),database.prepare('INSERT INTO media_chunks VALUES(?,?,?)').bind('missing',0,new ArrayBuffer(1))]));assert.equal(raw.prepare('SELECT COUNT(*) n FROM media_files').get().n,1);
 raw.exec('DELETE FROM media_chunks; DELETE FROM media_files');
 const concurrent=await Promise.allSettled([files.put('race-a',bytes,'image/png'),files.put('race-b',bytes,'image/png')]);
 assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);assert.equal(concurrent.find(x=>x.status==='rejected').reason.status,507);assert.equal(raw.prepare('SELECT COUNT(*) n FROM media_files').get().n,1);assert.equal(raw.prepare('SELECT COUNT(*) n FROM media_chunks').get().n,3);
});
