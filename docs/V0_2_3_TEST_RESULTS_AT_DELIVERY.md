# V0.2.3 验证报告

DOUYIN_LIVE_REVIEW_PROBE_V0_2_3 = **PARTIAL**：本地全部通过，新增文字机制等待用户实机。

## 基线与范围

基线 e5c8ae5296d211f4594c6e06505cddad464c85ca。用户真实 Mac Chrome 已验证 V0.2.2 自动化主链 COMPLETE / PARTIAL，33 endpoints、39 JSON，文字90条/约26.9%。详情见 [实机基线](V0_2_2_REAL_BASELINE.md)。本次不修改 debugger attach、Network事件/正文读取、IndexedDB、Grouping、Schema detector、覆盖率算法、V0.2.2 readiness等待；仅在已有 metadata 中追加安全业务上下文和证据。

## 本地结果

- npm test：原有66项全部通过，新增17项，合计83/83 PASS。
- 新增覆盖：四模块prefetch及子步骤归属、辅助/核心丢包与run隔离、安全枚举/身份拒绝/合法及非法时间/重复键、metadata安全上下文、逐动作计数与response delta、无效slider方法有限切换、评论四态与未知枚举保守判断、fans歧义+prefetch、Share-safe ZIP匿名化（含Schema身份路径、嵌套账号name）、原本地数据不变、整体PASS规则。
- Chromium真实DOM回归：role/Ant slider键盘 Home/ArrowRight/PageDown/End、机制排除、脱敏结构指纹、局部fans精确查找/歧义、video未触碰。
- 既有V0.2.1身份/React父节点点击及V0.2.2流式reload生命周期回归通过：无body→body空壳→ready→延迟React菜单；仅一次init。
- 两种完整本地HTTPS Mock均PASS：分页回退/推进；role slider键盘动作触发正常网页窗口响应。各331条话术/110分钟/覆盖率100%，模块导航、评论、取消与跨场守卫继续通过。Mock前端允许fetch，仅扩展禁止主动请求。
- Safe fingerprint最多600结构节点/80候选，白名单标签；真实DOM注入的PRIVATE字段/话术及长随机class不进入指纹。
- SECURITY_CHECK PASS：27个扩展文件，零新增权限，无主动API/重放/远程脚本/私钥/认证访问/全页通配扫描/视频操控；imports有效。
- git diff --check PASS。安装ZIP只包含27个extension文件，manifest版本0.2.3；ZIP CRC与SHA-256另见V023_ZIP_CHECK.txt。

## 报告规则与限制

预加载与对应步骤证据分开：PREFETCH_OBSERVED / STEP_OBSERVED / STEP_AND_PREFETCH_OBSERVED；子模块来源通过step_sources明确记录。fans导航歧义不否定fans_group_pie预加载数据。核心minute_trend/overview_v3/room_stats_content_list/entrance_v2丢正文影响PASS，辅助丢失仅capture_warnings。

评论未知数字/字符串枚举不猜语义。AVAILABLE_EMPTY要求当前comments步骤出现空series，且同一host/path的同一安全内容类型已被本地会话真实评论结构证实；旧run只提供类型含义证明，其正文/数量不计为本run成功。预加载的本run评论候选也可OBSERVED；无响应仍NOT_OBSERVED。

text_loading.attempts记录每个动作、方法、计数、response delta、签名变化、覆盖变化与耗时；无Network/记录效果的方法有限停止并尝试下一已识别机制。额外结构指纹不包含全文；没有可靠面板时只给有限结构诊断，不盲目点击。

page_diagnostic_initial取reload后初次可用DOM，ready在React等待和DOM稳定后重新inspect；兼容page_diagnostic指向ready。可分享导出不修改缓存和本地原始诊断包，删除指定账号字段和明确账号name。话术及经营指标仍保留，不是完全匿名公共数据包。

REAL_PAGE_VERIFICATION = NOT VERIFIED，等待用户实机。环境为Linux Chromium，本地Mock直接使用CDP而未安装扩展；不等同真实Mac Chrome登录页面验证。不能由Mock100%推断真实文字已完整。真实仍约30分钟时必须PARTIAL，回传安全窗口、attempts与fingerprint后再定位。
