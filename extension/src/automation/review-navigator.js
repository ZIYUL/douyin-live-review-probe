import {waitForElement,waitForNetworkQuiet,waitForDOMStable,waitForRoute,waitForDOMReady,inspectReady,aborted} from './wait-strategy.js';
export class ReviewNavigator{
 constructor(page,activity,signal,options={}){Object.assign(this,{page,activity,signal,options});}
 async prepare(info){
 const options={signal:this.signal,...this.options,timeout:this.options.timeout||10000};
 const before=this.activity.navigation;await this.page.reload();await waitForRoute(()=>this.activity.navigation>before,options);
 await waitForDOMReady(this.page,options);let current=await inspectReady(this.page,options);
 if(current.status!=='OK')throw Object.assign(Error('NOT_REVIEW'),{code:'NOT_REVIEW'});
 // Rendering evidence is separate from route identity; absent controls time out later.
 try{await waitForElement(async()=>{current=await this.page.inspect();const d=current.page_diagnostic;return d?.review_text_found||d?.overview_found||d?.content_found;},options);}catch(e){if(e.code!=='TIMEOUT')throw e;}
 if(current.live_key!==info.live_key)throw Object.assign(Error('LIVE_CHANGED'),{code:'LIVE_CHANGED'});
 await waitForNetworkQuiet(this.activity,options);await waitForDOMStable(()=>this.page.signature(true),options);return current;
 }
 async settle(){await waitForNetworkQuiet(this.activity,{signal:this.signal,...this.options});await waitForDOMStable(()=>this.page.signature(),{signal:this.signal,timeout:this.options.timeout||10000});}
 async visit(id){
 let found;try{await waitForElement(async()=>{found=await this.page.find(id);return ['FOUND','AMBIGUOUS'].includes(found.status);},{signal:this.signal,timeout:this.options.elementTimeout??1500});}catch(e){if(e.code==='TIMEOUT')return {status:'SKIPPED',reason:'SKIPPED_NOT_AVAILABLE'};throw e;}
 if(found.status==='AMBIGUOUS')return {status:'SKIPPED',reason:'AMBIGUOUS'};
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
