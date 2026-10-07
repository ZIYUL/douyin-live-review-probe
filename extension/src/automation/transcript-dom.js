// Serialized into the selected page. Only structure/times leave the page.
export function transcriptDOM(action,expectedTimes=[]){
 const visible=e=>!!e&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
 const banned=e=>['BODY','HTML','MAIN'].includes(e.tagName)||e===document.scrollingElement||e.getAttribute('data-probe-content-panel')!==null||e.getAttribute('role')==='main'||e.matches('.ant-layout-content,[data-testid="content-analysis"]');
 const extract=text=>{
 const value=String(text||'');if(value.length>16384)return [];
 const source=value.replace(/\s+/g,' '),times=new Set();
 for(const m of source.matchAll(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/g)){
 if(/\d/.test(source[m.index-1]||'')||/\d/.test(source[m.index+m[0].length]||''))continue;
 const [y,mo,d,h,mi,sec]=m.slice(1).map(Number);if(mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate()||h>23||mi>59||sec>59)continue;
 const ms=Date.parse(m[0].replace(' ','T')+'+08:00');if(Number.isFinite(ms))times.add(new Date(ms).toISOString());
 if(times.size>1)break; // Multi-time containers can never be a single row.
 }return [...times];
 };
 const expected=new Set((Array.isArray(expectedTimes)?expectedTimes:[]).slice(0,12).filter(t=>typeof t==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)).flatMap(extract));
 const diagnostic={expected_time_count:expected.size,expected_time_matches:0,timestamp_nodes_found:0,row_candidates_found:0,row_groups_found:0,scrollable_ancestors_found:0};
 const matchedTimes=new Set(),timestampNodes=new Set(),rowCandidates=new Set();
 const singleTime=e=>{const times=extract(e.textContent);return times.length===1?times[0]:null;};
 const hasBody=row=>[...row.querySelectorAll('span,div,p')].slice(0,30).some(e=>!e.children.length&&String(e.textContent||'').trim()&&!extract(e.textContent).length);
 const tab=[...document.querySelectorAll('button,a,[role="tab"],div,span')].slice(0,2000).find(e=>visible(e)&&['文字记录','主播文字记录'].includes((e.innerText||e.textContent||'').replace(/\s/g,'')));
 const scopes=[...document.querySelectorAll('[data-probe-text-panel],[data-testid="text-records"],[class*="transcript"],[class*="text-record"]')].filter(visible);
 const controlled=tab?.getAttribute('aria-controls');if(controlled){const e=document.getElementById(controlled);if(visible(e))scopes.push(e);}
 if(!scopes.length&&tab)for(let e=tab.parentElement,depth=0;e&&depth<5;e=e.parentElement,depth++){if(banned(e))break;if(e.querySelectorAll('div,span,time,p,li').length<=2000)scopes.push(e);}
 const groups=[];const seen=new Set();
 for(const scope of [...new Set(scopes)]){
 if(banned(scope))continue;
 for(const stamp of [...scope.querySelectorAll('time,span,div,p')].slice(0,2000)){
 if(!visible(stamp))continue;const time=singleTime(stamp);if(!time)continue;timestampNodes.add(stamp);if(expected.has(time))matchedTimes.add(time);
 for(let row=stamp.parentElement,d=0;row&&row!==scope&&d<3;row=row.parentElement,d++){
 if(singleTime(row)!==time||!hasBody(row))continue;rowCandidates.add(row);const parent=row.parentElement;if(!parent||seen.has(parent))break;
 const siblings=[...parent.children].slice(0,500);const records=[];
 for(const sibling of siblings){if(sibling.tagName!==row.tagName||!visible(sibling))continue;const siblingTime=singleTime(sibling);if(!siblingTime||!hasBody(sibling))continue;rowCandidates.add(sibling);records.push({row:sibling,time:siblingTime});}
 if(records.length>=3&&records.every((r,i)=>!i||r.time>records[i-1].time)){seen.add(parent);groups.push(records);break;}
 }
 }
 }
 const matchedGroups=groups.filter(records=>records.filter(r=>expected.has(r.time)).length>=Math.min(2,expected.size||2));
 // Prefer corroborated groups, retain structural fallback for cached/unseen rows.
 const preferred=matchedGroups.length?matchedGroups:groups;
 const candidates=[];
 for(const records of preferred)for(let e=records[0].row.parentElement,depth=1;e&&depth<=7;e=e.parentElement,depth++){
 if(banned(e))break;if(!records.every(r=>e.contains(r.row)))continue;
 if(e.scrollHeight<=e.clientHeight+20||e.clientHeight<40)continue;
 // Reject a broad content region containing unrelated panels/menus.
 if(e.querySelectorAll('video,[data-probe-content-panel],nav,[role="tabpanel"]').length>0||e.querySelectorAll('[role="tab"]').length>0)break;
 const overflow=getComputedStyle(e).overflowY;let movable=['auto','scroll','overlay'].includes(overflow);
 if(!movable&&action==='scroll'){const old=e.scrollTop;e.scrollTop=old===0?1:old-1;movable=e.scrollTop!==old;e.scrollTop=old;}
 if(movable){candidates.push({element:e,records,depth});break;}
 }
 const unique=[...new Map(candidates.map(c=>[c.element,c])).values()];
 Object.assign(diagnostic,{expected_time_matches:matchedTimes.size,timestamp_nodes_found:timestampNodes.size,row_candidates_found:rowCandidates.size,row_groups_found:groups.length,scrollable_ancestors_found:unique.length});
 if(unique.length!==1)return {status:unique.length?'AMBIGUOUS':'TRANSCRIPT_SCROLL_CONTAINER_NOT_FOUND',transcript_find_diagnostic:diagnostic};
 const {element:e,records,depth}=unique[0];const numeric=n=>Math.max(0,Math.min(1e9,Number(n)||0));
 const viewport=e.getClientRects()[0];const shown=records.filter(r=>{const rect=r.row.getClientRects()[0];return rect&&(!Number.isFinite(viewport?.top)||(rect.bottom>viewport.top&&rect.top<viewport.bottom));});
 const info=()=>({transcript_find_diagnostic:diagnostic,row_group_status:'TRANSCRIPT_ROW_GROUP_CONFIRMED',matched_expected_times_count:records.filter(r=>expected.has(r.time)).length,first_time:records[0].time,last_time:records.at(-1).time,tagName:e.tagName,role:['list','region','tabpanel'].includes(e.getAttribute('role'))?e.getAttribute('role'):null,clientHeight:numeric(e.clientHeight),scrollHeight:numeric(e.scrollHeight),scrollTop:numeric(e.scrollTop),row_count:records.length,ancestor_depth:depth,visible_first_time:shown[0]?.time||null,visible_last_time:shown.at(-1)?.time||null});
 if(action!=='scroll')return {status:'TRANSCRIPT_SCROLL_CONTAINER_CONFIRMED',...info()};
 const before=e.scrollTop;const max=e.scrollHeight-e.clientHeight;if(before>=max-2)return {status:'AT_BOTTOM',scrollTop_before:numeric(before),...info()};
 e.scrollTop=Math.min(max,before+e.clientHeight*0.8);e.dispatchEvent(new Event('scroll',{bubbles:true}));
 return {status:e.scrollTop>before?'SCROLLED':'NO_PROGRESS',scrollTop_before:numeric(before),...info()};
}
