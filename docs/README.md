# 技术文档导航与权威边界

版本：2026-09-20 / gameplay-core-04。01/02/04/05 为当前场景驱动合同；旧工作包保留历史证据，不覆盖当前授权。实际结果只看 STATUS 本轮记录。

| 文档 | 回答的问题 |
| --- | --- |
| [STATUS](STATUS.md) | 仓库现在真正有什么、验证了什么、缺什么 |
| [01 产品与范围](01-product-and-scope.md) | 为谁做、为什么做、比赛必须交付什么 |
| [02 场景目标与玩法](02-gameplay-and-levels.md) | 每关目标、操作、错误、状态与学习证据 |
| [03 交互、美术与音频](03-ux-art-audio.md) | 手机界面、触屏规则、资源和无障碍 |
| [04 技术架构](04-architecture.md) | 模块边界、状态推进、恢复与部署形态 |
| [05 内容与运行协议](05-content-and-runtime-contracts.md) | 词、物品、关卡、指令、存档与校验 |
| [06 AI 工坊与安全](06-ai-workshop-and-security.md) | 限定生成、API、发布、失败降级和成本 |
| [07 教学质量与内容安全](07-learning-quality-and-safety.md) | 记录口径、教研审核、隐私与授权 |
| [08 测试、发布与运行](08-test-release-and-operations.md) | 必要测试、真机、上线和提交清单 |
| [09 路线图与 agent 协作](09-roadmap-and-agent-handoff.md) | 工作包顺序、负责人、并行和交接 |
| [10 决策、风险与来源](10-decisions-risks-and-sources.md) | 对话中的取舍与修正、依据及未确认事项 |
| [WP-GAMEPLAY-CORE-04](work-packages/WP-GAMEPLAY-CORE-04.md) | 当前场景驱动主线、组句和活动验收 |
| [WP-01](work-packages/WP-01.md) | 历史基础工作包 |
| [WP-PLAYABLE-STORY-01](work-packages/WP-PLAYABLE-STORY-01.md) | 完整主线接续交付、覆盖关系与剩余门槛 |
| [WP-PLAYFUL-GAME-03](work-packages/WP-PLAYFUL-GAME-03.md) | 主线手感、魔法野餐、三个短玩法和本次交付 |
| [设计说明模板](submission/design-description.md) | 比赛提交材料；必须按实际交付更新 |
| [AI 使用记录](submission/ai-usage-log.md) | 实际 AI 制作证据，不是营销陈述 |

阅读顺序：README → STATUS → 01 → 02 → 04/05 → 当前工作包；UI 开发再读 03，AI 工坊开发再读 06。无需每次把所有文件复制进 Prompt。

需求权威在 01/02，交互权威在 03，领域协议在 05，交付状态只在 STATUS。代码与文档冲突时，先报告差异，判断是缺陷还是批准后的设计改变；禁止把当前代码的偶然行为默认为新需求。修改设计时同步对应测试与工作包，不追加平行蓝图。
