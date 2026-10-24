# 口袋叙事 · 剧情手机创作平台 v3 开发版

已经替换旧绿色本地演示，提供七应用、中文三栏编辑、独立剧情引擎，以及真实 Node HTTP / SQLite 后端。此版本仍需真实浏览器验收与生产资源配置，不是全部上线的成品。

公开源码仓库：https://github.com/bulebule618/pocket-story 。最终入口选择 GitHub Pages；完整配置见 docs/github-pages.md。后端、数据库、存储、邮件仍待接通，当前没有可交付的正式公网产品链接。

## 启动

要求 Node 24 或更新版本（系统自带 Node 14 不可用）。在本项目目录：

```powershell
node server.mjs
```

默认入口 http://127.0.0.1:4173/studio 。无需登录即可多作品试用。若端口被占用，可设置 PORT 与匹配的 APP_ORIGIN。当前环境已验证替代端口 4175 的健康响应。

正式服务配置：复制 .env.example 为 .env，填写 APP_ORIGIN、DATA_DIR、RESEND_API_KEY、MAIL_FROM，然后 `node --env-file=.env server.mjs`。MAIL_FROM 需要在邮件服务验证发送域名；没有凭据时验证码接口明确返回 503，绝不会在页面显示验证码。生产 HTTPS 使用 NODE_ENV=production，并通过反向代理转发到此 Node 服务；将 DATA_DIR 挂载持久卷。更换端口必须同步修改 APP_ORIGIN。

## 数据与素材

首次启动自动应用 migrations 下的有序迁移。SQLite 位于 DATA_DIR/pocket.sqlite，素材独立位于 DATA_DIR/assets。备份数据库（含 WAL 一致性）与素材文件需要运维层处理，不是产品作品导入导出。正式草稿和发布快照在服务端；未登录试用才使用 localStorage/IndexedDB。

登录后可勾选试用作品转入账号；其本机素材先上传，再保存正式草稿。发布生成冻结版本与稳定 /read/:publicId 链接。草稿自动保存带 revision，冲突停止编辑；可核对后保存为独立作品或显式加载服务端版本。断网停止在线编辑，未确认保存的修改保留内存。

## 测试

```powershell
pnpm install
node -e "require('node:fs').mkdirSync('work',{recursive:true})"
node scripts/check.mjs
node --test tests/*.test.mjs
```

DOM 集成测试依赖 happy-dom / fake-indexeddb，云端运行适配依赖 @libsql/client 与 @vercel/blob。本机运行时使用 Node 自带 SQLite。HTTP 测试使用 work 下独立临时数据库与测试邮件接收器，不发送真实邮件。测试配置不注入普通运行服务器，不在正式 API 返回验证码。最近一次 27 项自动测试通过。

本机网络沙箱可能要求批准本地监听或请求。本机首页已通过真实浏览器打开与渲染检查；完整云端交互验收仍未完成，不能将 DOM 测试当作浏览器验收。

## 示例与文件

原创《末班车之后》包含主人、两位联系人、群聊、五类消息、手填中韩对照、两个相簿及跨簿照片、密码备忘录、来电、Safari、短信和两个结局。演示锁屏与信件密码为 1024（作者预设的剧情密码）。

核心模块见 docs/architecture.md；实施状态、逐条追踪、测试记录分别见 docs/implementation-status.md、docs/requirements-traceability.md、docs/verification.md。

## 发布限制

GitHub Pages 只托管公开前端。正式登录、草稿、素材和发布版本需要独立在线后端；支持本机/持久卷 Node 服务或 Vercel Functions + Turso + 私有 Blob。正式邮件及云端资源尚未配置。Pages 工作流缺少 PAGES_API_BASE 会停止发布，不将未接通后端的页面冒充完整平台。

## Vercel免费范围部署准备

新增配置见 vercel.json、.env.vercel.example；云数据库迁移执行 `pnpm db:cloud:migrate`。当前未连接Vercel账号或真实云资源，不能声称已上线。详细进度见 docs/public-deployment-progress.md。
