# V0.2.3 实机验收（待用户完成）

V0.2.2 自动化主链已经用户实机证明可用；本次只验证新增窗口诊断、控件机制与报告/分享修复。

1. 更新未打包扩展到0.2.3，保持 debugger / activeTab 权限；正常登录并打开当前场复盘，点一次自动采集。
2. 核对 page_diagnostic_initial 与 ready；正常刷新后继续导航，未出现旧 NOT_REVIEW / 空body DOM_ERROR。
3. 检查 room_stats_content_list 每次 metadata.safe_business_context 的内容类型与 ISO start/end，必须无 roomID/账号/认证值及原始 Query。
4. 检查 text_control_diagnostic 是否包含真实 slider/分页/滚动结构；任意DOM文本、昵称、话术正文不能在指纹中出现。
5. 检查 text_loading.attempts 的方法、状态、记录增量和 network_response_delta；完全无效机制必须停止并转试有限下一机制。确认没有自动播放视频或改 video.currentTime。
6. 对照真实整场起止与文字覆盖；可推进则目标≥95%，仍仅30分钟应PARTIAL并保留足够证据，不能凭首尾跨度宣布全覆盖。
7. 核对 prefetch 端点模块归属；fans 歧义安全跳过但 fans_group_pie 已捕获时数据仍 PREFETCH_OBSERVED。
8. 核对核心/辅助 capture loss：仅辅助丢失只告警；核心丢失影响PASS。
9. 评论无可归属响应应 NOT_OBSERVED；可靠类型的空响应 AVAILABLE_EMPTY；有评论结构 OBSERVED；缺控件 NOT_AVAILABLE。未知数字枚举不能猜评论类型。
10. 分别导出本地和可分享诊断包。确认可分享包指定ID、昵称、头像及明确账号name被删除，话术/时间/经营指标保留；本地缓存与原始业务导出不变。可分享包不是公共匿名数据包，分享前复核。
11. 确认停止后不继续操作，手动采集/JSON/Schema/IndexedDB/ZIP维持既有行为。回传可分享ZIP与结果字段，勿提供认证信息。
