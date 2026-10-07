import {SELECTORS} from './selectors.js';
import {aborted} from './wait-strategy.js';
// Executed only in the selected page. No page-world API calls or arbitrary scripts.
export function pageOperation(action,rules,runId,payload={}){
 const slot='__douyinReviewProbeV02';
 if(action==='cancel'){if(window[slot]?.id===runId)window[slot].cancelled=true;return {status:'CANCELLED'};}
 if(location.protocol!=='https:'||location.hostname!=='anchor.douyin.com')return {status:'WRONG_PAGE'};
 const visible=e=>!!e&&!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
 const enabled=e=>!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!e.closest('.ant-pagination-disabled');
 const label=e=>(e.getAttribute('aria-label')||e.innerText||e.textContent||'').replace(/\s+/g,'').trim();
 const controls=()=>[...document.querySelectorAll(rules.controls)].filter(visible);
 function target(id){const def=rules[id];if(!def)return null;
 for(const css of def.css){const items=[...document.querySelectorAll(css)].filter(visible);if(items.length===1)return items[0];}
 const matches=controls().filter(e=>def.labels.some(t=>label(e)===t));
 const leaves=matches.filter(e=>!matches.some(other=>other!==e&&e.contains(other)));return leaves.length===1?leaves[0]:null;
 }
 function liveKey(){const u=new URL(location.href);const ids=['room_id','live_id','roomId','liveId'].map(k=>u.searchParams.get(k)||'').join('|');if(ids!=='|||')return ids;const start=bound('liveStart'),end=bound('liveEnd');return start&&end?start+'|'+end:u.pathname.replace(/\/(overview|content|audience|traffic)\/?$/,'');}
 function panel(){for(const css of rules.textPanels){const list=[...document.querySelectorAll(css)].filter(visible);if(list.length===1)return list[0];}
 const tab=target('text');if(tab){const controlled=tab.getAttribute('aria-controls');if(controlled&&visible(document.getElementById(controlled)))return document.getElementById(controlled);}
 return null;}
 function bound(which){for(const css of rules[which]){const e=document.querySelector(css);if(e&&visible(e))return e.getAttribute(which==='liveStart'?'data-live-start':'data-live-end')||e.getAttribute('datetime')||e.textContent.trim();}
 const text=document.body.innerText||'';const marker=which==='liveStart'?'(?:直播开始时间|开播时间)':'(?:直播结束时间|下播时间)';const m=text.match(new RegExp(marker+'\\s*[：:]?\\s*(\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}(?::\\d{2})?)'));return m?.[1]||null;}
 if(action==='inspect'){
 const isReview=(!!target('content')&&!!target('overview'))&&(/直播复盘/.test(document.body.innerText||'')||new RegExp(rules.reviewRoute).test(location.pathname));
 return {status:isReview?'OK':'NOT_REVIEW',live_key:liveKey(),live_start:bound('liveStart'),live_end:bound('liveEnd')};
 }
 if(action==='init'){window[slot]={id:runId,cancelled:false,liveKey:payload.live_key};return {status:'OK'};}
 const run=window[slot];if(!run||run.id!==runId||run.cancelled)return {status:'CANCELLED'};
 if(run.liveKey!==liveKey())return {status:'LIVE_CHANGED'};
 if(action==='find')return {status:target(payload.id)?'FOUND':'SKIPPED_NOT_AVAILABLE'};
 if(action==='click'){
 const e=target(payload.id);if(!e)return {status:'SKIPPED_NOT_AVAILABLE'};if(!enabled(e))return {status:'SKIPPED_DISABLED'};
 e.click();return {status:'CLICKED'};
 }
 if(action==='signature'){const p=panel();return {status:'OK',signature:document.querySelectorAll('[role="tab"][aria-selected="true"]').length+':'+(p?p.childElementCount+':'+p.scrollHeight+':'+p.scrollTop:document.body.childElementCount)};}
 if(action==='textReset'||action==='textAdvance'){
 const p=panel();if(!p)return {status:'SKIPPED_NOT_AVAILABLE'};
 const slider=rules.textRange.flatMap(css=>[...p.querySelectorAll(css)]).find(e=>visible(e)&&enabled(e));
 if(slider){const min=Number(slider.min||0),max=Number(slider.max||100),old=Number(slider.value),step=Math.max(Number(slider.step)||1,(max-min)/12);const next=action==='textReset'?min:Math.min(max,old+step);
 if(next===old)return {status:action==='textReset'?'AT_START':'AT_END'};
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(slider,String(next));slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));return {status:'ADVANCED',method:'time_range'};
 }
 if(action==='textReset'){const previous=[...rules.textFirst,...rules.textPrevious].flatMap(css=>[...p.querySelectorAll(css)]).find(e=>visible(e)&&enabled(e));if(previous){previous.click();return {status:'ADVANCED',method:'pagination_reset'};}}
 if(action==='textAdvance'){
 const next=rules.textNext.flatMap(css=>[...p.querySelectorAll(css)]).find(e=>visible(e)&&enabled(e));if(next){next.click();return {status:'ADVANCED',method:'pagination'};}
 }
 const scroll=[p,...p.querySelectorAll('*')].find(e=>visible(e)&&e.scrollHeight>e.clientHeight+20&&/(auto|scroll)/.test(getComputedStyle(e).overflowY));
 if(scroll){const value=action==='textReset'?0:Math.min(scroll.scrollHeight-scroll.clientHeight,scroll.scrollTop+Math.max(100,scroll.clientHeight*0.8));if(Math.abs(scroll.scrollTop-value)<1)return {status:action==='textReset'?'AT_START':'AT_END'};scroll.scrollTop=value;scroll.dispatchEvent(new Event('scroll',{bubbles:true}));return {status:'ADVANCED',method:'scroll'};}
 return {status:'SKIPPED_NOT_AVAILABLE'};
 }
 return {status:'UNSUPPORTED'};
}
export class PageController{
 constructor(send,tabId,runId,signal){Object.assign(this,{send,tabId,runId,signal});}
 async perform(action,payload={}){if(action!=='cancel')aborted(this.signal);
 const expression=`(${pageOperation.toString()})(${JSON.stringify(action)},${JSON.stringify(SELECTORS)},${JSON.stringify(this.runId)},${JSON.stringify(payload)})`;
 const result=await this.send({tabId:this.tabId},'Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});
 if(action!=='cancel')aborted(this.signal);if(result.exceptionDetails)throw Object.assign(Error('PAGE_OPERATION_FAILED'),{code:'DOM_ERROR'});
 const value=result.result?.value;if(!value)throw Object.assign(Error('PAGE_UNAVAILABLE'),{code:'DOM_ERROR'});
 if(['WRONG_PAGE','LIVE_CHANGED','CANCELLED'].includes(value.status)&&action!=='cancel')throw Object.assign(Error(value.status),{code:value.status});return value;
 }
 inspect(){return this.perform('inspect');}init(value){return this.perform('init',{live_key:value.live_key});}
 async reload(){aborted(this.signal);await this.send({tabId:this.tabId},'Page.reload',{});aborted(this.signal);}
 find(id){return this.perform('find',{id});}click(id){return this.perform('click',{id});}
 signature(){return this.perform('signature').then(r=>r.signature);}
 textReset(){return this.perform('textReset');}textAdvance(){return this.perform('textAdvance');}cancel(){return this.perform('cancel');}
}
