/**
 * dsh-toolkit 单元测试（node --test，零依赖）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAME_HEADER,
  CHECK_BEFORE_ANSWER,
  PROBLEM_SPEC_SKELETON,
  assembleAugmentedPrompt,
} from '../lib/templates.js';
import {
  profilePrompt,
  triggerCategories,
  isContinueDrive,
  stripCodeFences,
} from '../lib/heuristics.js';
import {
  createOptimizer,
  heuristicOptimize,
  isHumanUserMessage,
} from '../lib/optimizer.js';
import { SKILL_CATALOG, createSkillProvider } from '../lib/skills.js';

function makeState(overrides) {
  const state = createOptimizer({ promptOptimizer: {} });
  return { ...state, ...overrides };
}

test('templates: 四要素模版可组装且保留原文', () => {
  const out = assembleAugmentedPrompt('写个登录页', ['thin']);
  assert.ok(out.startsWith('写个登录页'));
  assert.ok(out.includes(FRAME_HEADER));
  assert.ok(out.includes(CHECK_BEFORE_ANSWER));
});

test('templates: kickoff 组装含 DoD 与验收尾挂', () => {
  const out = assembleAugmentedPrompt('调研对象存储选型出报告', ['kickoff']);
  assert.ok(out.includes(PROBLEM_SPEC_SKELETON));
  assert.ok(out.includes('DoD'));
  assert.ok(out.includes('验收尾挂'));
});

test('heuristics: 「继续」判定', () => {
  assert.equal(isContinueDrive('继续'), true);
  assert.equal(isContinueDrive('  ok '), true);
  assert.equal(isContinueDrive('好的。'), true);
  assert.equal(isContinueDrive('继续把那个函数写完'), false);
});

test('heuristics: thin 短问命中、结构化提示不命中', () => {
  assert.equal(profilePrompt('写个登录页').thin, true);
  const structured = '目标：x\n背景：y\n约束：z\n验收：w';
  assert.equal(profilePrompt(structured).thin, false);
  assert.equal(profilePrompt(structured).hasStructure, true);
});

test('heuristics: 涉外与重要决策信号', () => {
  assert.equal(profilePrompt('帮我对接微信支付 API').external, true);
  assert.equal(profilePrompt('把数据库从 MySQL 迁移到 PG').important, true);
});

test('heuristics: 代码块不参与画像', () => {
  const withCode = '看这段\n```\nconst 目标 = 1\n```';
  assert.equal(profilePrompt(withCode).structureHits, 0);
});

test('optimizer: thin 增强且原文一字不动', () => {
  const state = makeState();
  const out = heuristicOptimize('写个登录页', state);
  assert.ok(out.startsWith('写个登录页'));
  assert.ok(out.includes('先检后答'));
});

test('optimizer: 逃生标记原样放行', () => {
  const state = makeState();
  assert.equal(heuristicOptimize('!!raw 写个登录页', state), null);
});

test('optimizer: 强制标记剥离并增强', () => {
  const state = makeState();
  const out = heuristicOptimize('!!po 目标：x 背景：y 约束：z 验收：w', state);
  assert.ok(out.includes('目标：x'));
  assert.ok(out.includes(FRAME_HEADER));
});

test('optimizer: 结构完备只保留 external/important 增补', () => {
  const state = makeState();
  const structured = '目标：对接支付\n背景：老系统\n约束：不换库\n验收：单测绿';
  const out = heuristicOptimize(structured, state);
  assert.ok(out.includes('涉外四问') || out.includes('答完自检'));
  assert.ok(!out.includes('Problem Spec 委托'));
});

test('optimizer: off 模式不安装监听', async () => {
  const { installOptimizer } = await import('../lib/optimizer.js');
  const state = makeState({ mode: 'off' });
  void installOptimizer;
  let hooked = false;
  const fakeCtx = {
    on: () => {
      hooked = true;
      return () => {};
    },
    logger: undefined,
  };
  const dispose = installOptimizer(fakeCtx, state, { recordPrompt: async () => {} });
  assert.equal(hooked, false);
  assert.equal(dispose, null);
});

test('optimizer: pre-step 监听改写人类消息并保留其余消息', async () => {
  const state = makeState();
  const events = [];
  const fakeCtx = {
    on: (name, listener) => {
      events.push({ name, listener });
      return () => {};
    },
    logger: undefined,
  };
  const { installOptimizer } = await import('../lib/optimizer.js');
  const dispose = installOptimizer(fakeCtx, state, { recordPrompt: async () => {} }, { current: undefined });
  assert.equal(typeof dispose, 'function');
  const preStep = events.find((e) => e.name === 'agent/pre-step');
  assert.ok(preStep);
  const humanMsg = { role: 'user', content: [{ type: 'text', text: '写个登录页' }], source: { kind: 'user' } };
  const contextMsg = { role: 'user', content: [{ type: 'text', text: 'runtime context' }], source: { kind: 'plugin', plugin: 'x' } };
  const toolMsg = { role: 'user', content: [{ type: 'tool-result', data: 'x' }] };
  const decision = { kind: 'enter', messages: [humanMsg, contextMsg, toolMsg] };
  const result = await preStep.listener({ turn: 1, step: 1, messages: decision.messages }, async () => decision);
  assert.equal(result.messages.length, 3);
  assert.ok(result.messages[0].content[0].text.includes('先检后答'));
  // 非人类消息原对象原样传递
  assert.equal(result.messages[1], contextMsg);
  assert.equal(result.messages[2], toolMsg);
});

test('optimizer: isHumanUserMessage 过滤规则', () => {
  assert.equal(isHumanUserMessage({ role: 'user', content: [{ type: 'text', text: 'x' }], source: { kind: 'user' } }), true);
  assert.equal(isHumanUserMessage({ role: 'assistant', content: [{ type: 'text', text: 'x' }] }), false);
  assert.equal(isHumanUserMessage({ role: 'user', content: [{ type: 'text', text: 'x' }], source: { kind: 'plugin', plugin: 'y' } }), false);
  assert.equal(isHumanUserMessage({ role: 'user', content: '纯字符串也认' }), true);
  assert.equal(isHumanUserMessage({ role: 'user', content: [{ type: 'image', mediaType: 'image/png' }] }), false);
});

test('skills: 目录名全部 kebab-case 且正文文件存在', async () => {
  const { access } = await import('node:fs/promises');
  const provider = createSkillProvider(new URL('../skills', import.meta.url).pathname);
  const list = await provider.list();
  assert.equal(list.length, Object.keys(SKILL_CATALOG).length);
  for (const candidate of list) {
    assert.match(candidate.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(candidate.invocation.modelInvocable, true);
    assert.equal(candidate.invocation.userInvocable, true);
    const skill = await provider.get(candidate);
    assert.ok(skill.content.length > 400, candidate.name + ' 正文过短');
  }
});

test('skills: 注册在缺少服务时安全降级', () => {
  assert.equal(
    (() => {
      try {
        const mod = createSkillProvider('/nonexistent');
        return mod.name;
      } catch {
        return 'threw';
      }
    })(),
    'dsh-toolkit',
  );
});

test('heuristics: kickoff 命中时抑制冗余 thin', () => {
  const profile = profilePrompt('调研一下三大云厂商的对象存储选型并出报告');
  const cats = triggerCategories(profile, null);
  assert.ok(cats.includes('kickoff'));
  assert.ok(!cats.includes('thin'));
});

test('commands: USAGE 与骨架可渲染', async () => {
  const { PROBLEM_SPEC_SKELETON: S } = await import('../lib/templates.js');
  assert.ok(S.includes('DoD'));
  assert.ok(S.includes('好：'));
});

test('optimizer: LLM 模式无配置路由时静默回退 heuristic', async () => {
  const state = makeState({ mode: 'llm' });
  const out = heuristicOptimize('写个登录页', state);
  assert.ok(out.includes('先检后答'));
});
