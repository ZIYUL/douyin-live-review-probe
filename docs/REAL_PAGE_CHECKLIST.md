# 实机验收（待完成）

每项记录浏览器 / OS / 版本、时间和 PASS/FAIL，不记录登录凭证。

1. Mac Chrome、Windows Chrome / Edge 加载 extension，后台无报错，Popup 可用。
2. 正常登录自己的账号，打开直播复盘；开始后出现调试提示，页面无明显性能影响。
3. 手动刷新/切换分钟指标：minute_trend 可读正文，data.series 数量/字段和 timeMinute 正确、60 秒间隔正确。
4. 手动打开文字记录：room_stats_content_list 有 content/contentTime，标 TEXT_TIMELINE_CANDIDATE。
5. 发现其他未知业务 JSON，业务用途保持 UNKNOWN。
6. 同接口 captures 增加；内容不同独立版本，重复内容去重。
7. 停止后调试提示消失、计数不再增加；顶层页面离开主播中心 / 关标签页后停止，错误域名开始拒绝。
8. ZIP 可解压，含 inventory / session / responses / schemas，正文和预览一致。
9. 检查全部文件：无认证字段值、query 值、headers、HAR/cURL。README 隐私说明中会出现 Cookie、Authorization、Token 等词，检查字段及值，不把说明文字视为泄漏。
10. 清空后缓存为空；重启不自动采集；5–20 MiB 开关和 >20 MiB 标记正确。
11. 核查 Worker / OOPIF / 缓存响应覆盖情况，必要业务域名仅依据真实页面观察添加。

全部通过后才可升级 PASS。当前：NOT VERIFIED ON REAL DOUYIN PAGE。
