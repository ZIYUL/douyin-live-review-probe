import {waitForElement,waitForNetworkQuiet,waitForDOMStable,waitForRoute,aborted} from './wait-strategy.js';
export class ReviewNavigator{
 constructor(page,activity,signal,options={}){Object.assign(this,{page,activity,signal,options});}
 async prepare(info){const before=this.activity.navigation;await this.page.reload();await waitForRoute(()=>this.activity.navigation>before,{signal:this.signal,timeout:this.options.timeout||10000});await waitForElement(async()=>(await this.page.inspect()).status==='OK',{signal:this.signal,timeout:this.options.timeout||10000});const current=await this.page.inspect();if(current.status!=='OK'||current.live_key!==info.live_key)throw Object.assign(Error('LIVE_CHANGED'),{code:'LIVE_CHANGED'});await this.page.init(current);await this.settle();return current;}
 async settle(){await waitForNetworkQuiet(this.activity,{signal:this.signal,...this.options});await waitForDOMStable(()=>this.page.signature(),{signal:this.signal,timeout:this.options.timeout||10000});}
 async visit(id){
 try{await waitForElement(async()=> (await this.page.find(id)).status==='FOUND',{signal:this.signal,timeout:this.options.elementTimeout??1500});}catch(e){if(e.code==='TIMEOUT')return {status:'SKIPPED',reason:'SKIPPED_NOT_AVAILABLE'};throw e;}
 aborted(this.signal);const result=await this.page.click(id);if(result.status!=='CLICKED')return {status:'SKIPPED',reason:result.status};
 await this.settle();return {status:'PASS'};
 }
 async collectText(progress,{maxWindows=120,maxNoProgress=3,maxDuration=240000}={}){
 const started=Date.now();let stagnant=0,last=progress().record_count||0,windows=0,reason='WINDOW_LIMIT';
 for(let i=0;i<20;i++){aborted(this.signal);const reset=await this.page.textReset();if(reset.status!=='ADVANCED')break;await this.settle();}
 for(;windows<maxWindows&&Date.now()-started<maxDuration;windows++){
 aborted(this.signal);const coverage=progress();if(coverage.coverage_ratio>=0.95){reason='COVERAGE_REACHED';break;}
 const action=await this.page.textAdvance();if(action.status!=='ADVANCED'){reason=action.status;break;}await this.settle();
 const next=progress().record_count||0;stagnant=next>last?0:stagnant+1;last=next;if(stagnant>=maxNoProgress){reason='NO_NEW_TEXT';break;}
 }
 if(Date.now()-started>=maxDuration)reason='TEXT_TIMEOUT';return {windows,reason,coverage:progress()};
 }
}
