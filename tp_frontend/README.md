# Travel Planner — Frontend

## 快速开始

```bash
cp .env.example .env.development   # .env.* 不入库，clone 下来要先复制一份
npm install
npm start        # http://localhost:3000
npm test         # 8 个 auth flow 测试
npm run build
```

`.env.development` 里 `REACT_APP_USE_MOCK=true`，不需要后端就能完整跑通注册 / 登录 / 登出 / 主页 / Trip 列表。

演示账号：`demo@travelplanner.com` / `demo1234`

后端 `/api/auth/*` 上线后，把 `REACT_APP_USE_MOCK` 改成 `false` 即可，业务代码不用动。

注意 `useMock` 默认是 `false`。`npm run build` 不读 `.env.development`，默认开着会把 mock 打进生产包。测试环境的开关在 `.env.test`，那个文件要入库，删了测试会全挂。

---

## 模块 1：App Framework + User/Auth

### 已完成

| 交付物 | 位置 |
|---|---|
| App 主框架 / 路由表 | `src/App.js` |
| 页面导航 | `src/components/NavBar.js`、`src/components/AppLayout.js` |
| 注册 / 登录 / 登出 | `src/pages/RegisterPage.js`、`src/pages/LoginPage.js`、`NavBar` |
| 登录状态 | `src/auth/AuthContext.js`、`src/auth/tokenStorage.js` |
| 路由守卫 | `src/auth/ProtectedRoute.js`、`src/auth/PublicOnlyRoute.js` |
| 用户主页 | `src/pages/HomePage.js` |
| Trip 列表入口 | `src/pages/TripListPage.js` |
| HTTP 层 + 401 统一处理 | `src/api/client.js` |
| Design tokens | `src/index.css`（**其他模块请用 CSS 变量，不要硬编码颜色**） |

### 登录态设计

- 注册 / 登录成功后后端返回 `{ token, user }`，token 存 `localStorage`
- 每个请求由 axios 拦截器自动加 `Authorization: Bearer <token>`
- 冷启动时用 token 调 `GET /api/auth/me` 恢复用户信息，失败就清凭证退回匿名态
- 任意请求返回 401 → 清凭证 + 广播 `tp:unauthorized` → `AuthContext` 退出登录态 → 守卫跳 `/login`
- 被弹回登录页时原地址记在 `location.state.from`，登录后跳回去（deep link 不丢）

> 如果最终和后端定成 **Session + HttpOnly Cookie**，只需要改 `tokenStorage.js`（改成空实现）+ 给 axios 打开 `withCredentials`，其余代码不受影响。

---

## Auth API 契约（草案，待模块 6 确认）

```
POST /api/auth/register   { email, password, displayName }  -> 201 { token, user }
POST /api/auth/login      { email, password }               -> 200 { token, user }
POST /api/auth/logout                                       -> 204
GET  /api/auth/me                                           -> 200 { user }
GET  /api/trips                                             -> 200 { trips: [...] }

user  = { id, email, displayName, createdAt }
错误体 = { message: string }
错误码  400 参数不合法 / 401 未认证或密码错 / 409 邮箱已注册
```

后端待办（模块 6 / 后端统筹）：

- [ ] `spring-boot-starter-security` + BCrypt + JWT 依赖还没加
- [ ] CORS 需放行 `http://localhost:3000`，否则前端本地调不通
- [ ] `User` entity 已有 `passwordHash`，缺 `AuthController` / `AuthService`

---

## 给模块 2 / 3 / 4 的挂载点

路由已经接通，登录态、导航、布局都是现成的，把占位组件换成自己的页面即可：

| 路由 | 当前占位 | 归属 |
|---|---|---|
| `/explore` | `pages/placeholders/ExplorePage.js` | 模块 2 POI Management |
| `/trips/new`、`/trips/:tripId` | `pages/placeholders/TripDetailPage.js` | 模块 3 Trip Planning + 模块 4 Map |

加新页面只要在 `src/App.js` 受保护的那段里加一行 `<Route>`。

拿当前用户：

```js
import { useAuth } from '../auth/AuthContext';
const { user, isAuthenticated, logout } = useAuth();
```

发请求（自动带 token、自动处理 401）：

```js
import client from '../api/client';
const { data } = await client.get('/trips/123');
```

---

## 目录结构

```
src/
├── api/
│   ├── client.js        axios 实例 + 拦截器
│   ├── auth.js          Auth API
│   ├── trips.js         Trip 只读接口（完整 CRUD 归模块 3/6）
│   └── mock/            后端 ready 后整个目录可删
├── auth/                AuthContext / 路由守卫 / token 存储
├── components/          NavBar / AppLayout / FullPageSpinner
├── pages/               Login / Register / Home / TripList / 404
│   └── placeholders/    模块 2/3/4 的占位页
├── utils/date.js        日期格式化（避开 LocalDate 的时区坑）
├── config.js
└── index.css            design tokens + 通用组件样式
```
