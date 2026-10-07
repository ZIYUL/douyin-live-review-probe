export const CORE_ENDPOINTS=['minute_trend','overview_v3','room_stats_content_list','entrance_v2'];
export const MODULE_ENDPOINTS={
 overview:['overview_v3','common_traffic_conversion','minute_trend'],
 traffic:['entrance_v2','top_entrance_video','conversion_ratio'],
 audience:['age_profile','analysis_v3','audience_maintenance','rank','honor_level_profile','fans_group_pie'],
 content:['room_stats_content_list','gift_top_v2','key_fragment'],
 fans:['fans_group_pie'],text:['room_stats_content_list'],
};
const moduleSteps={overview:['overview','trend'],traffic:['traffic'],audience:['audience','fans'],content:['content','revenue','text','comments','gifts','clips'],fans:['fans'],text:['text']};
export function moduleEvidence(module,moduleData={}){
 const known=MODULE_ENDPOINTS[module]||[];
 const prefetch=(moduleData.initial||[]).filter(n=>known.includes(n));
 const sources=Object.fromEntries((moduleSteps[module]||[module]).map(id=>[id,(moduleData[id]||[]).filter(n=>known.includes(n))]).filter(([,names])=>names.length));
 const step=[...new Set(Object.values(sources).flat())];
 return {data_status:step.length?prefetch.length?'STEP_AND_PREFETCH_OBSERVED':'STEP_OBSERVED':prefetch.length?'PREFETCH_OBSERVED':'NOT_OBSERVED',endpoints:[...new Set([...prefetch,...step])],prefetch_endpoints:prefetch,step_endpoints:step,step_sources:sources};
}
export function commentStatus(summary,step){
 if(summary.comment_timeline_count>0)return 'OBSERVED';
 if(step?.status==='SKIPPED'&&['SKIPPED_NOT_AVAILABLE',undefined].includes(step.reason))return 'NOT_AVAILABLE';
 if(summary.comment_available_empty)return 'AVAILABLE_EMPTY';
 return 'NOT_OBSERVED';
}
