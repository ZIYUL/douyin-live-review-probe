export function aborted(signal){if(signal?.aborted)throw Object.assign(Error('STOPPED_BY_USER'),{code:'ABORTED'});}
export function delay(ms,signal){aborted(signal);return new Promise((resolve,reject)=>{
 const abort=()=>{clearTimeout(timer);reject(Object.assign(Error('STOPPED_BY_USER'),{code:'ABORTED'}));};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);signal?.addEventListener('abort',abort,{once:true});
 });}
export class NetworkActivity{
 constructor(clock=()=>Date.now()){this.clock=clock;this.lastActivity=clock();this.requests=new Set();this.processing=0;this.navigation=0;this.endpoints=new Map();}
 begin(id){this.requests.add(id);this.lastActivity=this.clock();}
 end(id){if(this.requests.delete(id))this.lastActivity=this.clock();}
 received(name){this.endpoints.set(name,(this.endpoints.get(name)||0)+1);this.lastActivity=this.clock();}
}
export async function waitUntil(check,{signal,timeout=10000,poll=100,now=()=>Date.now(),pause=delay}={}){
 const started=now();while(now()-started<=timeout){aborted(signal);try{if(await check())return true;}catch(e){if(e.code!=='TRANSIENT_DOM_ERROR')throw e;}await pause(poll,signal);}throw Object.assign(Error('WAIT_TIMEOUT'),{code:'TIMEOUT'});
}
export function waitForElement(check,options){return waitUntil(check,options);}
export function waitForRoute(check,options){return waitUntil(check,options);}
export async function waitForDOMStable(snapshot,{quiet=500,...options}={}){let old,last=Date.now();return waitUntil(async()=>{const v=await snapshot();if(v!==old){old=v;last=Date.now();}return Date.now()-last>=quiet;},options);}
export function waitForNetworkQuiet(activity,{minimum=800,quiet=800,...options}={}){
 const now=options.now||(()=>Date.now()),start=now();return waitUntil(()=>now()-start>=minimum&&activity.requests.size===0&&activity.processing===0&&now()-activity.lastActivity>=quiet,options);
}
export function waitForEndpoint(activity,name,before,options){return waitUntil(()=>(activity.endpoints.get(name)||0)>before,options);}

export function waitForDOMReady(page,options){return waitUntil(async()=>(await page.readiness()).status==='OK',options);}
export async function inspectReady(page,options){let value;await waitUntil(async()=>{value=await page.inspect();return true;},options);return value;}
