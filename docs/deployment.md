# 生产接通步骤与阻塞

当前未部署，无已确认的外网阅读地址。不要直接上传 dist 到静态托管冒充完整平台。

1. 提供支持 Node 24 长期运行及持久卷的主机，或使用 Dockerfile。运行服务不需要 pnpm install，测试依赖不会进入镜像。
2. 把 /data（或 DATA_DIR）挂载到持久存储，保证 SQLite 与 assets 同时备份。当前为单实例 SQLite WAL，不能横向多实例共享一个不支持 SQLite 锁的文件系统。
3. 设置 APP_ORIGIN 为正式 HTTPS 源，例如 https://your-domain.example；反向代理 /api、/read、/studio 及静态资源到同一 Node 服务。HOST=0.0.0.0，PORT 按主机要求设置。
4. 设置 NODE_ENV=production，以启用 Secure 会话 cookie。反向代理必须提供有效 HTTPS。
5. 在 Resend 验证发件域名，并以服务端 Secret 配置 RESEND_API_KEY、MAIL_FROM。不得把凭据写入 dist、hosting.json 或版本库。
6. 在部署目标验证 health、真实邮箱收件、两个账号隔离、上传后文件持久化、匿名阅读以及下线/重新上线。浏览器完成桌面和手机手势验收后再报告生产可用。

示例容器命令（仅部署说明，未执行）：

```sh
docker build -t pocket-story .
docker run --env-file .env.production -p 4173:4173 -v pocket-story-data:/data pocket-story
```

.env.production 需要 APP_ORIGIN、RESEND_API_KEY、MAIL_FROM，不提交该文件。

现有 Site project_id=appgprj_6adba7a7c8b881918af6dcf90e2da439 已保留，未重复创建。当前 Site 只有所有者访问范围、无已发布版本。若继续使用 Sites：先在独立准备目录把 Node 数据访问改为兼容 Worker 的 D1/R2，保留 Site 身份，确认邮箱验证码与匿名读者入口符合平台能力及用户授权，再完成完整后端部署。当前源码不会在 Cloudflare Worker 内使用本机 SQLite 或文件持久化。

缺少的不是一个可编造的 URL：正式邮件凭据、生产持久存储/计算主机和真实浏览器验收目前都未完成。
