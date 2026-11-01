/**
 * dsh-toolkit — 提示词优化器。
 *
 * 挂载点：agent 循环公开瀑布事件 agent/pre-step（dsh-agent-loop 的每步入口）。
 * payload.messages 为本轮认领的收件消息；先 next() 拿默认决议（其中含宿主
 * 注入的运行时上下文消息），再对其中「人类用户消息」做增强改写——原始文本
 * 一字不动，只在尾部追加依据知识库模版生成的增强层。任何内部异常都回退为
 * 原决议：插件失效时 DSH 行为与未安装完全一致。
 *
 * 三种模式：
 *   off       —— 不挂任何监听（配置显式关闭）。
 *   heuristic —— 确定性模版增强（默认，零成本零延迟，学习 draft-blog 模版）。
 *   llm       —— 先走 heuristic；再尽力调用 llm 服务把整条消息改写为
 *                <enhanced_prompt>（借鉴 deerflow prompt_enhancer）；llm 服务
 *                缺失或调用失败时静默回退 heuristic 结果。
 *
 * 逃生舱：消息以 escapeMarker（默认 !!raw）开头则原样放行；
 *         以 forceMarker（默认 !!po）开头则强制走优化（剥掉标记）。
 *
 * @module dsh-toolkit/optimizer
 */
import {
  REWRITE_META_PROMPT,
  assembleAugmentedPrompt,
} from './templates.js';
import { profilePrompt, triggerCategories } from './heuristics.js';

/** 从配置对象安全读取一个字符串字段。 */
function stringOf(value, fallback) {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

/** 从配置对象安全读取一个布尔字段。 */
function boolOf(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

/** 提取一条消息的纯文本（多块拼接；非文本块忽略）。 */
function textBlocksOf(message) {
  const content = message?.content;
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  if (!Array.isArray(content)) return undefined;
  const blocks = content.filter(
    (block) => block?.type === 'text' && typeof block.text === 'string',
  );
  return blocks.length === content.length ? blocks : undefined;
}

/** 该消息是否人类用户消息（排除工具结果、插件注入、模型自灌）。 */
export function isHumanUserMessage(message) {
  if (message?.role !== 'user') return false;
  const source = message.source;
  if (source !== undefined && source !== null) {
    // 只认 source.kind 明确为 user 的消息；未知来源保守放行（role 过滤已足够弱依赖）。
    if (typeof source.kind === 'string' && source.kind !== 'user') return false;
  }
  return textBlocksOf(message) !== undefined;
}

/** 优化器运行时状态（模式可在会话期经 /ptk 切换）。 */
export function createOptimizer(config, audit) {
  const settings = config?.promptOptimizer ?? {};
  const state = {
    mode: stringOf(settings.mode, 'heuristic'),
    applyTo: Array.isArray(settings.applyTo) ? settings.applyTo : null,
    escapeMarker: stringOf(settings.escapeMarker, '!!raw'),
    forceMarker: stringOf(settings.forceMarker, '!!po'),
    keepRichUnchanged: boolOf(settings.keepRichUnchanged, true),
    maxOriginalLength:
      typeof settings.maxOriginalLength === 'number' ? settings.maxOriginalLength : 20000,
    stats: { seen: 0, optimized: 0, skipped: 0, llmRewrites: 0, failures: 0 },
  };
  return state;
}

/** 对单条文本执行 heuristic 增强；返回 null 表示无需增强。 */
export function heuristicOptimize(text, state) {
  const trimmed = String(text ?? '').trim();
  if (trimmed === '' || trimmed.length > state.maxOriginalLength) return null;
  // 逃生标记在此处也生效（/po 命令与 pre-step 监听共用本函数，双通道一致）。
  if (state.escapeMarker !== '' && trimmed.startsWith(state.escapeMarker)) return null;
  let working = trimmed;
  let forced = false;
  if (state.forceMarker && working.startsWith(state.forceMarker)) {
    working = working.slice(state.forceMarker.length).trim();
    forced = true;
  }
  const profile = profilePrompt(working);
  const categories = triggerCategories(profile, state.applyTo);
  if (categories.length === 0) {
    if (!forced) return null;
    categories.push('thin');
  }
  if (state.keepRichUnchanged && profile.hasStructure && !forced) {
    // 结构完备的提示词只保留 important/external 级别的增补（thin/kickoff 已无意义）。
    const residual = categories.filter((c) => c === 'external' || c === 'important');
    if (residual.length === 0) return null;
    return assembleAugmentedPrompt(working, residual);
  }
  return assembleAugmentedPrompt(working, categories);
}

/** 尽力而为的 LLM 改写：任何失败返回 null（调用方回退 heuristic 结果）。 */
async function llmRewrite(ctx, text, settings, logger) {
  let llm;
  try {
    llm = typeof ctx?.get === 'function' ? ctx.get('llm') : undefined;
  } catch {
    llm = undefined;
  }
  if (llm === undefined || typeof llm.prepareCall !== 'function') return null;
  try {
    const provider = stringOf(settings.llmProvider, '');
    const model = stringOf(settings.llmModel, '');
    if (provider === '' || model === '') return null; // 未配置路由则不硬猜
    const route = { provider, model, maxTokens: 1024 };
    const call = await llm.prepareCall(route);
    if (call === undefined || typeof call.stream !== 'function') return null;
    const message = {
      role: 'user',
      content: [{ type: 'text', text: REWRITE_META_PROMPT + '\n' + text }],
      source: { kind: 'dsh-toolkit' },
    };
    let out = '';
    for await (const chunk of call.stream({ ...call.config, messages: [message] })) {
      const piece =
        typeof chunk?.text === 'string'
          ? chunk.text
          : typeof chunk?.delta?.text === 'string'
            ? chunk.delta.text
            : typeof chunk === 'string'
              ? chunk
              : '';
      out += piece;
    }
    const match = /<enhanced_prompt>([\s\S]*?)<\/enhanced_prompt>/.exec(out);
    const body = (match ? match[1] : out).trim();
    return body.length > 0 ? body : null;
  } catch (error) {
    try {
      logger?.warn?.('dsh-toolkit: llm rewrite failed (%s), falling back to heuristic', String(error?.message ?? error));
    } catch { /* logging must never throw */ }
    return null;
  }
}

/**
 * 在 agent/pre-step 瀑布上安装优化监听；返回卸载函数（或 null 表示未安装）。
 * sessionRef：可变持有盒 { current }，监听器把 payload.agent.session 存进去供审计通道用。
 * 注意：pre-step 是 waterfall 事件——本插件只注册这一个监听器，且内部必经
 * next() 委托（任何分支都不否决整链）。
 */
export function installOptimizer(ctx, state, audit, sessionRef) {
  if (state.mode === 'off') return null;
  const logger = ctx?.logger;
  const disposers = [];
  try {
    const off = ctx.on('agent/pre-step', async (payload, next) => {
      // 下游（内层监听）异常原样传播：那不是本插件的错。
      const decision = await next();
      try {
        try {
          const session = payload?.agent?.session;
          if (sessionRef !== undefined && session !== undefined && session !== null) {
            sessionRef.current = session;
          }
        } catch { /* advisory */ }
        const messages = decision?.messages;
        if (decision?.kind !== 'enter' || !Array.isArray(messages)) return decision;
        let changed = false;
        const rewritten = [];
        for (const message of messages) {
          if (!isHumanUserMessage(message)) {
            rewritten.push(message);
            continue;
          }
          const blocks = textBlocksOf(message);
          const joined = blocks.map((block) => block.text).join('\n');
          state.stats.seen += 1;
          const trimmedHead = joined.trimStart();
          if (state.escapeMarker !== '' && trimmedHead.startsWith(state.escapeMarker)) {
            state.stats.skipped += 1;
            rewritten.push(message);
            continue;
          }
          let optimized = heuristicOptimize(joined, state);
          if (optimized === null) {
            state.stats.skipped += 1;
            rewritten.push(message);
            continue;
          }
          if (state.mode === 'llm') {
            const rewrittenText = await llmRewrite(ctx, optimized, state, logger);
            if (rewrittenText !== null) {
              optimized = rewrittenText;
              state.stats.llmRewrites += 1;
            }
          }
          state.stats.optimized += 1;
          changed = true;
          const newBlocks = [{ type: 'text', text: optimized }];
          rewritten.push({ ...message, content: newBlocks });
          try {
            await audit?.recordPrompt({ original: joined, optimized, mode: state.mode });
          } catch { /* audit is advisory */ }
        }
        if (!changed) return decision;
        return { ...decision, messages: rewritten };
      } catch (error) {
        state.stats.failures += 1;
        try {
          logger?.warn?.('dsh-toolkit: pre-step optimizer failed (%s); passing through', String(error?.message ?? error));
        } catch { /* logging must never throw */ }
        return decision;
      }
    });
    disposers.push(off);
  } catch (error) {
    try {
      logger?.warn?.('dsh-toolkit: cannot hook agent/pre-step (%s); optimizer disabled', String(error?.message ?? error));
    } catch { /* logging must never throw */ }
    return null;
  }
  return () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch { /* disposal must never throw */ }
    }
  };
}
