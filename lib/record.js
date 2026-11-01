/**
 * dsh-toolkit — 最佳努力审计通道。
 *
 * 两个独立可选通道，任一失败不影响另一路与主流程：
 *   1) 插件目录 prompts.log（JSONL，同 dsh-model-failover switches.log 惯例）；
 *   2) 官方会话插件记录 appendPluginRecord（plugin: 前缀 + ignorable 语法，
 *      经计算说明符动态导入，宿主缺失该模块时静默跳过）。
 *
 * @module dsh-toolkit/record
 */
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RECORD_TYPE = 'plugin:dsh-toolkit/prompt-optimized';

/** 解析插件根目录（lib/ 的上一级），兼容任意安装渠道。 */
export function pluginRoot() {
  try {
    return dirname(dirname(fileURLToPath(import.meta.url)));
  } catch {
    return undefined;
  }
}

let appendPluginRecord;
async function resolvePluginRecordWriter() {
  if (appendPluginRecord !== undefined) return appendPluginRecord;
  appendPluginRecord = undefined;
  try {
    const specifier = '@deepseek-ai/dsh-session';
    const mod = await import(specifier);
    if (typeof mod.appendPluginRecord === 'function') appendPluginRecord = mod.appendPluginRecord;
  } catch {
    /* 宿主未内嵌该模块：官方通道不可用，仅文件通道生效 */
  }
  return appendPluginRecord;
}

/** 创建审计器；enabled=false 时所有方法为空操作。 */
export function createAudit(enabled, sessionAccessor) {
  const root = pluginRoot();
  const logFile = root === undefined ? undefined : join(root, 'prompts.log');
  return {
    async recordPrompt(entry) {
      if (!enabled) return;
      const record = { at: Date.now(), ...entry };
      // 通道 1：插件目录 JSONL
      try {
        if (logFile !== undefined) {
          await mkdir(dirname(logFile), { recursive: true });
          await appendFile(logFile, JSON.stringify(record) + '\n', 'utf8');
        }
      } catch { /* advisory */ }
      // 通道 2：官方会话插件记录
      try {
        const session = sessionAccessor?.();
        if (session !== undefined && session !== null) {
          const write = await resolvePluginRecordWriter();
          write?.(session, RECORD_TYPE, record);
        }
      } catch { /* advisory */ }
    },
  };
}
