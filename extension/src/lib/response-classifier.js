export const defaultRules={businessHosts:['anchor.douyin.com'],telemetryHosts:['mcs.zijieapi.com','security.zijieapi.com','mon.zijieapi.com']};
export function classify(m,rules=defaultRules){
 if(rules.telemetryHosts.includes(m.host))return 'TELEMETRY';
 const mime=(m.mime||'').toLowerCase(),path=m.path.toLowerCase();
 if(m.type==='Image'||mime.startsWith('image/')||/\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(path))return 'IMAGE';
 if(m.type==='Media'||/^(audio|video)\//.test(mime)||/\.(ts|mp4|m3u8|mp3|wav|m4s)$/.test(path))return 'VIDEO_AUDIO';
 if(['Script','Stylesheet','Font'].includes(m.type)||/javascript|css|font|wasm/.test(mime)||/\.(js|css|woff2?|ttf|map)$/.test(path))return 'STATIC';
 if(!rules.businessHosts.includes(m.host))return 'OUT_OF_SCOPE';
 if(['XHR','Fetch'].includes(m.type)||/json|text\/plain/.test(mime))return 'BUSINESS_CANDIDATE';
 return 'STATIC';
}
export const MB=1024*1024;
export function sizePolicy(size,allowLarge=false){return size>20*MB?'METADATA_SCHEMA_ONLY':size>5*MB?(allowLarge?'SAVE_LARGE':'LARGE_RESPONSE'):'SAVE';}
export function parseBody(body,base64Encoded=false){
 try {
 if(base64Encoded){const bytes=Uint8Array.from(atob(body),x=>x.charCodeAt(0));body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
 if(/[\x00-\x08\x0e-\x1f]/.test(body))return {encoding:'unknown/binary'};
 try{return {kind:'BUSINESS_JSON',value:JSON.parse(body),encoding:'utf-8',byte_length:new TextEncoder().encode(body).length};}catch{return {kind:'BUSINESS_TEXT',value:body,encoding:'utf-8',byte_length:new TextEncoder().encode(body).length};}
 }catch{return {encoding:'unknown/binary'};}
}
