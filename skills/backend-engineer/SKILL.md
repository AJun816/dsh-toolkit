# 后端工程师（Backend Engineer）

服务端编写与评审的最佳实践。覆盖 API 设计、数据建模、可靠性、可观测性。

> 基线失败：外部调用不带超时/重试/熔断，金额用浮点，迁移直接改列，排障靠 grep 日志。
> 不启用：架构级选型与限界上下文划分（system-architect）；第三方接入完备性审计（integration-auditor）。

## 何时介入

编写或评审服务端代码、设计 API 与数据层、处理并发/事务/故障场景、容量与成本规划。

## API 设计

一、资源导向 REST（或团队既有规范）；URL 是契约——版本化（/v1/）、名词复数、层级不超三层。
二、幂等先行：写操作带幂等键（支付/下单类必带）；重试安全是默认要求。
三、错误契约统一：错误体带机器可读 code＋人类可读 message＋traceId；4xx 客户端错/5xx 服务端错，不混用。
四、分页/过滤/排序显式设计（游标分页优先）；限制单页上限；慢查询端点单独限流。

## 数据建模

一、先画领域再建表：聚合边界优先，跨聚合不走外键强约束（走事件最终一致）。
二、每张表：主键＋created/updated 时间戳＋乐观锁版本号（并发修改场景）；金额用整数最小单位或 DECIMAL，禁浮点。
三、迁移只前进（forward-only）；破坏性迁移三步走（加新列→双写切换→删旧列），每步可回滚。
四、索引跟着查询走：先写查询再建索引；执行计划里出现全表扫描的查询不出库。

## 可靠性（假定会出错来设计）

一、外部调用（DB/缓存/第三方）一律超时＋重试（仅幂等操作、指数退避＋抖动）＋熔断降级三件套。
二、队列消费者幂等（至少一次投递前提）；死信队列＋告警。
三、不可逆操作（删除/打款）二次确认＋审计日志＋备份恢复路三件套。
四、密钥只进环境变量/密管；日志与错误上报中做密钥脱敏。

## 可观测性

结构化日志（JSON，带 traceId/userId 关键字段）；三个黄金信号（延迟/流量/错误率/饱和度）有仪表盘；关键业务事件打点；告警基于症状而非原因。

## 测试与验收

集成测试（真实 DB 依赖用 testcontainers）＞ 单元测试（纯函数）＞ 契约测试（对外 API 冻结）；金基准：一条 make verify 全绿才算完成。验收断言可判定（禁「基本可用」），至少一条红线断言＋独立复核通道。

## 联网校验

依赖升级与安全公告用 web_search 核对（CVE/维护状态/破坏性变更）；第三方集成先 live 探针（openapi/tools list），原始 schema 落盘 contracts/ 再对拍。

## 业界基准（2026-11-01 联网核验）

一、API 契约基线：OpenAPI 3.2 是当前规范版本（swagger.io/specification）——API 设计以 OpenAPI 文档为单一事实源，契约测试对拍它。
二、数据库基线：PostgreSQL 18 为当前主版本（postgresql.org）；SQLite/libsql 在边缘与嵌入场景的复兴是官方认可的路线。
三、可观测性基线：OpenTelemetry 规范 1.x 已 Stable（opentelemetry.io/status）——traces/metrics/logs 三信号默认走 OTel 语义约定，结构化 JSON 日志为事实标准。

## 来源（保鲜 SLA 90 天：超期数字先重验再引用）
- [OpenAPI Specification v3.2](https://swagger.io/specification/)（官方，2026-11-01 联网核验）
- [PostgreSQL Release Notes](https://www.postgresql.org/docs/release/)（官方，2026-11-01 联网核验）
- [OpenTelemetry Status](https://opentelemetry.io/status/)（官方，2026-11-01 联网核验）
