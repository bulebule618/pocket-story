# 初始审计 · 2026-10-24

已完整读取实施指令及需求 v3。无适用 AGENTS.md（已搜索 Documents/Codex）。

原型：无依赖的 ES Modules，app.js 约 58 KB；静态 Node HTTP 服务器；localStorage 保存单草稿和发布快照；独立简易引擎；少量 assert 测试。旧绿色主题、5 应用、导入导出、假发布、本机正式草稿、暂停时间和 audio ended 自动挂断均需替换。

保留：原创 SVG 场景素材、原型的内容概念。重建领域、播放器、创作者与服务边界。旧文件仅保存在 work/legacy，不再作为公开入口；旧本机草稿不静默升级为正式草稿，不支持作品导入导出。

环境：系统 Node 14 不适用；使用 Codex 随附 Node 24.22.1，支持 node:sqlite。开发后端 SQLite + 独立文件存储，生产邮件使用 Resend HTTP API，未配置则明确 503；测试采用显式内存邮件接收器。未发现可确认的生产邮件或外部数据库凭据。

Sites：保留 appgprj_6adba7a7c8b881918af6dcf90e2da439；尚无发布版本及线上地址。当前 custom audience 只有所有者；Workers 不支持本地 SQLite 文件持久化，Sites 要求平台认证，不可假称已有邮箱验证码与匿名阅读。部署前需兼容 Worker 的数据适配或独立 Node 主机。

参考：2026-10-24 IAB 导航超时，网页工具也不能访问。未取得桌面或窄屏可核实尺寸；深色固定模板先按需求实现，不能称精确复刻。
