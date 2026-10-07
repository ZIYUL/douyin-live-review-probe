import {CORE_ENDPOINTS} from './evidence-policy.js';
import {expandNestedJSON} from '../lib/nested-json.js';
import {parseTime} from '../lib/time-series-detector.js';
import {historySummaries,textCoverage} from '../lib/live-summary.js';
export function observeBusiness(session,metadata,clean,schema){
 metadata.comment_data_observed=!!schema.arrays.some(a=>a.comment_timeline);
 const expanded=expandNestedJSON(clean).value;
 const run=metadata.context?.run_id||'manual';
 if(metadata.path.split('/').at(-1)==='history_list')session.history_live_summaries=historySummaries(expanded);
 if(['room_base_v2','get_room_info'].includes(metadata.path.split('/').at(-1))){
 const pairs=historySummaries({rows:[expanded?.data||expanded]});if(pairs.length===1){session.live_bounds_by_run??={};session.live_bounds_by_run[run]={live_start:pairs[0].live_start,live_end:pairs[0].live_end,source:'captured_live_info'};}
 }
 if(metadata.path.split('/').at(-1)==='room_stats_content_list'){
 const series=expanded?.data?.series||expanded?.series;
 if(Array.isArray(series))metadata.content_evidence={series_count:series.length,comment_rows:!!schema.arrays.some(a=>a.comment_timeline),text_rows:series.some(r=>typeof r?.content==='string'&&Number.isFinite(parseTime(r.contentTime)))};
 }
 if(metadata.path.split('/').at(-1)!=='room_stats_content_list'&&metadata.context?.step!=='text')return;
 session.text_timelines??={};const timeline=session.text_timelines[run]??={times:[],records:0};const seen=new Set(timeline.times);
 let visited=0;function walk(v,depth){if(++visited>200000||depth>40)return;if(Array.isArray(v))for(const r of v){if(r&&typeof r==='object'&&typeof r.content==='string'&&Number.isFinite(parseTime(r.contentTime)))seen.add(new Date(parseTime(r.contentTime)).toISOString());walk(r,depth+1);}else if(v&&typeof v==='object')for(const x of Object.values(v))walk(x,depth+1);}
 walk(expanded,0);timeline.times=[...seen].sort().slice(0,50000);timeline.records=timeline.times.length;
}
export function coverageFor(session,run,page){const bounds=session.live_bounds_by_run?.[run]||{};return textCoverage(session.text_timelines?.[run]?.times||[],page.live_start||bounds.live_start,page.live_end||bounds.live_end);}
export function summaryFor(session,run){
 const endpoints=Object.values(session.endpoints).filter(e=>e.metadata.some(m=>m.context?.run_id===run));
 const stepEvidence={};for(const e of endpoints)for(const m of e.metadata)if(m.context?.run_id===run&&m.response_type==='json'&&['SAVE','SAVE_LARGE'].includes(m.body_status)){const step=m.context.step;(stepEvidence[step]??=new Set()).add(e.name);}
 const candidateEndpoints=kind=>endpoints.filter(e=>Object.values(e.run_schemas?.[run]||{}).some(s=>s.arrays.some(a=>kind==='time_series'?a.time_series.detected:!!a[kind])));
 const loss=endpoints.flatMap(e=>e.metadata.filter(m=>m.context?.run_id===run&&!['SAVE','SAVE_LARGE'].includes(m.body_status)).map(m=>({name:e.name,metadata:m})));
 const coreLoss=loss.filter(e=>CORE_ENDPOINTS.includes(e.name)).length;
 const content=endpoints.filter(e=>e.name==='room_stats_content_list').flatMap(e=>e.metadata.filter(m=>m.context?.run_id===run&&m.response_type==='json'&&['SAVE','SAVE_LARGE'].includes(m.body_status)));
 const knownCommentType=m=>Object.values(session.endpoints).filter(e=>e.name==='room_stats_content_list'&&e.host===m.host&&e.path===m.path).some(e=>e.metadata.some(prior=>['SAVE','SAVE_LARGE'].includes(prior.body_status)&&prior.content_evidence?.comment_rows&&prior.safe_business_context?.roomStatsContentType===m.safe_business_context?.roomStatsContentType));
 // Platform enum meanings are unknown. Only a type previously corroborated by
 // actual comment-shaped rows at the same endpoint can identify a later empty response.
 const comment_available_empty=content.some(m=>m.context.step==='comments'&&m.content_evidence?.series_count===0&&m.safe_business_context?.roomStatsContentType&&knownCommentType(m));
 const module_data=Object.fromEntries(Object.entries(stepEvidence).map(([k,v])=>[k,[...v]]));
 return {module_data,room_stats_content_list_count:endpoints.filter(e=>e.name==='room_stats_content_list').reduce((n,e)=>n+e.metadata.filter(m=>m.context?.run_id===run).length,0),core_capture_loss_count:coreLoss,aux_capture_loss_count:loss.length-coreLoss,capture_warnings:loss.length>coreLoss?[{reason:'AUXILIARY_CAPTURE_LOSS',count:loss.length-coreLoss}]:[],comment_available_empty,endpoint_count:endpoints.length,json_count:endpoints.reduce((n,e)=>n+e.metadata.filter(m=>m.context?.run_id===run&&m.response_type==='json').length,0),capture_loss_count:endpoints.reduce((n,e)=>n+e.metadata.filter(m=>m.context?.run_id===run&&!['SAVE','SAVE_LARGE'].includes(m.body_status)).length,0),time_series_count:candidateEndpoints('time_series').length,text_timeline_count:candidateEndpoints('text_timeline').length,comment_timeline_count:candidateEndpoints('comment_timeline').filter(e=>e.metadata.some(m=>m.context?.run_id===run&&m.comment_data_observed&&['SAVE','SAVE_LARGE'].includes(m.body_status))).length,captured_endpoints:endpoints.map(e=>e.name),minute_trend_time_series:endpoints.some(e=>e.name==='minute_trend'&&Object.values(e.run_schemas?.[run]||{}).some(s=>s.arrays.some(a=>a.time_series.detected)))};
}
