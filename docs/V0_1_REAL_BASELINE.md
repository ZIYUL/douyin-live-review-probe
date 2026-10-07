# V0.1 用户实机基线

来源：用户在本次 V0.2 需求中明确提供的实机验证结果，2026-10-07 收到。开发环境没有独立登录抖音重复验证，不把这些结果冒充本次自动测试。

Mac / Chrome / anchor.douyin.com / 正常已登录账号 / 真实直播复盘：安装、debugger attach、Response 捕获、getResponseBody、JSON 解析、ZIP 导出 PASS，页面性能目前正常。约 463 Network / 55 JSON / 33 Endpoint Groups。

已收到 minute_trend、room_stats_content_list、overview_v3、analysis_v3、audience_maintenance、rank、honor_level_profile、age_profile、fans_group_pie、top_entrance_video、entrance_v2、common_traffic_conversion、room_base_v2、conversion_ratio、history_list、new_fan_sources 等。

minute_trend.data.series[]：真实场约 112 点，timeMinute 连续一分钟。用户通过整场汇总交叉确认：pcuTotal=当前在线人数、likeCnt=分钟点赞、followUcnt=分钟涨粉、shareCnt=分钟分享。V0.2 不重新猜测或推翻这些结论。

room_stats_content_list.data.series[]：content/contentTime，约每20秒主播话术。现有真实采集约30分钟，整场约110分钟，因此 V0.2 需要通过正常 UI 加载更多窗口，并如实报告覆盖率。

V0.1 的原交付报告保留为 V0_1_TEST_RESULTS_AT_DELIVERY.md，反映当时未完成实机验证的历史状态；当前以以上用户提供的实机基线为准。V0.2 自动化仍需要新的实机验收。
