# Douyin Live Review Probe V0.2.4.1

V0.2.4.1 修复昵称与时间戳同处一个文本节点导致的列表定位失败：从已捕获 contentTime 选取最多12个前/中/末时间点（北京时间）辅助匹配；确认至少3条递增、每行唯一合法时间戳的记录，再选择最近安全滚动祖先。失败诊断只返回计数，不保存昵称或正文。用户 V0.2.4 实机仍为单窗口90条、覆盖约26.9%，本补丁等待实机确认。

V0.2.4.1 以用户实机证明的「文字记录内部列表滚动→type=4约30分钟窗口懒加载」为自动文字主路线。从至少3条重复时间戳记录反查最近滚动祖先，不使用第一个可滚动DIV；不以slider、时间picker或视频为主路线。既有Network/debugger/reload/prefetch保留。详见 [验证报告](docs/TEST_RESULTS.md)。

抖音主播中心直播复盘数据探针。保留 V0.1 的 Manifest V3 / chrome.debugger / Network.responseReceived / Network.getResponseBody、本地诊断缓存、手动模式和 ZIP 导出，新增「自动采集当前直播」。无 AI、主动业务 API 请求、重放、自动登录、批量历史采集或云上传。

**当前 V0.2.4.1：PARTIAL，等待实机。** 原有97项加新增8项，105项单元测试通过；本地Chromium列表lazy-load及旧回归通过。用户已验证 V0.2.2 在真实 Mac Chrome 完成自动化主链：33 endpoints、39 JSON，文字只覆盖约26.9%；用户另已证明正常滚动列表触发type=4的11:06:32–11:36:31窗口（北京时间）、90条文字；本次自动定位和滚动能否在真实页面推进仍待验证。[V0.2.2 实机基线](docs/V0_2_2_REAL_BASELINE.md)。

V0.1 已由用户在 Mac Chrome、正常登录主播中心的真实复盘页验证安装 / attach / 正文读取 / JSON / ZIP / 当前性能 PASS。用户报告约 463 Network Response、55 JSON、33 Endpoint Group；不会推翻该基线。详见 [实机基线](docs/V0_1_REAL_BASELINE.md)，该结论不等于 V0.2 自动化验收。

## 安装与升级

1. 解压 `Douyin_Live_Review_Probe_V0.2.4.1_Extension.zip`，找到 `extension` 目录，无需 npm 安装或构建。
2. Mac / Windows Chrome：Chrome → 扩展程序 → 管理扩展程序（`chrome://extensions`）→ 开发者模式 → 加载已解压的扩展程序 → 选择 `extension`。
3. Edge：`edge://extensions` → 开发人员模式 → 加载解压缩的扩展 → 选择 `extension`。
4. Chrome/Edge 内核 ≥118，Safari 不支持。固定扩展到工具栏。
5. 更新已有未打包扩展时可先备份 V0.1，把新 extension 文件放入原加载目录，再点击扩展页的「重新加载」。保持加载路径可保留同一个扩展 ID / 本地会话缓存；重新加载会停止在途采集。

旧 V0.1 源码保留在 Git 历史，旧安装包仍在 artifacts/。没有新增权限。

## 自动采集当前场

1. 自行正常登录并进入**当前一场直播复盘**。
2. 点击扩展「自动采集当前直播」。不能与手动采集同时运行。
3. 扩展 attach，确认可见复盘模块，正常刷新当前页一次。请不要在采集中自行切换到另一场直播。
4. 按 DOM 精确控件依次点击：整体数据 → 内容分析 → 营收 → 流量 → 互动指标 → 粉丝 → 文字记录 → 评论 → 礼物 → 关键片段 → 观众分析 → 流量分析。
5. 缺失或歧义控件记录 `SKIPPED_NOT_AVAILABLE`，不猜坐标、不构造跳转 URL、不无限重试。每步使用最短等待、业务网络 quiet 和 DOM 稳定判断；超时记录并继续，错误页面 / 当前场变化则停止。
6. 自动文字主路线只操作经记录行结构确认的列表滚动祖先，以80% clientHeight逐步推进。每次等待Network quiet与真实type=4窗口/DOM进展；拒绝BODY/HTML/MAIN/全页滚动/内容分析大区域。未能唯一定位时如实PARTIAL，不退回猜slider或第一个DIV。
7. 完成后自动 detach，显示 `CURRENT_LIVE_CAPTURE_COMPLETE` 和 `AUTO_CAPTURE_RESULT` 的 PASS / PARTIAL / FAIL。点击「停止自动采集」立即取消后续动作并发起 detach；已发出的同步点击不能撤销。
8. 导出 ZIP，含 `auto_capture_result.json`。当前场 report 只统计本次 run 的捕获证据，旧会话响应不会被当成本场成功。库存仍保留本地当前会话的全部手动/自动响应，metadata.context 可区分 run 和步骤。

自动操作使用合成 DOM click/input/change。真实页面可能要求可信事件，或 DOM 与当前通用选择器不同；本版本不绕过这些限制。选择器集中在 `extension/src/automation/selectors.js`，当前无真实 DOM 快照，不宣称已匹配所有实际页面控件。

## 文字覆盖与评论

`text_coverage` 输出 live_start/end、text_start/end、record_count、coverage_seconds、coverage_ratio、boundary_span_ratio、gap_count 和 status。

- 主播文字记录 `room_stats_content_list` 是用户已确认的结构，跨响应合并并按时间点去重，不重放时间窗口请求。
- 直播边界优先取页面明确标识的开播/下播时间，可用当前 `room_base_v2` / `get_room_info` 响应中明确 start/end 对补充；不使用历史列表或文字窗口的边界冒充整场边界。
- 无法确定整场起止时 `coverage_ratio=null`、status=UNKNOWN，不按 100% 报告。
- 相邻文字时间间隔≤60 秒才计入覆盖；更大的间隔视为未知缺口。只抓到首尾不能伪装为全场覆盖。`boundary_span_ratio` 仅描述跨度，不作为完整性 PASS。
- ≥95% 可标文字覆盖 PASS，低于门槛 PARTIAL。无声时段也可能导致保守低估，不把指标解释为平台内容丢失。
- 文字主路线最多120次增量滚动、连续3次无进展停止，最长约4分钟（每个有界等待可能额外延迟）；不自动播放视频、不修改 video.currentTime、不构造时间窗口 API 请求。

评论依据数组正文结构识别：content/text/comment/message + time/timestamp/contentTime/createTime + 用户字段。输出 `COMMENT_TIMELINE_CANDIDATE`、字段和记录数量，支持非单调 / 两条记录。候选不是最终语义证明，主播话术若有相同结构也可能成为候选；已保存的本次 run 评论结构候选（含预加载）可作为观察证据，不根据未知数字枚举猜测类型。

评论状态：OBSERVED / AVAILABLE_EMPTY / NOT_OBSERVED / NOT_AVAILABLE。AVAILABLE_EMPTY 要求 comments 步骤捕获空 series，且同一 endpoint 的 roomStatsContentType 已由本地会话中真实评论结构证明；未知枚举、不同接口或仅点击成功仍是 NOT_OBSERVED。NOT_AVAILABLE 与可靠 AVAILABLE_EMPTY 不阻塞 PASS；NOT_OBSERVED 保持 PARTIAL，不能推断平台无评论。

## 二次 JSON、历史摘要、安全 Query

- 字符串符合对象/数组 JSON 并 parse 成功时，最多二次解析 3 层，输出 nested_json_detected / nested_json_paths，并分析二次结构。扫描受节点、深度与解析预算限制。
- 保存前先过滤嵌套 JSON 中认证字段；超出解析层数的 JSON 字符串用 `[NESTED_JSON_LIMIT]` 替代，避免保留未审查的深层认证信息。
- `history_list` 仅解析 `HistoryLiveSummary`：明确的起止时间、duration_seconds 和有限数字指标；不点击历史直播、不批量采集。提供 `collectLive('current')` 和显式拒绝执行的 `collectRecentLives` 接口，V0.3 实现未启用。
- 通用 safe_query 仍只允许人工审核的精确枚举，设置初始 `{}`。V0.2.3 起另有仅限 room_stats_content_list 的 safe_business_context：自动保存长度≤32的 ASCII 安全枚举 roomStatsContentType，以及严格验证后的 startTime/endTime ISO 时间。未带时区的墙上时间按中国标准时间转换，支持10/13位 epoch；非法日期、时区和重复键拒绝，原始 Query 不保存。roomID 等身份值永远禁止。

人工审核后可填写：

```json
{"metric_name":["pcuTotal"],"data_type":["revenue","traffic"]}
```

未知值、重复参数和任何 room_id / anchor_id / uid / token / signature / session / device_id 等字段始终不保留 query value。上述示例是格式示范，不声称对应真实页面枚举。

## 手动模式、缓存与导出

手动开始/停止、接口详情、Endpoint Grouping、Schema、时间候选、文字时间轴、版本正文预览（4096 字符）、本地缓存与 ZIP 导出全部保留。只保存用户允许域名的业务正文，默认 anchor.douyin.com；埋点列表优先于业务列表。

- host+path+method 分组；不保存 URL query 原始值、fragment、URL 用户名/密码、headers 或 postData。
- 同内容 SHA-256 去重，不同内容独立版本，每组最近 1000 次 metadata；各 Schema 版本及按本次 run 的 schema 可查。
- ≤5 MiB 正文正常保存；5–20 MiB 默认 metadata/schema，可停止后允许保存；>20 MiB 不保存正文，CDP 提供正文时分析 schema。总正文上限 100 MiB，2000 endpoints，8 个在途正文。
- 图片/媒体/静态/埋点/范围外响应不取正文。JSON 扫描最多 200000 节点/40 层，截断明确标记。
- 缓存使用已有 V0.1 IndexedDB，不新增正式数据库，不自动恢复采集。浏览器重启中断的自动任务标 PARTIAL。清空停止且删除插件当前缓存，已导出 ZIP 自行删除。
- ZIP 为系统可解压的 STORE 格式，不支持 ZIP64。新增 auto_capture_result.json、history_live_summaries.json；其余 session、api_inventory、responses、schemas 保持。

## 权限与安全

Manifest 仍仅 `debugger` / `activeTab`：前者读取指定 tab 响应并做有限 DOM 操作/当前页正常刷新，后者读取用户选择的标签页 URL/ID。无 all_urls、host_permissions、tabs、scripting、storage 或 downloads 权限。不注入常驻 content script，不 hook fetch/XHR。

CDP 命令白名单：Network.enable、Network.getResponseBody、Page.enable、Runtime.evaluate（仅打包的 DOM 操作函数）、Page.reload（当前页正常刷新）。没有业务 API 构造、重放、认证访问或上传。详见 [PRIVACY.md](PRIVACY.md)。

## 测试与结构

Node.js 20+，零第三方运行依赖：

```sh
npm test
npm run test:security
npm run test:automation-browser
```

最后一项需要 Linux /usr/bin/chromium、openssl 和允许本地端口的环境；脚本自动生成/删除临时 Mock 证书，模拟域名只映射到 127.0.0.1。它直接测试真实 Chromium DOM 与本地正常前端响应，不安装扩展，不等于真实 chrome.debugger 扩展自动化验收。

- background/：保持 V0.1 网络响应链路。
- automation/：状态机、页面控制、选择器、导航、等待及本场证据分析。
- lib/：脱敏、Query 策略、Schema、嵌套 JSON、时间/评论候选、覆盖率、分组和导出。
- popup/、storage/：界面及现有缓存。
- mocks/、tests/、docs/：虚构样本、自动测试、验证与验收文档。

[测试报告](docs/TEST_RESULTS.md)区分已验证的 V0.2.2 用户实机基线、本地 Mock 与待验证的 V0.2.4.1 列表机制。下一步按[实机验收清单](docs/REAL_PAGE_CHECKLIST.md)回传真实文字窗口与控件证据。

## 诊断与分享

- 兼容回归的text_loading.attempts（生产主链改用transcript_scroll_attempts）：reset/advance 的方法、状态、记录前后数、新增数、room_stats_content_list 响应前后数/增量、DOM签名是否变化、覆盖率前后值与耗时。一次效果等待默认最多1200ms，所有动作仍受次数/时长限制。响应计数取本 run 已记录 metadata，包含正文读取失败的响应。
- text_control_diagnostic：最多扫描有界区域600个结构节点、保存80个候选；只输出允许的属性/数字/白名单标签。任意 aria-label/title、话术、昵称、DOM对象与随机长 class hash 不保存。未识别专属面板时仅生成有限祖先区域的结构诊断，不据此盲目操作。
- page_diagnostic_initial：reload 后 DOM 初步可用时；page_diagnostic_ready：React证据等待及 DOM稳定后。兼容 page_diagnostic 指向 ready（初始失败时指向 initial）。
- modules：PREFETCH_OBSERVED / STEP_OBSERVED / STEP_AND_PREFETCH_OBSERVED / NOT_OBSERVED，附两类端点证据。fans 导航歧义仍安全跳过，fans_group_pie 预加载不写成缺失数据。
- capture_loss_count 保留总数；四个核心端点丢正文计 core_capture_loss_count 并影响 PASS，其他计 aux_capture_loss_count / capture_warnings，仅辅助丢失不单独降级。文字不足95%、核心缺失或评论未知仍如实 PARTIAL。

「导出诊断包 ZIP」保留本地已去认证的业务数据；「导出可分享诊断包」在独立快照中额外删除 user_id/userID/uid/sec_uid/secUid/sec_user_id/anchor_id/anchorID、nickname/screen_name、avatar及其URL字段、明确账号对象的name，包含嵌套JSON及Schema身份路径。不会修改IndexedDB或本地原始导出，分享目录带 _ShareSafe 与 EXPORT_MODE.json。分享正文改变后不沿用原正文 hash，大小按输出重算。

**可分享包仍可能包含主播话术及经营指标，不是完全匿名的公共数据包。** 无法自动识别任意自由文本中的身份信息；分享前请复核业务内容。

## V0.2.4.1 transcript 主链

用户真实手动滚动触发room_stats_content_list，type=4，窗口2026-09-30T03:06:32Z–03:36:31Z，90条，正文11:06:35–11:36:17（中国标准时间），中位间隔20秒。它证明列表滚动会推进窗口，不证明本扩展已自动定位真实列表。

findTranscriptRows按合法YYYY-MM-DD HH:mm:ss（含React分拆子节点）、至少3条递增记录、附近非空正文及重复兄弟结构识别；全文只用于内存判断，不输出。最近的可滚动祖先必须包含该组记录，有足够scrollHeight且overflowY为auto/scroll/overlay或可验证scrollTop变化；排除主页面/大内容区域，多个候选拒绝猜测。结构扫描最多2000节点、500兄弟、7层滚动祖先。

transcript_scroll_attempts保存滚动位置/尺寸、可见首末时间、type4响应计数、真实前后窗口、记录增量、覆盖率与状态。只有新的type=4响应且start/end至少一项改变才WINDOW_ADVANCED/TRANSCRIPT_WINDOW_ADVANCED；重复窗口或其它type不能冒充推进。未到lazy阈值的小步物理滚动允许有限继续。DOM进展但Network无变化也可继续，不将DOM文字计入正式数据；到结束仍缺捕获则PARTIAL_CACHED_BEFORE_CAPTURE。

full_transcript_timeline仅从已保存的type4、经连续口播结构证实的Response合并content/contentTime，按时间去重；输出window_count/record_count/first_time/last_time/coverage_ratio。第一窗口须覆盖live_start附近（60秒容差），否则TRANSCRIPT_START_WINDOW_MISSING；窗口顺序及相邻时间范围必须连续。只有真实窗口推进、记录数>90、覆盖≥95%、minute_trend正常及core loss为0才可主链PASS。评论可独立NOT_OBSERVED，不阻塞满足上述证据的主链；不推测type1/type2。

type4不是盲目硬编码成口播：正文须有合法content/contentTime、单一说话人、占位userID/空secUid、递增且中位间隔15–25秒，才SPEECH_TRANSCRIPT_CANDIDATE；不增加comment_timeline_count。room_stats_type_evidence保留结构证据，type1/type2仍UNKNOWN。旧slider/分页接口仅保留兼容和回归，自动主链不使用它们兜底。
