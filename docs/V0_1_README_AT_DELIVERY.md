# Douyin Live Review Probe V0.1

抖音主播中心直播复盘数据探针。诊断型工具：仅监听用户选择的标签页已经正常收到的 Response，分析结构并导出本地 ZIP。无主动抖音 API 请求、请求重放、账号管理、AI 分析或上传。

当前交付状态：**DOUYIN_LIVE_REVIEW_PROBE_V0_1 = PARTIAL**。24 项自动测试 PASS / MOCK VERIFIED；此环境的 Chromium 管理员策略禁止安装未打包扩展，安装与真实 chrome.debugger 链路未能完成实机验证。抖音真实页面：**NOT VERIFIED ON REAL DOUYIN PAGE**。详见 [测试报告](docs/TEST_RESULTS.md)。

## 安装（Mac / Windows，Chrome / Edge）

1. 解压源码交付包；找到其中的 `extension` 目录，无需 npm 安装或构建。
2. Mac Chrome：Chrome → 扩展程序 → 管理扩展程序（或打开 `chrome://extensions`）。
3. 开启「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择 `extension` 目录，不是源码包根目录。
5. 将扩展固定到工具栏。Windows Chrome 操作相同。
6. Edge 打开 `edge://extensions`，开发人员模式 → 加载解压缩的扩展 → 选择 `extension`。

要求 Chromium 内核版本 ≥118。Safari 不支持。本版本不发布 Chrome Web Store。如果浏览器组织策略禁止未打包扩展，需要在允许开发者扩展的浏览器环境安装。

## 使用

1. 自行正常登录 `https://anchor.douyin.com`，打开自己有权限的直播复盘。
2. 点击扩展工具栏图标 →「开始采集当前标签页」。浏览器会显示调试权限提示条。
3. 手动刷新页面，或切换正常复盘面板、指标、文字记录。开始前收到的正文无法补采；扩展不替你刷新、点击或翻历史。
4. 查看统计和接口列表，展开接口查看 Host / Path / Method、调用次数、MIME、每次响应状态、结构、数组字段、时间序列、文本时间轴及每个版本的 前 4096 字符预览。
5. 点击「停止采集」立即发起 detach。采集时关闭 Popup 不会停止；浏览器调试提示条、打开 DevTools、关闭标签页或离开主播中心可能导致 detach。
6. 点击「导出诊断包 ZIP」，下载到浏览器默认下载位置。建议先停止，得到稳定快照；未停止时导出仅覆盖当时已处理完成的 Response。
7. 「清空本次采集」停止并删除扩展内当前缓存；不会删除已导出的文件。跨多个直播复盘采集前建议先清空，避免不同场次混合。

默认业务正文范围只包含 `anchor.douyin.com`。若当前页面确实使用其他必要业务域名，停止后在设置中逐行加入精确域名；不支持通配符。埋点忽略列表可编辑，优先于业务允许列表。不要添加与复盘无关的域名。

## 保存和导出

- IndexedDB 存储当前会话，浏览器重启后可查看、导出；采集必须再次主动开始，不自动 attach。
- Endpoint 按 `host + path + method` 分组，不保留 URL query 值、fragment、URL 用户名或密码。
- 可保留不敏感 query key 名；认证参数名称也被过滤。
- 正文先解析 / 脱敏，再计算 SHA-256 和本地保存；相同内容只留一份和重复次数，不同内容保留独立版本。每组保留最近 1000 次调用元数据及删除计数。
- 每个结构版本保留 Schema Summary。结构扫描包含数组字段并集，类型扫描最多 200000 节点、40 层，截断标记 `analysis_truncated`。库存的快速摘要对应最后一次分析，完整结构版本位于 schemas 文件。
- ≤5 MiB 正常保存；5–20 MiB 默认只保留 metadata + schema，并标 `LARGE_RESPONSE`，可在停止后勾选允许保存；>20 MiB 只留 metadata + schema（前提 CDP 能返回正文）。限制按解码后正文 UTF-8 字节计算。
- 会话正文最大 100 MiB；最多 2000 个 endpoint；正文待处理队列最多 8 个；超限保留可用元数据并标记。缓存空间不足或浏览器无法提供正文，会显示失败标记或通用错误，绝不重放请求。
- 图片、媒体、静态、埋点和范围外响应只计数，永不调用 getResponseBody。
- 标准 JSON MIME / plain text 优先处理；XHR / Fetch 即使 MIME 不标准也尝试 JSON。二进制或非 UTF-8 base64 不保存正文。
- 无时区 `YYYY-MM-DD HH:mm:ss` 按中国标准时间解释；支持 epoch 秒 / 毫秒。至少 3 个有效点、有效比例≥80%、单调非递减且有正间隔才标候选；不根据接口名解释业务意义。

ZIP（无压缩 STORE，可由系统解压）：

```text
DouyinProbe_YYYYMMDD_HHMMSS/
  README.txt
  session.json
  api_inventory.json
  responses/<endpoint>_<编号>[_v版本].json 或 .txt
  schemas/<endpoint>_<编号>.schema.json
```

编号避免跨域、不同方法和路径同名冲突。内容版本元数据包含对应文件、大小、hash、次数和最后时间。Schema 键为内部结构 hash；不包含认证信息。导出目录时间使用 UTC，详情中的时间为 ISO UTC。

## 权限（全部）

| 权限 | 原因 |
| --- | --- |
| `debugger` | 主动 attach 用户选择的单个标签页，使用 CDP `Page.enable`（导航范围检测） / `Network.enable` / `Network.getResponseBody` 读取该页已接收正文。Chrome 的权限提示范围较宽，代码执行范围限制为选中的主播中心标签页。 |
| `activeTab` | 用户点击扩展时获取当前标签页 URL / ID，校验主播中心地址。 |

无 `<all_urls>`、无 `host_permissions`、无 `tabs` 权限、无 `storage` / `downloads` 权限。CDP debugger 不需要 host permission；IndexedDB 不需要 storage permission；ZIP 用 Popup 的 Blob + 下载链接，不需要 downloads permission。不注入 content script，不 hook fetch/XHR。

隐私规则与边界见 [PRIVACY.md](PRIVACY.md)。

## 开发与测试

Node.js 20+，无第三方依赖。

```sh
npm test
```

24 项核心 / 后台 Mock 自动测试。`mocks/` 只有虚构数字与话术；不依赖抖音账号。测试输出示例 ZIP 位于 `work/mock-diagnostic.zip`（仅开发产物）。

浏览器 Mock 测试（仅开发测试程序使用 fetch 请求本地模拟页面；扩展无 fetch）：

```sh
mkdir -p work
openssl req -x509 -newkey rsa:2048 -nodes -keyout work/mock.key -out work/mock.crt -days 1 -subj /CN=anchor.douyin.com
npm run test:browser
```

需要 Linux `/usr/bin/chromium`、允许本地端口与未打包扩展的环境。测试把模拟域名映射到 127.0.0.1:9443，仅本地 HTTPS；开发证书及浏览器 profile 不在交付包中。本次浏览器测试被管理员策略阻止，不能将其称为 PASS。

## 已知限制与下一步

- 未完成真实 Chrome / Edge、Mac / Windows 的安装验收和抖音页面验收。
- 只启用该 tab 的 CDP Network，可能覆盖 Service Worker 返回给页面的响应；没有递归 attach 独立 Worker / OOPIF 子目标，不能保证捕获全部子目标网络。
- DevTools 和其他 debugger 客户端可能中断采集；关闭浏览器、缓存回收、超大正文、响应过快可能导致正文不可读。CDP 缓冲为单响应 25 MiB / 总量 80 MiB，>缓冲的正文不能分析 schema。
- 不支持 ZIP64；会话 cap 控制导出规模。大量数据 JSON.parse、哈希、IndexedDB 会消耗内存 / CPU；未做真实页面性能测试。
- 文本与时间检测是候选描述；2 点、倒序、无序、非常规日期格式或分页跨块数据可能漏报，未合并跨响应时间轴。
- 规则脱敏无法证明任意自由文本中不存在未标注的凭证，不能把 Mock 的安全结论当作真实数据零泄露证明。

下一步先完成 [真实验收清单](docs/REAL_PAGE_CHECKLIST.md)，核实 minute_trend / room_stats_content_list 正文和页面性能；再基于观察结果完善必要业务域名和子目标覆盖。AI 复盘仍不在 V0.1 范围。
