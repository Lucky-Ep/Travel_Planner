import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import client from './api/client';
import * as authApi from './api/auth';
import { listTrips } from './api/trips';
import mockAdapter from './api/mock/mockAdapter';
import { mockDb } from './api/mock/mockDb';
import { AuthProvider } from './auth/AuthContext';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import { getToken, setToken } from './auth/tokenStorage';

jest.mock('./api/trips', () => ({ listTrips: jest.fn() }));
jest.mock('./pages/TripOverview', () => () => <h1>行程总览</h1>);

const originalAdapter = client.defaults.adapter;
const DEMO = { email: 'demo@travelplanner.com', password: 'demo1234' };

beforeEach(() => {
  window.localStorage.clear();
  mockDb.reset();
  window.history.replaceState({}, '', '/');
  client.defaults.adapter = mockAdapter;
  listTrips.mockResolvedValue([]);
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
])('%s时保留凭证，重试成功后恢复原页面', async (_, status, code) => {
  const user = userEvent.setup();
  const token = await seedSession();
  window.history.replaceState({}, '', '/trips?day=2#map');
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
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
  }

  expect(await screen.findByRole('heading', { name: '行程总览' })).toBeInTheDocument();
  expect(window.location.pathname + window.location.search + window.location.hash)
    .toBe('/trips?day=2#map');
  expect(getToken()).toBe(token);
});

test('已保存的凭证在登录页恢复失败时也能重试', async () => {
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

test('凭证过期返回401时清除凭证，重新登录后恢复完整原地址', async () => {
  const user = userEvent.setup();
  setToken('expired-token');
  window.history.replaceState({}, '', '/trips?day=2#map');
  render(<App />);

  await screen.findByRole('heading', { name: '登录 Travel Planner' });
  expect(getToken()).toBeNull();
  expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();

  await signIn(user);
  await screen.findByRole('heading', { name: '行程总览' });
  expect(window.location.pathname + window.location.search + window.location.hash)
    .toBe('/trips?day=2#map');
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

test('未登录访问受保护页面，登录后保留查询参数和锚点', async () => {
  const user = userEvent.setup();
  window.history.replaceState({}, '', '/trips?day=2#map');
  render(<App />);

  await signIn(user);
  await screen.findByRole('heading', { name: '行程总览' });
  expect(window.location.pathname + window.location.search + window.location.hash)
    .toBe('/trips?day=2#map');
});

test.each(['//evil.example', '/\\evil.example', '/login'])('拒绝不安全的跳转目标 %s', async (pathname) => {
  await seedSession();
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname } } }]}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<div>登录页</div>} />
          </Route>
          <Route path="/" element={<div>安全主页</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByText('安全主页')).toBeInTheDocument());
});
