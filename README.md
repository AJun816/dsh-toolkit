# dsh-toolkit

DeepSeek Harness 工具箱插件：**自动提示词优化器**（学习 draft-blog 知识库模版）＋ **联网编码领域技能集**（前端/后端/UI 设计/系统架构/验收/研究等 10 项）＋ **人类命令**（/ptk /po /spec）。

零 npm 依赖；所有扩展点能力检测＋防御式包裹——DSH 升级移除任一依赖服务时，对应能力自动停用，插件与其余能力不受影响，宿主行为与未安装时完全一致。

## 能力一：提示词优化器（agent/pre-step）

对每条人类用户消息做确定性画像，命中触发类别时在**原文不动**的前提下追加知识库模版增强层：

| 触发类别 | 判定 | 附加模版 |
|---|---|---|
| thin | ≤120 字且四要素缺失的短问 | 先检后答（指出缺件与问偏，先要后猜） |
| kickoff | 研究/实现/搭建类长任务 | Problem Spec v2 骨架（目标/背景/约束/未知/风险/交付物/DoD/示例段）＋验收尾挂 |
| external | 涉及 API/MCP/第三方/长文档 | 涉外四问（对拍基准/外部完备/量化分母/演进保全） |
| important | 涉及钱/架构/不可逆操作 | 答完自检三查＋Decision Memo 骨架 |
| continue | 「继续/ok/好的」式低信息驱动 | 复述目标与 DoD 协议（裁决点前先对齐） |

- 模式：`off` / `heuristic`（默认，零成本零延迟）/ `llm`（可选：先 heuristic 再尽力调用 llm 服务做整体改写，失败静默回退）
- 逃生舱：消息以 `!!raw` 开头原样放行；`!!po` 开头强制优化（标记自动剥离）
- 审计：`prompts.log`（插件目录 JSONL）＋官方会话插件记录通道（best effort）
- 结构完备的提示词只保留 external/important 级增补，不做无意义包装

## 能力二：技能集（ctx.skills）

| 技能 | 用途 | 方法论来源 |
|---|---|---|
| prompt-architect | 提示词工程与任务委托 | draft-blog 可复用框架手册 v2 / Problem Spec v2 / 提问模式综合分析 |
| system-architect | 系统架构（DDD/约束式工程/AG-UI 治理） | draft-blog 架构终极提示词 v2 |
| frontend-engineer | 前端编写 | 分层/性能预算/可访问性/工程化纪律 |
| backend-engineer | 后端编写 | API 契约/数据建模/可靠性三件套/可观测性 |
| ui-designer | UI 设计 | token 先行/排版配色/反 AI 俗套清单 |
| acceptance-engineer | 验收工程 | draft-blog 验收自进化提示词 v1（P0-P5） |
| integration-auditor | 外部集成审计 | draft-blog 外部集成审计提示词 v1（八铁律五步流） |
| research-mode | 深度研究 | deerflow 研究模式（结构化计划回填＋并行分批＋引用纪律） |
| landing-page | 着陆页生成 | deerflow frontend-design（先研究后生成/风格字典/反 slop） |
| project-init | 项目快起 | draft-blog Agent 快起 Init v2（walking skeleton＋立法三件套） |

技能对模型与用户均可见（modelInvocable/userInvocable），模型按描述自动激活；技能正文在插件 `skills/` 目录，按需加载（渐进披露）。

每个技能正文末尾带「业界基准（2026-11-01 联网核验）」与「来源」两节：版本基线（React 19.3 / Vite 7 / PostgreSQL 18 / OpenAPI 3.2 / MCP 2025-11-25）、官方阈值（Core Web Vitals、WCAG 2.2 对比度）、权威研究数据（Baymard 70.22%）与官方工程范式（Anthropic Explore→Plan→Code、Agent Skills 开放标准、AGENTS.md 采纳面）均逐一核验过官方原文并附 URL——技能本身遵守 integration-auditor 的「联网查漏补缺」纪律，过期可按来源链接复验更新。

## 能力三：人类命令（ctx.commands）

```
/ptk                 查看状态（模式/触发类别/技能与命令注册情况）
/ptk off|heuristic|llm   会话内切换优化模式
/ptk stats           优化统计（seen/optimized/skipped/failures）
/po <提示词>         立即优化并回显（不自动发送，可改写后复制）
/spec <任务主题>     生成 Problem Spec v2 委托骨架
```

## 安装

### Web / headless profile

```sh
dsh plugin --profile web add /Users/ajun/projects/github/dsh-toolkit
# 或 GUI → Plugins → 粘贴本地路径安装
dsh --profile web --dump-config   # 验证出现 "# == dsh-toolkit" 层
```

### 桌面版 profile（Electron 独占，手动三步）

1. 退出 DeepSeek Harness 应用
2. 编辑 `~/.dsh/profiles/desktop/package.json`：dependencies 加 `"dsh-toolkit": "file:/Users/ajun/projects/github/dsh-toolkit"`，`dsh.profile.bundles` 数组追加 `"dsh-toolkit"`
3. 在该目录执行 `pnpm install` 后重新启动应用

### 配置（cordis.patch.yml）

```yaml
- insert:
    - id: dsh-toolkit
      name: dsh-toolkit
      config:
        promptOptimizer:
          mode: heuristic        # off | heuristic | llm
          applyTo: thin,kickoff,external,important,continue
          escapeMarker: "!!raw"
          forceMarker: "!!po"
          keepRichUnchanged: true
          auditLog: true
          # llm 模式的路由（未配置则 llm 模式自动等价 heuristic）：
          # llmProvider: ""
          # llmModel: ""
        skills:
          enabled: true
        commands:
          enabled: true
```

## 弱依赖设计（为什么 DSH 升级不会弄坏它）

一、零 npm 依赖：不打包任何 runtime 包；官方模块（@deepseek-ai/dsh-session）经计算说明符动态导入，缺失即跳过。
二、无 default export：规避 loader unwrapExports 陷阱（postmortem 0001：default 导出会丢掉 name/inject/Config）。
三、inject 留空：skills/commands/llm 全部经 `ctx.get()`（官方语义「无 inject 要求读服务」）惰性获取，服务缺失返回 undefined → 对应能力停用而非插件崩溃。
四、事件级防御：agent/pre-step 监听内部任何异常都返回 next() 的原决议——优化器失效时 DSH 行为与未安装完全一致。
五、只用文档化公共 API：waterfall 事件、skills.registerProvider、commands.register、appendPluginRecord——全部来自官方 subsystems 文档与内置插件同款用法（dsh-skill-badge / dsh-command-goal / dsh-model-failover）。

## 测试

```sh
npm test    # node --test test/unit.test.mjs（17 项：模版组装/画像判定/优化器行为/技能清单）
```

## 设计溯源

- 提示词模版：draft-blog 知识库（02-模板、07-知识库/可复用框架、提问模式综合分析的六大反模式）
- 研究/着陆页：deerflow（bytedance/deer-flow）1.x 结构化计划与 2.x 技能方法论的研究结论
- 插件骨架：DSH 官方扩展点文档与 dsh-model-failover 的防御式实践
