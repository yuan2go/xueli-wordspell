# 04 · 技术架构

一个 React/TypeScript/Vite 应用，一个确定性 `domain/world.transition`。WP-GAMEPLAY-CORE-04 正式入口为 `main.tsx → App.tsx → Scene/Letters/SentenceBuilder`；没有平行 Demo 或第二套世界引擎。

## 当前执行链

玩家意图 → `game/adventure.runAdventure` 核对 session/revision/mode/attempt → 内容/语言与世界条件 → 同一 `domain.transition` → 原子提交世界/事实/证据/日志 → `goals` 投影 → UI 表现。

`Adventure` 保存 story 和已开启活动 Board、固定种子、当前模式、事件与日志。每个 Board 保存 world、scene、bagOpen、真实事实、按任务保留的帮助与音频观察、variant/seed。操作 revision 与 world revision 分开。一次换帽的两个世界效果在克隆状态上执行，任何失败整体丢弃，避免部分提交。

`availableTargets` 对同一受守卫的世界动作作无副作用试算，因此点击、拖动提示和执行许可一致；目标只从规则与当前世界派生。`sentenceTasks` 用当前情境生成有限内容；描述句没有 effect。独立活动复用既有初始物品构建并经同一 transition 编排，不修改主线 Board。

## 模块边界

- `domain/world.ts`：实体、词形、唯一位置、包含/占用/角色保护；无 React/DOM/storage/audio/provider。
- `content/adventure.ts` / `sentences.ts`：三幕、词义/用途、活动变体、制作配额、语义句型与未审核开发语音目录。
- `game/adventure.ts` / `sentences.ts`：应用命令、情境守卫、语法/语义、目标/能力/证据投影。
- `platform/adventure-save.ts`：schema 4 envelope、严格重放与投影一致性检查、原档备份/导出；`audio.ts` 保留单一可取消通道。
- `App`：页面/焦点/工具草稿与平台接入；`Scene` 从唯一 location 递归显示包内、垫上、佩戴关系；没有独立完成状态。
- `game/session.ts`、`content/story.ts`、旧存档和摘要模块：仅保留旧版精确日志解码/回归，正式 App 不调用旧 step runner。既有 picnic 初始实体构建被复用，旧 play reducer不驱动新页面。

## 表现与恢复

UI 只有选中、未提交字母/词块、拖影和短反馈。世界先提交，CSS 位置过渡有界（350ms），减少动态效果直接显示稳定态；反馈 6.5 秒后收起，不延迟进度。暂停、后台和刷新无需等待动画回调，拖动取消保持原位。佩戴物以角色局部坐标定位，不镜像角色或遮住定位器；包内/垫上子节点跟随父物品。

语音来自现有资源服务，播放新任务取消旧请求；观察核对任务、资源 ID/版本、来源和 request，拒绝旧回调。静音/缺音频可文字辅助。无后端、网络模型、全局事件总线或通用编排框架。所有证据仍仅在设备本地。
