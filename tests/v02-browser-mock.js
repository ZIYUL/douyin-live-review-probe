// Browser DOM + local HTTPS fixture; never connects to Douyin. Does not install extension.
import https from 'node:https';import fs from 'node:fs';import {spawn,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
import {AutoCollector} from '../extension/src/automation/collector-state-machine.js';
import {PageController} from '../extension/src/automation/page-controller.js';
import {ReviewNavigator} from '../extension/src/automation/review-navigator.js';
import {NetworkActivity} from '../extension/src/automation/wait-strategy.js';
import {metadata,capture} from '../extension/src/background/network-capture.js';
import {summaryFor,coverageFor} from '../extension/src/automation/session-analysis.js';
import {fresh} from '../extension/src/storage/session-store.js';
import {exportFiles,zip} from '../extension/src/lib/exporter.js';
fs.mkdirSync('work',{recursive:true});execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout','work/v02-mock.key','-out','work/v02-mock.crt','-days','1','-subj','/CN=anchor.douyin.com'],{stdio:'ignore'});
const session=fresh(),base=Date.parse('2026-09-01T10:00:00+08:00');const rows=Array.from({length:331},(_,i)=>({content:'虚构话术 '+i,contentTime:new Date(base+i*20000).toISOString()}));
const minute={data:{series:Array.from({length:111},(_,i)=>({timeMinute:new Date(base+i*60000).toISOString(),pcuTotal:String(10+i),likeCnt:'5',followUcnt:'1',shareCnt:'2'}))}};
const comments={data:{rows:Array.from({length:3},(_,i)=>({comment:'虚构评论 '+i,createTime:new Date(base+i*20000).toISOString(),nickname:'虚构用户'+i}))}};
const html=`<!doctype html><html lang="zh"><meta charset="utf-8"><body><h1>直播复盘 · LOCAL MOCK</h1><time data-live-start="2026-09-01 10:00:00"></time><time data-live-end="2026-09-01 11:50:00"></time><nav>${[['overview','整体数据'],['content','内容分析'],['audience','观众分析'],['traffic','流量分析'],['revenue','营收'],['trend','流量'],['interaction','互动指标'],['fans','粉丝'],['text','文字记录'],['comments','直播间评论'],['gifts','直播间礼物'],['clips','关键片段']].map(([id,text])=>`<div class="side-menu-item" style="cursor:pointer" data-mock-action="${id}" onclick="navigate('${id}')"><span>${text}</span></div>`).join('')}</nav><section data-probe-text-panel style="display:none"><div id="records"></div><button data-probe-text-previous onclick="loadText(index-1)">上一页</button><button data-probe-text-next onclick="loadText(index+1)">下一页</button></section><div id="loaded"></div><script>
let index=1;const panel=document.querySelector('[data-probe-text-panel]');
async function loadText(i){index=Math.max(0,Math.min(3,i));const body=await fetch('/api/room_stats_content_list?window='+index+'&token=MOCK_PRIVATE_CREDENTIAL').then(r=>r.json());document.querySelector('#records').textContent=body.data.series.map(r=>r.content).join(' ');document.querySelector('[data-probe-text-previous]').disabled=index===0;document.querySelector('[data-probe-text-next]').disabled=index===3;}
async function navigate(id){panel.style.display=id==='text'?'block':'none';if(id==='text'){await loadText(index);return;}const endpoint=id==='overview'?'overview_v3':id==='traffic'?'entrance_v2':id==='comments'?'opaque_rows':id==='trend'?'minute_trend':'analysis_v3';const data=await fetch('/api/'+endpoint+'?metric_name=pcuTotal&room_id=MOCK_PRIVATE_ROOM').then(r=>r.json());document.querySelector('#loaded').textContent=id+' 已加载';}
</script></body></html>`;
const server=https.createServer({key:fs.readFileSync('work/v02-mock.key'),cert:fs.readFileSync('work/v02-mock.crt')},(req,res)=>{const url=new URL(req.url,'https://local');if(url.pathname==='/anchor/review'){res.setHeader('Content-Type','text/html; charset=utf-8');const content=html.split('<body>')[1].split('<script>')[0];const script=html.split('<script>')[1].split('</script>')[0];
res.write('<!doctype html><html lang="zh"><head><meta charset="utf-8">');
setTimeout(()=>res.write('</head><body><div id="shell"></div><script>setTimeout(()=>{document.body.innerHTML='+JSON.stringify(content)+';'+script+';window.navigate=navigate;window.loadText=loadText;Object.defineProperty(window,"index",{configurable:true,get:()=>index});},400);</script>'),200);
setTimeout(()=>res.end('</body></html>'),400);return;}res.setHeader('Content-Type','application/json');const name=url.pathname.split('/').at(-1);const data=name==='minute_trend'?minute:name==='opaque_rows'?comments:name==='room_stats_content_list'?{data:{series:rows.slice(Number(url.searchParams.get('window'))*90,(Number(url.searchParams.get('window'))+1)*90)}}:{code:0,data:{value:123}};setTimeout(()=>res.end(JSON.stringify(data)),30);});
await new Promise(r=>server.listen(9444,'127.0.0.1',r));const root=process.cwd(),port=9334,pause=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--no-first-run','--no-proxy-server','--ignore-certificate-errors','--host-resolver-rules=MAP anchor.douyin.com 127.0.0.1','--remote-debugging-port='+port,'--user-data-dir='+root+'/work/v02-browser-profile','about:blank'],{stdio:['ignore','ignore',fs.openSync('work/v02-browser.log','w')]});
let ws;
try{
 let list;for(let i=0;i<100;i++){try{list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();break;}catch{}await pause(100);}
 const target=list.find(t=>t.type==='page');ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let next=0;const jobs=new Map();let collector;const activity=new NetworkActivity(),pending=new Map();const events=[];let task=Promise.resolve();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const j=jobs.get(m.id);jobs.delete(m.id);m.error?j.reject(Error(JSON.stringify(m.error))):j.resolve(m.result);return;}
 const p=m.params;if(m.method==='Page.frameNavigated'&&!p.frame.parentId){activity.navigation++;return;}if(m.method==='Network.requestWillBeSent'){activity.begin(p.requestId);return;}
 if(m.method==='Network.responseReceived'){const meta=metadata(p,'GET',session.rules);meta.context={mode:'auto',run_id:collector.report.run_id,step:collector.report.current_step||'initial'};pending.set(p.requestId,meta);return;}
 if(m.method==='Network.loadingFailed'){activity.end(p.requestId);pending.delete(p.requestId);return;}
 if(m.method==='Network.loadingFinished'){activity.end(p.requestId);const meta=pending.get(p.requestId);pending.delete(p.requestId);if(!meta||meta.classification!=='BUSINESS_CANDIDATE')return;activity.processing++;const body=call('Network.getResponseBody',{requestId:p.requestId});task=task.then(async()=>{try{await capture(session,meta,await body);activity.received(meta.path.split('/').at(-1));}finally{activity.processing--;}});}
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;jobs.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 await call('Page.enable');await call('Page.navigate',{url:'https://anchor.douyin.com:9444/anchor/review'});
 for(let i=0;i<100;i++){const r=await call('Runtime.evaluate',{expression:"!!document.querySelector('[data-mock-action=overview]')",returnByValue:true});if(r.result?.value)break;await pause(50);}

 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const controller=new PageController((target,method,params)=>call(method,params),1,'V021_DOM_REGRESSION');
 const frame=(await call('Page.getFrameTree')).frameTree.frame.id;
 const setDOM=async html=>{await call('Page.setDocumentContent',{frameId:frame,html});};
 await setDOM('<html><body><p>页面模块尚未渲染</p></body></html>');
 let inspected=await controller.inspect();assert.equal(inspected.status,'OK');assert.equal(inspected.page_diagnostic.route_match,true);assert.equal(inspected.page_diagnostic.overview_found,false);
 const labels=[['overview','整体数据'],['content','内容分析'],['audience','观众分析'],['traffic','流量分析']];
 await setDOM('<html><body>'+labels.map(([id,text])=>`<div class="extra side-menu-item selected" style="cursor:pointer" onclick="window.__clicks=(window.__clicks||[]).concat('${id}:'+event.target.tagName)"><span>${text}</span></div>`).join('')+'</body></html>');
 await controller.init(await controller.inspect());for(const [id]of labels){assert.equal((await controller.find(id)).status,'FOUND');assert.equal((await controller.click(id)).status,'CLICKED');}
 assert.deepEqual(await evaluate('window.__clicks'),labels.map(([id])=>id+':DIV'));
 await setDOM('<html><body><div style="cursor:pointer" onclick="window.__parentClicked=event.target.tagName"><span>整体数据</span></div></body></html>');
 assert.equal((await controller.click('overview')).status,'CLICKED');assert.equal(await evaluate('window.__parentClicked'),'DIV');
 await setDOM('<html><body><div class="side-menu-item" data-probe-action="overview" onclick="window.__duplicateClicks=(window.__duplicateClicks||0)+1"><span>整体数据</span></div><div class="side-menu-item" onclick="window.__duplicateClicks=(window.__duplicateClicks||0)+1"><span>整体数据</span></div></body></html>');
 assert.equal((await controller.find('overview')).status,'AMBIGUOUS');assert.equal((await controller.click('overview')).status,'AMBIGUOUS');assert.equal(await evaluate('window.__duplicateClicks||0'),0);
 await setDOM('<html><body><p>普通页面</p></body></html>');await evaluate("history.replaceState(null,'','/other?room_id=PRIVATE_DIAG_ID&token=PRIVATE_DIAG_TOKEN')");inspected=await controller.inspect();assert.equal(inspected.status,'NOT_REVIEW');assert(!JSON.stringify(inspected.page_diagnostic).includes('PRIVATE_DIAG'));
 await evaluate("history.replaceState(null,'','/anchor/review')");assert.equal((await controller.inspect()).status,'OK');assert.equal((await controller.inspect()).page_diagnostic.content_found,false);
 // Use a distinct local fixture URL to force a full navigation after setDocumentContent.
 await call('Page.navigate',{url:'https://anchor.douyin.com:9444/anchor/review?mock_fixture=restored'});
 for(let i=0;i<100;i++){if(await evaluate("document.readyState==='complete'&&!!document.querySelector('[data-mock-action=overview]')&&!!document.querySelector('time[data-live-start]')"))break;await pause(50);}
 assert(await evaluate("!!document.querySelector('[data-mock-action=overview]')"),'restored fixture loaded');
 console.log('V0.2.1 BROWSER DOM REGRESSIONS PASS: correct route without controls, React four-module parent clicks, pointer parent, ambiguity/no click, wrong page, delayed rendering, safe diagnostics.');
 const lifecycle=[];let initCount=0;
 const page=new PageController(async(target,method,params)=>{const result=await call(method,params);if(method==='Runtime.evaluate'){
 if(params.expression.includes(')("readiness",'))lifecycle.push(result.result?.value);
 if(params.expression.includes(')("init",'))initCount++;
 }return result;},1,'MOCK_BROWSER_RUN');
 collector=new AutoCollector({attach:async()=>{await call('Network.enable');},detach:async()=>{await call('Network.disable');},page,summary:()=>summaryFor(session,collector.report.run_id),coverage:info=>coverageFor(session,collector.report.run_id,info),onUpdate:async report=>{events.push(report.state);session.auto=structuredClone(report);}});page.signal=collector.abort.signal;collector.navigator=new ReviewNavigator(page,activity,collector.abort.signal,{minimum:20,quiet:40,timeout:2000,elementTimeout:500});
 const report=await collector.run();await task;assert.equal(initCount,1);assert(lifecycle.some(r=>r&&!r.has_body),'observed body unavailable after reload');assert(lifecycle.some(r=>r?.status==='OK'),'observed ready after shell load');console.log('V0.2.2 RELOAD LIFECYCLE PASS: streamed head/body shell/document ready/delayed React controls; readiness polled; single init.');assert.equal(report.state,'COMPLETE',JSON.stringify({report,requests:[...activity.requests],processing:activity.processing,navigation:activity.navigation}));assert.equal(report.status,'PASS',JSON.stringify(report));assert.equal(report.text_coverage.record_count,331);assert.equal(report.text_coverage.coverage_ratio,1);assert.equal(report.comment_timeline_count,1);assert(report.captured_endpoints.includes('entrance_v2'));assert(events.includes('NAVIGATING_AUDIENCE'));assert(!JSON.stringify(session).includes('MOCK_PRIVATE_CREDENTIAL'));assert(!JSON.stringify(session).includes('MOCK_PRIVATE_ROOM'));
 const packed=exportFiles(session);fs.writeFileSync('work/v02-browser-diagnostic.zip',Buffer.from(await zip(packed.files).arrayBuffer()));
 // Cancellation and changed-live guard are checked on actual browser DOM.
 const signal=new AbortController();const isolated=new PageController((target,method,params)=>call(method,params),1,'CANCEL_RUN',signal.signal);const info=await isolated.inspect();await isolated.init(info);await isolated.cancel();await assert.rejects(isolated.click('overview'),e=>e.code==='CANCELLED');
 const guard=new PageController((target,method,params)=>call(method,params),1,'LIVE_GUARD_RUN',new AbortController().signal);await guard.init(await guard.inspect());await call('Runtime.evaluate',{expression:`document.querySelector('[data-live-start]').setAttribute('data-live-start','2026-09-02 10:00:00')`});await assert.rejects(guard.click('overview'),e=>e.code==='LIVE_CHANGED');
 console.log('BROWSER DOM MOCK PASS: actual Chromium DOM clicks, normal frontend HTTPS responses, module order, pagination rewind, 331 records / 110 minutes / coverage=100%, comments, schemas, privacy and ZIP. Extension installation and real Douyin automation are NOT VERIFIED.');
 fs.writeFileSync('work/V02_BROWSER_MOCK_RESULT.json',JSON.stringify(report,null,2));
}finally{ws?.close();browser.kill('SIGTERM');server.close();for(const name of ['work/v02-mock.key','work/v02-mock.crt'])fs.rmSync(name,{force:true});}
