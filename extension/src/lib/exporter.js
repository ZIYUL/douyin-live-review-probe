const enc=new TextEncoder();
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export function zip(files){
 const chunks=[],central=[];let offset=0;
 function header(size){const a=new Uint8Array(size);return [a,new DataView(a.buffer)];}
 for(const [name,text]of Object.entries(files)){
 const n=enc.encode(name),b=enc.encode(text),crc=crc32(b);const [h,v]=header(30);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);
 chunks.push(h,n,b);const [c,d]=header(46);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,crc,true);d.setUint32(20,b.length,true);d.setUint32(24,b.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true);central.push(c,n);offset+=30+n.length+b.length;
 }
 const len=central.reduce((n,a)=>n+a.length,0);const [end,v]=header(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,Object.keys(files).length,true);v.setUint16(10,Object.keys(files).length,true);v.setUint32(12,len,true);v.setUint32(16,offset,true);return new Blob([...chunks,...central,end],{type:'application/zip'});
}
export function exportFiles(raw){
 const s=structuredClone(raw),stamp=new Date().toISOString().replace(/[-:]/g,'').replace('T','_').slice(0,15),root='DouyinProbe_'+stamp,files={};const put=(path,value)=>files[root+'/'+path]=typeof value==='string'?value:JSON.stringify(value,null,2);
 put('README.txt','本诊断包不包含 Cookie、Authorization、Token、密码或完整 Request Headers。正文已按规则脱敏；业务数据仍可能包含个人信息，请导出者人工复核后再分享。仅本地采集，不包含完整 HAR。');
 const inventory=Object.values(s.endpoints).map((e,i)=>{
 const name=(e.name.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'endpoint')+'_'+String(i+1).padStart(3,'0');
 const versions=e.versions.map((v,j)=>{const path='responses/'+name+(j?'_v'+(j+1):'')+(v.response_type==='json'?'.json':'.txt');put(path,v.body);return {...v,body:undefined,file:path};});
 put('schemas/'+name+'.schema.json',e.schemas);
 const arrays=e.schema?.arrays||[];return {...e,versions,top_level_keys:e.schema?.top_level_keys||[],arrays,time_series:arrays.find(a=>a.time_series.detected)?.time_series||{detected:false},text_timeline:arrays.find(a=>a.text_timeline)?.text_timeline||false,comment_timeline:arrays.find(a=>a.comment_timeline)?.comment_timeline||false,nested_json_detected:e.schema?.nested_json_detected||false,nested_json_paths:e.schema?.nested_json_paths||[]};
 });
 if(s.auto)put('auto_capture_result.json',s.auto);if(s.history_live_summaries)put('history_live_summaries.json',s.history_live_summaries);
 put('session.json',{...s,endpoints:undefined});put('api_inventory.json',{generated_at:new Date().toISOString(),page:s.page,endpoints:inventory});return {root,files};
}
