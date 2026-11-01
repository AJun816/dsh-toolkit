/**
 * dsh-toolkit — 提示词画像与触发判定。
 *
 * 依据 draft-blog 提问模式综合分析的六大反模式，把每条用户消息归类为
 * 触发类别集合，供优化器决定附加哪些知识库模版块：
 *   thin      —— 低结构短问（四要素缺失）→ 先检后答
 *   kickoff   —— 正式委托级任务（长任务/研究/工程活）→ Problem Spec v2 + 验收尾挂
 *   external  —— 涉及外部系统/第三方接口/长文档 → 涉外四问
 *   important —— 影响钱、架构、不可逆 → 答完自检三查 + Decision Memo
 *   continue  —— 「继续」式低信息驱动 → 复述目标与 DoD 协议
 * 判定全部为纯函数（可单测、零依赖、确定性）。
 *
 * @module dsh-toolkit/heuristics
 */

/** 判定为「继续」类的高频低信息词（提问模式综合分析 模式 1：继续×202、单字确认×183）。 */
const CONTINUE_PATTERNS = [
  /^(继续|接着?做|接着?写|接着?说|gos*on|gos*ahead|next)\s*[。.!！]?$/i,
  /^(好|好的|可以|行|ok|okay|yes|y|1|嗯|en|嗯嗯)\s*[。.!！]?$/i,
  /^(继续吧|继续干|keep going)\s*[。.!！]?$/i,
];

/** 四要素结构信号（中英）。 */
const STRUCTURE_PATTERNS = [
  /(^|\n)\s*(目标|目的|goal)\s*[:：]/i,
  /(^|\n)\s*(背景|context)\s*[:：]/i,
  /(^|\n)\s*(约束|限制|constraint)\s*[:：]/i,
  /(^|\n)\s*(验收|完成标准|acceptance|definition of done|dod)\s*[:：]/i,
  /(^|\n)\s*(要求|需求|requirements?)\s*[:：]/i,
  /(^|\n)\s*(交付物|deliverable)\s*[:：]/i,
];

/** 正式委托（kickoff）信号：研究/工程/长任务动词 + 规模暗示。 */
const KICKOFF_VERBS =
  /(研究|调研|分析报告|设计方案|架构设计|重构|实现一个|开发一个|搭建|初始化|建立一个|生成一个|写一个完整的|从零|设计并实现|落地)/;
const KICKOFF_SCALE =
  /(报告|方案|系统|平台|项目|骨架|库|服务|应用|流水线|迁移|选型|完整)/;

/** 涉外信号：外部系统/第三方/接口/文档演进。 */
const EXTERNAL_PATTERNS =
  /(api|mcp|sdk|第三方|外部(系统|接口|服务)|openapi|swagger|接口对接|集成|对接.{0,6}(平台|系统)|官方文档|长文档|协议规范)/i;

/** 重要决策信号：钱、架构、不可逆。 */
const IMPORTANT_PATTERNS =
  /(架构|选型|技术栈|数据库|上线|部署到生产|生产环境|删除|DROP|truncate|付款|支付|预算|费用|成本|购买|订阅|迁移|重命名|不可逆|回滚方案|止损)/i;

/** 干扰词：命令、代码片段里的关键词不算结构信号。 */
const CODE_FENCE = /```[\s\S]*?```/g;

/** 去掉代码块后的纯文本（代码里的字不应参与画像）。 */
export function stripCodeFences(text) {
  return String(text ?? '').replace(CODE_FENCE, ' ');
}

/** 统计四要素结构信号命中数。 */
export function countStructureSignals(text) {
  let hits = 0;
  for (const pattern of STRUCTURE_PATTERNS) if (pattern.test(text)) hits += 1;
  return hits;
}

/** 是否「继续」式低信息驱动。 */
export function isContinueDrive(text) {
  const trimmed = String(text ?? '').trim();
  if (trimmed.length > 24) return false;
  return CONTINUE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** 提示词画像：返回确定性分类结果。 */
export function profilePrompt(rawText) {
  const text = String(rawText ?? '');
  const prose = stripCodeFences(text);
  const trimmed = prose.trim();
  const structureHits = countStructureSignals(prose);
  const hasStructure = structureHits >= 2;
  const isContinue = isContinueDrive(prose);
  const thin =
    !hasStructure &&
    !isContinue &&
    trimmed.length > 0 &&
    trimmed.length <= 120 &&
    trimmed.split(/\s+/).length <= 60;
  const kickoff =
    !isContinue &&
    KICKOFF_VERBS.test(prose) &&
    (KICKOFF_SCALE.test(prose) || prose.length >= 200);
  const external = EXTERNAL_PATTERNS.test(prose);
  const important = IMPORTANT_PATTERNS.test(prose);
  return {
    length: text.length,
    structureHits,
    hasStructure,
    isContinue,
    thin,
    kickoff,
    external,
    important,
  };
}

/** 由画像得到触发类别列表（顺序即附加顺序，受 applyTo 配置过滤）。 */
export function triggerCategories(profile, applyTo) {
  const allowed = new Set(
    (Array.isArray(applyTo) && applyTo.length > 0
      ? applyTo
      : ['thin', 'kickoff', 'external', 'important', 'continue']
    ).map((entry) => String(entry).trim().toLowerCase()),
  );
  const categories = [];
  if (profile.isContinue) categories.push('continue');
  if (profile.thin) categories.push('thin');
  if (profile.kickoff) categories.push('kickoff');
  if (profile.external) categories.push('external');
  if (profile.important) categories.push('important');
  const filtered = categories.filter((category) => allowed.has(category));
  // kickoff 的 Problem Spec 骨架自带「缺什么先问我」，thin 的先检后答此时冗余。
  if (filtered.includes('kickoff')) {
    return filtered.filter((category) => category !== 'thin');
  }
  return filtered;
}
