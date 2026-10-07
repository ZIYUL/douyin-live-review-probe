# 隐私与本地数据边界

扩展只在用户点击「开始采集当前标签页」后 attach，经 HTTPS + 精确 host 校验为 anchor.douyin.com 的一个标签页。停止立即发起 detach；不自动登录，不主动发起抖音接口请求，不重放，不访问其他账号，不上传、不使用外部 SDK 或服务器。

## 持久化前的数据处理

CDP 必须在内存中短暂接收原始 Response 才能脱敏，原始正文不写入 IndexedDB。请求事件仅提取 HTTP method，不复制 headers / postData；响应事件仅提取脱敏 host/path/query key、MIME/type/status、时间和大小，不复制 headers、账号信息或请求正文。不存储完整 URL、完整 HAR 或 cURL。

JSON 递归删除名称包含 Cookie、Authorization、Token、密码、验证码、secret、credential、signature、session ID 等的字段；字符串剥除 URL 的 query / userinfo，屏蔽 Bearer、JWT、标记的认证 key=value 和长十六进制值。纯文本使用相同字符串规则。脱敏后的正文才用于分析、hash、本地保存与 UI 展示。媒体永远不读正文。

自由文本、任意字段名、URL path 中未标记的字符串无法通过通用规则保证绝对识别。脱敏可能漏掉未标注凭证，或误删业务里的 token 字段 / hash。Mock 导出检查只证明测试样本未泄漏，真实账号正文未在此环境验证。分享 ZIP 前应人工检查；业务昵称、话术、直播指标仍可能属于个人 / 商业数据，V0.1 不自动匿名化这些业务字段。

## 权限（Manifest 的全部权限）

- `debugger`：仅主动选择的主播中心标签页，读取已经正常收到的 Network Response。只允许 `Page.enable`（导航范围检测）、`Network.enable` 和 `Network.getResponseBody` 命令，后者是读取 CDP 已有响应缓冲，不发起 HTTP。
- `activeTab`：用户点扩展时读取当前标签页 URL / ID 作范围校验。

没有 host_permissions / all_urls / tabs / downloads / storage。IndexedDB 和 Blob 下载链接无额外权限。权限 API 的技术能力大于本扩展实际使用范围，以源码白名单及用户选择约束。

## 保存、导出与删除

数据保存在当前浏览器 profile 的扩展 IndexedDB，只保留当前会话。用户明确导出才生成 ZIP；不发送到任何网络目的地。卸载扩展或「清空本次采集」删除插件内缓存；用户下载的 ZIP 需自行删除。数据未做额外加密，具有本机 / profile 访问权者可能访问，不使用 Chrome sync。

默认 ≤5 MiB 正文保存，5–20 MiB 需用户开启设置，>20 MiB 不保存正文；总正文上限 100 MiB。请求/响应 headers 不落盘，错误只存通用类别，不持久化可能含完整 URL 的浏览器错误原文。

浏览器调试权限提示条由 Chrome/Edge 管理。Popup 关闭不代表停止，使用「停止采集」或浏览器「取消调试」。再次启动浏览器不自动 attach。V0.1 已由用户实机验证；V0.2.2 自动化主链已由用户实机验证；V0.2.3 新机制等待实机。

## V0.2 增补（保持 V0.1 权限与本地原则）

V0.1 用户实机确认安装、采集和 ZIP PASS；V0.2.2 真实自动化主链已由用户确认，文字覆盖仍为部分；V0.2.3 的新增控件机制未实机验证。

用户主动点击「自动采集当前直播」后，额外通过 CDP Runtime.evaluate 执行扩展打包的有限 DOM 控件操作，通过 Page.reload 正常刷新同一页一次；不执行用户传入脚本、不读 document.cookie、localStorage 认证项、页面全局登录对象或请求 headers。调试命令白名单新增这两项，仍无 Network 请求构造/重放。

仅使用 DOM 精确选择器、可见文字、既有 UI 点击、专属文字面板分页/滚动/时间滑块。不点历史直播条目、不批量翻历史、不自动登录。当前场 query 标识仅短暂用于内存中的场次变化守卫，既不加入 report，也不写本地缓存。报告记录随机 run_id、模块步骤、时间与统计，可区分本次采集证据。

默认仍不保存 query value。配置仅允许人工审核的 data_type / metric_name / roomStatsContentType 精确枚举，未知值、重复 query、身份/认证字段强制忽略。配置初始 {}，不推断 room_id、uid、session 等为安全字段。

字符串 JSON 在正文落盘前最多解析3层并递归清除认证字段；超层 JSON 字符串替换为 [NESTED_JSON_LIMIT]。评论昵称等仍属于诊断业务正文，V0.2 无正式数据库、不新增身份存储系统，也不承诺匿名化全部业务正文。历史摘要只含明确时间与有限数值指标，不含历史身份参数。

停止取消后续动作并发起 detach；已经发出的同步页面动作不能撤销。自由文本脱敏边界仍存在，分享 ZIP 前须人工复核。无外部服务器、上传、AI、定时后台抓取或 Chrome sync。

V0.2.2 reload readiness 只返回 hostname、脱敏 pathname、has_document、has_body、ready_state、route_match 和状态。错误诊断仅保存动作名、异常类型及可选行列号；不保存原始异常描述、页面正文、Query 值、Cookie、Token 或 DOM 对象。直播关联键仍仅在运行内用于防止跨场误操作。

## V0.2.3 增补

仅 room_stats_content_list 可额外保存 safe_business_context：roomStatsContentType 必须是≤32字符的安全短枚举；startTime/endTime 必须合法并统一ISO时间，原始Query值不保存。roomID、anchorID、uid、sec_uid、token、signature、a_bogus、commonParams、device_id、session、cookie、authorization 不属于许可字段。通用 safe_query 策略保持。

文字动作诊断只含枚举、数量、比例、耗时、签名变化布尔值。结构指纹仅在文字区域或最多4层有界祖先内扫描，最多600节点/80候选，属性自由文本只保存明确白名单标签；不保存话术、评论、昵称、任意 DOM 文本或 DOM 对象。slider 只发正常键盘UI事件，不能自动播放视频、改视频时间或发送业务请求。

本地导出保持已去认证的原业务数据。可分享导出使用独立克隆，额外删除指定账号ID、昵称、头像字段及明确账号对象name；递归处理嵌套JSON和Schema字段路径，不改缓存。主播话术、时间、指标保留，因此可分享包不是完全匿名的公共数据包。任何未知身份字段或自由文本无法保证自动识别，用户分享前仍需复核。所有导出均为本地Blob，不上传。

## V0.2.4 增补

文字列表按时间戳、非空正文及重复兄弟结构在内存定位，不输出自由文本。滚动祖先诊断和逐次尝试仅含允许的结构属性、数量、尺寸、位置、时间、窗口与状态，不含昵称、ID或正文。DOM进展不写入正式文字数据；正式content/contentTime只来自已经正常捕获并脱敏保存的type4 Response。full_transcript_timelines作为已有本地会话的派生业务数据保存，仍使用原IndexedDB，不新建数据库或上传。

自动滚动为80%视口增量，不操作视频，不构造窗口请求。仅合格口播结构取消评论候选，未知type1/type2不猜业务语义。原本地/可分享导出边界保持，业务话术仍属于分享包需复核的内容。

## V0.2.4.1 增补

页面定位只接收已捕获 contentTime 中最多12个前/中/末北京时间字符串，不传正文、昵称或用户对象。嵌入时间戳在页面内提取；诊断只输出六项计数及已验证的时间/数量/尺寸，不输出原始 DOM 文本。Network、认证过滤、窗口与覆盖率链路保持。
