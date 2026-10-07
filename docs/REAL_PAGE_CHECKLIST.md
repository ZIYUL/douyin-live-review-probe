# V0.2.4 实机验收

1. 更新未打包扩展到0.2.4，保持debugger/activeTab权限；正常登录当前直播复盘，仅点一次自动采集。
2. 确认attach在reload前，原四模块导航和prefetch保持。文字阶段不得以slider、视频或页面主滚动区作为路线。
3. 检查text_loading.scroll_container状态TRANSCRIPT_SCROLL_CONTAINER_CONFIRMED：行数≥3，祖先深度、scroll/client尺寸符合实际文字内部列表。不能选BODY/HTML/页面MAIN/整个内容分析区。
4. 检查transcript_scroll_attempts：80%增量、type4计数及start/end实际变化才WINDOW_ADVANCED。前几次只有SCROLLED或DOM_PROGRESS_ONLY允许继续，完全无进展有限停止。
5. 核对第一个type4窗口覆盖直播10:06:32附近；缺失必须TRANSCRIPT_START_WINDOW_MISSING。窗口正常逐段向后直到11:56:38附近。
6. 核对full_transcript_timeline：记录明显>90、至少2个连续窗口、coverage≥95%；minute_trend正常、core_capture_loss_count=0，才CURRENT_LIVE_AUTO_CAPTURE PASS。
7. 仅DOM已加载但Network未捕获的缓存文字不能计入正文，到结束仍缺数据应PARTIAL_CACHED_BEFORE_CAPTURE。
8. 确认当前type4、单一说话人/占位userID/空secUid/20秒口播结构为SPEECH_TRANSCRIPT_CANDIDATE，不增加comment_timeline_count。无真实评论证据为NOT_OBSERVED，不猜type1/type2。
9. 手动、Schema、ZIP、IndexedDB、share-safe保持。分享包仍包含话术/经营指标，复核后回传允许的窗口/滚动尝试/结构诊断，勿提供认证信息。
