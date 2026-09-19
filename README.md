# 雪梨英语奇旅 / Xueli English Quest

**发现问题，用单词改变物品，用句子帮助朋友。**

首个故事《小猫的野餐冒险》是一款触屏绘本游戏。正式入口 `/` 已接入场景目标驱动的三幕：家门口准备 → 湿墨小径 → 野餐草地。没有账号、后端或运行时 AI 依赖。

唤醒伙伴后就可探索已出现物品。背包和地图可按不同顺序恢复；纸偶能变帽子；开包、取出、戴帽、换帽、摘帽与摆放都产生真实世界结果。同一张路线纸必须亲自变成垫子、铺过湿墨、让猫到达对岸后才能恢复地图。草地上用词块组成指令和描述，安排野餐，并保留自己的帽子和收纳选择。

三个短活动按能力提前开放，各有两种手工编排情境：帽子搭配、背包找物、野餐小帮手。退出回到原故事布置，刷新不改活动变体；重玩切换另一种情境。自由制作的备用 mat / hat 各一件，稳定 ID，不复制主角或关键物品。

## 开发与体验

Node.js 22.12+，已有真实且精确锁定的 npm lockfile。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5178
# http://127.0.0.1:5178/ —— 正式 React 入口
npm test
npm run typecheck
npm run typecheck:domain
npm run build
npm run check:resources
npm run test:browser
```

浏览器回归从正常首页真实操作，使用生产 HTTP `127.0.0.1:4174`；需已安装 Playwright Chromium。`dist` 是静态构建产物，Vite dev/preview 是本地体验服务。没有公网部署。旧 `/#design` 不再是独立页面；本包只交付正式入口。

## 当前权威与限制

- [项目状态与本次真实检查](docs/STATUS.md)
- [本工作包](docs/work-packages/WP-GAMEPLAY-CORE-04.md)
- [产品与范围](docs/01-product-and-scope.md)、[场景玩法](docs/02-gameplay-and-levels.md)
- [架构](docs/04-architecture.md)、[运行和存档合同](docs/05-content-and-runtime-contracts.md)
- [全部文档导航](docs/README.md)、[有效决策](docs/10-decisions-risks-and-sources.md)

三幕和六个核心词是本故事的编排；旧十二挑战、十三步骤不是全产品限制。所有动作经同一个 `domain.transition`，目标和学习记录从已提交事实投影，动画不推进状态。探索、教学、辅助、独立应用和回访分开记录；一次成功不等于掌握或学习效果提升。

复用带绿围巾、背包和画面颈部右侧白色定位器的狸花猫资产。素材权利、正式录音和教研状态保持 PENDING；浏览器 TTS 明示为开发语音。真机和真实儿童试玩尚未完成，`check:release` 仍阻断未审核资源。旧线性存档会原样备份、可导出，明确重开新目标，绝不把旧 step 映射成新通关。

仓库公开可见不代表获得第三方素材复用许可；不提交密钥、儿童个人信息、内部课件或未经授权的品牌素材。AGENTS.md 与 CLAUDE.md 共用同一工程合同。
