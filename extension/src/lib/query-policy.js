export const SAFE_QUERY_ALLOWLIST=Object.freeze(['data_type','metric_name','roomStatsContentType']);
const forbidden=/room.?id|anchor.?id|uid|sec.?uid|token|signature|authorization|cookie|session|device.?id|user|identity/i;
export function validateSafeQuery(config){
 if(!config||typeof config!=='object'||Array.isArray(config))throw Error('安全 Query 配置必须是对象');
 for(const [key,values]of Object.entries(config)){
 if(!SAFE_QUERY_ALLOWLIST.includes(key)||forbidden.test(key)||!Array.isArray(values)||values.length>20||values.some(v=>typeof v!=='string'||! /^(?:[A-Za-z][A-Za-z0-9_-]{0,39}|\d{1,2})$/.test(v)||/token|secret|cookie|bearer|auth/i.test(v)))throw Error('仅支持人工审核的枚举名称与精确值');
 }return config;
}
export function safeQuery(params,config={}){
 const out={};for(const key of SAFE_QUERY_ALLOWLIST){const value=params.get(key);if(params.getAll(key).length!==1)continue;
 try{validateSafeQuery({[key]:config[key]||[]});if(config[key]?.includes(value))out[key]=value;}catch{}
 }return out;
}
