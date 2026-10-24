import {clone,visible,fingerprint} from './domain.js';
export function initialProgress(s,now=Date.now()) {return {definitionFingerprint:fingerprint(s),version:3,compatibilityVersion:s.compatibilityVersion,releaseId:null,enteredAt:now,unlockedAt:null,lastAt:now,started:false,phoneUnlocked:false,read:[],facts:{},factTimes:{},dependencies:[],unlocked:[],hidden:[],arrived:s.messages.filter(m=>m.initial!==false).map(m=>m.id),unread:{},variables:clone(s.switches),eventCounts:{},eventTimes:{},pending:[],callQueue:[],call:null,callHistory:[],noteUnlocked:[],notePasswords:{},ending:null,endingDismissed:false,notification:null,characterOverrides:{},members:{},systemMessages:[],replies:[],cameraAdded:false,wallpaper:null,log:[]};}
const add=(a,x)=>{if(!a.includes(x))a.push(x);};
export function conditionMet(c,p){if(c.type==='switch')return p.variables[c.key]===c.value;if(c.type==='unlocked')return p.unlocked.includes(c.target);return !!p.facts[`${c.type}:${c.target||''}`];}
export function step(s,previous,input,now=Date.now()) {
 const p=clone(previous),effects=[];p.lastAt=now;p.scheduledFactTimes??={};p.arrivalSchedule??={};
 const log=(text,data)=>{p.log.push({at:now,text,...data});p.log=p.log.slice(-200);};
 const fact=(type,id,scheduledAt=now)=>{const key=`${type}:${id||''}`;p.facts[key]=true;p.factTimes[key]=now;p.scheduledFactTimes[key]=scheduledAt;if(id)add(p.dependencies,id);};
 if(input.type==='start'){p.started=true;fact('start','');}
 if(input.type==='unlock'){p.phoneUnlocked=true;p.unlockedAt??=now;fact('unlock','');}
 if(['chat.enter','message.read','attachment.read','chat.complete','photo.grid','photo.display','photo.zoom','note.attempt','note.read','safari.read','reply','call.end'].includes(input.type))fact(input.type,input.id,p.arrivalSchedule[input.id]||now);
 if(input.type==='chat.enter')p.unread[input.id]=0;
 if(input.type==='chat.allread'){for(const r of s.rooms){p.unread[r.id]=0;fact('chat.complete',r.id);}}
 if(input.type==='message.read')add(p.read,input.id);
 if(input.type==='reply'){if(input.nodeId)fact('reply',input.nodeId);if(!p.replies.some(r=>(r.nodeId||r.roomId)===(input.nodeId||input.id))){if(input.nodeId)add(p.dependencies,input.nodeId);p.replies.push({id:`reply_${input.nodeId||input.id}`,nodeId:input.nodeId||null,roomId:input.id,text:input.text,zh:input.zh||'',at:now,display:input.display!==false});if(input.eventId)fact('event.request',input.eventId);}}
 if(input.type==='notice.dismiss')p.notification=null;
 if(input.type==='ending.dismiss')p.endingDismissed=true;
 if(input.type==='camera')p.cameraAdded=true;
 if(input.type==='note.password'){const n=s.notes.find(n=>n.id===input.id);if(n){const a=p.notePasswords[n.id]||{errors:0,until:0,disabled:false,ok:false};if(!a.disabled&&a.until<=now){if(input.code===n.passcode){a.ok=true;a.errors=0;}else{a.errors++;if(a.errors>=n.attempts){if(n.exhaustion==='disabled')a.disabled=true;else {a.until=now+n.cooldown*1000;a.errors=0;}}}p.notePasswords[n.id]=a;}}}
 const finishCall=reason=>{if(!p.call)return;const c=s.calls.find(c=>c.id===p.call.id);p.callHistory.push({id:p.call.id,at:p.call.scheduledAt,direction:p.call.direction||'in',status:reason});fact('call.end',p.call.id);if(c?.afterEventId)fact('event.request',c.afterEventId);p.call=null;effects.push({type:'call.stop'});};
 if(input.type==='call.accept'&&p.call){p.call.accepted=true;p.call.acceptedAt=now;effects.push({type:'call.accept',id:p.call.id});}
 if(['call.decline','call.hangup'].includes(input.type))finishCall(input.type==='call.decline'?'missed':'completed');
 if(input.type==='call.outgoing'&&s.calls.some(c=>c.id===input.id)&&!p.call){p.call={id:input.id,scheduledAt:now,shownAt:now,accepted:true,acceptedAt:now,direction:'out'};effects.push({type:'call.accept',id:input.id});}
 const apply=(a,scheduledAt)=>{
  log('执行 '+a.type,{target:a.target});
  if(['unlock','send'].includes(a.type)){add(p.unlocked,a.target);p.hidden=p.hidden.filter(x=>x!==a.target);const m=s.messages.find(m=>m.id===a.target);if(m&&!p.arrived.includes(m.id)){p.arrived.push(m.id);p.arrivalSchedule[m.id]=scheduledAt;p.unread[m.roomId]=(p.unread[m.roomId]||0)+1;fact('message.arrived',m.id,scheduledAt);effects.push({type:'message',id:m.id});}}
  if(a.type==='hide')add(p.hidden,a.target);
  if(a.type==='note.unlock')add(p.noteUnlocked,a.target);
  if(a.type==='set')p.variables[a.key]=a.value===true;
  if(a.type==='notify'){p.notification={...a,at:now};effects.push({type:'notice'});}
  if(a.type==='call'&&!p.callQueue.some(c=>c.taskId===a.taskId)){const c=s.calls.find(c=>c.id===a.target);if(c){if(c.expired==='missed'&&now>scheduledAt+c.timeout*1000){p.callHistory.push({id:c.id,at:scheduledAt,direction:'in',status:'missed'});fact('call.end',c.id);if(c.afterEventId)fact('event.request',c.afterEventId);}else p.callQueue.push({id:c.id,scheduledAt,taskId:a.taskId});}}
  if(a.type==='ending'){p.ending=a.target;p.endingDismissed=false;effects.push({type:'ending',id:a.target});}
  if(a.type==='wallpaper')p.wallpaper=a.src;
  if(a.type==='character')p.characterOverrides[a.target]={...p.characterOverrides[a.target],[a.field]:a.value};
  if(['member.add','member.remove'].includes(a.type)){const r=s.rooms.find(r=>r.id===a.target);if(r){const members=p.members[r.id]??clone(r.members);p.members[r.id]=a.type==='member.add'?[...new Set([...members,a.characterId])]:members.filter(id=>id!==a.characterId);p.systemMessages.push({roomId:r.id,text:`${s.characters.find(c=>c.id===a.characterId)?.name||''}${a.type==='member.add'?'님이 들어왔습니다':'님이 나갔습니다'}`,at:now});}}
 };
 if(p.call&&!p.call.accepted){const c=s.calls.find(c=>c.id===p.call.id);if(now>=p.call.shownAt+(c?.timeout||30)*1000)finishCall('missed');}
 let rounds=0,changed=true;
 while(changed&&rounds++<64){
  changed=false;
  p.pending.sort((a,b)=>a.due-b.due||a.order-b.order);
  const due=p.pending.filter(t=>t.due<=now);
  // Shift the rest of each overdue message sequence once; the next message keeps its gap.
  for(const t of due){if(!p.pending.includes(t)||t.due>now)continue;const scheduled=t.originalDue??t.due;
   if(t.action.type==='send'&&now>t.due){const shift=now-t.due,e=s.events.find(e=>e.id===t.eventId);for(const next of p.pending)if(next.eventId===t.eventId&&next.run===t.run&&next.order>t.order&&(e?.timing!=='scheduled'||next.action.type==='send')){next.originalDue??=next.due;next.due+=shift;}}
   p.pending.splice(p.pending.indexOf(t),1);apply({...t.action,taskId:t.id},scheduled);changed=true;
  }
  for(const e of s.events){if(e.enabled===false)continue;const count=p.eventCounts[e.id]||0;if(count>= (e.repeat?e.maxRuns:1))continue;if(count&&now-(p.eventTimes[e.id]||0)<e.interval)continue;
   const cs=e.conditions||[],ok=e.conditionMode==='any'?cs.some(c=>conditionMet(c,p)):cs.every(c=>conditionMet(c,p));
   const startAt=s.phone.timerStart==='unlock'?p.unlockedAt:p.enteredAt;
   const trigger=(input.type==='test.event'&&input.id===e.id)||(e.trigger==='start'?p.started:e.trigger==='delay'?startAt!==null&&p.started&&now>=startAt+(e.delay||0):e.trigger==='state'?cs.length>0:e.trigger==='manual'?!!p.facts[`event.request:${e.id}`]:!!p.facts[`${e.trigger}:${e.target||''}`]);
   if(!trigger||!ok)continue;
   p.eventCounts[e.id]=count+1;p.eventTimes[e.id]=now;add(p.dependencies,e.id);log('触发 '+e.name,{eventId:e.id,run:count+1});
   let dueAt=e.trigger==='delay'&&count===0?startAt+(e.delay||0):now;
   if(e.timing==='scheduled'&&count===0&&e.trigger!=='delay'){
    const times=(e.trigger==='state'?cs.filter(c=>conditionMet(c,p)).map(c=>p.scheduledFactTimes[`${c.type}:${c.target||''}`]):[p.scheduledFactTimes[`${e.trigger}:${e.target||''}`]]).filter(Number.isFinite);
    if(times.length)dueAt=e.conditionMode==='any'?Math.min(...times):Math.max(...times);
   }
   e.actions.forEach((a,order)=>{if(a.type==='wait'){dueAt+=Math.max(0,a.ms);return;}p.pending.push({id:`${e.id}:${count+1}:${order}`,eventId:e.id,run:count+1,order,due:dueAt,action:clone(a)});});changed=true;
  }
 }
 if(rounds>=64)log('达到单次处理上限，剩余任务下次继续');
 if(!p.call&&p.callQueue.length){p.callQueue.sort((a,b)=>a.scheduledAt-b.scheduledAt);p.call={...p.callQueue.shift(),shownAt:now,accepted:false};effects.push({type:'call.ring',id:p.call.id});}
 if(p.notification?.duration&&now>=p.notification.at+p.notification.duration)p.notification=null;
 return {progress:p,effects};
}


