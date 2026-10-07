export function endpointKey(m){return [m.host,m.path,m.method].join(' ');}
export async function hash(text){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function groupCapture(store,m,body,schema){
 const key=endpointKey(m);let e=store.endpoints[key];
 if(!e&&Object.keys(store.endpoints).length>=2000){store.droppedBodies++;return;}
 if(!e)e=store.endpoints[key]={name:m.path.split('/').filter(Boolean).at(-1)||m.path,host:m.host,path:m.path,method:m.method,business_purpose:'UNKNOWN',captures:0,versions:[],metadata:[],schemas:{}};
 e.captures++;e.metadata.push(m);if(e.metadata.length>1000){e.metadata.shift();e.metadata_dropped=(e.metadata_dropped||0)+1;}
 if(schema){const sig=await hash(JSON.stringify({...schema,arrays:schema.arrays.map(a=>({path:a.path,fields:a.fields})),analysis_truncated:schema.analysis_truncated}));e.schemas[sig]=schema;e.schema=schema;}
 if(body!==undefined){const digest=await hash(body);const found=e.versions.find(v=>v.hash===digest);if(found){found.last_seen=m.captured_at;found.captures++;}else if(store.bodyBytes+new TextEncoder().encode(body).length<=100*1024*1024){e.versions.push({hash:digest,body,size:new TextEncoder().encode(body).length,captures:1,last_seen:m.captured_at,response_type:m.response_type});store.bodyBytes+=new TextEncoder().encode(body).length;}else {m.body_status='SESSION_LIMIT';store.droppedBodies++;}}
 return e;
}
