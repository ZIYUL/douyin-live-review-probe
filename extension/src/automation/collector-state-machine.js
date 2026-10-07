import {moduleEvidence,commentStatus} from './evidence-policy.js';
import {STEPS} from './selectors.js';
import {aborted,inspectReady} from './wait-strategy.js';
export const STATES=new Set(['IDLE','ATTACHING','CAPTURING','NAVIGATING_OVERVIEW','NAVIGATING_CONTENT','NAVIGATING_AUDIENCE','NAVIGATING_TRAFFIC','COLLECTING_TEXT','COLLECTING_COMMENTS','FINALIZING','COMPLETE','FAILED','STOPPED']);
const transitions={IDLE:['ATTACHING'],ATTACHING:['CAPTURING'],CAPTURING:['CAPTURING','NAVIGATING_OVERVIEW','COLLECTING_TEXT','NAVIGATING_AUDIENCE'],NAVIGATING_OVERVIEW:['NAVIGATING_CONTENT'],NAVIGATING_CONTENT:['CAPTURING'],COLLECTING_TEXT:['COLLECTING_COMMENTS'],COLLECTING_COMMENTS:['CAPTURING'],NAVIGATING_AUDIENCE:['NAVIGATING_TRAFFIC'],NAVIGATING_TRAFFIC:['FINALIZING'],FINALIZING:['COMPLETE']};
const terminal=new Set(['COMPLETE','FAILED','STOPPED']);
export class AutoCollector{
 constructor({attach,detach,page,navigator,summary,coverage,onUpdate=async()=>{}}){Object.assign(this,{attach,detach,page,navigator,summary,coverage,onUpdate});this.abort=new AbortController();this.state='IDLE';this.report={type:'AUTO_CAPTURE_RESULT',state:'IDLE',status:'RUNNING',started_at:new Date().toISOString(),steps:{},modules:{},errors:[],run_id:crypto.randomUUID()};}
 async transition(state){if(!STATES.has(state)||terminal.has(this.state)||!transitions[this.state]?.includes(state))throw Error('INVALID_TRANSITION');aborted(this.abort.signal);this.state=state;this.report.state=state;await this.onUpdate(this.report);}
 async run(){
 try{
 await this.transition('ATTACHING');await this.attach(this.abort.signal);aborted(this.abort.signal);
 let page=await inspectReady(this.page,{signal:this.abort.signal});if(page.page_diagnostic)this.report.page_diagnostic_initial=page.page_diagnostic;this.report.page_diagnostic=page.page_diagnostic;if(page.status!=='OK')throw Object.assign(Error('请先进入直播复盘'),{code:'NOT_REVIEW'});
 if(this.navigator.prepare)page=await this.navigator.prepare(page);if(page.page_diagnostic_initial)this.report.page_diagnostic_initial=page.page_diagnostic_initial;if(page.page_diagnostic){this.report.page_diagnostic_ready=page.page_diagnostic;this.report.page_diagnostic=page.page_diagnostic;}await this.page.init(page);this.report.live_start=page.live_start;this.report.live_end=page.live_end;await this.transition('CAPTURING');
 for(const step of STEPS){
 aborted(this.abort.signal);await this.transition(step.state);this.report.current_step=step.id;await this.onUpdate(this.report);
 try{
 const result=await this.navigator.visit(step.id);this.report.steps[step.id]=result;
 if(step.id==='text'&&result.status==='PASS'){if(this.page.textDiagnostic)this.report.text_control_diagnostic=await this.page.textDiagnostic();this.report.text_loading=await this.navigator.collectText(()=>this.coverage(page),{transcriptState:()=>this.summary().full_transcript_timeline,responseCount:()=>this.summary().room_stats_content_list_count||0,onAttempt:async partial=>{this.report.text_loading=partial;await this.onUpdate(this.report);}});}
 }catch(e){if(this.abort.signal.aborted||['WRONG_PAGE','LIVE_CHANGED','CANCELLED'].includes(e.code))throw e;this.report.steps[step.id]={status:e.code==='TIMEOUT'?'TIMEOUT':'FAIL',reason:e.code||'STEP_ERROR'};this.report.errors.push({step:step.id,reason:e.code||'STEP_ERROR',...safeDOMDiagnostic(e)});}
 await this.onUpdate(this.report);
 }
 await this.transition('FINALIZING');Object.assign(this.report,this.summary(),{text_coverage:this.coverage(page)});
 for(const id of ['overview','content','audience','traffic','text','fans'])this.report.modules[id]={...(this.report.steps[id]||{status:'SKIPPED'}),...moduleEvidence(id,this.report.module_data)};
 if(this.report.text_loading?.transcript_scroll_attempts){this.report.transcript_scroll_attempts=this.report.text_loading.transcript_scroll_attempts;this.report.full_transcript_timeline=this.report.text_loading.full_transcript_timeline;if(this.report.full_transcript_timeline?.coverage)this.report.text_coverage=this.report.full_transcript_timeline.coverage;}
 const text=this.report.text_coverage;this.report.text_coverage_ratio=text.coverage_ratio;
 this.report.modules.comments={...(this.report.steps.comments||{status:'SKIPPED'}),data_status:commentStatus(this.report,this.report.steps.comments),endpoints:this.report.module_data?.comments||[]};
 if(this.report.steps.fans?.reason==='AMBIGUOUS')this.report.modules.fans.navigation='AMBIGUOUS';
 const required=['minute_trend','room_stats_content_list','overview_v3','entrance_v2'];
 const core=required.every(n=>this.report.captured_endpoints?.includes(n))&&this.report.minute_trend_time_series&&this.report.text_timeline_count>0;
 const moduleSuccess=['overview','content','audience','traffic','text'].every(id=>this.report.modules[id].status==='PASS');
 const transcript=this.report.text_loading?.full_transcript_timeline,newPrimary=Array.isArray(this.report.text_loading?.transcript_scroll_attempts);
 const transcriptComplete=!newPrimary||transcript?.record_count>90&&transcript.window_count>=2&&transcript.window_sequence_valid&&transcript.coverage_ratio>=0.95&&!transcript.start_window_missing&&this.report.text_loading.transcript_scroll_attempts.some(a=>a.status==='WINDOW_ADVANCED');
 const commentsOkay=newPrimary&&transcriptComplete||['OBSERVED','AVAILABLE_EMPTY','NOT_AVAILABLE'].includes(this.report.modules.comments.data_status);
 this.report.status=this.report.endpoint_count===0?'FAIL':core&&moduleSuccess&&text.coverage_ratio>=0.95&&transcriptComplete&&commentsOkay&&!this.report.errors.length&&!(this.report.core_capture_loss_count??this.report.capture_loss_count)?'PASS':'PARTIAL';
 this.report.CURRENT_LIVE_AUTO_CAPTURE=this.report.status;this.report.completion='CURRENT_LIVE_CAPTURE_COMPLETE';await this.transition('COMPLETE');
 }catch(e){const stopped=this.abort.signal.aborted;this.report.state=this.state=stopped?'STOPPED':'FAILED';this.report.status=stopped?'PARTIAL':'FAIL';this.report.errors.push({reason:stopped?'STOPPED_BY_USER':e.code||'AUTO_CAPTURE_ERROR',...safeDOMDiagnostic(e)});}
 finally{this.report.finished_at=new Date().toISOString();try{await this.page.cancel();}catch{}try{await this.detach();}catch{this.report.status='PARTIAL';this.report.errors.push({reason:'DETACH_ERROR'});}await this.onUpdate(this.report);}
 return this.report;
 }
 stop(){this.abort.abort();void this.page.cancel().catch(()=>{});return this.detach();}
 collectLive(liveReference='current'){if(liveReference!=='current')throw Error('V0.2 只支持当前场');return this.run();}
 collectRecentLives(){throw Error('V0.2 不支持批量历史直播采集');}
}

function safeDOMDiagnostic(error){const out={};for(const key of ['dom_action','exception_type'])if(typeof error[key]==='string')out[key]=error[key];for(const key of ['lineNumber','columnNumber'])if(Number.isInteger(error[key])&&error[key]>=0)out[key]=error[key];return out;}
