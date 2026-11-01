# 深度研究模式（Deep Research）

四阶段结构化研究流水线。方法论借鉴 deerflow 两代研究架构之长：1.x 的结构化计划与回填（强结构）＋ 2.x 的技能方法论与并行子代理（强自主）。

> 基线失败：带着模糊问题开跑，计划只存在自然语言里，URL 凭记忆生成，单一来源撑结论。
> 不启用：十秒可答的事实核对（直接 web_search）；工程实现类任务（对应工程技能）。

## 何时介入

技术调研、竞品分析、选型研究、写研究报告——任何「结论需要证据支撑」的多源调查任务。

## 总流程：CLARIFY → PLAN → EXECUTE → SYNTHESIZE

### 阶段 0 澄清（CLARIFY，执行前必须完成）

用 ask_user_question 补齐三维度（deerflow coordinator 三维法：具体技术/关注点/范围），凑满至少 2 维才进入规划。禁止带着模糊问题开跑。

### 阶段 1 计划（PLAN，结构化一等公民）

产出结构化研究计划（deerflow Plan 模式）：

```text
研究目标：（一句话）
has_enough_context: false
步骤：
1. [research|need_search=true] 标题 / 描述 / 执行结果：（待回填）
2. [analysis] 标题 / 描述 / 执行结果：（待回填）
3. [research] …
```

计划纪律：
一、每步标注类型：research（需联网检索）/ analysis（纯推理综合）/ processing（跑代码验证）。禁止全部标 analysis——至少一个 need_search 步骤是防幻觉硬要求。
二、信息量三标准（deerflow planner）：Comprehensive Coverage / Sufficient Depth / Adequate Volume——「刚好够」不可接受；90% 确定信息足够时，选择再收集。8 维分析框架可裁剪：历史脉络/现状/未来指标/利益相关方/定量/定性/对比/风险。
三、计划先给用户过目（ask_user_question：接受/修改），反馈作为输入重规划，最多 2 轮——避免研究南辕北辙。
四、has_enough_context 默认 false，全部步骤回填完毕才置 true。

### 阶段 2 执行（EXECUTE，分类型分派＋并行分批）

一、research 步骤用 web_search/web_fetch：先搜索后点击，绝不自造 URL；每步执行时携带已完成步骤的 findings 级联上下文（后续步骤应利用前序发现，顺藤摸瓜）。
二、analysis 步骤纯推理，不碰工具，输入是已回填的 findings。
三、processing 步骤写代码算，不许心算——数字结论必须有可复现脚本。
四、独立的 research 步骤用 subagent 并行（每批 ≤3 个，多批次分轮启动，遵守宿主并发约束）；有依赖的步骤串行。
五、每步结果回填进计划的「执行结果」字段——结构驱动进度，不靠自然语言记忆。

### 阶段 3 汇总（SYNTHESIZE，引用纪律）

一、报告结构：标题 → 关键引用（前置防 URL 幻觉）→ 核心要点（4-6 条）→ 概览 → 详细分析 → 来源列表（尾部重复）。
二、引用格式 [来源: 标题](URL) 内联，URL 只能来自实际搜索/抓取结果——never generate URLs on your own。
三、数据完整性铁律：只用明确提供的信息；数据缺失写「未提供」，禁止编造示例数字。
四、表格优先于长段落；每节标证据强度（高：官方文档/源码；中：多家媒体一致；低：单一来源）。
五、风格化输出：按用户需求套报告人格（学术/新闻/投研/科普），结构不变。
六、保险丝：研究超轮次或部分步骤失败时，基于已收集材料产出降级报告并明示缺口——不空手而归，不硬撑完美。

## 产出契约

最终报告为 Markdown 文件（放工作区）；用 present 声明交付；附完整来源列表与置信度评估。

## 业界基准（2026-11-01 联网核验）

一、交叉验证官方模式（Anthropic Claude Code 实践）：综合阶段让一个「新鲜上下文」的模型尝试反驳已得结论（fresh model tries to refute）——比同一会话自查更能暴露幻觉；落实到本技能：SYNTHESIZE 前把关键结论列表交给独立 subagent 挑错。
二、探索优先：动手写报告前先探索（Explore first, then plan）——与四阶段流程的 CLARIFY→PLAN 一致，官方与知识库方法论在此汇合。
三、引用纪律沿用 deerflow 双保险（引用前置 + URL 只出自搜索结果），与 OpenAI/Gemini Deep Research 公开描述的规划-检索-综合循环同构。

## 来源（保鲜 SLA 90 天：超期数字先重验再引用）
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)（官方，2026-11-01 联网核验）
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)（官方，2026-11-01 联网核验）
