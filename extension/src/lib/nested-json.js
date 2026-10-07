export function expandNestedJSON(input,{maxLayers=3,maxNodes=200000,maxBytes=20*1024*1024}={}){
 const paths=new Set();let nodes=0,bytes=0,truncated=false;
 function walk(v,path,layers,depth){
 if(++nodes>maxNodes||depth>40){truncated=true;return v;}
 if(typeof v==='string'&&/^\s*(?:\{[\s\S]*\}|\[[\s\S]*\])\s*$/.test(v)){
 if(layers>=maxLayers||bytes+v.length>maxBytes){truncated=true;return v;}
 try{const parsed=JSON.parse(v);bytes+=v.length;paths.add(path||'$');return walk(parsed,path,layers+1,depth+1);}catch{return v;}
 }
 if(Array.isArray(v))return v.map(x=>walk(x,path+'[]',layers,depth+1));
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x,path?path+'.'+k:k,layers,depth+1)]));
 return v;
 }
 return {value:walk(input,'',0,0),nested_json_detected:paths.size>0,nested_json_paths:[...paths],get analysis_truncated(){return truncated;}};
}
