import {AsyncLocalStorage} from 'node:async_hooks';

// Request-scoped transaction connections prevent one invocation from borrowing another's transaction.
export function localDatabase(db){
 let queue=Promise.resolve();
 return {
  one:async(sql,...args)=>db.prepare(sql).get(...args),
  all:async(sql,...args)=>db.prepare(sql).all(...args),
  run:async(sql,...args)=>db.prepare(sql).run(...args),
  async transaction(fn){db.exec('BEGIN IMMEDIATE');try{const out=await fn();db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}},
  withRequest(fn){const task=queue.then(fn,fn);queue=task.catch(()=>{});return task;},
  close:()=>db.close(),kind:'sqlite-local'
 };
}

export function libsqlDatabase(client){
 const scope=new AsyncLocalStorage(),connection=()=>scope.getStore()||client;
 return {
  async one(sql,...args){return (await connection().execute({sql,args})).rows[0];},
  async all(sql,...args){return (await connection().execute({sql,args})).rows;},
  async run(sql,...args){const out=await connection().execute({sql,args});return {changes:out.rowsAffected};},
  async transaction(fn){if(scope.getStore())return fn();const tx=await client.transaction('write');try{const result=await scope.run(tx,fn);await tx.commit();return result;}catch(e){await tx.rollback().catch(()=>{});throw e;}finally{tx.close();}},
  withRequest:fn=>scope.run(null,fn),close:()=>client.close(),kind:'libsql-cloud'
 };
}

export function asDatabase(db){return typeof db.withRequest==='function'?db:localDatabase(db);}
