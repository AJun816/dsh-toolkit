# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow semver.

## [0.1.0] — 2026-11-01

### Added — 首个版本
- 提示词优化器：`agent/pre-step` 公开瀑布钩子，对人类用户消息在原文不动的前提下追加知识库模版增强层；三模式（`off` / `heuristic` 默认 / `llm`）；`!!raw` 逃生 / `!!po` 强制；五类触发（thin/kickoff/external/important/continue，`applyTo` 可过滤）；`keepRichUnchanged` 对结构完备提示词只保留 external/important 增补。
- 技能集 ×10：`ctx.skills` provider（同 dsh-skill-badge 模式，rank 600，model/user 双面可见）——提示词架构师 / 系统架构师 / 前端工程师 / 后端工程师 / UI 设计师 / 验收工程师 / 集成审计师 / 深度研究模式 / 着陆页生成 / 项目快起。
- 人类命令：`/ptk`（状态/模式切换/stats）、`/po`（立即优化回显）、`/spec`（Problem Spec v2 骨架）。
- 审计双通道（best-effort）：插件目录 `prompts.log`（JSONL，已 gitignore）＋官方会话插件记录 `appendPluginRecord`（动态导入，缺失自动跳过）。
- 弱依赖纪律：零 npm 依赖、无 default export（规避 loader unwrapExports 陷阱）、`inject` 留空全走 `ctx.get()`、一切注册与监听 try/catch——任一服务缺失对应能力自动停用，插件失效时宿主行为与未安装完全一致。
- 测试：18 项纯逻辑单测（模版组装/画像判定/优化器瀑布/技能清单一致性/命令渲染/LLM 回退），`npm test` 零依赖运行。
- 仓库要件：README（介绍+安装+配置+使用说明）、MIT LICENSE、CHANGELOG、CI（node 22/24 单测）、.gitignore、package.json 元数据（repository/engines）。
