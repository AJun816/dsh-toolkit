/**
 * dsh-toolkit — 人类命令（/ptk /po /spec）。
 *
 * 经官方 ctx.commands.register() 挂载（同 dsh-command-goal 模式）。
 * 命令结果只支持 success/error 两类纯文本回显；/po 与 /spec 直接把
 * 优化产物作为文本返回，用户可复制或改写后再发送。
 *
 * @module dsh-toolkit/commands
 */
import { PROBLEM_SPEC_SKELETON, ACCEPTANCE_TAIL } from './templates.js';
import { heuristicOptimize } from './optimizer.js';
import { SKILL_CATALOG } from './skills.js';

const USAGE = [
  '用法：/ptk [status|off|heuristic|llm|stats] —— 查看状态或切换优化模式',
  '　　　/po <提示词> —— 立即优化一条提示词并回显（不自动发送）',
  '　　　/spec <任务主题> —— 生成 Problem Spec v2 委托骨架',
].join('\n');

/** 渲染 /ptk 状态卡。 */
function renderStatus(state, skillsRegistered, commandsRegistered) {
  return {
    kind: 'success',
    text: [
      'dsh-toolkit 状态',
      '提示词优化模式：' + state.mode + '（off/heuristic/llm 可切换）',
      '触发类别：' + (state.applyTo === null ? '全部' : state.applyTo.join(',')),
      '逃生标记：' + state.escapeMarker + '（原样放行） / ' + state.forceMarker + '（强制优化）',
      '技能集：' + (skillsRegistered ? '已注册（' + Object.keys(SKILL_CATALOG).length + ' 个技能）' : '不可用（skills 服务缺失）'),
      '命令集：' + (commandsRegistered ? '已注册' : '不可用（commands 服务缺失）'),
      '',
      USAGE,
    ].join('\n'),
  };
}

/** 安装命令；commands 服务缺失时返回 false（永不抛出）。 */
export function tryRegisterCommands(ctx, deps) {
  const { state, skillsRegistered } = deps;
  try {
    const commands = typeof ctx?.get === 'function' ? ctx.get('commands') : undefined;
    if (commands === undefined || typeof commands.register !== 'function') return false;
    let skillsNow = skillsRegistered;
    commands.register({
      definitionId: 'dsh-toolkit/ptk',
      name: 'ptk',
      description: 'dsh-toolkit 状态与模式切换',
      input: { hint: '[status|off|heuristic|llm|stats]' },
      handler: (invocation) => {
        const arg = String(invocation?.rawInput ?? '').trim().toLowerCase();
        if (arg === '' || arg === 'status') return renderStatus(state, skillsNow, true);
        if (arg === 'off' || arg === 'heuristic' || arg === 'llm') {
          state.mode = arg;
          try {
            ctx?.logger?.info?.('dsh-toolkit: optimizer mode switched to ' + arg);
          } catch { /* logging must never throw */ }
          return { kind: 'success', text: '提示词优化模式已切换为 ' + arg + '。' };
        }
        if (arg === 'stats') {
          return {
            kind: 'success',
            text:
              '优化统计：用户消息 ' + state.stats.seen +
              ' 条，已优化 ' + state.stats.optimized +
              ' 条（其中 LLM 改写 ' + state.stats.llmRewrites +
              ' 条），跳过 ' + state.stats.skipped +
              ' 条，异常回退 ' + state.stats.failures + ' 次。',
          };
        }
        return { kind: 'error', text: '未知参数。\n' + USAGE };
      },
    });
    commands.register({
      definitionId: 'dsh-toolkit/po',
      name: 'po',
      description: '立即优化一条提示词并回显',
      input: { hint: '<提示词>' },
      handler: (invocation) => {
        const raw = String(invocation?.rawInput ?? '').trim();
        if (raw === '') return { kind: 'error', text: '请给出要优化的提示词。\n' + USAGE };
        const optimized = heuristicOptimize(raw, state);
        if (optimized === null) {
          return {
            kind: 'success',
            text: '这条提示词已足够结构化（或未命中任何触发类别），无需优化。原文：\n' + raw,
          };
        }
        return {
          kind: 'success',
          text: '优化结果（可直接复制发送；模式 ' + state.mode + '）：\n\n' + optimized,
        };
      },
    });
    commands.register({
      definitionId: 'dsh-toolkit/spec',
      name: 'spec',
      description: '生成 Problem Spec v2 委托骨架',
      input: { hint: '<任务主题>' },
      handler: (invocation) => {
        const topic = String(invocation?.rawInput ?? '').trim();
        if (topic === '') return { kind: 'error', text: '请给出任务主题。\n' + USAGE };
        return {
          kind: 'success',
          text:
            'Problem Spec 委托骨架（补全后发送）：\n\n标题：' + topic +
            '\n\n' + PROBLEM_SPEC_SKELETON +
            '\n\n' + ACCEPTANCE_TAIL,
        };
      },
    });
    return true;
  } catch {
    return false;
  }
}
