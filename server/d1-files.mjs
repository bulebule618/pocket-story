import {Buffer} from 'node:buffer';
const chunkBytes=512*1024;
// D1 Free has a 500 MB per-database limit and a 2 MB row limit.
// Keep media bounded and reserve room for stories, indexes and release snapshots.
export function d1Files(database,{maxUploadBytes=4*1024*1024,mediaBudget=300*1024*1024}={}){
 const error=(status,message)=>Object.assign(Error(message),{status});
 return {kind:'d1-private-chunks',async put(id,input,mime){
  const bytes=Buffer.from(input);
  if(!bytes.length||bytes.length>maxUploadBytes)throw error(413,'当前免费存储不支持此文件大小');
  const used=await database.prepare('SELECT COALESCE(SUM(size),0) total FROM media_files').first();
  if(Number(used.total)+bytes.length>mediaBudget)throw error(507,'免费素材容量已满，已停止上传，不会升级收费');
  const statements=[database.prepare('INSERT INTO media_files(id,size,mime) SELECT ?,?,? WHERE (SELECT COALESCE(SUM(size),0) FROM media_files)+?<=?').bind(id,bytes.length,mime,bytes.length,mediaBudget)];
  for(let offset=0;offset<bytes.length;offset+=chunkBytes){const chunk=bytes.subarray(offset,offset+chunkBytes);statements.push(database.prepare('INSERT INTO media_chunks VALUES(?,?,?)').bind(id,offset/chunkBytes,chunk.buffer.slice(chunk.byteOffset,chunk.byteOffset+chunk.byteLength)));}
  // A conditional metadata insert plus FK constraints makes a concurrent over-budget batch roll back.
  try{await database.batch(statements);}catch(cause){
   const latest=await database.prepare('SELECT COALESCE(SUM(size),0) total FROM media_files').first();
   if(Number(latest.total)+bytes.length>mediaBudget)throw error(507,'免费素材容量已满，已停止上传，不会升级收费');
   throw cause;
  }return id;
 },async get(id){
  const file=await database.prepare('SELECT size FROM media_files WHERE id=?').bind(id).first();if(!file)throw error(404,'素材不存在');
  const out=await database.prepare('SELECT bytes FROM media_chunks WHERE file_id=? ORDER BY position').bind(id).all();
  const bytes=Buffer.concat(out.results.map(x=>Buffer.from(x.bytes)));if(bytes.length!==Number(file.size))throw error(503,'素材不完整，暂时无法读取');return bytes;
 }};
}
