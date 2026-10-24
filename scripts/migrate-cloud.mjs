import{readFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import{createClient}from'@libsql/client/http';
const env=process.env;if(!env.TURSO_DATABASE_URL||!env.TURSO_AUTH_TOKEN)throw Error('请配置服务端 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN');
if(!/^(libsql|https):\/\//.test(env.TURSO_DATABASE_URL))throw Error('此命令只用于已配置的云数据库，不修改本机正式数据');
const client=createClient({url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN});
try{
 await client.execute('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied INTEGER NOT NULL)');
 for(const[version,name]of[[1,'001_initial.sql'],[2,'002_request_limits.sql'],[3,'003_media_access.sql']]){
  const source=await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'),checksum=createHash('sha256').update(source).digest('hex');
  const existing=(await client.execute({sql:'SELECT checksum FROM schema_migrations WHERE version=?',args:[version]})).rows[0];
  if(existing){if(existing.checksum!==checksum)throw Error('已经应用的迁移校验不匹配：'+name);continue;}
  const statements=source.split(';').map(x=>x.trim()).filter(x=>x&&!/^PRAGMA/i.test(x));
  await client.batch([...statements,{sql:'INSERT INTO schema_migrations VALUES(?,?,?)',args:[version,checksum,Date.now()]}],'write');console.log('Applied '+name);
 }
}finally{client.close();}
