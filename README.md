# Douyin Live Review Probe V0.2.3

V0.2.3 补齐真实文字窗口的逐动作证据、安全业务窗口参数与控件指纹，并修复预加载归属、丢包分级和评论状态；新增独立「导出可分享诊断包」。V0.2.2 的 reload 等待、单次初始化和已验证 Network 采集链路保留。详见 [验证报告](docs/TEST_RESULTS.md)。

抖音主播中心直播复盘数据探针。保留 V0.1 的 Manifest V3 / chrome.debugger / Network.responseReceived / Network.getResponseBody、本地诊断缓存、手动模式和 ZIP 导出，新增「自动采集当前直播」。无 AI、主动业务 API 请求、重放、自动登录、批量历史采集或云上传。

**当前 V0.2.3：PARTIAL，等待实机。** 本地83项单元测试及真实 Chromium 的分页/role slider Mock 通过。用户已验证 V0.2.2 在真实 Mac Chrome 完成自动化主链：33 endpoints、39 JSON，文字只覆盖约26.9%；本次新增机制能否推进真实窗口仍待验证。[V0.2.2 实机基线](docs/V0_2_2_REAL_BASELINE.md)。

V0.1 已由用户在 Mac Chrome、正常登录主播中心的真实复盘页验证安装 / attach / 正文读取 / JSON / ZIP / 当前性能 PASS。用户报告约 463 Network Response、55 JSON、33 Endpoint Group；不会推翻该基线。详见 [实机基线](docs/V0_1_REAL_BASELINE.md)，该结论不等于 V0.2 自动化验收。

## 安装与升级

1. 解压 `Douyin_Live_Review_Probe_V0.2.3_Extension.zip`，找到 `extension` 目录，无需 npm 安装或构建。
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
6. 文字记录只在有界文字区域内操作 input range、role/Ant slider、分页或滚动。slider 使用 focus 与 Home / ArrowRight（垂直时 ArrowDown）/ PageDown / End 键盘事件。每次检查响应和记录增量，无效机制记录 NO_NETWORK_EFFECT 并转试下一种；未识别到控件时如实报告 PARTIAL。
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
- 每次文字最多 120 个前进动作、20 个回退动作、同一机制连续 3 次无新时间点则转试下一种，完全无 Network/记录效果则立即停止该机制、文字阶段最长约 4 分钟（含每个有界等待可能额外延迟）；不自动播放视频、不修改 video.currentTime、不构造时间窗口 API 请求。

评论依据数组正文结构识别：content/text/comment/message + time/timestamp/contentTime/createTime + 用户字段。输出 `COMMENT_TIMELINE_CANDIDATE`、字段和记录数量，支持非单调 / 两条记录。候选不是最终语义证明，主播话术若有相同结构也可能成为候选；已保存的本次 run 评论结构候选（含预加载）可作为观察证据，不根据未知数字枚举猜测类型。

评论状态：OBSERVED / AVAILABLE_EMPTY / NOT_OBSERVED / NOT_AVAILABLE。AVAILABLE_EMPTY 要求 comments 步骤捕获空 series，且同一 endpoint 的 roomStatsContentType 已由本地会话中真实评论结构证明；未知枚举、不同接口或仅点击成功仍是 NOT_OBSERVED。NOT_AVAILABLE 与可靠 AVAILABLE_EMPTY 不阻塞 PASS；NOT_OBSERVED 保持 PARTIAL，不能推断平台无评论。

## 二次 JSON、历史摘要、安全 Query

- 字符串符合对象/数组 JSON 并 parse 成功时，最多二次解析 3 层，输出 nested_json_detected / nested_json_paths，并分析二次结构。扫描受节点、深度与解析预算限制。
- 保存前先过滤嵌套 JSON 中认证字段；超出解析层数的 JSON 字符串用 `[NESTED_JSON_LIMIT]` 替代，避免保留未审查的深层认证信息。
- `history_list` 仅解析 `HistoryLiveSummary`：明确的起止时间、duration_seconds 和有限数字指标；不点击历史直播、不批量采集。提供 `collectLive('current')` 和显式拒绝执行的 `collectRecentLives` 接口，V0.3 实现未启用。
- 通用 safe_query 仍只允许人工审核的精确枚举，设置初始 `{}`。V0.2.3 另有仅限 room_stats_content_list 的 safe_business_context：自动保存长度≤32的 ASCII 安全枚举 roomStatsContentType，以及严格验证后的 startTime/endTime ISO 时间。未带时区的墙上时间按中国标准时间转换，支持10/13位 epoch；非法日期、时区和重复键拒绝，原始 Query 不保存。roomID 等身份值永远禁止。

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

[测试报告](docs/TEST_RESULTS.md)区分已验证的 V0.2.2 用户实机基线、本地 Mock 与待验证的 V0.2.3 控件机制。下一步按[实机验收清单](docs/REAL_PAGE_CHECKLIST.md)回传真实文字窗口与控件证据。

## V0.2.3 诊断与分享

- text_loading.attempts：reset/advance 的方法、状态、记录前后数、新增数、room_stats_content_list 响应前后数/增量、DOM签名是否变化、覆盖率前后值与耗时。一次效果等待默认最多1200ms，所有动作仍受次数/时长限制。响应计数取本 run 已记录 metadata，包含正文读取失败的响应。
- text_control_diagnostic：最多扫描有界区域600个结构节点、保存80个候选；只输出允许的属性/数字/白名单标签。任意 aria-label/title、话术、昵称、DOM对象与随机长 class hash 不保存。未识别专属面板时仅生成有限祖先区域的结构诊断，不据此盲目操作。
- page_diagnostic_initial：reload 后 DOM 初步可用时；page_diagnostic_ready：React证据等待及 DOM稳定后。兼容 page_diagnostic 指向 ready（初始失败时指向 initial）。
- modules：PREFETCH_OBSERVED / STEP_OBSERVED / STEP_AND_PREFETCH_OBSERVED / NOT_OBSERVED，附两类端点证据。fans 导航歧义仍安全跳过，fans_group_pie 预加载不写成缺失数据。
- capture_loss_count 保留总数；四个核心端点丢正文计 core_capture_loss_count 并影响 PASS，其他计 aux_capture_loss_count / capture_warnings，仅辅助丢失不单独降级。文字不足95%、核心缺失或评论未知仍如实 PARTIAL。

「导出诊断包 ZIP」保留本地已去认证的业务数据；「导出可分享诊断包」在独立快照中额外删除 user_id/userID/uid/sec_uid/secUid/sec_user_id/anchor_id/anchorID、nickname/screen_name、avatar及其URL字段、明确账号对象的name，包含嵌套JSON及Schema身份路径。不会修改IndexedDB或本地原始导出，分享目录带 _ShareSafe 与 EXPORT_MODE.json。分享正文改变后不沿用原正文 hash，大小按输出重算。

**可分享包仍可能包含主播话术及经营指标，不是完全匿名的公共数据包。** 无法自动识别任意自由文本中的身份信息；分享前请复核业务内容。
