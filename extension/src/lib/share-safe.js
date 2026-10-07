const identity=/^(?:user_?id|uid|sec_?uid|sec_?user_?id|anchor_?id|nickname|screen_?name|avatar(?:_?url)?)$/i;
const identityPath=value=>/^[\w.$\[\]-]+$/.test(value)&&value.split(/[.$\[\]]/).some(part=>identity.test(part));
const accountContainer=/^(?:user|account|anchor|author|owner|creator)(?:_?(?:info|profile|detail))?$/i;
// Build a separate export snapshot. Stored responses and local export stay intact.
export function shareSafe(value,account=false,depth=0,field=false){
 if(depth>60)return '[DEPTH_LIMIT]';
 if(typeof value==='string'){
 if(field&&identityPath(value))return undefined;
 if(/^\s*[\[{]/.test(value)){try{return JSON.stringify(shareSafe(JSON.parse(value),account,depth+1));}catch{}}
 return value;
 }
 if(Array.isArray(value))return value.map(v=>shareSafe(v,account,depth+1,field)).filter(v=>v!==undefined);
 if(value&&typeof value==='object'){
 const user=account||Object.keys(value).some(k=>identity.test(k));const out={};
 for(const [key,v]of Object.entries(value)){
 if(identityPath(key)||(key==='name'&&user))continue;
 const fieldContext=['fields','top_level_keys','query_keys','nested_json_paths','field','identity_field','text_field','time_field','path'].includes(key);
 const next=shareSafe(v,accountContainer.test(key),depth+1,fieldContext);if(next!==undefined)out[key]=next;
 }return out;
 }
 return value;
}
