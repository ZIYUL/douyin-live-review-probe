import {waitUntil,aborted} from './wait-strategy.js';
export async function collectTranscript(page,progress,state,settle,signal,options={},limits={}){
 const {maxWindows=120,maxNoProgress=3,maxDuration=240000,onAttempt=async()=>{}}=limits;
 const now=options.now||(()=>Date.now()),started=now(),attempts=[];let stagnant=0,reason='WINDOW_LIMIT',cached=false;
 let current=await page.transcriptFind();
 if(current.status!=='TRANSCRIPT_SCROLL_CONTAINER_CONFIRMED')return {reason:current.status,attempts:[],transcript_scroll_attempts:[],coverage:progress(),full_transcript_timeline:state(),scroll_container:current};
 const scroll_container=current;
 for(let i=0;i<maxWindows&&now()-started<maxDuration;i++){
 aborted(signal);const before=state(),coverageBefore=progress();if(before.coverage_ratio>=0.95&&!before.start_window_missing){reason='COVERAGE_REACHED';break;}
 const at=now(),moved=await page.transcriptScroll();let afterDOM=moved,timedOut=false;
 if(moved.status==='SCROLLED'){
 await settle();
 try{await waitUntil(async()=>{afterDOM=await page.transcriptFind();const next=state();return next.type4_request_count>before.type4_request_count||afterDOM.visible_last_time>current.visible_last_time;},{signal,timeout:Math.min(options.transcriptWaitTimeout??1500,Math.max(0,maxDuration-(now()-started))),poll:100,now,pause:options.pause});}catch(e){if(e.code!=='TIMEOUT')throw e;timedOut=true;}
 await settle();afterDOM=await page.transcriptFind();
 }
 const after=state();const previous=before.latest_window,next=after.latest_window;
 const windowChanged=after.type4_request_count>before.type4_request_count&&!!next&&(!previous||next.startTime!==previous.startTime||next.endTime!==previous.endTime);
 const domProgress=!!afterDOM.visible_last_time&&afterDOM.visible_last_time>current.visible_last_time;
 const scrollProgress=moved.scrollTop>current.scrollTop;
 const status=windowChanged?'WINDOW_ADVANCED':domProgress?'DOM_PROGRESS_ONLY':moved.status==='AT_BOTTOM'?'AT_BOTTOM':timedOut&&!scrollProgress?'TIMEOUT':scrollProgress?'SCROLLED':'NO_PROGRESS';
 if(domProgress&&after.type4_request_count===before.type4_request_count&&(!after.last_time||afterDOM.visible_last_time>after.last_time))cached=true;
 const attempt={attempt_index:attempts.length+1,scrollTop_before:current.scrollTop,scrollTop_after:afterDOM.scrollTop??moved.scrollTop,scrollHeight:afterDOM.scrollHeight??moved.scrollHeight,clientHeight:afterDOM.clientHeight??moved.clientHeight,
 visible_first_time:afterDOM.visible_first_time||null,visible_last_time:afterDOM.visible_last_time||null,type4_request_count_before:before.type4_request_count,type4_request_count_after:after.type4_request_count,
 window_before:previous?{start:previous.startTime,end:previous.endTime}:null,window_after:next?{start:next.startTime,end:next.endTime}:null,new_records:Math.max(0,after.record_count-before.record_count),coverage_before:before.coverage_ratio,coverage_after:after.coverage_ratio,status,evidence:windowChanged?'TRANSCRIPT_WINDOW_ADVANCED':null,wait_timed_out:timedOut,elapsed_ms:Math.max(0,now()-at)};
 attempts.push(attempt);await onAttempt({windows:after.window_count,reason:'RUNNING',attempts:[],transcript_scroll_attempts:structuredClone(attempts),scroll_container,coverage:progress(),full_transcript_timeline:after});
 // In-list physical scrolling is useful progress before the next lazy threshold.
 stagnant=windowChanged||domProgress||scrollProgress?0:stagnant+1;
 current=afterDOM.status==='TRANSCRIPT_SCROLL_CONTAINER_CONFIRMED'?afterDOM:moved;
 if(moved.status==='AT_BOTTOM'&&!windowChanged&&!domProgress){reason='AT_BOTTOM';break;}
 if(stagnant>=maxNoProgress){reason='NO_PROGRESS';break;}
 }
 const final=state();if(now()-started>=maxDuration)reason='TEXT_TIMEOUT';
 if(final.coverage_ratio>=0.95&&!final.start_window_missing)reason='COVERAGE_REACHED';
 const reachedEnd=current.visible_last_time&&final.live_end&&Date.parse(current.visible_last_time)>=Date.parse(final.live_end)-60000;
 const warnings=[];if(final.start_window_missing)warnings.push('TRANSCRIPT_START_WINDOW_MISSING');
 if(cached&&reachedEnd&&!(final.coverage_ratio>=0.95)){warnings.push('PARTIAL_CACHED_BEFORE_CAPTURE');reason='PARTIAL_CACHED_BEFORE_CAPTURE';}
 else if(final.start_window_missing)reason='TRANSCRIPT_START_WINDOW_MISSING';
 return {windows:final.window_count,reason,attempts:[],transcript_scroll_attempts:attempts,scroll_container,coverage:progress(),full_transcript_timeline:final,warnings};
}
