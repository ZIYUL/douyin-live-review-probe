import {parseTime} from './time-series-detector.js';
export function historySummaries(value){
 const found=[];let count=0;
 function walk(v,depth){if(++count>200000||depth>40)return;
 if(Array.isArray(v)){for(const r of v){if(r&&typeof r==='object'){
 const start=['live_start','liveStart','startTime','start_time','live_start_time'].find(k=>Number.isFinite(parseTime(r[k])));
 const end=['live_end','liveEnd','endTime','end_time','live_end_time'].find(k=>Number.isFinite(parseTime(r[k])));
 if(start&&end&&parseTime(r[end])>parseTime(r[start])){
 const metrics=Object.fromEntries(Object.entries(r).filter(([k,x])=>/^(showCnt|watchUcnt|pcuTotal|likeCnt|followUcnt|shareCnt|income|revenue|duration)$/.test(k)&&(typeof x==='number'||/^\d+(\.\d+)?$/.test(String(x)))));
 found.push({live_start:new Date(parseTime(r[start])).toISOString(),live_end:new Date(parseTime(r[end])).toISOString(),duration_seconds:(parseTime(r[end])-parseTime(r[start]))/1000,summary_metrics:metrics});
 }}walk(r,depth+1);}
 }else if(v&&typeof v==='object')for(const x of Object.values(v))walk(x,depth+1);
 }walk(value,0);return [...new Map(found.map(v=>[v.live_start+' '+v.live_end,v])).values()].slice(0,1000);
}
export function textCoverage(times,start,end,{gapThreshold=60}={}){
 const a=parseTime(start),b=parseTime(end);const all=[...new Set(times.map(parseTime).filter(Number.isFinite))].sort((x,y)=>x-y);
 const base={live_start:Number.isFinite(a)?new Date(a).toISOString():null,live_end:Number.isFinite(b)?new Date(b).toISOString():null,text_start:all.length?new Date(all[0]).toISOString():null,text_end:all.length?new Date(all.at(-1)).toISOString():null,record_count:all.length,coverage_seconds:0,coverage_ratio:null,status:'UNKNOWN'};
 if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return base;
 const points=all.filter(t=>t>=a&&t<=b);let covered=0,gaps=0;
 for(let i=1;i<points.length;i++){const delta=(points[i]-points[i-1])/1000;if(delta<=gapThreshold)covered+=delta;else gaps++;}
 const ratio=Math.min(1,covered/((b-a)/1000));return {...base,coverage_seconds:covered,coverage_ratio:ratio,boundary_span_ratio:points.length?Math.min(1,(points.at(-1)-points[0])/(b-a)):0,gap_count:gaps,gap_threshold_seconds:gapThreshold,status:ratio>=0.95?'PASS':'PARTIAL'};
}
