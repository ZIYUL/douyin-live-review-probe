# Douyin Live Review Probe V0.2.2

V0.2.2 仅修复 reload 后 DOM 生命周期竞态：轻量 readiness、每100ms有界等待、异步 React 渲染等待、空 body 保护与单次初始化。临时执行上下文错误可在等待窗口内重试；永久错误保留安全 dom_action/exception_type/位置，不保存原始异常。V0.2.1 的页面身份和精确控件逻辑保持。详见 [补丁验证报告](docs/TEST_RESULTS.md)。

抖音主播中心直播复盘数据探针。保留 V0.1 的 Manifest V3 / chrome.debugger / Network.responseReceived / Network.getResponseBody、本地诊断缓存、手动模式和 ZIP 导出，新增「自动采集当前直播」。无 AI、主动业务 API 请求、重放、自动登录、批量历史采集或云上传。

**当前 V0.2.2：PARTIAL。** 自动测试与真实 Chromium DOM 的本地 Mock 自动操作已验证；真实抖音 V0.2 自动化：**NOT VERIFIED ON REAL DOUYIN PAGE**。

V0.1 已由用户在 Mac Chrome、正常登录主播中心的真实复盘页验证安装 / attach / 正文读取 / JSON / ZIP / 当前性能 PASS。用户报告约 463 Network Response、55 JSON、33 Endpoint Group；不会推翻该基线。详见 [实机基线](docs/V0_1_REAL_BASELINE.md)，该结论不等于 V0.2 自动化验收。

## 安装与升级

1. 解压 `Douyin_Live_Review_Probe_V0.2.2_Extension.zip`，找到 `extension` 目录，无需 npm 安装或构建。
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
6. 文字记录仅操作**专属文字面板**内的前后分页、滚动或明确标识的时间范围 input。尝试回退到起点再向后加载；未识别到控件时如实报告 PARTIAL。
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
- 每次文字最多 120 个前进动作、20 个回退动作、连续 3 次无新时间点停止、文字阶段最长约 4 分钟（含每个有界等待可能额外延迟）；不自动播放直播录像或无限拖动。

评论依据数组正文结构识别：content/text/comment/message + time/timestamp/contentTime/createTime + 用户字段。输出 `COMMENT_TIMELINE_CANDIDATE`、字段和记录数量，支持非单调 / 两条记录。候选不是最终语义证明，主播话术若有相同结构也可能成为候选；自动结果只把评论步骤实际收到的候选作为评论观察证据。

不存在评论控件时显示 NOT AVAILABLE；存在控件但没有收到正文显示 NOT OBSERVED，不能证明平台不存在历史评论。无评论实证时整体结果保守为 PARTIAL。

## 二次 JSON、历史摘要、安全 Query

- 字符串符合对象/数组 JSON 并 parse 成功时，最多二次解析 3 层，输出 nested_json_detected / nested_json_paths，并分析二次结构。扫描受节点、深度与解析预算限制。
- 保存前先过滤嵌套 JSON 中认证字段；超出解析层数的 JSON 字符串用 `[NESTED_JSON_LIMIT]` 替代，避免保留未审查的深层认证信息。
- `history_list` 仅解析 `HistoryLiveSummary`：明确的起止时间、duration_seconds 和有限数字指标；不点击历史直播、不批量采集。提供 `collectLive('current')` 和显式拒绝执行的 `collectRecentLives` 接口，V0.3 实现未启用。
- 默认仍删除全部 query value。只有内置许可字段 data_type / metric_name / roomStatsContentType **及用户明确填写的精确枚举值**才可保留。设置初始 `{}`。

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

[测试报告](docs/TEST_RESULTS.md)区分用户报告的 V0.1 实机基线、本地 Mock 和未验证的 V0.2 真实页面操作。下一步仅按[实机验收清单](docs/REAL_PAGE_CHECKLIST.md)验证 V0.2，不开发批量历史采集或 AI。
