/**
 * dsh-toolkit — 知识库模版内核。
 *
 * 全部模版蒸馏自 draft-blog 知识库（02-模板 + 07-知识库/可复用框架）：
 *   - 可复用框架手册 v2 §①：四要素 / 先检后答 / 答完自检三查 / 涉外四问
 *   - Problem Spec 模板 v2：DoD 清单 / 示例段（好与不好）/ 交付物
 *   - 提问模式综合分析 §三/§七：六大反模式与三个补丁（验收前置、示例段、链式打包）
 *   - Decision Memo 模板
 * 写作规范遵循库内 SOP-3 提示词块纪律：块内纯文本行文，禁 Markdown 语法；
 * 段题用中文序号或「角色：/目标：/背景：/要求：/约束：/输出：」六段引导。
 *
 * @module dsh-toolkit/templates
 */

/** 附加块的统一抬头（模型可识别来源并据此调整行为）。 */
export const FRAME_HEADER = '———— dsh-toolkit 提示词增强层（依据 draft-blog 知识库模版自动附加，原文未改动）————';

/** 日常四要素 + 先检后答（可复用框架手册 v2 §① 日常版）。 */
export const CHECK_BEFORE_ANSWER = `先检后答：回答之前，先用两三句话指出上面这条请求缺了什么关键信息、问题是否问偏；
缺件影响作答时先向我要，不要靠猜补齐。确认无遗漏后再正式作答。`;

/** 答完自检三查（手册 §① 重要版：影响钱、架构、不可逆的决策时追加）。 */
export const SELF_CHECK = `答完自检：给出结论后，追加三条自查——
一、最可能错在哪；二、我怎么验证（给出可执行的验证动作）；三、若不成立，第二方案是什么。`;

/** 涉外四问（手册 §① 真源版：结论涉及外部系统/审计/长文档时追加）。 */
export const EXTERNAL_FOUR = `涉外四问（结论涉及外部系统时必须回答）：
一、对拍基准：这结论跟什么对的拍？基准是 live 真源还是二手衍生品？两端独立才算数。
二、外部完备：对方有什么我们没用？
三、量化分母：覆盖 x / 共 y？什么时候探的？「基本完整」不算结论。
四、演进保全：新版包含旧版全部关键信息了吗？逐项 diff 过了吗？`;

/** 「继续」复述协议（提问模式综合分析 模式 1：裁决点前必须先复述目标与完成标准）。 */
export const CONTINUE_PROTOCOL = `继续之前先复述：一、当前目标是什么；二、完成的定义（DoD）逐条现状如何；
三、接下来第一步打算做什么。复述不出来就先问我要，不要顺着惯性往下做。`;

/** Problem Spec v2 骨架（02-模板/Problem Spec 模板.md，kickoff 级任务包装用）。 */
export const PROBLEM_SPEC_SKELETON = `这是一个正式委托级任务，请先按下面的骨架把它补成完整规格（缺什么先问我，不要替我编）：
目标：
背景：
约束：
未知：
风险：
交付物：路径与命名 / 格式要求。
DoD（完成的定义——开工前写好，交付前逐条自检，不通过不交付）：
1.
2.
3.
示例（消除歧义——给一个具体的「好」，最好再给一个「不好」）：
好：
不好：
骨架补全并经我确认后再动手。`;

/** 验收尾挂协议（验收自进化提示词 v1 P0 的精简版，kickoff 任务默认尾挂）。 */
export const ACCEPTANCE_TAIL = `验收尾挂：完工时交一张验收表，四列——断言编号、判定（过/不过）、证据位置、遗留风险；
断言先写 3 到 8 条可判定语句（禁用「尽量、合理」等词），其中至少一条红线；
判定不了视为不通过；单一来源显示成功不构成通过，至少用一个独立方式复核。`;

/** Decision Memo 骨架（02-模板/Decision Memo 模板.md）。 */
export const DECISION_MEMO_SKELETON = `这是一个架构/选型/不可逆决策，请顺手产出 Decision Memo：
决策主题 / 要解决的问题 / 候选方案（至少两个）/ 判断依据 / 主要风险 /
反例或失败条件 / 建议方案 / 为什么不是其他方案 / 验证动作 / 复盘时间点。`;

/** LLM 改写模式的元提示词（借鉴 deerflow prompt_enhancer：保留原意、加结构、XML 包裹）。 */
export const REWRITE_META_PROMPT = `你是提示词优化器。把用户原始提示词改写为更高质量的版本，规则：
一、保留全部原始意图与事实，禁止编造新要求；
二、按「目标/背景/约束/验收」四要素重组，缺的要素留占位问题而不是编造；
三、追加「先检后答」协议：让模型先指出缺件与问偏处再作答；
四、任务级请求补 DoD 雏形（可判定断言）与示例段（一个好例子）；
五、纯文本输出，不用 Markdown 语法；用 <enhanced_prompt></enhanced_prompt> 包裹结果。
用户原始提示词如下：`;

/** 各触发类别的组装规则：类别 → [附加块]。 */
export const AUGMENT_RULES = {
  thin: [CHECK_BEFORE_ANSWER],
  kickoff: [PROBLEM_SPEC_SKELETON, ACCEPTANCE_TAIL],
  external: [EXTERNAL_FOUR],
  important: [SELF_CHECK, DECISION_MEMO_SKELETON],
  continue: [CONTINUE_PROTOCOL],
};

/** 把原始文本与触发类别组装成增强后的提示词。 */
export function assembleAugmentedPrompt(originalText, categories) {
  const blocks = [];
  for (const category of categories) {
    const rule = AUGMENT_RULES[category];
    if (Array.isArray(rule)) blocks.push(...rule);
  }
  if (blocks.length === 0) return originalText;
  return [originalText, '', FRAME_HEADER, ...blocks].join('\n');
}
