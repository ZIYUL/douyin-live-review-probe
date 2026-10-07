# V0.2.2 补丁验证

DOUYIN_LIVE_REVIEW_PROBE_V0_2_2 = **PARTIAL**（本地验证通过，等待真实 Mac Chrome 验证）

基线：37bb85c9f30f67145d921d3b8a247bf8845e51b8。用户实机已确认 V0.2.1 页面身份与模块发现通过，本次不改选择器、Debugger Network 或导出架构。

修复：reload 导航后先等待 document/body 与 interactive/complete，再 inspect，等待 React 复盘证据，等待 DOM 稳定，最后由 AutoCollector 单次 init。空 body/缺 document 返回 DOM_NOT_READY；执行上下文销毁在有界等待中重试。永久 TypeError/ReferenceError 不重试，报告包含安全动作与异常类型。控件缺失交给后续导航跳过，不能误报 NOT_REVIEW。

- 原有54项 + 新增12项 = 66项单元回归全部通过。
- 新增：空 body、无 document、loading 无扫描、interactive/complete、600ms延迟、超时边界、上下文重试、永久错误、动作诊断、bound/signature保护、React等待、单次初始化。
- 真实 Chromium 本地 HTTPS Mock：流式 head（body 缺失）→200ms body空壳→400ms文档完成→600ms React模块渲染；自动采集通过，331条话术、110分钟、覆盖率100%，评论、四模块、取消及跨场保护通过。测试延迟只存在于 Mock。
- SECURITY_CHECK PASS：24个扩展文件，无主动请求/接口重放/远程脚本/私钥，权限与模块导入检查通过。
- ZIP 仅包含 extension 文件；历史版本与 Git 历史保留。

REAL_PAGE_VERIFICATION = NOT VERIFIED，等待用户实机。当地浏览器测试未安装扩展，不替代登录抖音与真实 Mac Chrome 验证。

请更新未打包扩展至0.2.2，重新加载扩展和真实复盘页面，再点自动采集。检查是否越过 reload 并进入模块步骤；若失败，回传安全 dom_action、exception_type、page_diagnostic。
