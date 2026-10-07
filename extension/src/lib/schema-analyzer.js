import {expandNestedJSON} from './nested-json.js';
import {detectComments} from './comment-detector.js';
import {detectTimeline} from './time-series-detector.js';
export function analyze(value){
 const nested=expandNestedJSON(value);value=nested.value;
 const arrays=[],types=new Map();let visited=0,truncated=false;
 function walk(v,path,depth){
 if(++visited>200000||depth>40){truncated=true;return;}
 const type=v===null?'null':Array.isArray(v)?'array':typeof v;
 if(!types.has(path))types.set(path,new Set());types.get(path).add(type);
 if(Array.isArray(v)){
 const fields=[...new Set(v.flatMap(r=>r&&typeof r==='object'&&!Array.isArray(r)?Object.keys(r):[]))].sort();
 arrays.push({path:path||'$',length:v.length,fields,...detectTimeline(v,fields),comment_timeline:detectComments(v,fields)});
 for(const child of v)walk(child,path+'[]',depth+1);
 }else if(v&&typeof v==='object')for(const [k,child]of Object.entries(v))walk(child,path?path+'.'+k:k,depth+1);
 }
 walk(value,'',0);
 const merged=new Map();for(const a of arrays){if(!merged.has(a.path))merged.set(a.path,a);else {const old=merged.get(a.path);old.fields=[...new Set([...old.fields,...a.fields])].sort();}}
 return {top_level_type:value===null?'null':Array.isArray(value)?'array':typeof value,top_level_keys:value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value).sort():[],arrays:[...merged.values()].sort((a,b)=>a.path.localeCompare(b.path)),field_types:Object.fromEntries([...types].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,[...v].sort()])),nested_json_detected:nested.nested_json_detected,nested_json_paths:nested.nested_json_paths,analysis_truncated:truncated||nested.analysis_truncated};
}
