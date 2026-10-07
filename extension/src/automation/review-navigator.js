import {waitForElement,waitForNetworkQuiet,waitForDOMStable,waitForRoute,waitForDOMReady,inspectReady,waitUntil,aborted} from './wait-strategy.js';
export class ReviewNavigator{
 constructor(page,activity,signal,options={}){Object.assign(this,{page,activity,signal,options});}
 async prepare(info){
 const options={signal:this.signal,...this.options,timeout:this.options.timeout||10000};
 const before=this.activity.navigation;await this.page.reload();await waitForRoute(()=>this.activity.navigation>before,options);
 await waitForDOMReady(this.page,options);let current=await inspectReady(this.page,options);const diagnosticInitial=current.page_diagnostic;
 if(current.status!=='OK')throw Object.assign(Error('NOT_REVIEW'),{code:'NOT_REVIEW'});
 // Rendering evidence is separate from route identity; absent controls time out later.
 try{await waitForElement(async()=>{current=await this.page.inspect();const d=current.page_diagnostic;return d?.review_text_found||d?.overview_found||d?.content_found;},options);}catch(e){if(e.code!=='TIMEOUT')throw e;}
 if(current.live_key!==info.live_key)throw Object.assign(Error('LIVE_CHANGED'),{code:'LIVE_CHANGED'});
 await waitForNetworkQuiet(this.activity,options);await waitForDOMStable(()=>this.page.signature(true),options);current=await inspectReady(this.page,options);if(current.live_key!==info.live_key)throw Object.assign(Error('LIVE_CHANGED'),{code:'LIVE_CHANGED'});return {...current,page_diagnostic_initial:diagnosticInitial};
 }
 async settle(){await waitForNetworkQuiet(this.activity,{signal:this.signal,...this.options});await waitForDOMStable(()=>this.page.signature(),{signal:this.signal,timeout:this.options.timeout||10000});}
 async visit(id){
 let found;try{await waitForElement(async()=>{found=await this.page.find(id);return ['FOUND','AMBIGUOUS'].includes(found.status);},{signal:this.signal,timeout:this.options.elementTimeout??1500});}catch(e){if(e.code==='TIMEOUT')return {status:'SKIPPED',reason:'SKIPPED_NOT_AVAILABLE'};throw e;}
 if(found.status==='AMBIGUOUS')return {status:'SKIPPED',reason:'AMBIGUOUS'};
 aborted(this.signal);const result=await this.page.click(id);if(result.status!=='CLICKED')return {status:'SKIPPED',reason:result.status};
 await this.settle();return {status:'PASS'};
 }
 async collectText(progress,{maxWindows=120,maxNoProgress=3,maxDuration=240000,onAttempt=async()=>{},responseCount}={}){
 const now=this.options.now||(()=>Date.now()),started=now(),attempts=[];let windows=0,reason='WINDOW_LIMIT';
 const counts=()=>responseCount?responseCount():this.activity.endpoints?.get('room_stats_content_list')||0;
 const snapshot=async()=>this.page.signature?this.page.signature():null;
 const runAction=async(action,excluded)=>{
 aborted(this.signal);const before=progress(),networkBefore=counts(),signatureBefore=await snapshot(),at=now();let result;
 try{
 result=await (action==='reset'?this.page.textReset([...excluded]):this.page.textAdvance([...excluded]));
 if(result.status==='ADVANCED'){
 await this.settle();
 if(result.method)try{await waitUntil(()=>counts()>networkBefore||(progress().record_count||0)>(before.record_count||0),{signal:this.signal,timeout:this.options.textEffectTimeout??1200,poll:100,now,pause:this.options.pause});}catch(e){if(e.code!=='TIMEOUT')throw e;}
 if(counts()>networkBefore)await this.settle();
 }
 }catch(e){attempts.push({attempt_index:attempts.length+1,action,method:result?.method||'none',status:e.code||'DOM_ERROR',dom_action:e.dom_action,exception_type:e.exception_type,record_count_before:before.record_count||0,record_count_after:progress().record_count||0,new_records:Math.max(0,(progress().record_count||0)-(before.record_count||0)),room_stats_content_list_count_before:networkBefore,room_stats_content_list_count_after:counts(),network_response_delta:Math.max(0,counts()-networkBefore),dom_signature_changed:null,coverage_before:before.coverage_ratio??null,coverage_after:progress().coverage_ratio??null,elapsed_ms:Math.max(0,now()-at)});await onAttempt({windows,reason:'ACTION_ERROR',attempts,coverage:progress()});throw e;}
 const after=progress(),networkAfter=counts(),signatureAfter=await snapshot();
 const newRecords=Math.max(0,(after.record_count||0)-(before.record_count||0)),delta=Math.max(0,networkAfter-networkBefore);
 const status=result.status==='ADVANCED'&&!newRecords&&!delta?'NO_NETWORK_EFFECT':result.status;
 attempts.push({attempt_index:attempts.length+1,action,method:result.method||'unknown',status,
 record_count_before:before.record_count||0,record_count_after:after.record_count||0,new_records:newRecords,
 room_stats_content_list_count_before:networkBefore,room_stats_content_list_count_after:networkAfter,network_response_delta:delta,
 dom_signature_changed:signatureBefore!==signatureAfter,coverage_before:before.coverage_ratio??null,coverage_after:after.coverage_ratio??null,elapsed_ms:Math.max(0,now()-at)});
 await onAttempt({windows,reason:'RUNNING',attempts:structuredClone(attempts),coverage:after});return {...result,status,new_records:newRecords,network_response_delta:delta};
 };
 const resetExcluded=new Set();
 for(let i=0;i<20&&now()-started<maxDuration;i++){
 const result=await runAction('reset',resetExcluded);if(result.status==='SKIPPED_NOT_AVAILABLE')break;
 if(result.status!=='ADVANCED'){if(!result.method)break;resetExcluded.add(result.method);}
 }
 const excluded=new Set();let stagnant=0;
 for(;windows<maxWindows&&now()-started<maxDuration;windows++){
 aborted(this.signal);if(progress().coverage_ratio>=0.95){reason='COVERAGE_REACHED';break;}
 const result=await runAction('advance',excluded);
 if(result.status==='SKIPPED_NOT_AVAILABLE'){reason=excluded.size?'NO_NETWORK_EFFECT':'SKIPPED_NOT_AVAILABLE';break;}
 if(['AT_END','AT_START'].includes(result.status)){if(result.method){excluded.add(result.method);continue;}reason=result.status;break;}
 stagnant=result.new_records>0?0:stagnant+1;
 if(result.status==='NO_NETWORK_EFFECT'&&result.method){excluded.add(result.method);stagnant=0;continue;}
 if(stagnant>=maxNoProgress){if(result.method){excluded.add(result.method);stagnant=0;}else{reason='NO_NEW_TEXT';break;}}
 }
 if(now()-started>=maxDuration)reason='TEXT_TIMEOUT';
 return {windows,reason,attempts,coverage:progress()};
 }
}
