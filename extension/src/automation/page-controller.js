import {transcriptDOM} from './transcript-dom.js';
import {SELECTORS} from './selectors.js';
import {aborted} from './wait-strategy.js';
// Executed only in the selected page. No page-world API calls or arbitrary scripts.
export function pageOperation(action,rules,runId,payload={},transcriptProbe=null){
 const slot='__douyinReviewProbeV02';
 if(action==='cancel'){if(window[slot]?.id===runId)window[slot].cancelled=true;return {status:'CANCELLED'};}
 if(location.protocol!=='https:'||location.hostname!=='anchor.douyin.com')return {status:'WRONG_PAGE'};
 const routeMatch=/^\/anchor\/review(?:\/|$)/.test(location.pathname)||new RegExp(rules.reviewRoute).test(location.pathname);
 const pathname=/^\/anchor\/review\/?$/.test(location.pathname)?location.pathname:(routeMatch?'[KNOWN_REVIEW_ROUTE]':'[OTHER_PATH]');
 const hasDocument=typeof document!=='undefined'&&!!document;
 const hasBody=hasDocument&&!!document.body;
 const ready=hasBody&&['interactive','complete'].includes(document.readyState);
 if(action==='readiness')return {status:ready&&routeMatch?'OK':'DOM_NOT_READY',hostname:location.hostname,pathname,has_document:hasDocument,has_body:hasBody,ready_state:hasDocument?document.readyState:'unavailable',route_match:routeMatch};
 if(!ready)return {status:'DOM_NOT_READY'};
 const visible=e=>!!e&&!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
 const enabled=e=>!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&!e.closest('.ant-pagination-disabled');
 const label=e=>(e.getAttribute('aria-label')||e.innerText||e.textContent||'').replace(/\s+/g,'').trim();

 const forbiddenContainer=e=>/^(BODY|HTML|MAIN|SECTION|ARTICLE|HEADER|FOOTER|NAV|FORM)$/.test(e.tagName);
 function nearestClickable(node,text,scope=document){
 let pointerTarget=null;
 for(let e=node,depth=0;e&&depth<=rules.maxControlAncestorDepth;e=e.parentElement,depth++){
 if(scope!==document&&e!==scope&&!scope.contains(e))break;
 if(forbiddenContainer(e))break;
 if(!visible(e)||label(e)!==text)continue;
 const tabindex=e.getAttribute('tabindex');
 const clickable=e.matches(rules.clickableControls)||(tabindex!==null&&Number.isFinite(Number(tabindex))&&Number(tabindex)>=0)||new RegExp(rules.clickableClasses).test(e.getAttribute('class')||'');
 if(e.querySelectorAll(rules.controls).length>rules.maxControlDescendants)continue;
 if(clickable)return e;
 // cursor is inherited by plain spans; prefer their bounded clickable container.
 if(!pointerTarget&&e.tagName!=='SPAN'&&getComputedStyle(e).cursor==='pointer')pointerTarget=e;
 }return pointerTarget;
 }
 function resolveNodes(nodes,text,scope=document){
 const elements=[...new Set(nodes.map(e=>nearestClickable(e,text,scope)).filter(Boolean))];
 // A clickable text leaf nested in another clickable match represents one target.
 const smallest=elements.filter(e=>!elements.some(other=>other!==e&&e.contains(other)));
 return smallest.length>1?{status:'AMBIGUOUS'}:smallest.length===1?{status:'FOUND',element:smallest[0]}:{status:'SKIPPED_NOT_AVAILABLE'};
 }
 function findExactTextControl(text,scope=document){
 const normalized=String(text).replace(/\s+/g,'').trim();
 const matches=[...scope.querySelectorAll(rules.controls)].filter(e=>visible(e)&&!forbiddenContainer(e)&&label(e)===normalized);
 const leaves=matches.filter(e=>!matches.some(other=>other!==e&&e.contains(other)));
 return resolveNodes(leaves,normalized,scope);
 }
 function target(id){const def=rules[id];if(!def)return {status:'SKIPPED_NOT_AVAILABLE'};
 let scope=document;
 if(id==='fans'){
 const content=target('content').element,controlled=content?.getAttribute('aria-controls'),linked=controlled?document.getElementById(controlled):null;
 const panels=linked&&visible(linked)?[linked]:rules.contentPanels.flatMap(css=>[...document.querySelectorAll(css)]).filter(visible);const unique=[...new Set(panels)].filter(e=>(!forbiddenContainer(e)||['SECTION','ARTICLE'].includes(e.tagName))&&e.querySelectorAll(rules.controls).length<=400);
 if(unique.length===1)scope=unique[0];else return {status:unique.length>1?'AMBIGUOUS':'SKIPPED_NOT_AVAILABLE'};
 }
 const results=def.labels.map(text=>findExactTextControl(text,scope));if(results.some(r=>r.status==='AMBIGUOUS'))return {status:'AMBIGUOUS'};
 if(new Set(results.filter(r=>r.status==='FOUND').map(r=>r.element)).size>1)return {status:'AMBIGUOUS'};
 for(const css of def.css){const nodes=[...scope.querySelectorAll(css)].filter(visible);if(!nodes.length)continue;
 const resolved=def.labels.map(text=>resolveNodes(nodes.filter(e=>label(e)===text),text,scope));
 if(resolved.some(r=>r.status==='AMBIGUOUS'))return {status:'AMBIGUOUS'};
 const elements=[...new Set(resolved.filter(r=>r.status==='FOUND').map(r=>r.element))];
 if(elements.length>1)return {status:'AMBIGUOUS'};if(elements.length===1)return {status:'FOUND',element:elements[0]};
 }
 const elements=[...new Set(results.filter(r=>r.status==='FOUND').map(r=>r.element))];
 return elements.length>1?{status:'AMBIGUOUS'}:elements.length===1?{status:'FOUND',element:elements[0]}:{status:'SKIPPED_NOT_AVAILABLE'};
 }
 function liveKey(){const u=new URL(location.href);const ids=['room_id','live_id','roomId','liveId'].map(k=>u.searchParams.get(k)||'').join('|');if(ids!=='|||')return ids;const start=bound('liveStart'),end=bound('liveEnd');return start&&end?start+'|'+end:u.pathname.replace(/\/(overview|content|audience|traffic)\/?$/,'');}
 function panel(){for(const css of rules.textPanels){const list=[...document.querySelectorAll(css)].filter(e=>visible(e)&&!e.matches('button,a,[role="tab"],[role="button"]'));if(list.length===1)return list[0];}
 const match=target('text');const tab=match.element;if(match.status==='FOUND'){const controlled=tab.getAttribute('aria-controls');if(controlled&&visible(document.getElementById(controlled)))return document.getElementById(controlled);}
 if(match.status==='FOUND')for(let e=tab.parentElement,depth=0;e&&depth<4;e=e.parentElement,depth++){
 if(forbiddenContainer(e)&&!['SECTION','ARTICLE'].includes(e.tagName))break;
 if(e.querySelectorAll(rules.controls).length<=400&&e.querySelector(rules.textSlider+',input[type="range"],.ant-pagination,[data-probe-text-next]'))return e;
 }
 return null;}
 function bound(which){for(const css of rules[which]){const e=document.querySelector(css);if(e&&visible(e))return e.getAttribute(which==='liveStart'?'data-live-start':'data-live-end')||e.getAttribute('datetime')||e.textContent.trim();}
 const text=document.body?.innerText||'';const marker=which==='liveStart'?'(?:直播开始时间|开播时间)':'(?:直播结束时间|下播时间)';const m=text.match(new RegExp(marker+'\\s*[：:]?\\s*(\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}(?::\\d{2})?)'));return m?.[1]||null;}

 if(action==='inspect'){
 const reviewTextFound=/直播复盘/.test(document.body?.innerText||'');
 // Page identity is independent of asynchronously rendered navigation controls.
 const diagnostic={pathname:/^\/anchor\/review\/?$/.test(location.pathname)?location.pathname:(routeMatch?'[KNOWN_REVIEW_ROUTE]':'[OTHER_PATH]'),route_match:routeMatch,review_text_found:reviewTextFound,overview_found:target('overview').status==='FOUND',content_found:target('content').status==='FOUND'};
 return {status:routeMatch||reviewTextFound?'OK':'NOT_REVIEW',page_diagnostic:diagnostic,live_key:liveKey(),live_start:bound('liveStart'),live_end:bound('liveEnd')};
 }
 if(action==='signature'&&payload.before_init)return {status:'OK',signature:document.body?.childElementCount||0};
 if(action==='init'){window[slot]={id:runId,cancelled:false,liveKey:payload.live_key};return {status:'OK'};}
 const run=window[slot];if(!run||run.id!==runId||run.cancelled)return {status:'CANCELLED'};
 if(run.liveKey!==liveKey())return {status:'LIVE_CHANGED'};
 if(action==='transcriptFind'||action==='transcriptScroll')return transcriptProbe(action==='transcriptScroll'?'scroll':'find');
 if(action==='find')return {status:target(payload.id).status};
 if(action==='click'){
 const found=target(payload.id);if(found.status!=='FOUND')return {status:found.status};const e=found.element;if(!enabled(e))return {status:'SKIPPED_DISABLED'};
 e.click();return {status:'CLICKED'};
 }
 if(action==='signature'){const p=panel();return {status:'OK',signature:document.querySelectorAll('[role="tab"][aria-selected="true"]').length+':'+(p?p.childElementCount+':'+p.scrollHeight+':'+p.scrollTop:document.body?.childElementCount||0)};}
 if(action==='textDiagnostic'){
 let p=panel();const scopeFound=!!p,tab=target('text').element;
 if(!p&&tab)for(let e=tab.parentElement,d=0;e&&d<4;e=e.parentElement,d++){if(['BODY','HTML','MAIN'].includes(e.tagName)||e.querySelectorAll(rules.controls).length>400)break;if(e.tagName==='NAV')continue;p=e;}
 if(!p)return {status:'SKIPPED_NOT_AVAILABLE',candidates:[],scope_found:false};
 const number=value=>{const n=Number(value);return value!==null&&value!==undefined&&Number.isFinite(n)&&Math.abs(n)<=1e9?n:null;};
 const white=value=>rules.textDiagnosticLabels.includes(value)?value:undefined;
 const relation=e=>{for(let a=e,d=0;a&&d<=6;a=a.parentElement,d++)if(a===tab||a.contains(tab))return d;return null;};
 const nodes=[p,...p.querySelectorAll('button,a,input,[role="slider"],.ant-slider,.ant-slider-handle,.ant-pagination,div,span')].slice(0,600);
 const candidates=nodes.filter(e=>e===p||e.matches('button,a,input,'+rules.textSlider+',.ant-pagination')||(e.scrollHeight>e.clientHeight+20&&/(auto|scroll)/.test(getComputedStyle(e).overflowY))).slice(0,80).map(e=>{
 const style=getComputedStyle(e),role=e.getAttribute('role');
 return {tagName:e.tagName,role:['slider','button','tab','tabpanel','listbox','scrollbar'].includes(role)?role:undefined,
 'aria-label':white(e.getAttribute('aria-label')),title:white(e.getAttribute('title')),label:white(label(e)),
 input_type:e.tagName==='INPUT'&&['range','button','number'].includes(e.type)?e.type:undefined,
 class_tokens:(e.getAttribute('class')||'').split(/\s+/).filter(t=>t.length<=32&&/^(?:ant-(?:slider|pagination|tabs)|(?:text|transcript|review|scroll|side-menu)-)[a-zA-Z_-]*$/.test(t)).slice(0,8),
 child_count:number(e.childElementCount),scrollHeight:number(e.scrollHeight),clientHeight:number(e.clientHeight),scrollTop:number(e.scrollTop),tabIndex:number(e.tabIndex),cursor:['pointer','auto','default','grab','grabbing'].includes(style.cursor)?style.cursor:'other',disabled:!enabled(e),
 'aria-selected':['true','false'].includes(e.getAttribute('aria-selected'))?e.getAttribute('aria-selected'):undefined,
 'aria-valuemin':number(e.getAttribute('aria-valuemin')),'aria-valuemax':number(e.getAttribute('aria-valuemax')),'aria-valuenow':number(e.getAttribute('aria-valuenow')),
 'aria-orientation':['horizontal','vertical'].includes(e.getAttribute('aria-orientation'))?e.getAttribute('aria-orientation'):undefined,
 visible:visible(e),tab_ancestor_distance:relation(e)};
 });return {status:'OK',scope_found:scopeFound,candidate_limit:80,scan_limit:600,candidates};
 }
 if(action==='textReset'||action==='textAdvance'){
 const p=panel();if(!p)return {status:'SKIPPED_NOT_AVAILABLE',method:'none'};
 const reset=action==='textReset',excluded=new Set(payload.excluded||[]);
 const slider=rules.textRange.flatMap(css=>[...p.querySelectorAll(css)]).find(e=>visible(e)&&enabled(e));
 if(slider&&!excluded.has('time_range')){const min=Number(slider.min||0),max=Number(slider.max||100),old=Number(slider.value),step=Math.max(Number(slider.step)||1,(max-min)/12);const next=reset?min:Math.min(max,old+step);
 if(next===old)return {status:reset?'AT_START':'AT_END',method:'time_range'};
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(slider,String(next));slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));return {status:'ADVANCED',method:'time_range'};
 }
 const roles=[...p.querySelectorAll(rules.textSlider)].filter(e=>visible(e)&&enabled(e)).slice(0,8);
 const handles=roles.filter(e=>e.matches('[role="slider"],.ant-slider-handle'));const handle=(handles.length?handles:roles)[0];
 if(handle){for(const key of reset?['Home']:['ArrowRight','PageDown','End']){
 const method='role_slider:'+key;if(excluded.has(method))continue;
 const numeric=name=>{const v=handle.getAttribute(name);return v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;};
 const now=numeric('aria-valuenow'),min=numeric('aria-valuemin'),max=numeric('aria-valuemax');
 if(now!==null&&((reset&&min!==null&&now<=min)||(!reset&&max!==null&&now>=max)))return {status:reset?'AT_START':'AT_END',method};
 const vertical=handle.getAttribute('aria-orientation')==='vertical';const actual=vertical&&key==='ArrowRight'?'ArrowDown':key;
 handle.focus();handle.dispatchEvent(new KeyboardEvent('keydown',{key:actual,code:actual,bubbles:true}));handle.dispatchEvent(new KeyboardEvent('keyup',{key:actual,code:actual,bubbles:true}));
 return {status:'ADVANCED',method,keyboard_key:actual};
 }}
 const method=reset?'pagination_reset':'pagination';
 if(!excluded.has(method)){
 const selectors=reset?[...rules.textFirst,...rules.textPrevious]:rules.textNext;
 const pager=selectors.flatMap(css=>[...p.querySelectorAll(css)]).find(e=>visible(e)&&enabled(e));
 if(pager){pager.click();return {status:'ADVANCED',method};}
 }
 if(!excluded.has('scroll')){
 const scroll=[p,...p.querySelectorAll('div,section,[role="tabpanel"]')].slice(0,600).find(e=>visible(e)&&e.scrollHeight>e.clientHeight+20&&/(auto|scroll)/.test(getComputedStyle(e).overflowY));
 if(scroll){const value=reset?0:Math.min(scroll.scrollHeight-scroll.clientHeight,scroll.scrollTop+Math.max(100,scroll.clientHeight*0.8));if(Math.abs(scroll.scrollTop-value)<1)return {status:reset?'AT_START':'AT_END',method:'scroll'};scroll.scrollTop=value;scroll.dispatchEvent(new Event('scroll',{bubbles:true}));return {status:'ADVANCED',method:'scroll'};}
 }
 return {status:'SKIPPED_NOT_AVAILABLE',method:'none'};
 }
 return {status:'UNSUPPORTED'};
}
function domError(action,payload,error){
 const text=String(error.exception?.description||error.message||error.text||'');
 const transient=/execution context.*(?:destroyed|available|found)|cannot find context|context.*(?:destroyed|unavailable)|document.*not ready|inspected target navigated/i.test(text);
 const type=transient?'CONTEXT_DESTROYED':/TypeError/.test(text)?'TYPE_ERROR':/ReferenceError/.test(text)?'REFERENCE_ERROR':'UNKNOWN';
 const diagnostic={code:transient?'TRANSIENT_DOM_ERROR':'DOM_ERROR',dom_action:action==='click'?'click:'+payload.id:action,exception_type:type};
 for(const key of ['lineNumber','columnNumber'])if(Number.isInteger(error[key])&&error[key]>=0)diagnostic[key]=error[key];
 return Object.assign(Error('PAGE_OPERATION_FAILED'),diagnostic);
}
export class PageController{
 constructor(send,tabId,runId,signal){Object.assign(this,{send,tabId,runId,signal});}
 async perform(action,payload={}){if(action!=='cancel')aborted(this.signal);
 const expression=`(${pageOperation.toString()})(${JSON.stringify(action)},${JSON.stringify(SELECTORS)},${JSON.stringify(this.runId)},${JSON.stringify(payload)},${transcriptDOM.toString()})`;
 let result;
 try{result=await this.send({tabId:this.tabId},'Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});}catch(e){if(action!=='cancel')aborted(this.signal);throw domError(action,payload,e);}
 if(action!=='cancel')aborted(this.signal);if(result.exceptionDetails)throw domError(action,payload,result.exceptionDetails);

 const value=result.result?.value;if(!value)throw Object.assign(Error('PAGE_UNAVAILABLE'),{code:'DOM_ERROR',dom_action:action,exception_type:'UNKNOWN'});
 if(value.status==='DOM_NOT_READY'&&action!=='readiness')throw Object.assign(Error('DOM_NOT_READY'),{code:'TRANSIENT_DOM_ERROR',dom_action:action,exception_type:'DOM_NOT_READY'});
 if(['WRONG_PAGE','LIVE_CHANGED','CANCELLED'].includes(value.status)&&action!=='cancel')throw Object.assign(Error(value.status),{code:value.status});return value;
 }
 readiness(){return this.perform('readiness');}
 inspect(){return this.perform('inspect');}init(value){return this.perform('init',{live_key:value.live_key});}
 async reload(){aborted(this.signal);await this.send({tabId:this.tabId},'Page.reload',{});aborted(this.signal);}
 find(id){return this.perform('find',{id});}click(id){return this.perform('click',{id});}
 signature(beforeInit=false){return this.perform('signature',{before_init:beforeInit}).then(r=>r.signature);}
 transcriptFind(){return this.perform('transcriptFind');}transcriptScroll(){return this.perform('transcriptScroll');}
 textDiagnostic(){return this.perform('textDiagnostic');}
 textReset(excluded=[]){return this.perform('textReset',{excluded});}textAdvance(excluded=[]){return this.perform('textAdvance',{excluded});}cancel(){return this.perform('cancel');}
}
