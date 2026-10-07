// Serialized into the selected page. Only structure/times leave the page.
export function transcriptDOM(action){
 const visible=e=>!!e&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
 const banned=e=>['BODY','HTML','MAIN'].includes(e.tagName)||e===document.scrollingElement||e.getAttribute('data-probe-content-panel')!==null||e.getAttribute('role')==='main'||e.matches('.ant-layout-content,[data-testid="content-analysis"]');
 const parse=text=>{const m=String(text).trim().replace(/\s+/g,' ').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);if(!m)return null;const [y,mo,d,h,mi,s]=m.slice(1).map(Number);if(mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate()||h>23||mi>59||s>59)return null;return new Date(Date.parse(m[0].replace(' ','T')+'+08:00')).toISOString();};
 const tab=[...document.querySelectorAll('button,a,[role="tab"],div,span')].slice(0,2000).find(e=>visible(e)&&['文字记录','主播文字记录'].includes((e.innerText||e.textContent||'').replace(/\s/g,'')));
 const scopes=[...document.querySelectorAll('[data-probe-text-panel],[data-testid="text-records"],[class*="transcript"],[class*="text-record"]')].filter(visible);
 const controlled=tab?.getAttribute('aria-controls');if(controlled){const e=document.getElementById(controlled);if(visible(e))scopes.push(e);}
 if(!scopes.length&&tab)for(let e=tab.parentElement,depth=0;e&&depth<5;e=e.parentElement,depth++){if(banned(e))break;if(e.querySelectorAll('div,span,time,p,li').length<=2000)scopes.push(e);}
 const groups=[];const seen=new Set();
 for(const scope of [...new Set(scopes)]){
 if(banned(scope))continue;
 for(const stamp of [...scope.querySelectorAll('time,span,div,p')].slice(0,2000)){
 if(!visible(stamp))continue;const time=parse(stamp.textContent);if(!time)continue;
 for(let row=stamp.parentElement,d=0;row&&row!==scope&&d<3;row=row.parentElement,d++){
 const body=[...row.querySelectorAll('span,div,p')].slice(0,30).some(e=>e!==stamp&&!e.contains(stamp)&&!e.children.length&&String(e.textContent||'').trim()&&!parse(e.textContent));
 if(!body)continue;const parent=row.parentElement;if(!parent||seen.has(parent))break;
 const siblings=[...parent.children].slice(0,500);const records=[];
 for(const sibling of siblings){if(sibling.tagName!==row.tagName||!visible(sibling))continue;const nodes=[...sibling.querySelectorAll('time,span,div,p')].slice(0,30);const times=[...new Set(nodes.map(e=>parse(e.textContent)).filter(Boolean))];if(times.length!==1)continue;const hasBody=nodes.some(e=>!e.children.length&&String(e.textContent||'').trim()&&!parse(e.textContent));if(hasBody)records.push({row:sibling,time:times[0]});}
 if(records.length>=3&&records.every((r,i)=>!i||r.time>records[i-1].time)){seen.add(parent);groups.push(records);break;}
 }
 }
 }
 const candidates=[];
 for(const records of groups)for(let e=records[0].row.parentElement,depth=1;e&&depth<=7;e=e.parentElement,depth++){
 if(banned(e))break;if(!records.every(r=>e.contains(r.row)))continue;
 if(e.scrollHeight<=e.clientHeight+20||e.clientHeight<40)continue;
 // Reject a broad content region containing unrelated panels/menus.
 if(e.querySelectorAll('video,[data-probe-content-panel],nav,[role="tabpanel"]').length>0||e.querySelectorAll('[role="tab"]').length>0)break;
 const overflow=getComputedStyle(e).overflowY;let movable=['auto','scroll','overlay'].includes(overflow);
 if(!movable&&action==='scroll'){const old=e.scrollTop;e.scrollTop=old===0?1:old-1;movable=e.scrollTop!==old;e.scrollTop=old;}
 if(movable){candidates.push({element:e,records,depth});break;}
 }
 const unique=[...new Map(candidates.map(c=>[c.element,c])).values()];
 if(unique.length!==1)return {status:unique.length?'AMBIGUOUS':'TRANSCRIPT_SCROLL_CONTAINER_NOT_FOUND'};
 const {element:e,records,depth}=unique[0];const numeric=n=>Math.max(0,Math.min(1e9,Number(n)||0));
 const viewport=e.getClientRects()[0];const shown=records.filter(r=>{const rect=r.row.getClientRects()[0];return rect&&(!Number.isFinite(viewport?.top)||(rect.bottom>viewport.top&&rect.top<viewport.bottom));});
 const info=()=>({tagName:e.tagName,role:['list','region','tabpanel'].includes(e.getAttribute('role'))?e.getAttribute('role'):null,clientHeight:numeric(e.clientHeight),scrollHeight:numeric(e.scrollHeight),scrollTop:numeric(e.scrollTop),row_count:records.length,ancestor_depth:depth,visible_first_time:shown[0]?.time||null,visible_last_time:shown.at(-1)?.time||null});
 if(action!=='scroll')return {status:'TRANSCRIPT_SCROLL_CONTAINER_CONFIRMED',...info()};
 const before=e.scrollTop;const max=e.scrollHeight-e.clientHeight;if(before>=max-2)return {status:'AT_BOTTOM',scrollTop_before:numeric(before),...info()};
 e.scrollTop=Math.min(max,before+e.clientHeight*0.8);e.dispatchEvent(new Event('scroll',{bubbles:true}));
 return {status:e.scrollTop>before?'SCROLLED':'NO_PROGRESS',scrollTop_before:numeric(before),...info()};
}
