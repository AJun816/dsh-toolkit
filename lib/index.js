/**
 * dsh-toolkit —— DeepSeek Harness 工具箱插件。
 *
 * 三个能力（全部可选获取，任一服务缺失时对应能力自动停用，其余不受影响）：
 *   1. 提示词优化器：agent/pre-step 公开瀑布上对人类用户消息做知识库模版增强
 *      （heuristic 默认 / llm 可选 / off 关闭；!!raw 逃生；!!po 强制）。
 *   2. 技能集：ctx.skills 上注册 dsh-toolkit 提供者，10 个联网编码领域技能
 *      （提示词架构 / 系统架构 / 前端 / 后端 / UI 设计 / 验收 / 集成审计 /
 *       深度研究 / 着陆页 / 项目快起），正文见插件 skills/ 目录。
 *   3. 人类命令：/ptk 状态与模式切换、/po 立即优化、/spec 委托骨架生成。
 *
 * 弱依赖纪律（保证 DSH 升级后仍可用）：
 *   - 零 npm 依赖、无 default export（postmortem 0001）、不静态导入任何
 *     @deepseek-ai/* 模块（官方 @deepseek-ai/dsh-session 经计算说明符动态导入）；
 *   - 所有服务经 ctx.get() 惰性获取（官方语义：无 inject 要求读服务）；
 *   - 所有注册与监听均 try/catch + 能力检测，异常等价于未安装；
 *   - agent/pre-step 监听内部异常一律返回 next() 的原决议：插件失效时
 *     DSH 行为与未安装完全一致。
 *
 * @module dsh-toolkit
 */
import { createAudit, pluginRoot } from './record.js';
import { createOptimizer, installOptimizer } from './optimizer.js';
import { tryRegisterSkills } from './skills.js';
import { tryRegisterCommands } from './commands.js';
import { fileURLToPath } from 'node:url';

/** Cordis 插件名。 */
export const name = 'dsh-toolkit';

/**
 * 声明式强依赖：留空。skills / commands / llm 全部经 ctx.get() 可选获取，
 * 未来 DSH 重命名或移除任一服务时本插件仍可加载（对应能力降级停用）。
 */
export const inject = [];

/** 日志兜底：宿主 logger 缺席或抛错时静默。 */
function info(ctx, message) {
  try {
    ctx?.logger?.info?.('dsh-toolkit: ' + message);
  } catch { /* logging must never throw */ }
}

/**
 * 安装全部能力。
 * @param ctx - 插件上下文
 * @param config - cordis.patch.yml 传入的配置对象
 */
export function apply(ctx, config = {}) {
  // 可变持有盒：优化器监听器在 pre-step 里把 payload.agent.session 存入，
  // 审计通道按需读取。绝不为此单独注册 waterfall 监听（不调 next() 会否决整链）。
  const sessionRef = { current: undefined };
  const auditEnabled = config?.promptOptimizer?.auditLog !== false;
  const audit = createAudit(auditEnabled, () => sessionRef.current);

  // 技能目录（插件根下 skills/）
  let skillsDir;
  try {
    skillsDir = fileURLToPath(new URL('../skills', import.meta.url));
  } catch {
    skillsDir = undefined;
  }

  let skillsRegistered = false;
  if (config?.skills?.enabled !== false && skillsDir !== undefined) {
    skillsRegistered = tryRegisterSkills(ctx, skillsDir);
  }

  const state = createOptimizer(config, audit);
  const disposeOptimizer = installOptimizer(ctx, state, audit, sessionRef);

  let commandsRegistered = false;
  if (config?.commands?.enabled !== false) {
    commandsRegistered = tryRegisterCommands(ctx, {
      state,
      skillsRegistered: () => skillsRegistered,
    });
  }

  info(
    ctx,
    'armed — optimizer=' + state.mode +
    ', skills=' + (skillsRegistered ? 'on' : 'off') +
    ', commands=' + (commandsRegistered ? 'on' : 'off'),
  );

  // 卸载清理：ctx.on 的返回值随 fiber 自动回收，这里只处理显式资源。
  if (typeof disposeOptimizer === 'function') {
    ctx.effect?.(() => disposeOptimizer);
  }
}
