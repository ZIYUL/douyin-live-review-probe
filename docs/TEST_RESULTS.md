# V0.2.4.1 验证报告

DOUYIN_LIVE_REVIEW_PROBE_V0_2_4_1 = **PARTIAL**：本地通过，真实 Mac Chrome 未验证。

基线：d0a50b6458d58d60a0021a4b1d73706a1587ac2f。用户 V0.2.4 实机口播分类正确，90条/单窗口/约26.9%，但 TRANSCRIPT_SCROLL_CONTAINER_NOT_FOUND 且无滚动尝试。本补丁仅修容器发现及安全参数/诊断传递。

- 原97项继续PASS，新增8项，105/105单元测试PASS。
- 新回归：昵称内嵌时间戳、多时间大父节点拒绝、已捕获时间点匹配优先、至少3条唯一递增兄弟记录、最近536px祖先与MAIN拒绝、失败纯计数、前中末最多12个CST时间及输入过滤、缓存未见窗口兼容和参数传递。
- 真实Chromium DOM回归PASS：嵌入昵称标题、时间匹配、最近滚动祖先、诱饵和多时间节点拒绝；不保存自由文本。
- 本地HTTPS完整Mock PASS：4个正常前端type4窗口，331条/110分钟/100%覆盖。既有分页、slider兼容、reload、取消、模块导航、安全导出回归PASS。
- SECURITY_CHECK PASS：31个扩展文件，权限保持，无主动业务API/重放、视频操作、认证访问或远程脚本；imports有效。
- ZIP含31个extension文件，CRC、源文件逐字节及manifest0.2.4.1检查PASS；SHA256见V0241_ZIP_CHECK.txt。

## 修复边界

已捕获口播contentTime按前/中/末采样最多12个合法北京时间字符串。页面端允许时间戳嵌入昵称文本，每行必须只有一个唯一合法时间，至少3条兄弟行递增。匹配已捕获时间的组优先；未见缓存窗口保留既有结构判断。最近滚动祖先与BODY/HTML/MAIN/全分析区域排除保持。

失败 transcript_find_diagnostic 只含 expected_time_count、expected_time_matches、timestamp_nodes_found、row_candidates_found、row_groups_found、scrollable_ancestors_found 六项计数。成功附已验证时间和数量，不附昵称、正文或DOM对象。

Network/debugger/reload、80%增量滚动、lazy等待、WINDOW_ADVANCED、窗口合并、95%覆盖及起始窗口判据均保持；评论自动化未新增。

REAL_PAGE_VERIFICATION = NOT VERIFIED，等待用户实机。Linux Chromium/CDP Mock不等于真实Mac Chrome登录页面与扩展安装验收。
