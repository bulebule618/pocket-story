# 免费公网部署适配记录 · 2026-10-24

已开始执行公网部署准备；不是已上线声明。

## 已完成代码

- vercel.json、api/entry.js：网站与API部署入口，生产稳定域名下保留 /studio 与 /read/:publicId。
- server/database.mjs：本机SQLite与云端libSQL异步适配；事务连接按请求隔离。本机模式串行请求以避免SQLite事务交叉。
- server/files.mjs：本机独立文件与Vercel私有Blob适配；文件URL不直接公开，读取仍经作者权限或已发布素材引用校验。
- server/cloud-runtime.mjs：仅从服务端环境读取云凭据；线上禁止使用file:数据库或本机临时目录冒充持久存储；缺失配置时在线API明确503。
- migrations/002_request_limits.sql：验证码IP限流持久化，避免Serverless实例轮换重置限流。验证码检查、尝试与一次消费已纳入事务。
- scripts/migrate-cloud.mjs：显式云迁移，校验已应用迁移checksum；运行时不创建schema。
- 上传前读取托管能力并显示文件限制。本次Vercel适配采用函数上传，单文件最大4MB（平台请求上限4.5MB内留余量）；大音频/原图后续需直传链路，未冒称支持无限文件。

本机原有23项测试回归通过；新增2项云适配测试通过。新增测试使用真实本机libSQL文件、两个独立客户端与私有Blob测试接收器，验证跨实例会话/草稿、事务冲突、冻结发布、素材授权和失败回滚。它不代表已验证真实Turso或Vercel云资源。

## 账号连接状态

- 当前没有已连接的Vercel插件；已发起安装/连接建议，等待用户完成。未创建或假称已绑定Vercel项目。
- 已有Sites ID继续保留，无部署版本；Sites平台身份及免费范围尚不能替代本业务要求。
- 没有Turso数据库、私有Blob和真实邮件凭据。没有创建付费资源或接受账户条款。

## 后续接通顺序

更新：用户已选用 GitHub Pages 作为最终分享入口，账户 bulebule618，默认仓库 pocket-story。以下 Vercel 步骤用于在线后端；前端发布顺序以 github-pages.md 为准。当前没有真实生产 URL。

1. 用户安装并连接自己的Vercel账号，使用Hobby免费范围（限个人非商业用途）。不要选择Pro试用或付费资源。
2. 在账号中创建/连接免费Turso数据库及私有Blob，具体免费额度和服务状态以创建时展示为准；用户自己在服务端Secret设置凭据，不在聊天中粘贴密钥。
3. 配置 .env.vercel.example 中的 APP_ORIGIN、TURSO_DATABASE_URL、TURSO_AUTH_TOKEN、BLOB_READ_WRITE_TOKEN、RESEND_API_KEY、MAIL_FROM。
4. 使用服务端环境执行云迁移，先部署并取得真实域名，随后核对APP_ORIGIN为固定生产域名；再部署生效。
5. 验证匿名阅读、实际邮箱收件、云文件持久化及浏览器功能。部署返回真实URL后才交付分享链接。

## 免费条件（已核对官方文档）

- Vercel Hobby：个人非商业使用，受免费额度限制：https://vercel.com/docs/plans/hobby
- Blob免费额度超出会停止访问，不能承诺无限或永远不中断：https://vercel.com/docs/vercel-blob/usage-and-pricing
- Turso有免费套餐，无需信用卡，具体额度由官方公布：https://turso.tech/pricing
- 当前本机SQLite不能原样放Vercel作为持久库：https://vercel.com/kb/guide/is-sqlite-supported-in-vercel

## GitHub Pages参考链接分析

本产品当前发布进度：GitHub仓库bulebule618/pocket-story已接通并写入源码，main提交cbb260172a8c296efd7eb83a32acc9bb1b7eca0f。GitHub云端Actions40084172303已通过27项测试与语法检查，因缺少PAGES_API_BASE停止构建，部署跳过。需继续接通Vercel后端、Turso、私有Blob和Resend，不将仓库源码链接当作产品阅读链接。

用户新提供：https://4vfydj7fmz-star.github.io/sdiphone/

已实际请求返回HTTP200；GitHub公开仓库元数据确认 private=false、has_pages=true、default_branch=main。完整文件目录未截断，包含index.html（20,262,305字节）、preview.png、audios、videos与videos2文件夹，没有服务端代码目录。网页标题为“명재현의 iPhone”。本次HTML只下载到约916KB后超时，因此未完整审阅页面脚本，不能据此断言完全没有外部API。

可确定其公开页面由GitHub Pages服务器托管，不依赖作者电脑开机。Pages提供静态HTML/CSS/JS，公开仓库可使用GitHub Free；是否有在线账号/保存需要另行后端。此参考适合长期静态阅读链接的机制，不能把本平台的邮件、正式草稿、素材库和发布后台直接省略。

官方：https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

