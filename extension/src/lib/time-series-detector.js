export function parseTime(v){
 if(typeof v==='number'||/^\d{10,13}$/.test(String(v))){const n=Number(v);return n>=946684800&&n<4102444800?n*1000:n>=946684800000&&n<4102444800000?n:NaN;}
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v))return NaN;
 // 未带时区的抖音墙上时间，按中国标准时间解释。
 return Date.parse(v.replace(' ','T')+(/Z$|[+-]\d\d:\d\d$/.test(v)?'':'+08:00'));
}
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?(b[Math.floor((b.length-1)/2)]+b[Math.floor(b.length/2)])/2:null;};
export function detectTimeline(rows,fields){
 let best={detected:false};
 for(const field of fields){
 const values=rows.map(r=>parseTime(r?.[field]));const valid=values.filter(Number.isFinite);
 if(valid.length<3||valid.length/rows.length<0.8)continue;
 const deltas=valid.slice(1).map((v,i)=>(v-valid[i])/1000);
 const monotonic=deltas.every(d=>d>=0),positive=deltas.filter(d=>d>0);
 if(!monotonic||!positive.length)continue;
 const freq=new Map();positive.forEach(d=>freq.set(d,(freq.get(d)||0)+1));const mode=[...freq].sort((a,b)=>b[1]-a[1])[0][0];
 const candidate={detected:true,field,points:rows.length,valid_points:valid.length,first_time:new Date(valid[0]).toISOString(),last_time:new Date(valid.at(-1)).toISOString(),span_seconds:(valid.at(-1)-valid[0])/1000,monotonic_increasing:true,median_interval_seconds:median(deltas),most_common_interval_seconds:mode,regular_60_seconds:positive.filter(d=>Math.abs(d-60)<=1).length/positive.length>=0.8,around_20_seconds:positive.filter(d=>d>=15&&d<=25).length/positive.length>=0.6};
 if(!best.detected||/time|date/i.test(field))best=candidate;
 }
 const textField=fields.find(f=>/^(content|text|sentence|message|title|description)$/i.test(f)&&rows.filter(r=>typeof r?.[f]==='string'&&r[f].trim()).length/rows.length>=0.6);
 return {time_series:best,text_timeline:best.detected&&!!textField?{detected:true,type:'TEXT_TIMELINE_CANDIDATE',text_field:textField,time_field:best.field}:false};
}
