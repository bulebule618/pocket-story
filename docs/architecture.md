# 架构

基线：需求 v3。实现采用原生 ES Modules + Node 24，沿用项目无框架前端的运行方式。没有增加构建时服务或翻译 API。领域边界独立，后续可迁移 TypeScript；当前运行时校验由 domain.js 完成。

## 边界与数据

- dist/domain.js：schemaVersion 3、稳定内容 ID、引用校验、复制依赖、相册序列、存档兼容。
- dist/engine-v3.js：可注入现实时间、纯状态转移、事件次数、任务、来电队列、外部效果。
- dist/player.js：编辑、试玩、读者共用手机；音频、相机、手势、消息可见区域适配。
- dist/app.js：中文三栏编辑、目录、属性表单、作品库、修订保存与冲突处理。
- dist/services.js：HTTP、浏览器试用存储、等比例图片压缩。
- dist/trial-assets.js：IndexedDB 保存试用 Blob，稳定引用经 object URL 展示；登录转入时真实上传。
- server/api.mjs：真实邮件验证码、会话、所有权、草稿修订、素材、发布版本与匿名入口。
- server/store.mjs + migrations/001_initial.sql：SQLite 持久化与一次性 schema 迁移。

正式草稿 JSON 与关系记录分离：users/challenges/sessions、projects/revisions/versions、characters、assets/asset_refs。revisions 只记录修订编号，不提供在线草稿历史恢复。versions 保存不可变文档，发布成功事务性切换稳定入口。删除草稿时保留发布快照的数据库行以支持用户选择保留链接；产品没有恢复删除功能。隐藏素材永不删除引用文件。

## 四类状态

1. 作品定义 story；在线通过修订检查保存。
2. 后台 section、selectedId、面板、undoStack、redoStack，仅会话内。
3. Phone(mode=play) 内独立进度，不写读者存档。
4. /read/:publicId 以 pocket-reader-<publicId> 保存单设备单进度。

未登录试用在 pocket-v3-trials 本机暂存；素材存在独立 IndexedDB。旧 pocket-story-draft-v1 与本机发布版本不自动转为正式作品，旧导出文件退出服务目录，历史代码保留于 work/legacy。没有产品导入导出入口。

## 图片与时间

手机相册按相簿入口构造可见序列，recentOrder 为照片内容身份的独立顺序；相簿 photoIds 是多对多归属，不复制照片身份。聊天大图只关闭，人物资料册上下切换，手机相册左右切换及缩放拖动。实际双指 / 滚轮仍待浏览器验收。

事件按列表顺序，现实时间 due 持久化；补演时延后同一消息序列保持间隔，后续动作可按 actual 或 scheduled。来电队列按时间，逐通 replay / missed。效果由引擎返回，UI 负责音频，音频 ended 不调用挂断。

存档采取保守兼容：兼容版本和完整定义指纹一致才继续，并核对依赖 ID、任务、成员、开关、密码状态、回复与通话。定义改变则提示读者重开；确认前保留旧存档，不做部分迁移。

## 服务与部署

本地 /api 是真实 SQLite 和文件写入，邮件未配置返回 503；测试专用内存邮件接收器只通过测试代码注入，无开发验证码 API、无模拟登录按钮。会话 token 仅 HttpOnly cookie，数据库保存摘要。验证码有 10 分钟有效期、5 次尝试、邮箱/IP 频率限制、一次消费。作者操作从会话确定 owner，不接受客户端 ownerId。写请求检查 Origin。

Node 生产托管需持久卷、HTTPS、Resend 验证域名；单实例 SQLite WAL，不将其伪称云端数据库服务。现有 Sites ID 保留但静态发布不能运行本后端；其 Workers 需要 D1/R2 适配，平台当前身份与 audience 也不满足匿名邮箱产品需求。没有把旧静态配置部署成完整平台。
