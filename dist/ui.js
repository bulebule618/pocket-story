import {resolveMedia} from './trial-assets.js';
import {resolveHostedMedia} from './location.js';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeSrc=v=>typeof v==='string'&&(/^\/(?!\/)/.test(v)||/^blob:/.test(v))?resolveHostedMedia(resolveMedia(v)):'';
export const image=(src,cls='')=>safeSrc(src)?`<img class="${cls}" src="${esc(safeSrc(src))}" alt="">`:'';
export const button=(text,action,cls='',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
export const options=(pairs,value)=>pairs.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('');
export const field=(label,key,value,type='text',extra='')=>`<label>${label}${type==='textarea'?`<textarea data-field="${key}" ${extra}>${esc(value)}</textarea>`:`<input type="${type}" data-field="${key}" value="${esc(value)}" ${extra}>`}</label>`;
export const select=(label,key,value,pairs)=>`<label>${label}<select data-field="${key}">${options(pairs,value)}</select></label>`;
export const check=(label,key,value)=>`<label class="check"><input type="checkbox" data-field="${key}" ${value?'checked':''}>${label}</label>`;
export function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),5000);}

