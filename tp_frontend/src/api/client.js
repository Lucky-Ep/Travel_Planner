import axios from 'axios';
import config from '../config';
import { getToken, clearToken } from '../auth/tokenStorage';
import mockAdapter from './mock/mockAdapter';

/** 401 时广播，AuthContext 监听后清理登录态并跳转 /login */
export const UNAUTHORIZED_EVENT = 'tp:unauthorized';

const client = axios.create({
  baseURL: `${config.apiBaseUrl}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

if (config.useMock) {
  client.defaults.adapter = mockAdapter;
}

client.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    // 把后端各种错误形态收敛成一个 message，页面层只管展示
    error.message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (status ? `请求失败 (${status})` : '网络异常，请检查后端服务是否已启动');

    return Promise.reject(error);
  }
);

export default client;
