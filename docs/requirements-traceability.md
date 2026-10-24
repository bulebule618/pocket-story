# 需求追踪矩阵 · v3

状态释义：实现=已存在业务代码；逻辑/DOM/HTTP通过=对应自动测试通过；待浏览器=尚无真实视觉/设备交互证据。不能把一行映射当作全部实机验收。

| 需求 v3 / 实施条款 | 实现位置 | 自动验证 | 状态与剩余验收 |
|---|---|---|---|
| §1 七应用；联系人归 KakaoTalk | domain.apps、player.body | player七应用视图、engine示例 | 实现/通过；装饰按钮外观待浏览器 |
| §2 固定深色模板、灵动岛、当地状态栏 | styles.css、player.render/updateTime | DOM phone-shell与状态栏结构 | 实现；参考站尺寸与桌面/窄屏截图未验证 |
| §2 独立壁纸、裁切、外背景、信号网络电量 | app.inspector/cropFields、player.wallpaper | DOM表单 | 实现；真实拖动裁切/比例待浏览器 |
| §3 4/6位密码、错误清空/抖动、提示、记忆 | domain.validate、player.unlock/click、app.boot | online-dom完整解锁 | 实现/通过；滑动与记忆开关真实设备待验证 |
| §3 锁屏通知直接整机解锁 | player.phone.notification、engine.unlock | online-dom通知导航 | 实现；锁屏状态直接点击分支待浏览器 |
| §3 网格、分页、应用拖动、Dock最多4个 | phone配置、app.setupDrag、player.home | domain数量边界、DOM表单 | 实现；手机触摸排序手柄已实现，仍需实机验收 |
| §3 消息统一提示音、无常驻暂停/音量/重开 | player.effect、overlays、app | player读者无编辑按钮 | 实现；autoplay与真实声音待浏览器 |
| §4 人物先建、主人、备注、共享副本 | domain、app人物表单、server.characters | DOM编辑与HTTP账号隔离 | 实现/通过；跨作品头像素材授权完整验收待浏览器 |
| §4 资料册网格与上下切换，不触发剧情 | player.profile/viewer | player三种查看器 | 逻辑通过；真实上下滑动待浏览器 |
| §4 资料页聊天/电话独立开关解锁与拨出 | character chatGate/phoneGate、phoneMode | engine开关、player视图 | 实现；资料页主动拨出完整路径待浏览器 |
| §5 浅蓝Kakao、黄/白气泡、五底栏装饰 | player.body/message、styles.css | player只读/无search交互 | 实现；参考观感未精确复刻验收 |
| §5 全部/未读、置顶、最新消息排序、角标 | player.latestTime、engine.unread | engine全部已读边界 | 实现/通过；滚动与角标联动待浏览器 |
| §6 逐条消息、选人物突出、默认发送者、时间 | app消息与聊天表单、add | creator-dom逐条编辑与撤销 | 实现/通过 |
| §6 五类型、失败、同聊引用、卡片详情 | domain.validate、player.message/card | engine引用校验、player视图 | 实现；五类型真实内容视觉待浏览器 |
| §6 群聊头像/成员/人数、加入退出保留历史 | roomAvatar、engine成员动作 | engine成员退出 | 实现/通过 |
| §6 多回复节点、只读/预设/自动打字/自由输入 | replyNodes、player.replyConfig、engine.reply | player节点解锁；online-dom预设回复 | 实现；自动打字速度/仿键盘、自由输入的真实手感待浏览器 |
| §6 语音互斥、暂停继续、离开重置、来电暂停 | player.voice/effect/stopVoice | player离开重置/音频不挂断 | 实现；真实音频播放策略待浏览器 |
| §7 无翻译API，仅手填Kakao文字/回复对照 | app消息/节点表单、player.translation | creator-dom手填、player视图 | 实现/通过；文字与预设回复均提供读者展开/收起；视觉待浏览器 |
| §8 多相簿同照身份、最近去重、锁定过滤 | domain.albumPhotos、recentOrder、app排序 | engine相册去重与隐藏 | 实现/通过 |
| §8 手机照片左右边界、缩放拖动、双击/双指/滚轮 | player.viewer/down/move/up/zoom | player边界/缩放禁止翻页 | 逻辑通过；真实多指/滚轮/拖动/滚动恢复待浏览器 |
| §8 三种照片触发与事件重复策略 | player.openPhoto/zoom/click、engine事件 | engine重复与player触发区分 | 实现/通过 |
| §8 相机取景不采集、预设照片一次入册、释放轨道 | player.camera/releaseCamera/shutter、engine.camera | player轨道释放、engine最近项目 | 实现；真实权限/无设备、快门动画声音待浏览器 |
| §9 备忘录独立密码、提示、次数、冷却/禁用/事件解除 | app备忘录、engine.note.password、note.unlock | engine密码与尝试/正文分离；online-dom密码 | 实现/通过；本次阅读禁用的跨刷新范围需进一步验收 |
| §10 全屏/横幅来电、超时/拒接推进、手动挂断 | player.overlays/effect、engine.call | engine多来电/过期/接听；online-dom拒接 | 实现/通过；真实音频ended与横幅观感待浏览器 |
| §10 通话记录只读、人物主动拨出独立 | player.calls/profile-call | player视图、engine.call.outgoing | 实现；主动拨出真实交互待浏览器 |
| §11 历史短信只读无事件、Safari预设结果 | player.sms/safari、app表单 | player视图；engine条件 | 实现/通过 |
| §12 表单事件、全/任一无序、布尔、全部动作 | app.eventInspector、engine.step | engine纯函数、顺序、重复上限 | 实现/通过；任一条件与资料修改动作已补测试通过 |
| §12 现实时间、锁屏/解锁起点、间隔补演、计时依赖 | engine.pending/step | engine补演actual/scheduled、起点、过期队列 | 实现/通过；长时间系统挂起待设备验收 |
| §13 两种结局、继续浏览、重开范围、单存档 | player.ending、app.reader、domain.compatible | online-dom到结局、engine兼容 | 实现/通过；重开UI确认范围待浏览器 |
| §13 新版本会话固定、下次刷新、完整兼容 | 发布快照、fingerprint+依赖检查 | HTTP发布隔离、engine兼容 | 实现/通过；保守策略：定义有变即重开，不部分迁移 |
| §14 多作品、引导/直接、复制依赖、归档/删除选择 | app作品库、server.projects | creator-dom多作品；HTTP复制/删除 | 实现/通过；归档触摸交互待浏览器 |
| §14 会话内撤销重做、无在线历史恢复 | app.undoStack/redoStack、revisions编号 | creator-dom撤销重做 | 实现/通过 |
| §15 邮箱真实验证码、试用勾选转入 | server.auth、app登录/转入 | HTTP一次使用/频率/过期、online-dom登录 | 测试接收器通过；生产邮件未配置 |
| §15 正式在线自动保存、修订冲突/断网冻结 | server.projects PUT、app.save/frozen | HTTP409；online-dom自动保存 | 实现/通过；断网冻结与冲突核对/独立副本DOM+HTTP覆盖通过 |
| §15 不用本机正式草稿、无作品导入导出 | 正式API、trialKey隔离、旧文件移出dist | creator-dom无假发布/导出 | 实现/通过 |
| §16 共享素材、原图/压缩大小、引用隐藏不破坏发布 | services.prepareImage、server.assets/asset_refs | HTTP隐藏与跨账号；IndexedDB转入 | 实现/通过；图片解码/压缩真实浏览器待验证 |
| §17 节点模拟、调试日志条件/开关/任务、可选检查 | app.debugSetup/debugHtml/publishDialog | player节点不补齐、engine日志 | 实现；事件节点入口已补齐，且模拟不绕过条件 |
| §18 冻结版本、稳定链接、上下线、失败策略 | server.versions/publish/read、app发布 | HTTP冻结与keep/offline；online-dom匿名阅读 | 本地通过；真实公网入口未部署 |
| 实施G权限/账户隔离/素材访问/CSRF/不泄露验证码 | server.api | api.test.mjs | 本机HTTP通过；生产HTTPS与Secret未配置 |
| 实施D参考站桌面/窄屏基线 | docs/audit.md | 无有效截图 | 受阻：首次超时，后续读取frame limit，未宣称精确复刻 |
| 实施J/K浏览器验收后部署 | docs/verification.md/deployment.md | 本轮不具备浏览器完成证据 | 受阻：Computer Use URL判定终止；生产目标未配置 |

未完成项保留在本矩阵，未将DOM或HTTP测试替代视觉验收。真实邮件、正式持久存储/计算主机、浏览器能力是外部阻塞；已识别内部补齐项已实现并完成最终自动复验；真实设备交互仍待验收。

## GitHub Pages 补充追踪

仓库创建后复查：仓库已存在，账号admin/push=true；实际创建源码树失败403 Resource not accessible by integration。源码准备58文件，尚未提交。待用户为GitHub集成授权此仓库后重试；不把账号权限当作集成写入成功。

最新外部验证：已认证 bulebule618，GitHub App 安装列表为空，可访问仓库为空，pocket-story 返回404。账号身份已接通，仓库授权未接通，不能声称已发布。

| 新要求 | 实现 | 证据与剩余项 |
| --- | --- | --- |
| 关闭 Codex 后仍可访问的 Pages 入口 | scripts/build-pages.mjs、.github/workflows/pages.yml | 构建/路径测试通过；账户未连接，尚未发布 |
| 仓库子路径与稳定作品链接 | dist/location.js、runtime-config.js、app.js | hash 阅读和静态资源路径测试通过 |
| 跨域登录与正式云保存 | services.js、server/cors.mjs、api.mjs | 真实 HTTP 无 Cookie 会话及拒绝外来源测试通过；真实云/邮件待接通 |
| 私有图片与音频跨域读取 | media_access 迁移、assets/access、location.js | 跨账号、单素材范围、过期测试通过 |
| 实际浏览器复验 | 本机 /studio 首页 | 本轮已打开并查看实际渲染；全流程云端浏览器验收仍未完成 |


安装复查：GitHub 插件 installed=true、ENABLED；当前会话无 GitHub 工具，本机 Git 无凭据，未执行发布。源码准备脚本已生成58个允许文件和SHA-256清单，待发布副本27/27测试通过；Actions全新检出目录问题已修复。
