# V0.1 验证结果

DOUYIN_LIVE_REVIEW_PROBE_V0_1 = **PARTIAL**

执行日期：2026-10-07。环境：Linux / Node.js v24.19.0 / Chromium 151.0.7922.173。未访问真实抖音账号或接口。

## IMPLEMENTATION

已创建可直接加载的 Manifest V3 源码目录、模块化后台、Popup、响应分类、递归脱敏、Schema、时间候选、文本时间轴、按 host/path/method 分组、内容 hash 版本管理、IndexedDB、ZIP 导出、Mock 和中文安装/隐私说明。

仅 debugger + activeTab 两项权限。无构建步骤、第三方运行依赖或服务器。源代码在 extension/；测试与文档在 tests/、mocks/、docs/。

## TESTS

`npm test`：**24 PASS，0 FAIL**。

- 核心 18 项：JSON / text / base64 / binary，URL query/value/userinfo 去除，递归敏感字段和文本过滤，数组与非首条字段并集，60 秒规律，content + contentTime 和 20 秒规律，不依赖时间字段名，无序与非时间数值排除，静态/图片/媒体/埋点/范围外过滤，可配置规则，5 / 20 MiB 边界，分组/重复去重/不同内容版本，100 MiB 容量，capture → inventory → ZIP，权限白名单。
- 后台 Mock 6 项：开始与 loadingFinished 取正文、本地保存与跳过媒体；正文不可读保留元数据；立即停止与停止后忽略事件；错误域名拒绝与清空；顶层页面导航自动 detach；attach 过程中停止取消开始。
- Python `zipfile -t work/mock-diagnostic.zip`：完整性 PASS。
- 所有扩展 JS `node --check`：语法 PASS。

上述结论为 **MOCK VERIFIED**。后台测试使用 chrome API / IndexedDB 的测试替身，不是实际浏览器 chrome.debugger 集成验证。完整测试输出附在本目录。

浏览器测试 `npm run test:browser`：**BLOCKED / NOT VERIFIED**。使用 Chromium 本地 HTTPS 模拟页面及回环地址映射尝试加载扩展，浏览器返回：

```text
Loading of unpacked extensions is disabled by the administrator.
```

命令行加载也未生成扩展后台目标。未修改管理员策略，未尝试真实抖音页面。此结论表示环境阻碍验证，不证明扩展能安装，也不证明源码安装失败。

## SECURITY_CHECK

源码检查和 Mock 导出检查 **PASS / MOCK VERIFIED**：

- 14 个扩展文件无 fetch / XMLHttpRequest / WebSocket / sendBeacon、主动接口加载、重放命令、远程脚本或私钥。
- 权限与模块引用检查 PASS。
- Mock 注入的认证 sentinel 和 query value 没有出现在本地会话 / 导出内容。
- headers / postData / 原始 URL 不写入本地会话；两条核心响应保持业务字段及时间结构。
- 交付文件不含真实账号数据、登录凭证、Mock 开发私钥或浏览器 profile。测试中出现的 FAKE / MOCK / NEVER_PERSIST 是虚构安全样本。

仅源码与已知样本验证，不能保证任意真实自由文本中的未标注凭证一定可识别。README 的隐私说明包含 Cookie / Authorization / Token 等字样，不代表保存了对应字段或值。

## REAL_PAGE_VERIFICATION

**NOT VERIFIED ON REAL DOUYIN PAGE**

| 用户 PASS 门槛 | 当前证据 |
| --- | --- |
| 1 Chrome / Edge 安装 | NOT VERIFIED；本环境管理员策略阻止安装 |
| 2 实际 attach | MOCK VERIFIED；浏览器 / 抖音未验证 |
| 3 页面无明显性能影响 | NOT VERIFIED |
| 4 minute_trend 真实正文 | Mock 模拟已读；真实页面未验证 |
| 5 data.series / 字段 / 分钟规律 | MOCK VERIFIED |
| 6 room_stats_content_list 真实正文 | Mock 模拟已读；真实页面未验证 |
| 7 content + contentTime 候选 | MOCK VERIFIED |
| 8 未知业务 JSON | MOCK VERIFIED |
| 9 api_inventory.json | MOCK VERIFIED |
| 10 ZIP 导出 | ZIP 生成 / 解压 PASS；实际 Popup 下载未验证 |
| 11 ZIP 不含认证数据 | 已知敏感样本 PASS；真实正文未验证 |
| 12 无真实账号凭证 | 本交付源码与 Mock 检查 PASS，没有输入真实凭证 |
| 13 自动测试 | 24 PASS，0 FAIL；浏览器集成 BLOCKED |

## KNOWN_LIMITATIONS

详见 README：Worker / OOPIF 子目标未递归 attach、CDP 缓冲与正文获取失败、100 MiB 正文上限及队列 cap、自由文本规则脱敏边界、JSON 分析截断和时间候选漏报、真实页面性能未测。大正文可能只能保留 metadata，浏览器未提供 body 时不能生成 schema。只接收开始后自然产生的响应。

## NEXT_STEP

在允许未打包扩展的 Chrome / Edge 上按 [真实页面验收清单](REAL_PAGE_CHECKLIST.md) 验收；观察真实业务域名、两条核心响应与页面性能。完成全部门槛后再将结果升级为 PASS，不扩大到 AI 复盘。
