import {sampleExpectedTimes} from './expected-transcript-times.js';
import {parseTime} from '../lib/time-series-detector.js';
import {textCoverage} from '../lib/live-summary.js';
export function speechEvidence(rows,type){
 if(type!=='4'||!Array.isArray(rows)||rows.length<3)return {classification:'UNKNOWN',non_empty:!!rows?.length};
 const valid=rows.every(r=>typeof r?.content==='string'&&r.content.trim()&&Number.isFinite(parseTime(r.contentTime)));
 if(!valid)return {classification:'UNKNOWN',non_empty:true};
 const times=rows.map(r=>parseTime(r.contentTime)),deltas=times.slice(1).map((t,i)=>(t-times[i])/1000).sort((a,b)=>a-b),median=deltas[Math.floor(deltas.length/2)];
 const placeholders=rows.every(r=>['userID','userId','user_id','uid'].every(k=>[undefined,null,'','0',0].includes(r[k]))&&['secUid','sec_uid','sec_user_id'].every(k=>[undefined,null,''].includes(r[k]))&&!r.user);
 const singleSpeaker=new Set(rows.map(r=>r.nickname||'')).size<=1;
 return {classification:placeholders&&singleSpeaker&&deltas.every(n=>n>0)&&median>=15&&median<=25?'SPEECH_TRANSCRIPT_CANDIDATE':'UNKNOWN',non_empty:true,record_count:rows.length,median_interval_seconds:median};
}
export function transcriptSnapshot(session,run,page={}){
 const timeline=session.full_transcript_timelines?.[run]||{records:[],windows:[]};
 const metadata=Object.values(session.endpoints).filter(e=>e.name==='room_stats_content_list').flatMap(e=>e.metadata.filter(m=>m.context?.run_id===run&&m.safe_business_context?.roomStatsContentType==='4'));
 const windows=timeline.windows||[],records=timeline.records||[];const bounds=session.live_bounds_by_run?.[run]||{};
 const liveStart=page.live_start||bounds.live_start,liveEnd=page.live_end||bounds.live_end;
 const coverage=textCoverage(records.map(r=>r.contentTime),liveStart,liveEnd);
 const first=windows[0];const start=parseTime(liveStart);const firstStart=parseTime(first?.startTime);
 const missing=Number.isFinite(start)&&(!Number.isFinite(firstStart)||Math.abs(firstStart-start)>60000);
 const sequence=windows.length>0&&windows.every((w,i)=>parseTime(w.endTime)>=parseTime(w.startTime)&&(!i||(parseTime(w.startTime)>=parseTime(windows[i-1].startTime)&&parseTime(w.startTime)<=parseTime(windows[i-1].endTime)+60000&&parseTime(w.endTime)>parseTime(windows[i-1].endTime))));
 return {expected_times:sampleExpectedTimes(records.map(r=>r.contentTime)),window_sequence_valid:sequence,type4_request_count:metadata.length,windows,latest_window:windows.at(-1)||null,window_count:windows.length,record_count:records.length,first_time:records[0]?.contentTime||null,last_time:records.at(-1)?.contentTime||null,coverage_ratio:coverage.coverage_ratio,coverage,start_window_missing:missing,live_end:coverage.live_end};
}
