import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import client from './api/client';
import * as authApi from './api/auth';
import mockAdapter from './api/mock/mockAdapter';
import { mockDb } from './api/mock/mockDb';
import { getToken, setToken } from './auth/tokenStorage';

const originalAdapter = client.defaults.adapter;
const DEMO = { email: 'demo@travelplanner.com', password: 'demo1234' };

beforeEach(() => {
  window.localStorage.clear();
  mockDb.reset();
  window.history.replaceState({}, '', '/');
  client.defaults.adapter = mockAdapter;
});

afterEach(() => {
  client.defaults.adapter = originalAdapter;
});

async function seedSession() {
  const { token } = await authApi.login(DEMO);
  setToken(token);
  return token;
}

function requestFailure(config, status, code) {
  const error = new Error('模拟请求失败');
  error.config = config;
  error.code = code;
  if (status) error.response = { status, data: { message: '服务暂时不可用' } };
  return error;
}

async function signIn(user) {
  await screen.findByRole('heading', { name: '登录 Travel Planner' });
  await user.type(screen.getByLabelText('邮箱'), DEMO.email);
  await user.type(screen.getByLabelText('密码'), DEMO.password);
  await user.click(screen.getByRole('button', { name: '登录' }));
}

test.each([
  ['断网', undefined, 'ERR_NETWORK'],
  ['超时', undefined, 'ECONNABORTED'],
  ['服务异常', 503, undefined],
])('%s时保留凭证并阻止受保护内容，重试成功后恢复原页面', async (_, status, code) => {
  const user = userEvent.setup();
  const token = await seedSession();
  window.history.replaceState({}, '', '/trips/101?day=2#map');
  let failedRequests = 0;
  client.defaults.adapter = async (config) => {
    if (config.url === '/auth/me' && failedRequests++ < 2) {
      throw requestFailure(config, status, code);
    }
    return mockAdapter(config);
  };
  render(<App />);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    expect(await screen.findByRole('heading', { name: '暂时无法恢复登录' })).toBeInTheDocument();
    expect(getToken()).toBe(token);
    expect(screen.queryByRole('heading', { name: 'Trip 详情 #101' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
  }

  expect(await screen.findByRole('heading', { name: 'Trip 详情 #101' })).toBeInTheDocument();
  expect(window.location.pathname + window.location.search + window.location.hash)
    .toBe('/trips/101?day=2#map');
  expect(getToken()).toBe(token);
});

test('登录页的凭证恢复失败也提供重试入口', async () => {
  const user = userEvent.setup();
  const token = await seedSession();
  window.history.replaceState({}, '', '/login');
  client.defaults.adapter = async (config) => { throw requestFailure(config, 503); };
  render(<App />);
  await screen.findByRole('heading', { name: '暂时无法恢复登录' });
  expect(getToken()).toBe(token);
  expect(screen.queryByLabelText('密码')).not.toBeInTheDocument();

  client.defaults.adapter = mockAdapter;
  await user.click(screen.getByRole('button', { name: '重试' }));
  expect(await screen.findByRole('heading', { name: 'Demo User' })).toBeInTheDocument();
});

test('过期凭证返回401时清除凭证，重新登录后恢复完整原地址', async () => {
  const user = userEvent.setup();
  setToken('expired-token');
  window.history.replaceState({}, '', '/trips/101?day=2#map');
  render(<App />);
  await screen.findByRole('heading', { name: '登录 Travel Planner' });
  expect(getToken()).toBeNull();
  expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();

  await signIn(user);
  await screen.findByRole('heading', { name: 'Trip 详情 #101' });
  expect(window.location.pathname + window.location.search + window.location.hash)
    .toBe('/trips/101?day=2#map');
});

test('网络恢复后重试发现凭证已过期，转到登录页', async () => {
  const user = userEvent.setup();
  await seedSession();
  client.defaults.adapter = async (config) => { throw requestFailure(config, undefined, 'ERR_NETWORK'); };
  render(<App />);
  await screen.findByRole('heading', { name: '暂时无法恢复登录' });
  const db = mockDb.read();
  db.sessions = {};
  mockDb.write(db);
  client.defaults.adapter = mockAdapter;
  await user.click(screen.getByRole('button', { name: '重试' }));
  await screen.findByRole('heading', { name: '登录 Travel Planner' });
  expect(getToken()).toBeNull();
});

test.each(['/trips/101', '/trips/101?day=2#map'])('未登录访问%s，登录后回到原地址', async (address) => {
  const user = userEvent.setup();
  window.history.replaceState({}, '', address);
  render(<App />);
  await signIn(user);
  await screen.findByRole('heading', { name: 'Trip 详情 #101' });
  expect(window.location.pathname + window.location.search + window.location.hash).toBe(address);
});

test('重复邮箱注册显示409提示，不创建新账户或登录态', async () => {
  const user = userEvent.setup();
  const count = mockDb.read().users.length;
  window.history.replaceState({}, '', '/register');
  render(<App />);
  await screen.findByRole('heading', { name: '创建账号' });
  await user.type(screen.getByLabelText('用户名'), 'Duplicate User');
  await user.type(screen.getByLabelText('邮箱'), DEMO.email);
  await user.type(screen.getByLabelText('密码'), DEMO.password);
  await user.type(screen.getByLabelText('确认密码'), DEMO.password);
  await user.click(screen.getByRole('button', { name: '注册' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('该邮箱已被注册');
  expect(mockDb.read().users).toHaveLength(count);
  expect(getToken()).toBeNull();
  expect(window.location.pathname).toBe('/register');
});

test('Trip列表请求失败与空列表区分，重试后显示行程并保留登录态', async () => {
  const user = userEvent.setup();
  const token = await seedSession();
  window.history.replaceState({}, '', '/trips');
  let failTrips = true;
  client.defaults.adapter = async (config) => {
    if (config.url === '/trips' && failTrips) throw requestFailure(config, 503);
    return mockAdapter(config);
  };
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('服务暂时不可用');
  expect(screen.queryByText('还没有行程')).not.toBeInTheDocument();
  expect(getToken()).toBe(token);
  failTrips = false;
  await user.click(screen.getByRole('button', { name: '重试' }));
  expect(await screen.findByText('My Trip to Tokyo')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('已登录时Trip接口返回401，退出登录并隐藏行程列表', async () => {
  await seedSession();
  window.history.replaceState({}, '', '/trips');
  client.defaults.adapter = async (config) => {
    if (config.url === '/trips') throw requestFailure(config, 401);
    return mockAdapter(config);
  };
  render(<App />);
  await screen.findByRole('heading', { name: '登录 Travel Planner' });
  await waitFor(() => expect(getToken()).toBeNull());
  expect(screen.queryByRole('heading', { name: 'My Trips' })).not.toBeInTheDocument();
});
