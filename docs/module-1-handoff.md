# 功能组 1 接入与验收说明

负责人：Zhuoqi Liu。范围：公共布局、导航、认证前端、登录态、主页及 Trip 列表入口。

## 当前交付范围

- 已实现注册、登录、登出、刷新恢复、路由保护、用户主页及 Trip 列表入口。
- 恢复登录时，401 清除凭证并转到登录页；断网、超时及其他非 401 错误保留凭证，显示重试入口。
- 恢复加载中或失败时不挂载受保护页面，不发送页面内的业务请求。
- 重试失败仍可继续重试；重试成功恢复当前页面，重试返回 401 则要求重新登录。
- 登录后的站内回跳保留 pathname、query 和 hash，由公共路由守卫统一执行。
- POI 和行程详情仍为占位页；本分支使用 mock 完成前端验证，真实后端集成尚未验收。

## Windows 启动和验证

在项目根目录的 PowerShell 中执行：

```powershell
Set-Location tp_frontend
# 仅首次缺少配置时复制，避免覆盖已有本地配置。
if (-not (Test-Path .env.development)) {
    Copy-Item .env.example .env.development
}
npm.cmd ci
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run build
npm.cmd start
```

开发模式使用 `.env.development`，测试模式使用已入库的 `.env.test`；生产构建不读取 `.env.development`。
`REACT_APP_USE_MOCK=true` 启用模拟接口，缺省为 false。修改配置后需重启开发服务器。
mock 演示账户为 `demo@travelplanner.com` / `demo1234`。mock 账户和会话存于浏览器 localStorage，仅使用测试密码。

真实联调时，将 `.env.development` 的 `REACT_APP_USE_MOCK` 设为 `false`，设置后端地址 `REACT_APP_API_BASE_URL`，按接口确认结果适配 API 层。

## 其他模块如何接入

| 接入内容 | 约定 |
| --- | --- |
| 公共布局和登录保护 | 在 `src/App.js` 的 `ProtectedRoute` / `AppLayout` 下挂载页面 |
| 获取当前用户 | `useAuth()` 返回 `user`、`isAuthenticated`、`logout` 等；受保护页面只在认证成功后挂载 |
| 发请求 | 使用 `src/api/client.js`，自动添加 Bearer token 并统一处理 401；业务接口封装在 `src/api/` |
| 恢复失败 | 公共守卫负责显示恢复错误；页面不要自行清除凭证或重复调用 `/auth/me` |
| POI 页面 | 替换 `/explore` 的占位组件，由组 2 接入 |
| Trip 编辑和地图 | 组 3/4 接入 `/trips/:tripId`；当前 `/trips/new` 由同一占位组件识别，接真实 CRUD 前应明确新建路由处理 |
| 统一样式 | 复用 `src/index.css` 中的 CSS 变量和公共按钮样式 |

## 等待组 6 / 统筹确认的契约

以下是前端当前期待的接口，不表示真实后端已经实现或验收。

| 接口 | 前端期待的结果 |
| --- | --- |
| `POST /api/auth/register` | 请求 `{ email, password, displayName }`，201 `{ token, user }` |
| `POST /api/auth/login` | 请求 `{ email, password }`，200 `{ token, user }` |
| `POST /api/auth/logout` | 204 |
| `GET /api/auth/me` | 200 `{ user }`；凭证无效为 401；服务错误不能冒充 401 |
| `GET /api/trips` | 200 `{ trips: [...] }`；条目包含 `id, name, city, startDate, endDate, dayCount` |

`user` 当前期待 `id, email, displayName, createdAt`；错误体期待 `{ message }`。

- 确认认证接口负责人、工作分支及可联调时间，选择 Bearer token 或 Cookie Session。
- 对齐 `name` / `displayName`、日期格式、`dayCount` 来源和错误码。
- 此前核对的 `feature/trip-crud-api` 使用 `/api/users/{userId}/trips`；确认最终路径和响应结构，适配 `src/api/trips.js`。
- 后端必须校验当前用户对 Trip 的访问权限，不能只信任 URL 中的 userId；前端守卫不能替代后端授权。
- 确认允许的前端 origin、登录过期规则和登出语义。

## 验收与演示

自动化测试中，`App.test.js` 保留原有 8 个基础场景；`App.recovery.test.js` 增加 11 个场景（包括参数化场景）：

- 断网、超时和 503：连续失败保留凭证、隐藏受保护内容，重试后恢复原页面。
- 登录页恢复失败也能重试。
- 冷启动凭证过期：清除凭证，重新登录后恢复完整地址。
- 网络故障后重试发现凭证过期：转到登录页。
- 普通深链接以及带 query/hash 的深链接回跳。
- 重复邮箱注册：显示错误，不增加账户或建立登录态。
- Trip 列表加载失败：区别于空列表，重试成功显示数据。
- 已登录后的 Trip 请求返回 401：清除会话并隐藏列表。

测试通过 Axios adapter 注入失败，保留真实请求拦截器、AuthContext、守卫及页面流程；不依赖真实后端。

本次本地验证结果：2 个测试套件、19 项测试全部通过；CI 模式生产构建成功；`git diff --check` 通过。测试中仍有 React Router v7 迁移提示，不影响当前测试通过。新增场景通过自动化验证，尚未进行真实后端浏览器联调。

浏览器演示：

1. 登出后输入 `/trips/101?day=2#map`，用演示账户登录，确认完整地址保留且显示详情占位页。
2. 在注册页面用演示账户邮箱再次注册，确认出现重复邮箱提示。
3. 用测试命令展示错误恢复和权限拦截的自动化结果。

浏览器的 Offline 开关不会让本地 mock adapter 模拟断网。网络/503 的恢复场景本周使用自动化故障注入验证；真实后端联调时，再验证停止服务、恢复服务、点击重试的浏览器流程。

## 本周汇报参考

完成本地与远端功能组 1 分支同步及备份差异核对。在原有 9 步手动验收通过的基础上，完善登录恢复异常处理和完整地址回跳，增加 11 个自动化测试场景，并整理模块接入与接口待确认清单。真实认证、Trip API 及其他模块页面的联调仍待团队接口确认。

汇报时附本次实际测试与构建结果；没有真实接口联调证据时，不将 mock 验收表述为后端联调完成。
