// Local-only HTTPS mock: DNS mapping never contacts Douyin. Requires Chromium and openssl fixture.
import https from 'node:https';import fs from 'node:fs';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const root=process.cwd(),port=9333;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=https.createServer({key:fs.readFileSync('work/mock.key'),cert:fs.readFileSync('work/mock.crt')},(req,res)=>{
 const name=req.url.split('?')[0].split('/').at(-1);const path=`mocks/${name}.mock.json`;
 if(fs.existsSync(path)){res.setHeader('Content-Type','application/json');res.end(fs.readFileSync(path));}
 else if(name==='unknown'){res.setHeader('Content-Type','text/plain');res.end('{"data":{"value":123},"token":"MOCK_CREDENTIAL_NEVER_EXPORT"}');}
 else if(name==='plain'){res.setHeader('Content-Type','text/plain');res.end('示例业务文字');}
 else {res.setHeader('Content-Type','text/html');res.end(`<html><body>LOCAL MOCK ONLY<script>Promise.all(['minute_trend','room_stats_content_list','unknown','plain'].map(n=>fetch('/api/'+n+'?room_id=MOCK_PRIVATE_QUERY').then(r=>r.text()))).then(()=>document.body.dataset.done='yes')</script></body></html>`);}
});await new Promise(r=>server.listen(9443,'127.0.0.1',r));
const browser=spawn('/usr/bin/chromium',['--headless=new','--enable-unsafe-extension-debugging','--disable-features=DisableLoadExtensionCommandLineSwitch','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update','--no-first-run','--no-proxy-server','--ignore-certificate-errors','--host-resolver-rules=MAP anchor.douyin.com 127.0.0.1','--remote-debugging-port='+port,'--user-data-dir='+root+'/work/smoke-profile','--load-extension='+root+'/extension','--disable-extensions-except='+root+'/extension','about:blank'],{stdio:['ignore','ignore',fs.openSync('work/browser.log','w')]});
let ws;
try{
 let version;for(let i=0;i<100;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();break;}catch{}await sleep(100);}
 const control=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{control.onopen=r;control.onerror=j;});
 const installed=await new Promise((resolve,reject)=>{control.onmessage=e=>{const m=JSON.parse(e.data);if(m.id===1)m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);};control.send(JSON.stringify({id:1,method:'Extensions.loadUnpacked',params:{path:root+'/extension'}}));});control.close();
 console.log('Loaded extension',installed);
 let targets;for(let i=0;i<100;i++){try{targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(targets.some(t=>t.type==='service_worker'))break;}catch{}await sleep(100);}
 const worker=targets.find(t=>t.type==='service_worker');assert(worker,'Extension worker loaded');const extensionId=new URL(worker.url).hostname;
 const popup=await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('chrome-extension://'+extensionId+'/src/popup/popup.html')}`,{method:'PUT'})).json();
 ws=new WebSocket(popup.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0;const waits=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const w=waits.get(m.id);waits.delete(m.id);m.error?w.reject(Error(JSON.stringify(m.error))):w.resolve(m.result);}};
 const call=(method,params)=>new Promise((resolve,reject)=>{const n=++id;waits.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await sleep(500);
 assert.equal(await evaluate("document.querySelector('#start').textContent"),'开始采集当前标签页');
 const tab=await evaluate("chrome.tabs.create({url:'https://anchor.douyin.com:9443/'})");await sleep(800);
 assert.equal((await evaluate(`chrome.runtime.sendMessage({type:'start',tabId:${tab.id}})`)).ok,true);
 await evaluate(`chrome.tabs.reload(${tab.id})`);
 let state;for(let i=0;i<100;i++){state=await evaluate("chrome.runtime.sendMessage({type:'export'})");if(Object.values(state.session.endpoints).length>=4)break;await sleep(100);}
 const endpoints=Object.values(state.session.endpoints);assert.equal(endpoints.length,4);const minute=endpoints.find(e=>e.name==='minute_trend');assert.equal(minute.schema.arrays[0].time_series.median_interval_seconds,60);assert.equal(endpoints.find(e=>e.name==='room_stats_content_list').schema.arrays[0].text_timeline.type,'TEXT_TIMELINE_CANDIDATE');assert(!JSON.stringify(state).includes('MOCK_PRIVATE_QUERY'));assert(!JSON.stringify(state).includes('MOCK_CREDENTIAL_NEVER_EXPORT'));
 assert.equal((await evaluate("chrome.runtime.sendMessage({type:'stop'})")).tabId,null);
 const stored=await evaluate("chrome.runtime.sendMessage({type:'status'})");assert.equal(Object.keys(stored.session.endpoints).length,4);
 assert.equal((await evaluate("chrome.runtime.sendMessage({type:'clear'})")).session.bodyBytes,0);
 const rejected=await evaluate(`chrome.tabs.create({url:'about:blank'}).then(t=>chrome.runtime.sendMessage({type:'start',tabId:t.id}))`);assert.equal(rejected.ok,false);
 console.log('BROWSER MOCK VERIFIED: extension loaded, popup, attach, getResponseBody, 4 endpoints, 60s trend, text timeline, sanitizer, stop/detach, clear, wrong-host rejection');
}finally{ws?.close();browser.kill('SIGTERM');server.close();}
