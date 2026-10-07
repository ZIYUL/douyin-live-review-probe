# V0.2.1 补丁验证

DOUYIN_LIVE_REVIEW_PROBE_V0_2_1 = **PARTIAL**

日期：2026-10-07。基线：a8d53dceb5fb3124054d7e7ebb082eacc3b66479。只修页面身份与真实 React DOM 控件发现，不新增功能。

## 真实问题与修复

用户在真实 Mac Chrome、已登录 anchor.douyin.com/anchor/review 上点击自动采集，约22ms内以NOT_REVIEW失败。页面可见直播复盘和四个模块，旧代码错误要求overview/content选择器先成功，导致控件为div/span时误判页面。

- HTTPS + anchor.douyin.com范围不变。明确 `/anchor/review` 及集中列出的review/replay路由独立判OK；控件是否渲染不再决定页面身份。错误页面且无复盘特征仍NOT_REVIEW。
- 仅在限定类型button/a/role/Ant/label/div/span中查找可见精确文字，去空白后不能模糊匹配说明文字。
- 从匹配文字叶节点最多上溯6层，优先可验证的语义/菜单class，其次pointer容器；普通span继承pointer不能冒充独立控件。body及大型页面容器禁止点击，容器后代数量受限。
- 四模块兼容span文字、父div处理点击。多个同名独立目标返回AMBIGUOUS，导航立即SKIPPED，不能随机选一个；稳定selector不掩盖同名歧义。
- `AUTO_CAPTURE_RESULT.page_diagnostic`包含pathname、route_match、review_text_found、overview_found、content_found。`/anchor/review`保留固定pathname，其余可能含身份的路径只留已知路由/其他路径标记；不保存query value、room_id、认证或DOM原文。

## TESTS

`npm test`：**54 PASS / 0 FAIL**。原43项全部PASS，新增11项：

1. 正确/anchor/review即使无按钮inspect仍OK。
2. 四个真实风格模块div/span找到并点击父div。
3. 普通span寻找最近pointer/tabindex/role/菜单class父级。
4. 同名目标AMBIGUOUS，零点击；稳定selector也不能掩盖歧义。
5. /other无复盘特征仍NOT_REVIEW，诊断不保存query身份。
6. 异步按钮未渲染时页面仍OK，导航阶段SKIPPED；后续按钮可发现。
7. 精确文字、无点击标记、大容器防误点。
8. 6层上溯限制、隐藏目标不产生歧义。
9. 已知路由支持与review-other误匹配排除。
10. AMBIGUOUS立即跳过，零随机点击/重试。
11. NOT_REVIEW报告保留安全诊断，不保存live_key。

完整输出：AUTOMATED_TEST_OUTPUT.txt。测试使用轻量DOM替身，另外执行真实浏览器DOM验证。

## BROWSER DOM MOCK

`npm run test:automation-browser`：**PASS**。

本地HTTPS Mock映射到127.0.0.1，不访问抖音；真实Chromium DOM验证：已知路由无按钮、四个菜单span点击父div（检查event.target=DIV）、pointer父级、同名歧义零点击、错误页、异步未渲染及安全诊断。

随后使用无button/role/data-probe-action的React风格div/span菜单运行原完整自动采集Mock，正常模块切换、分页、331条虚构文字/110分钟/100%样本覆盖、评论、Schema、脱敏、ZIP全部PASS。

测试夹具补齐UTF-8声明，避免中文精确文字在模拟HTML中乱码；恢复DOM后强制完整本地导航，避免测试夹具竞态。没有为绕过测试而改变生产网络捕获链路。

输出及Mock报告：V021_BROWSER_MOCK_OUTPUT.txt / V021_BROWSER_MOCK_RESULT.json。

## SECURITY_CHECK

**PASS**：未增加权限、主动API请求、请求重放或认证读取。54项回归、安全扫描、JS语法和git diff --check通过；Mock ZIP完整性通过。新增诊断不含query value、身份或认证值。

与a8d53dc比较：extension/src/background、lib、storage全部无改动；已验证attach/responseReceived/getResponseBody/JSON/缓存/Schema/ZIP链路保持一致。仅automation的身份/控件/跳过行为与安全诊断接入、版本标记、文档和测试变化。

## REAL_PAGE_VERIFICATION

**NOT VERIFIED，等待用户实机。** 此处未在用户Mac Chrome真实页面重新测试。不能把本地Chromium DOM Mock当成真实抖音修复已验收。

下一步：更新未打包扩展到0.2.1并重新加载，进入真实/anchor/review再次点自动采集。确认不再立即NOT_REVIEW、四模块正常导航；仍失败时检查page_diagnostic与步骤reason（缺控件或AMBIGUOUS应跳过/部分完成）。其他V0.2限制保持不变，本次不开发V0.3。
