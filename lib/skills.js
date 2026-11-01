/**
 * dsh-toolkit — 技能集提供者。
 *
 * 经官方 ctx.skills.registerProvider() 挂载（同 dsh-skill-badge 模式）。
 * 技能正文放插件 skills/ 目录（resourceBase 指向该目录，正文内引用的
 * 参考文件按需读取——渐进披露，借鉴 deerflow SKILL.md 设计）。rank 取
 * BUNDLED_SKILL_RANK 数值 600（不静态导入 dsh-skill，保持零依赖）。
 *
 * @module dsh-toolkit/skills
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PROVIDER_NAME = 'dsh-toolkit';
/** dsh-skill 的 BUNDLED_SKILL_RANK 常量值（600）；字面量以避免静态依赖。 */
const BUNDLED_RANK = 600;

/** 技能清单：名称 → 目录名 + 双语目录描述（模型据此自动激活）。 */
export const SKILL_CATALOG = {
  'prompt-architect': {
    dir: 'prompt-architect',
    description:
      '提示词工程与任务委托架构师。按 draft-blog 知识库方法论把模糊请求升级为四要素齐全、带 DoD 与示例段的正式规格（Problem Spec v2 / Decision Memo / 涉外四问）。用户要写复杂任务委托、优化提示词、拆解模糊需求，或消息含「帮我写个提示词/需求/规格/kickoff」时使用。',
  },
  'system-architect': {
    dir: 'system-architect',
    description:
      '系统架构设计（业务驱动 · DDD · 约束式工程）。技术栈由业务推导而非固定；advisory 与 binding 分层；L0-L3 四层防线；AG-UI 治理三级。做架构设计、技术选型、限界上下文划分、架构约束立法时使用。',
  },
  'frontend-engineer': {
    dir: 'frontend-engineer',
    description:
      '前端工程最佳实践：组件设计、状态管理选型、性能预算、可访问性、构建与测试策略。编写或评审 React/Vue/Svelte/TS 前端代码、前端架构决策、页面性能优化时使用。',
  },
  'backend-engineer': {
    dir: 'backend-engineer',
    description:
      '后端工程最佳实践：API 设计、数据建模、事务与一致性、缓存、可靠性（超时/重试/降级）、可观测性。编写或评审服务端代码、设计 API 与数据层、处理并发与故障场景时使用。',
  },
  'ui-designer': {
    dir: 'ui-designer',
    description:
      'UI/视觉设计：设计语言、排版与配色系统、组件视觉规范、反「AI 俗套」清单、着陆页视觉方向。做 UI 设计、视觉走查、设计系统、或要求「好看一点/高级感」时使用。',
  },
  'acceptance-engineer': {
    dir: 'acceptance-engineer',
    description:
      '验收工程与判据生产（验收自进化协议 P0-P5）：可判定断言、红线、防作弊三查、独立复核、逃逸沉淀。任务收尾验收、写 DoD/验收标准、做红队对抗或评测时使用。',
  },
  'integration-auditor': {
    dir: 'integration-auditor',
    description:
      '外部系统集成审计（八铁律五步流）：live 真源先行、量化分母、覆盖矩阵、三源对拍、增量保全。接入第三方 API/MCP/SaaS、审计集成完备性、迭代长文档时使用。',
  },
  'research-mode': {
    dir: 'research-mode',
    description:
      '深度研究模式（借鉴 deerflow）：CLARIFY→PLAN→EXECUTE→SYNTHESIZE 四阶段，结构化研究计划逐步回填、并行子任务分批、防幻觉引用纪律、报告风格化输出。做技术调研、竞品分析、写研究报告时使用。',
  },
  'landing-page': {
    dir: 'landing-page',
    description:
      '着陆页/展示页生成（借鉴 deerflow frontend-design）：先研究后生成、index.html 单文件契约、风格字典前置、反 AI-slop 清单、移动端与性能硬约束。生成 landing page、活动页、产品介绍页时使用。',
  },
  'project-init': {
    dir: 'project-init',
    description:
      '项目快起（walking skeleton）：空目录当天跑通端到端骨架 + 立法三件套（AGENTS.md/MEMORY.md/架构契约）+ L0-L3 防线 + 一键 verify。初始化新项目、新仓库脚手架时使用。',
  },
  'skill-author': {
    dir: 'skill-author',
    description:
      '技能编写（SKILL.md 作者指南）：体量三层经济学（路由/深度/数据）、目录级激活契约、正文七件套、查询纪律、溯源与保鲜 SLA。编写或评审 SKILL.md、设计技能目录结构、给技能做保鲜复验时使用。',
  },
};

/** 构建技能提供者（不依赖任何宿主模块）。 */
export function createSkillProvider(rootDir) {
  const base = rootDir;
  const resourceBase = { kind: 'directory', path: base };
  const candidates = Object.entries(SKILL_CATALOG).map(([name, meta]) => ({
    name,
    description: meta.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase,
    rank: BUNDLED_RANK,
    locator: new URL(`../skills/${meta.dir}/SKILL.md`, import.meta.url),
  }));
  return {
    name: PROVIDER_NAME,
    list: () => Promise.resolve(candidates),
    async get(candidate) {
      const meta = SKILL_CATALOG[String(candidate?.name ?? '')];
      const bodyPath = base + '/' + (meta?.dir ?? String(candidate?.name ?? '')) + '/SKILL.md';
      const content = await readFile(bodyPath, 'utf8');
      return {
        name: candidate.name,
        description: candidate.description,
        invocation: candidate.invocation,
        provider: PROVIDER_NAME,
        source: 'bundled',
        resourceBase,
        content,
      };
    },
  };
}

/** 在 ctx.skills 上注册提供者；服务缺失或形态变化时返回 false（永不抛出）。 */
export function tryRegisterSkills(ctx, rootDir) {
  try {
    const skills = typeof ctx?.get === 'function' ? ctx.get('skills') : undefined;
    if (skills === undefined || typeof skills.registerProvider !== 'function') return false;
    const provider = createSkillProvider(rootDir);
    skills.registerProvider(() => provider);
    return true;
  } catch {
    return false;
  }
}
