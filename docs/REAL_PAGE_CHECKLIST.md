# V0.2 实机验收（待完成）

V0.1 的用户实机验证作为既有基线，不重复设计采集架构。V0.2 新增自动操作必须另行验证。

1. 备份并更新未打包扩展，确认版本0.2.0、仍仅 debugger / activeTab 权限。
2. Mac Chrome、真实已登录主播中心，进入一场直播复盘后只点一次「自动采集当前直播」。确认正常刷新后自动切换整体/内容/观众/流量及内容子模块，不需人工点击。
3. 核实真实捕获 minute_trend、room_stats_content_list、overview_v3、entrance_v2 及其他实际存在业务接口，报告只统计本次 run。
4. 对照真实场的 data.series 点数/时间字段：minute_trend TIME_SERIES；room_stats_content_list TEXT_TIMELINE。V0.1 已确认指标业务含义维持。
5. 核对真实直播起止、文字首末、时间缺口和覆盖率；目标≥95%。缺边界或页面只允许部分文字必须PARTIAL，不以跨度伪造完整。
6. 核实文字面板的滚动、分页或区间控件正常触发加载；若未命中选择器，记录SKIPPED，并提供不含账号/凭证的DOM结构供维护。
7. 检查评论控件正常加载响应：候选须具有文字、时间、用户字段。不存在控件记录NOT AVAILABLE；存在控件却无正文记录NOT OBSERVED，不根据接口名猜。
8. 在不同步骤点击停止，确认后续不再点击/导航且 debugger detach；切换场次、离开主播中心、打开DevTools时安全结束，不自动恢复。
9. 检查嵌套 history_list JSON Schema 和历史摘要，不自动打开历史场次。
10. 默认Query值为空；仅人工审核的精确业务枚举可留值。ZIP不得包含身份Query值、认证字段/headers或真实凭证；README隐私说明词语不属于泄漏。
11. 手动采集、详情、版本、Schema、缓存、大小限制、ZIP继续正常；检查真实页面性能。
12. 记录各 modules状态/证据、超时/跳过原因、coverage_ratio、评论候选、最终PASS/PARTIAL/FAIL。真实自动化通过后才可升级V0.2发布结论。
