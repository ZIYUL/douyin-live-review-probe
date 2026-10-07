// Only canonical timestamps may be passed into the page, never row objects.
export function safeExpectedTimes(values){
 if(!Array.isArray(values))return [];
 return [...new Set(values.slice(0,12).filter(value=>{
 if(typeof value!=='string')return false;const m=value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);if(!m)return false;
 const [y,mo,d,h,mi,s]=m.slice(1).map(Number);return mo>=1&&mo<=12&&d>=1&&d<=new Date(Date.UTC(y,mo,0)).getUTCDate()&&h<=23&&mi<=59&&s<=59;
 }))];
}
export function sampleExpectedTimes(times){
 if(!Array.isArray(times)||!times.length)return [];
 const indices=new Set();for(const start of [0,Math.max(0,Math.floor(times.length/2)-2),Math.max(0,times.length-4)])for(let i=start;i<Math.min(times.length,start+4);i++)indices.add(i);
 const sampled=[...indices].slice(0,12).map(i=>{
 const value=times[i];if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))return null;
 const ms=Date.parse(value);return Number.isFinite(ms)?new Date(ms+28800000).toISOString().replace('T',' ').slice(0,19):null;
 });return safeExpectedTimes(sampled);
}
