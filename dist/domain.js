export const clone = x => structuredClone(x);
export const uid = p => `${p}_${crypto.randomUUID()}`;
export const collections = ['characters','rooms','messages','replyNodes','albums','photos','notes','sms','safari','calls','events','endings'];
export const apps = [['chat','KakaoTalk','●'],['sms','메시지','▰'],['calls','전화','☎'],['camera','카메라','◉'],['photos','사진','✿'],['notes','메모','▤'],['safari','Safari','◈']];
export function blank(title='未命名作品') { return {schemaVersion:3,compatibilityVersion:1,id:uid('story'),title,phone:{model:'iPhone 18 Pro',ownerId:'',passcode:'',remember:true,hint:'',timerStart:'lock',battery:86,network:'5G',signal:4,wallpaper:'',lockWallpaper:'',outer:'#e9e9ed',columns:4,iconSize:54,pageSize:12,appOrder:apps.map(a=>a[0]),dock:['calls','chat','safari'],hiddenApps:[],weather:true,weatherText:'서울 18°',dateWidget:true,typingSpeed:'normal',bilingual:true,translationOpen:true,savePhotos:false,resetPasswords:true,cameraPhotoId:'',messageSound:''},...Object.fromEntries(collections.map(k=>[k,[]])),recentOrder:[],switches:{}}; }
export function newItem(kind,s) {
 const id=uid(kind.slice(0,-1));
 return {replyNodes:{id,roomId:s.rooms[0]?.id||'',name:'新回复节点',afterMessageId:'',replyMode:'preset',replyText:'지금 갈게.',replyZh:'',replyEventId:'',replyAsMessage:true,gateSwitch:''},characters:{id,name:'新人物',remark:'',status:'',avatar:'',background:'',gallery:[],chatButton:true,phoneButton:false,chatGate:'',phoneGate:'',phoneMode:'unavailable',callId:'',eventId:'',crop:{x:50,y:50,scale:1}},rooms:{id,name:'新聊天',characterId:s.characters.find(c=>c.id!==s.phone.ownerId)?.id||'',members:[],group:false,pinned:false,avatar:'',startTime:'2026-10-24T20:00',interval:60,replyMode:'readonly',replyText:'',replyZh:'',replyEventId:'',replyAsMessage:true},messages:{id,roomId:s.rooms[0]?.id||'',sender:s.phone.ownerId||s.characters[0]?.id||'',type:'text',text:'새로운 메시지',zh:'',time:'20:00',initial:true,failed:false,quoteId:'',src:'',audio:'',transcript:'',transcriptOpen:true,product:'',amount:'',received:false},albums:{id,name:'新相簿',photoIds:[],initial:true,lockedStyle:'hidden',cover:''},photos:{id,title:'照片',src:'',initial:true,lockedStyle:'hidden',trigger:'display'},notes:{id,title:'新备忘录',text:'',date:'2026-10-24',initial:true,lockedStyle:'placeholder',passcode:'',remember:true,hint:'',error:'암호가 올바르지 않습니다',attempts:5,exhaustion:'cooldown',cooldown:60},sms:{id,sender:'안내',text:'',date:'2026-10-24'},safari:{id,keyword:'기록',title:'검색 결과',src:''},calls:{id,name:'알 수 없음',characterId:'',text:'',audio:'',ringtone:'',presentation:'fullscreen',timeout:30,expired:'replay',afterEventId:''},events:{id,name:'新事件',enabled:true,trigger:'state',target:'',conditions:[],conditionMode:'all',actions:[],repeat:false,maxRuns:1,interval:1000,timing:'actual'},endings:{id,title:'이야기의 끝',text:'',src:'',audio:'',continue:false,button:'계속 둘러보기'}}[kind];
}
export function visible(item,p) { return !p.hidden.includes(item.id)&&(item.initial!==false||p.unlocked.includes(item.id)); }
export function albumPhotos(s,p,albumId) {
 const albums=s.albums.filter(a=>visible(a,p)&&(!albumId||a.id===albumId));
 const ids=new Set(albums.flatMap(a=>a.photoIds));
 if(!albumId&&p.cameraAdded&&s.phone.cameraPhotoId)ids.add(s.phone.cameraPhotoId);
 const order=albumId?albums[0]?.photoIds||[]:[...s.recentOrder,...s.photos.map(x=>x.id)];
 return [...new Set(order)].map(id=>s.photos.find(x=>x.id===id)).filter(x=>x&&ids.has(x.id)&&(visible(x,p)||(p.cameraAdded&&x.id===s.phone.cameraPhotoId)));
}
export function referencedIds(s) {return new Set(collections.flatMap(k=>s[k].map(x=>x.id)));}
export function fingerprint(s){let h=2166136261;const text=JSON.stringify(s);for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16)+':'+text.length;}
export function validate(s) {
 const errors=[];
 if(!s||s.schemaVersion!==3||typeof s.title!=='string'||!s.title.trim()||!s.phone||collections.some(k=>!Array.isArray(s[k])))return ['作品格式或名称无效'];
 const all=collections.flatMap(k=>s[k]),ids=new Set();
 for(const x of all){if(!x||typeof x.id!=='string'||ids.has(x.id))errors.push('内容 ID 重复或无效');ids.add(x?.id);}
 const has=(k,id)=>s[k].some(x=>x.id===id);
 if(!has('characters',s.phone.ownerId))errors.push('请选择手机主人');
 const pass=p=>!p||/^\d{4}(\d{2})?$/.test(p);
 if(!pass(s.phone.passcode))errors.push('锁屏密码必须是 4 或 6 位数字');
 if(s.phone.dock.length>4||s.phone.columns<2||s.phone.columns>6)errors.push('桌面配置无效');
 for(const r of s.rooms){if(r.group?(r.members||[]).some(id=>!has('characters',id)):!has('characters',r.characterId))errors.push('聊天人物引用无效');}
 for(const m of s.messages){if(!has('rooms',m.roomId)||!has('characters',m.sender))errors.push('消息引用无效');if(!['text','image','voice','gift','transfer'].includes(m.type))errors.push('消息类型无效');if(m.quoteId){const q=s.messages.find(x=>x.id===m.quoteId);if(!q||q.roomId!==m.roomId||s.messages.indexOf(q)>=s.messages.indexOf(m))errors.push('只能引用同聊已出现的消息');}}
 for(const n of s.replyNodes){if(!has('rooms',n.roomId)||n.afterMessageId&&!s.messages.some(m=>m.id===n.afterMessageId&&m.roomId===n.roomId)||n.replyEventId&&!has('events',n.replyEventId))errors.push('回复节点引用无效');}
 for(const a of s.albums)if(a.photoIds.some(id=>!has('photos',id)))errors.push('相簿照片引用无效');
 for(const n of s.notes)if(!pass(n.passcode)||n.attempts<1||n.cooldown<0)errors.push('备忘录密码策略无效');
 for(const e of s.events){if(!Array.isArray(e.actions)||!Array.isArray(e.conditions)){errors.push('事件格式无效');continue;}if(e.repeat&&(!(e.interval>=100)||!(e.maxRuns>=1)))errors.push('重复事件需有效间隔与次数上限');for(const c of e.conditions)if(c.target&&!ids.has(c.target))errors.push('事件条件引用无效');for(const a of e.actions){if(['unlock','hide','send','call','ending','note.unlock','character','member.add','member.remove'].includes(a.type)&&!ids.has(a.target))errors.push('事件动作目标无效');if(a.type==='call'&&!has('calls',a.target))errors.push('来电目标无效');if(a.type==='ending'&&!has('endings',a.target))errors.push('结局目标无效');if(a.type==='send'&&!has('messages',a.target))errors.push('消息目标无效');if(a.type==='set'&&typeof a.value!=='boolean')errors.push('只支持布尔开关');if(a.type==='wait'&&(!Number.isFinite(a.ms)||a.ms<0))errors.push('等待时间无效');}}
 for(const v of Object.values(s.switches))if(typeof v!=='boolean')errors.push('只支持布尔开关');
 return [...new Set(errors)];
}
export function compatible(s,p) {
 if(p.compatibilityVersion!==s.compatibilityVersion||p.definitionFingerprint!==fingerprint(s))return false;
 const ids=referencedIds(s);
 if(p.version!==3)return false;
 const dependencies=[...p.dependencies,...p.unlocked,...p.hidden,...p.arrived,...p.noteUnlocked,...Object.keys(p.eventCounts||{}),...p.callHistory.map(x=>x.id),...p.pending.flatMap(t=>[t.eventId,t.action.target,t.action.characterId].filter(Boolean)),...p.callQueue.map(x=>x.id),...Object.keys(p.notePasswords),...Object.keys(p.characterOverrides),...Object.keys(p.members),...Object.values(p.members).flat(),...p.replies.map(x=>x.roomId),...p.systemMessages.map(x=>x.roomId),...(p.call?[p.call.id]:[]),...(p.ending?[p.ending]:[])];
 return dependencies.every(id=>ids.has(id))&&Object.keys(p.variables).every(k=>k in s.switches);
}
export function copyModules(source,chosen) {
 const s=blank(source.title+' · 副本');s.phone=clone(source.phone);s.switches=clone(source.switches);
 const selected=new Set(chosen);if(selected.has('replyNodes'))selected.add('rooms');if(selected.has('messages'))selected.add('rooms');if(selected.has('rooms'))selected.add('characters');if(selected.has('albums'))selected.add('photos');if(selected.has('events'))collections.forEach(k=>selected.add(k));
 for(const k of selected)if(collections.includes(k))s[k]=clone(source[k]);
 if(!selected.has('characters'))s.phone.ownerId='';
 if(selected.has('photos'))s.recentOrder=clone(source.recentOrder);
 return s;
}
