# V0.2.2 用户实机基线

来源：用户本次提供的真实 Mac Chrome 反馈；本环境没有接入其登录页或原始账号数据。

基线 commit：e5c8ae5296d211f4594c6e06505cddad464c85ca。真实已登录 anchor.douyin.com 直播复盘，约32.4秒：state COMPLETE / status PARTIAL。

整体、内容、营收、流量趋势、互动、文字、评论、礼物、片段、观众、流量分析均 PASS；fans 安全 SKIPPED / AMBIGUOUS。33 endpoint groups / 39 JSON / 2时间序列 / 1文字时间轴，minute_trend_time_series=true，证明自动化主链可用。

直播 2026-09-30 10:06:32–11:56:38（中国标准时间），文字仅10:06:34–10:36:12，90条，coverage_ratio=0.2691492582500757。room_stats_content_list 的4次捕获全部属于 initial：3次空series、1次90条。文字阶段没有新响应，现有控件机制没有推进真实窗口。不能归咎 Network、Schema 或覆盖算法。

辅助丢正文：get_observe_permission 1、ttwid/check 3、anchor/review document 2、get_anchor_card 1；核心minute_trend/overview_v3/room_stats_content_list/entrance_v2已保存。评论控件点击成功但无可归属评论正文，只能 NOT_OBSERVED。

V0.2.3 目标是输出安全窗口、逐动作响应效果和控件指纹；实际能否推进真实文字窗口必须另行实机验证。
