# 验证记录 · 2026-10-24

## 最终自动检查

运行时：Codex 随附 Node 24.22.1（系统 Node 14 不适用）。

实际执行：

```text
node scripts/check.mjs
PASS JavaScript syntax checks
node --test tests/*.test.mjs
23 tests / 23 pass / 0 fail / 0 skipped
```

最终完整运行耗时约 4.4 秒；HTTP 测试已通过本机网络审批执行。测试使用 work 下独立数据库，不接触正式账号，不发送真实邮件。

- tests/engine.test.mjs：12 项。无序条件、阅读边界、密码冷却、相册去重过滤、现实时间与间隔补演、actual/scheduled 后续时间、重复顺序上限、来电队列/超时/拒接/主动挂断、起点、成员历史、完整兼容、布尔/引用校验及节点模拟。
- tests/player.test.mjs：6 项。七应用详情生成、相册边界与缩放禁止翻页、三种查看器差异、编辑/读者边界、节点显隐、相机轨道与语音重置。
- tests/api.test.mjs：2 项真实 HTTP 集成。邮件测试接收器、验证码一次使用/频率/过期、HttpOnly会话、跨账号隔离、修订409、上传与引用隐藏、旧版素材保留、冻结发布、稳定匿名链接、上线下线、失败keep/offline、删除、CSRF、未配置邮件503。
- tests/creator-dom.test.mjs：2 项。Happy DOM 的真实元素事件，三栏、逐条编辑、手填对照、撤销重做、多作品、引导创建、表单及无假发布；IndexedDB Blob 与真实转入引用替换。
- tests/online-dom.test.mjs：1 项 Happy DOM + 实际 HTTP 联合链路。验证码登录 → 勾选试用作品转入 → 自动保存 → 断网停止编辑/恢复 → 另一标签页真实修订冲突 → 核对并保存独立副本 → 发布冻结版 → 匿名打开 → 锁屏密码 → 聊天/照片 → 通知/密码备忘录 → 拒接推进 → 回复 → 抵达结局并单进度存档。

发现并修复：素材 INSERT 参数数量；进入手机设置时 selected() 错将 phone 对象视为数组；补演消息在同一循环中被一次性执行；看图事件发生后通知层未立即更新；冲突后入口未切换为核对；旧版资源在更新后被访问校验阻断；接听默认铃声定时器未清除。

## 本地服务

本轮实际监听过 http://127.0.0.1:4173 与 http://127.0.0.1:4175。原沙箱实例的4173无法连接；获准在4175启动后，curl --noproxy '*' 成功返回：

```json
{"database":true,"mailConfigured":false,"production":false}
```

这验证本机真实服务和数据库，不表示真实邮件已接通。集成测试服务4187/4188/4189均由测试结束时关闭。预览服务在交付收尾核对关闭；使用 start.ps1 可重启默认4173。

## 参考站与浏览器验证的准确限制

参考站 https://dsdoaphone.vercel.app/ 首次 IAB 导航超时；网页访问工具也不能读取。后续浏览器库存出现该站标题，但绑定读取失败 native pipe message exceeds frame limit；没有获得可核实的桌面/窄屏视觉基线。

IAB 本地预览也出现 ERR_CONNECTION_TIMED_OUT。在尝试 Windows 浏览器验证时，Computer Use 返回：无法足够可靠地判定当前浏览器 URL，停止了本轮操作。随后停止了 UI 自动化，没有改用脚本浏览器绕过该限制。

因此：没有真实桌面/窄屏截图；没有完成真实双指、双击、滚轮、拖动、摄像头授权、浏览器音频限制及移动端触摸验收。Happy DOM 是单元/集成证据，不是浏览器视觉证据，不能声称精确复刻或整体验收通过。

## 部署

未部署、没有线上地址。既有 Sites项目无发布版本；静态dist不运行本后端，当前访问配置也不提供匿名读者。未创建新Site、未更改已有audience。生产邮件Secret和支持持久存储的Node主机均未配置。详见 deployment.md。
