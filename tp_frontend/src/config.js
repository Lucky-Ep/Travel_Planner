/**
 * 全局前端配置（模块 1 - App Framework）
 *
 * REACT_APP_API_BASE_URL : 后端 base url，默认 http://localhost:8080
 * REACT_APP_USE_MOCK     : "true" 时只有 Auth 使用本地 mock。
 *                          Trip、Day、POI、PlanItem 始终访问真实后端。
 * REACT_APP_DEV_USER_ID  : 认证后端完成前使用的开发用户 ID。
 */
const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
  useMock: process.env.REACT_APP_USE_MOCK === 'true',
  devUserId: Number(process.env.REACT_APP_DEV_USER_ID || 1),
};

export default config;
