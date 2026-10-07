import {classify} from '../lib/response-classifier.js';
import {sanitizeURL} from '../lib/sanitizer.js';
import {AutoCollector} from '../automation/collector-state-machine.js';
import {PageController} from '../automation/page-controller.js';
import {ReviewNavigator} from '../automation/review-navigator.js';
import {NetworkActivity} from '../automation/wait-strategy.js';
import {summaryFor,coverageFor} from '../automation/session-analysis.js';
import {validateSafeQuery} from '../lib/query-policy.js';
import {attach,detach,send} from './debugger-manager.js';
import {metadata,capture} from './network-capture.js';
import {load,save,fresh} from '../storage/session-store.js';
let session,tabId=null,epoch=0,queue=Promise.resolve(),inFlight=0,stopTask=null;const pending=new Map(),methods=new Map(),contexts=new Map();let collector=null,autoRunning=false,automationEpoch=0;const activity=new NetworkActivity();
const ready=load().then(s=>{session=s;if(session.auto?.status==='RUNNING'){session.auto.status='PARTIAL';session.auto.state='FAILED';session.auto.errors.push({reason:'BROWSER_RESTART_INTERRUPTED'});}});
function enqueue(fn){queue=queue.then(()=>ready).then(fn).catch(()=>{if(session){session.errors.push({at:new Date().toISOString(),reason:'CAPTURE_OR_STORAGE_ERROR'});session.errors=session.errors.slice(-100);}});return queue;}
async function stop(){if(collector){collector.abort.abort();void collector.page.cancel().catch(()=>{});}const id=tabId;tabId=null;epoch++;pending.clear();methods.clear();contexts.clear();activity.requests.clear();if(id!==null)try{await detach(id);}catch{}session.stopped_at=new Date().toISOString();await save(session);}
chrome.debugger.onEvent.addListener((source,event,p)=>{
 if(source.tabId!==tabId||source.sessionId)return;
 const generation=epoch;
 if(event==='Page.frameNavigated'){if(!p.frame.parentId){activity.navigation++;try{const u=new URL(p.frame.url);if(u.protocol!=='https:'||u.hostname!=='anchor.douyin.com')void stop();}catch{void stop();}}return;}
 if(event==='Network.requestWillBeSent'){if(!p.redirectResponse&&classify({...sanitizeURL(p.request.url||''),type:p.type||'XHR',mime:''},session.rules)==='BUSINESS_CANDIDATE')activity.begin(p.requestId);contexts.set(p.requestId,autoRunning&&session.auto?{mode:'auto',run_id:session.auto.run_id,step:session.auto.current_step||'initial'}:{mode:'manual'});if(contexts.size>5000)contexts.delete(contexts.keys().next().value);const m=p.request.method;methods.set(p.requestId,/^[A-Z]{1,20}$/.test(m)?m:'UNKNOWN');if(methods.size>5000)methods.delete(methods.keys().next().value);return;}
 if(event==='Network.responseReceived'){
 const m=metadata(p,methods.get(p.requestId)||'UNKNOWN',session.rules,session.safeQuery||{});m.context=contexts.get(p.requestId)||{mode:'manual'};pending.set(p.requestId,m);if(pending.size>5000){pending.delete(pending.keys().next().value);}
 enqueue(async()=>{if(generation!==epoch)return;session.counters.Network=(session.counters.Network||0)+1;session.counters[m.classification]=(session.counters[m.classification]||0)+1;});return;
 }
 if(event==='Network.loadingFailed'){activity.end(p.requestId);const m=pending.get(p.requestId);pending.delete(p.requestId);methods.delete(p.requestId);contexts.delete(p.requestId);if(m&&m.classification==='BUSINESS_CANDIDATE')enqueue(async()=>{if(generation!==epoch)return;m.body_status='LOADING_FAILED';await capture(session,m);await save(session);});return;}
 if(event==='Network.loadingFinished'){activity.end(p.requestId);
 const m=pending.get(p.requestId);pending.delete(p.requestId);methods.delete(p.requestId);contexts.delete(p.requestId);if(!m)return;
 if(m.classification!=='BUSINESS_CANDIDATE'){enqueue(async()=>{if(generation===epoch)await save(session);});return;}
 // Request body immediately after loadingFinished, before a busy analysis queue can evict it.
 if(inFlight>=8){enqueue(async()=>{if(generation!==epoch)return;m.body_status='BODY_QUEUE_LIMIT';await capture(session,m);await save(session);});return;}
 inFlight++;activity.processing++;const result=send({tabId:source.tabId},'Network.getResponseBody',{requestId:p.requestId}).then(value=>({value}),()=>({error:true}));
 enqueue(async()=>{try{const r=await result;if(generation!==epoch)return;if(r.error){m.body_status='BODY_UNAVAILABLE';await capture(session,m);}else {await capture(session,m,r.value);activity.received(m.path.split('/').at(-1));}await save(session);}finally{inFlight--;activity.processing--;}});
 }
});
chrome.debugger.onDetach.addListener(source=>{if(source.tabId===tabId){if(collector){collector.abort.abort();void collector.page.cancel().catch(()=>{});}activity.requests.clear();tabId=null;epoch++;pending.clear();methods.clear();contexts.clear();enqueue(async()=>{session.stopped_at=new Date().toISOString();await save(session);});}});
chrome.tabs.onUpdated.addListener((id,change)=>{if(id===tabId&&change.url){try{if(new URL(change.url).hostname==='anchor.douyin.com')return;}catch{}enqueue(stop);}});
chrome.tabs.onRemoved.addListener(id=>{if(id===tabId)enqueue(stop);});
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(sender.id!==chrome.runtime.id)return;
 if(msg.type==='stop'){stopTask=ready.then(stop);stopTask.then(()=>reply({ok:true,tabId:null}),()=>reply({ok:false,error:'停止失败'}));return true;}
 enqueue(async()=>{
 try{
 if(msg.type==='autoStart'){
 if(autoRunning||tabId!==null)throw Error('请先停止当前采集');
 const tab=await chrome.tabs.get(msg.tabId);const u=new URL(tab.url);if(u.protocol!=='https:'||u.hostname!=='anchor.douyin.com')throw Error('请先进入主播中心直播复盘');
 const automationGeneration=++automationEpoch;const page=new PageController(send,tab.id,crypto.randomUUID());
 const runner=new AutoCollector({page,attach:async(signal)=>{if(stopTask)await stopTask;if(signal.aborted)throw Error('STOPPED');const generation=++epoch;await attach(tab.id);if(signal.aborted||generation!==epoch){await detach(tab.id);throw Error('STOPPED');}tabId=tab.id;session.stopped_at=null;},detach:stop,summary:()=>summaryFor(session,runner.report.run_id,runner.report),coverage:info=>coverageFor(session,runner.report.run_id,info),onUpdate:report=>enqueue(async()=>{if(automationGeneration!==automationEpoch)return;session.auto=structuredClone({...report,...summaryFor(session,report.run_id,report),text_coverage:coverageFor(session,report.run_id,report)});await save(session);})});
 page.signal=runner.abort.signal;runner.navigator=new ReviewNavigator(page,activity,runner.abort.signal);collector=runner;autoRunning=true;session.auto=structuredClone(runner.report);
 void runner.run().finally(()=>{if(collector===runner){autoRunning=false;collector=null;}});
 }else if(msg.type==='start'){
 if(autoRunning)throw Error('自动采集进行中，请先停止');
 if(stopTask)await stopTask;
 if(tabId!==null)throw Error('已有采集标签页，请先停止');
 const tab=await chrome.tabs.get(msg.tabId);const u=new URL(tab.url);if(u.protocol!=='https:'||u.hostname!=='anchor.douyin.com')throw Error('仅支持 https://anchor.douyin.com 标签页');
 const startGeneration=++epoch;await attach(tab.id);if(startGeneration!==epoch){await detach(tab.id);throw Error('开始操作已被停止取消');}tabId=tab.id;session.stopped_at=null;await save(session);
 }else if(msg.type==='stop')await stop();
 else if(msg.type==='clear'){automationEpoch++;await stop();session=fresh();await save(session);}
 else if(msg.type==='settings'){
 if(tabId!==null||autoRunning)throw Error('请停止采集后修改规则');
 const valid=arr=>Array.isArray(arr)&&arr.length<=30&&arr.every(h=>/^[a-z0-9.-]+$/.test(h)&&h.includes('.')&&!h.startsWith('.'));
 if(!valid(msg.rules.businessHosts)||!valid(msg.rules.telemetryHosts))throw Error('域名规则无效');if(msg.safeQuery!==undefined)session.safeQuery=validateSafeQuery(msg.safeQuery);session.rules=msg.rules;session.allowLarge=!!msg.allowLarge;await save(session);
 }
 const data=msg.type==='export'?structuredClone(session):structuredClone({...session,endpoints:Object.fromEntries(Object.entries(session.endpoints).map(([key,e])=>[key,{...e,versions:e.versions.map(v=>({...v,body:undefined,preview:v.body.slice(0,4096)}))}]))});
 reply({ok:true,session:data,tabId,autoRunning});
 }catch(e){reply({ok:false,error:['start','autoStart','settings'].includes(msg.type)?String(e.message).replace(/https?:\/\/\S+/g,'[URL]'):'操作失败，请重试'});}
 });return true;
});
