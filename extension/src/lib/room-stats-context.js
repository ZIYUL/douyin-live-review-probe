// Endpoint-specific business windows; never copy raw URL/query values.
export function safeRoomStatsContext(raw){
 const out={};let url;try{url=new URL(raw);}catch{return out;}
 if(url.pathname.split('/').at(-1)!=='room_stats_content_list')return out;
 const one=key=>url.searchParams.getAll(key).length===1?url.searchParams.get(key):null;
 const type=one('roomStatsContentType');
 if(type&&/^[A-Za-z0-9_-]{1,32}$/.test(type)&&!/token|secret|cookie|bearer|auth|session|signature/i.test(type))out.roomStatsContentType=type;
 for(const key of ['startTime','endTime']){const iso=businessTime(one(key));if(iso)out[key]=iso;}
 return out;
}
export function businessTime(value){
 if(typeof value!=='string')return null;let ms;
 if(/^\d{10}$|^\d{13}$/.test(value)){const n=Number(value);ms=value.length===10?n*1000:n;}
 else{
 const m=value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/);if(!m)return null;
 const [year,month,day,hour,minute,second]=m.slice(1,7).map(v=>Number(v||0));
 if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59)return null;
 if(m[8]&&m[8]!=='Z'){const [h,min]=m[8].slice(1).split(':').map(Number);if(h>14||min>59||(h===14&&min!==0))return null;}
 ms=Date.parse(value.replace(' ','T')+(m[8]?'':'+08:00'));
 }
 return Number.isFinite(ms)&&ms>=946684800000&&ms<4102444800000?new Date(ms).toISOString():null;
}
