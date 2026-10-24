# Cloudflare 部署与零支出约束

当前用户选择 Cloudflare 作为部署目标，要求出现收费时停止服务。部署按更严格方式执行：不启用收费能力，不等到账单产生后再补救。

## 必须遵守

- 只使用经核实为 Workers Free 的目标账号；账号为付费计划或无法确认时停止部署。
- 不升级 Workers Paid，不购买域名，不开通 R2 计费订阅，不启用付费 Images、Stream、AI 或 Marketplace 产品。
- 不把预算告警当作自动停止扣费的硬限制，不承诺可在账单产生后立即自动退款或停费。
- Workers/D1 免费额度耗尽时允许相关操作失败，界面明确显示不可用；不得伪装保存或发布成功，不自动转付费服务。
- 私人素材必须有真实持久存储与权限隔离；零费用存储尚未接通前，不宣称完整上线，不用本机暂存冒充正式云存储。
- 正式作品发布必须验证文档及其图片音频全部可读；发布失败保留旧版，不删除旧版正在引用的文件。
- 保持用户尚未统一确认的 UI/功能变更不动。当前仅推进部署必需事项。

## 免费额度参考（2026-10-24）

- Workers 动态请求：100,000/日，每请求10ms CPU。静态资源直接访问免费，不计入动态调用。
- D1：每天5,000,000行读取、100,000行写入；每个免费数据库500MB，账号合计5GB。
- 静态资源：每Worker版本20,000文件，单文件25MiB。该资源系统不能直接充当私人动态上传库。
- R2虽然提供免费用量，但超额可计费，因此本任务默认不启用。

官方：https://developers.cloudflare.com/workers/platform/pricing/
官方：https://developers.cloudflare.com/d1/platform/limits/
官方：https://developers.cloudflare.com/r2/pricing/

## 实施进度

零费用素材组件：新增server/d1-files.mjs及Cloudflare素材表迁移，将小文件分成512KiB块存入D1，不使用R2。当前默认单文件4MiB、素材总预算300MiB，为免费单库500MB留出文档/索引/版本空间。容量满返回507，单文件过大返回413，不自动升级，不自动删除旧素材。新增实际SQLite协议测试覆盖完整读取、容量停止和批次回滚，1项通过。尚未接入云端路由，不能据此声称素材服务上线。

已核对项目仍为Node HTTP/SQLite及Vercel/libSQL/Blob适配；目前没有Cloudflare部署配置或真实公网产品地址。Cloudflare插件目录未找到可用连接，正在项目work/cloudflare-cli安装官方Wrangler并检查登录。账号授权、免费套餐验证、后端持久化适配、零费用素材存储与真实浏览器验收尚待完成。

不将源码上传、命令行安装或账号登录当作产品已经部署。

最新结果：官方Wrangler4.152.0及Windows运行组件已安装并核验官方npm校验值；whoami显示未登录。已启动OAuth，申请账号读取、Workers脚本写入、D1写入，不申请R2/计费变更权限，等待用户完成授权。28项完整回归通过，新增并发容量补测通过。尚未创建云端资源或正式部署。

授权成功：wrangler确认OAuth登录。只读Workers账号设置成功，但default_usage_model=standard不能证明套餐免费。订阅读取返回403（当前OAuth无Billing Read），因此未通过免费套餐核验，不创建或部署资源。workers/subdomain返回404，账号尚未创建workers.dev子域名；已打开官方Workers & Pages控制台，等待用户提供当前套餐Free状态。

## 2026-10-24 Cloudflare 实际部署结果

用户截图确认 Workers Free $0 Current plan。已完成 OAuth、D1 数据库创建和 001–005 远程迁移，部署版本 68b4c241-613a-4ebb-9914-f4c23d7fffdb。

正式入口：https://pocket-story.2997067828.workers.dev/studio

公网实测：/studio 200；/api/health 200，数据库 cloudflare-d1、素材 d1-private-chunks；/api/auth/me onlineReady=false；未登录作品接口401；不存在的读者链接404。30项自动测试通过，最后素材发布改为聚合完整性检查后，2项Cloudflare后端测试再次通过。本地Cloudflare运行时浏览器验证了作品库、编辑器与锁屏。公网浏览器首次打开超时，尚不能声称公网浏览器验收通过。

当前只绑定免费Workers网页资源和D1，没有R2、付费套餐或自动升级。所有请求（含网页静态资源）经过服务开关，会占用Workers免费请求额度。单文件4MiB、素材合计300MiB、作品文档预算80MiB；超限拒绝操作，不自动收费。SERVICE_ENABLED=false并重新部署可停服。免费套餐配额达到后由平台限制；目前没有独立常驻账单监控，不能承诺检测账号被外部升级后自动停服。不得改为付费套餐。

尚未配置邮件密钥和有效发信地址，生产验证码申请返回503；不能登录，正式在线创作、素材上传和作品发布暂不能对用户开放。试用创作仅保存在当前浏览器，不属于正式在线保存。未创建虚假账号、假验证码或虚假作品阅读链接。正式发布后的链接格式为 /read/公开ID，当前无已发布用户作品。

需求修改编号1（iOS界面与锁屏消息显示选项）仍待用户统一确认，本轮没有实施。
