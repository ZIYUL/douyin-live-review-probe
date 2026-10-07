import {expandNestedJSON} from '../lib/nested-json.js';
import {parseTime} from '../lib/time-series-detector.js';
import {historySummaries,textCoverage} from '../lib/live-summary.js';
export function observeBusiness(session,metadata,clean,schema){
 const expanded=expandNestedJSON(clean).value;
 const run=metadata.context?.run_id||'manual';
 if(metadata.path.split('/').at(-1)==='history_list')session.history_live_summaries=historySummaries(expanded);
 if(['room_base_v2','get_room_info'].includes(metadata.path.split('/').at(-1))){
 const pairs=historySummaries({rows:[expanded?.data||expanded]});if(pairs.length===1){session.live_bounds_by_run??={};session.live_bounds_by_run[run]={live_start:pairs[0].live_start,live_end:pairs[0].live_end,source:'captured_live_info'};}
 }
 if(metadata.path.split('/').at(-1)!=='room_stats_content_list'&&metadata.context?.step!=='text')return;
 session.text_timelines??={};const timeline=session.text_timelines[run]??={times:[],records:0};const seen=new Set(timeline.times);
 let visited=0;function walk(v,depth){if(++visited>200000||depth>40)return;if(Array.isArray(v))for(const r of v){if(r&&typeof r==='object'&&typeof r.content==='string'&&Number.isFinite(parseTime(r.contentTime)))seen.add(new Date(parseTime(r.contentTime)).toISOString());walk(r,depth+1);}else if(v&&typeof v==='object')for(const x of Object.values(v))walk(x,depth+1);}
 walk(expanded,0);timeline.times=[...seen].sort().slice(0,50000);timeline.records=timeline.times.length;
}
export function coverageFor(session,run,page){const bounds=session.live_bounds_by_run?.[run]||{};return textCoverage(session.text_timelines?.[run]?.times||[],page.live_start||bounds.live_start,page.live_end||bounds.live_end);}
export function summaryFor(session,run){
 const endpoints=Object.values(session.endpoints).filter(e=>e.metadata.some(m=>m.context?.run_id===run));
 const schemas=endpoints.flatMap(e=>e.run_schemas?.[run]?Object.values(e.run_schemas[run]):[]);
 const stepEvidence={};for(const e of endpoints)for(const m of e.metadata)if(m.context?.run_id===run&&m.response_type==='json'){const step=m.context.step;(stepEvidence[step]??=new Set()).add(e.name);}
 const candidateEndpoints=kind=>endpoints.filter(e=>Object.values(e.run_schemas?.[run]||{}).some(s=>s.arrays.some(a=>kind==='time_series'?a.time_series.detected:!!a[kind])));
 const module_data=Object.fromEntries(Object.entries(stepEvidence).map(([k,v])=>[k,[...v]]));
 return {module_data,endpoint_count:endpoints.length,json_count:endpoints.reduce((n,e)=>n+e.metadata.filter(m=>m.context?.run_id===run&&m.response_type==='json').length,0),capture_loss_count:endpoints.reduce((n,e)=>n+e.metadata.filter(m=>m.context?.run_id===run&&!['SAVE','SAVE_LARGE'].includes(m.body_status)).length,0),time_series_count:candidateEndpoints('time_series').length,text_timeline_count:candidateEndpoints('text_timeline').length,comment_timeline_count:candidateEndpoints('comment_timeline').filter(e=>e.metadata.some(m=>m.context?.run_id===run&&m.context.step==='comments')).length,captured_endpoints:endpoints.map(e=>e.name),minute_trend_time_series:endpoints.some(e=>e.name==='minute_trend'&&Object.values(e.run_schemas?.[run]||{}).some(s=>s.arrays.some(a=>a.time_series.detected)))};
}
