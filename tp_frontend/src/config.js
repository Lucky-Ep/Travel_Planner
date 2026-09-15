/**
 * 全局前端配置（模块 1 - App Framework）
 *
 * REACT_APP_API_BASE_URL : 后端 base url，默认 http://localhost:8080
 * REACT_APP_USE_MOCK     : "true" 时走本地 mock，不依赖后端。
 *                          后端 Auth API 还没落地，先用 mock 让整个 App 跑通，
 *                          等模块 6 的接口 ready 后把这个开关改成 false 即可，
 *                          业务代码一行都不用动。默认 false，因为 build 不读
 *                          .env.development，默认开着会把 mock 带进生产包。
 */
const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080',
  useMock: process.env.REACT_APP_USE_MOCK === 'true',
};

export default config;
