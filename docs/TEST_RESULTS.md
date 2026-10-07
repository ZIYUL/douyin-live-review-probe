# V0.2.4 验证报告

DOUYIN_LIVE_REVIEW_PROBE_V0_2_4 = **PARTIAL**：本地验证通过，等待真实Mac Chrome。

基线：6bd7e7363c4ca6c78f7e7b19dfaa34fa27775133。用户实机证明文字列表正常滚动触发type=4约30分钟窗口：2026-09-30T03:06:32Z–03:36:31Z（北京时间11:06:32–11:36:31），90条，实际文字11:06:35–11:36:17，中位20秒。此为主路线证据，不是本版本自动化实机PASS。

## 验证

- 原有83项全部继续PASS；新增14项，合计97/97单元测试PASS。
- 新增覆盖：type4口播/占位身份不计评论、其它type与真实非占位ID未知、多窗口合并去重、四窗口95%以上、起始缺失、窗口count与范围联合判据、重复窗口不能冒充推进、DOM缓存推进不补正文、无进展有限停止、lazy阈值前物理滚动、有界次数、评论独立状态及缺起始仍PARTIAL、无主动API/视频/坐标操作。
- 真实Chromium DOM：最近行祖先、前置诱饵忽略、页面MAIN拒绝、80%增量、React分拆时间戳、无正文诊断。
- 完整本地HTTPS列表Mock：4个正常前端type4窗口，331条/110分钟/覆盖100%；每个推进通过真实Network响应及safe_business_context确认，不由扩展构造时间请求。
- 旧Chromium身份/React点击/reload生命周期/分页/role slider/取消/跨场回归保留通过。旧文字机制在测试中显式走兼容分支，生产自动主链仅结构确认列表滚动，不以slider或任意DIV兜底。
- SECURITY_CHECK PASS：30个扩展文件，无新增权限、API构造/重放、视频操控、认证访问、远程脚本或私钥；imports有效。git diff --check PASS。
- ZIP只含30个extension文件；CRC/manifest0.2.4/SHA-256校验见V024_ZIP_CHECK.txt。

## 完整性与安全边界

正文只由已正常捕获的type4、符合当前口播结构证据的Response形成派生full_transcript_timelines；仅content/contentTime，按时间去重，既有IndexedDB不重构。full_transcript_timeline输出窗口数、记录数、首末时间和真实覆盖率。

只有type4新响应且start/end变化才WINDOW_ADVANCED/TRANSCRIPT_WINDOW_ADVANCED。DOM可见时间或物理位置推进可有限继续等待lazy加载，不计正式正文；缓存到直播结束且仍缺捕获为PARTIAL_CACHED_BEFORE_CAPTURE。第一窗口距live_start超过60秒或无合法窗口，TRANSCRIPT_START_WINDOW_MISSING。多窗口顺序与范围不连续、无真实窗口推进均不能完整PASS。

主链PASS要求核心接口/分钟趋势有效、四模块及文字导航通过、核心loss0、至少2个连续type4窗口并有真实推进、记录>90且覆盖≥95%、起始窗口正确；评论可独立NOT_OBSERVED，不阻塞满足全部证据的主链。既有非新主链回归的评论规则保持。

type4只有合法递增contentTime、非空口播、单一nickname、占位用户ID/空secUid、15–25秒中位间隔才SPEECH_TRANSCRIPT_CANDIDATE。明确身份或不匹配结构不强判，type1/type2仍UNKNOWN。诊断不记录nickname/ID的值或任意全文，只保存结构/时间/数量/布尔及允许状态。

REAL_PAGE_VERIFICATION = NOT VERIFIED，等待用户实机。Linux Chromium本地CDP Mock不等于真实Mac Chrome扩展安装及登录页面验收。请按REAL_PAGE_CHECKLIST.md复测，仍缺窗口时回传可分享诊断而不是宣布全量。
