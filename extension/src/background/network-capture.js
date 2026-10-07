import {safeRoomStatsContext} from '../lib/room-stats-context.js';
import {observeBusiness} from '../automation/session-analysis.js';
import {sanitizeURL,sanitize} from '../lib/sanitizer.js';
import {classify,parseBody,sizePolicy} from '../lib/response-classifier.js';
import {analyze} from '../lib/schema-analyzer.js';
import {groupCapture} from '../lib/endpoint-grouper.js';
export async function capture(s,m,result){
 if(!result){await groupCapture(s,m);return;}
 const parsed=parseBody(result.body,result.base64Encoded);m.body_encoding=parsed.encoding;
 if(parsed.value===undefined){m.body_status='BINARY_SKIPPED';await groupCapture(s,m);return;}
 m.response_type=parsed.kind==='BUSINESS_JSON'?'json':'text';m.classification=parsed.kind;s.counters[parsed.kind]=(s.counters[parsed.kind]||0)+1;
 const clean=sanitize(parsed.value);const body=typeof clean==='string'?clean:JSON.stringify(clean);const size=parsed.byte_length;
 m.response_size=size;m.body_status=sizePolicy(size,s.allowLarge);
 const schema=parsed.kind==='BUSINESS_JSON'?analyze(clean):undefined;
 if(schema)observeBusiness(s,m,clean,schema);
 await groupCapture(s,m,['SAVE','SAVE_LARGE'].includes(m.body_status)?body:undefined,schema);
}
export function metadata(params,method,rules,allowlist={}){const r=params.response;const u=sanitizeURL(r.url,allowlist);const m={...u,method,mime:r.mimeType,type:params.type,status:r.status,captured_at:new Date().toISOString(),response_size:r.encodedDataLength||0};const context=safeRoomStatsContext(r.url);if(Object.keys(context).length)m.safe_business_context=context;m.classification=classify(m,rules);return m;}
