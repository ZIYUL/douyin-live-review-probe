import {parseTime} from './time-series-detector.js';
export function detectComments(rows,fields){
 if(!rows.length)return false;
 const text=fields.find(f=>/^(content|text|comment|message)$/i.test(f)&&rows.filter(r=>typeof r?.[f]==='string'&&r[f].trim()).length/rows.length>=0.6);
 const time=fields.find(f=>/^(time|timestamp|contentTime|createTime|created_at)$/i.test(f)&&rows.filter(r=>Number.isFinite(parseTime(r?.[f]))).length/rows.length>=0.6);
 const identity=fields.find(f=>/^(nickname|user_id|userId|uid|user|username)$/i.test(f));
 return text&&time&&identity?{detected:true,type:'COMMENT_TIMELINE_CANDIDATE',text_field:text,time_field:time,record_count:rows.length,identity_field:identity,evidence:'text + time + user field; candidate only'}:false;
}
