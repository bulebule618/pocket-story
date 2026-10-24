# GitHub Pages 发布配置

账户：bulebule618。仓库：https://github.com/bulebule618/pocket-story （已创建，已验证可写权限）。目标分享地址：https://bulebule618.github.io/pocket-story/（尚未上线）。

前端使用 GitHub Pages，关闭 Codex 或本机服务器后由 GitHub 提供页面。登录、正式草稿、素材和版本仍使用独立在线后端，不能放入 Pages 静态目录。公开仓库会公开源码，绝不能提交真实作品、数据库或环境密钥。

## 接通步骤

1. 安装并连接自己的 GitHub 账号；创建公开 pocket-story 仓库，上传经过检查的项目源码，默认分支 main。不要上传 work、node_modules、.env 或数据库。
2. 部署 server/cloud-runtime.mjs 对应的 Vercel 后端，并接通 Turso、私有 Blob 和 Resend。服务端按 .env.vercel.example 配置；PAGES_ORIGIN 为 https://bulebule618.github.io，APP_ORIGIN 为实际后端生产源。运行 db:cloud:migrate（包含第三次素材授权迁移）。
3. 仓库 Settings → Secrets and variables → Actions → Variables 设置公开变量 PAGES_API_BASE 为实际 HTTPS 后端源；这里不填写密钥。
4. Settings → Pages → Source 选择 GitHub Actions，运行 Publish GitHub Pages 工作流。工作流执行语法检查、全部测试、公开前端构建和发布；缺少后端地址会明确失败。
5. 获取 Actions 返回的真实 page_url，验证邮箱收件、登录、刷新、正式保存、文件读取、匿名分享和不同设备访问后交付。尚未完成此步骤不能声称已上线。

## 已实现的路径和会话规则

- 分享作品使用 /pocket-story/#/read/作品公开编号，刷新不依赖 Pages 服务端重写。
- 内置图片、脚本及样式自动加仓库路径；API 请求发送到配置的后端。
- Pages 登录使用八小时服务端会话，浏览器标签会话存储仅保留会话凭据，正式内容仍在线保存；解决第三方 Cookie 被阻止的问题。
- 后端只允许明确配置的 Pages 源。作者私有图片和音频使用一小时、单素材范围的随机访问授权；授权不写入正式作品。已发布素材依照发布引用规则匿名读取。
- build:pages 只打包 dist 白名单文件，不打包服务器、工作目录和密钥。

## 当前验证与阻塞

实际提交和云端验证结果：58个源码文件已提交到 main，提交 cbb260172a8c296efd7eb83a32acc9bb1b7eca0f，https://github.com/bulebule618/pocket-story/commit/cbb260172a8c296efd7eb83a32acc9bb1b7eca0f 。远端工作流文件已读取核对。GitHub Actions运行40084172303（https://github.com/bulebule618/pocket-story/actions/runs/40084172303）中依赖安装、语法检查和27项测试全部通过，构建因PAGES_API_BASE为空按设计停止，deploy跳过。仓库授权已经解决，当前阻塞是在线后端配置；正式公网入口尚未上线。以下403及准备重试文字保留为历史记录，以本段为当前状态。

授权更新：已确认 bulebule618 的 GitHub App 安装存在（174768880），允许访问其仓库。main 仍为初始化提交3246d2ed33fcb17f65edb8a64179ad6f578677b9。本轮将重试提交58个源码文件。此前403记录属于授权前的历史，后续以实际提交结果为准。Pages尚未上线，PAGES_API_BASE及真实后端资源仍未配置。

27/27 自动测试通过，包含真实本机 HTTP 跨域登录、权限、素材授权过期、仓库路径与构建防误发布。真实浏览器已确认本机 /studio 首页可打开和渲染；未完成云端浏览器验收或真实邮件收件。

最新连接复查：GitHub 插件已通过认证接口确认账号 bulebule618，新建公开仓库 pocket-story 可读取，账号权限返回 admin/push=true，默认分支 main。初始化提交为 3246d2ed33fcb17f65edb8a64179ad6f578677b9，仅包含 README。已整理并核验58个源码文件（不包含工作数据），实际调用 GitHub 创建源码树接口时返回403 Resource not accessible by integration，没有创建提交或更新main。GitHub App 安装列表为空，账号拥有权限并不代表集成具有写入权限。需要在 GitHub 插件连接设置中安装/配置应用并授权 pocket-story。插件未提供配置 Pages 的接口。Vercel 插件尚未安装。

仓库创建步骤已由用户完成，无需重复创建或发送密码/令牌。已打开 https://github.com/settings/installations 供检查；如果有 ChatGPT/Codex 对应应用，进入 Configure 并把 pocket-story 加入所选仓库；若没有对应应用，从 GitHub 插件连接流程完成 GitHub App 安装/授权。后端接通和 Pages 启用仍需分别验证。

已增加 scripts/prepare-github.mjs，将允许公开的应用源码复制到独立 work/github-source-* 目录并生成 SHA-256 清单，排除运行数据和环境密钥；该目录仅用于待提交源码准备，并非已上传。Actions 已补齐全新检出时测试工作目录的创建步骤。

GitHub Pages 静态托管机制与免费范围参见官方文档：https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages 。后端服务有独立免费额度和使用条件，不承诺无限资源或永久不中断。

