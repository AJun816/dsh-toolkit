# 项目快起（Project Init / Walking Skeleton）

空目录当天跑通的工程骨架＋立法三件套。源自 draft-blog Agent 快起 Init 提示词 v2。

> 基线失败：第一天就上全家桶与 agent 编排，骨架无法端到端演示，约定只在口头，重启后靠考古续接。
> 不启用：已有仓库的日常开发；架构级选型争议（system-architect 主导）；研究类任务（research-mode）。

## 何时介入

初始化新项目、新仓库脚手架、「从零开始做 X」。

## 目标定义

行走的骨架（walking skeleton）：端到端可跑（入口→核心通路→输出）、天然演示核心模式、当天完成。只做骨架不做业务功能——业务功能等骨架验收后再立任务。

## 流程

### 第 1 步 复述确认（动手前）

用中文复述三件事：当前目标、完成标准（DoD 逐条）、第一步打算做什么；用户确认后再动手（脚手架文件无需逐个请示）。

### 第 2 步 技术栈推导（业务驱动，不携带默认栈）

按 system-architect 技能的推导矩阵：AI 密度高→Python/FastAPI；高并发网关→Go；企业重集成→Java；全栈同构→TS。每项给 2 候选＋触发条件＋选择理由。数据从文件＋SQLite 起步，部署从 docker-compose 起步，规模触发再升。

### 第 3 步 骨架生成

一、最小分层目录（领域/接口/基础设施分离，禁全局 utils 垃圾桶）。
二、一条端到端通路：健康检查端点＋一条核心业务通路（echo/模拟数据即可，不接真实外部服务）＋一键启动脚本。
三、配置管理（.env.example＋config 加载）＋日志（结构化）＋错误处理骨架。
四、README：一页纸（是什么/怎么跑/怎么验证/目录结构）。

### 第 4 步 立法三件套（与骨架同等优先级）

一、AGENTS.md：业务目标（每个功能答出如何降本/增产/提质）、成本红线、分层契约（机器强制）、失败容忍、提交约定。
二、MEMORY.md：重启一页纸（目标/DoD 现状/下一步/危险区）——空窗后 5 分钟重启。
三、架构契约：import-linter/dependency-cruiser/ArchUnit 按栈选型接入 CI；lint＋format＋类型检查＋测试全绿即 verify。

### 第 5 步 门禁与验收

一、L0 文档（AGENTS.md/README）→ L1 编辑器（lint/格式）→ L2 Git hook（pre-commit）→ L3 CI（verify 全量）四层防线。
二、make verify（或等价 npm script）一条命令跑全部检查——验收 = 命令绿，不是「我觉得行」。
三、人类验收清单（5 分钟）：端到端演示跑通/verify 绿/AGENTS.md 与 MEMORY.md 存在且非空/hook 生效（故意提交违规文件被拦）。

## 交付

可运行骨架＋三件套＋verify 一键命令＋演示脚本；用 present 声明交付物。

## 业界基准（2026-11-01 联网核验）

一、立法三件套的事实标准：AGENTS.md 已成跨工具标准（采纳方含 Google、Cursor、Windsurf、Semgrep、Kilo Code 等，agents.md）——新仓库用 AGENTS.md 命名 agent 立法文件，可被主流编码工具原生识别；MCP（规范修订 2025-11-25）是外部工具接入默认评估项。
二、复杂度起步官方共识（Anthropic）：从增强型 LLM/简单组合 workflow 起步，验证价值后再上自主 agent——walking skeleton 同理：先端到端最小通路，不预建 agent 编排。

## 来源（保鲜 SLA 90 天：超期数字先重验再引用）
- [AGENTS.md](https://agents.md/)（跨工具标准，2026-11-01 联网核验）
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)（官方，2026-11-01 联网核验）
