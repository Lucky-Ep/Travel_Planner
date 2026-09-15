import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { mockDb } from './api/mock/mockDb';

const DEMO = { email: 'demo@travelplanner.com', password: 'demo1234' };

beforeEach(() => {
  window.localStorage.clear();
  mockDb.reset();
  window.history.pushState({}, '', '/');
});

/** 从登录页走完登录流程，停在用户主页 */
async function signIn(user, { email = DEMO.email, password = DEMO.password } = {}) {
  await screen.findByRole('heading', { name: /登录 Travel Planner/ });
  await user.type(screen.getByLabelText('邮箱'), email);
  await user.type(screen.getByLabelText('密码'), password);
  await user.click(screen.getByRole('button', { name: '登录' }));
}

test('未登录访问受保护页面时被重定向到登录页', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: /登录 Travel Planner/ })).toBeInTheDocument();
});

test('登录成功后进入用户主页并显示 Trip 列表入口', async () => {
  const user = userEvent.setup();
  render(<App />);

  await signIn(user);

  expect(await screen.findByRole('heading', { name: 'Demo User' })).toBeInTheDocument();
  // 导航栏和主页卡片各有一个 Trip 列表入口
  expect(screen.getAllByRole('link', { name: /My Trips/ })).toHaveLength(2);
});

test('密码错误时展示错误提示且停留在登录页', async () => {
  const user = userEvent.setup();
  render(<App />);

  await signIn(user, { password: 'wrong-password' });

  expect(await screen.findByRole('alert')).toHaveTextContent('邮箱或密码不正确');
  expect(screen.getByRole('heading', { name: /登录 Travel Planner/ })).toBeInTheDocument();
});

test('登录态写入 localStorage，刷新后仍然保持登录', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);

  await signIn(user);
  await screen.findByRole('heading', { name: 'Demo User' });

  await waitFor(() => expect(window.localStorage.getItem('tp.auth.token')).toBeTruthy());

  // 模拟刷新页面
  unmount();
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Demo User' })).toBeInTheDocument();
});

test('注册成功后自动登录并进入用户主页', async () => {
  const user = userEvent.setup();
  render(<App />);

  await screen.findByRole('heading', { name: /登录 Travel Planner/ });
  await user.click(screen.getByRole('link', { name: '立即注册' }));

  await screen.findByRole('heading', { name: '创建账号' });
  await user.type(screen.getByLabelText('用户名'), 'New User');
  await user.type(screen.getByLabelText('邮箱'), 'new@travelplanner.com');
  await user.type(screen.getByLabelText('密码'), 'newpass123');
  await user.type(screen.getByLabelText('确认密码'), 'newpass123');
  await user.click(screen.getByRole('button', { name: '注册' }));

  expect(await screen.findByRole('heading', { name: 'New User' })).toBeInTheDocument();
  await waitFor(() => expect(window.localStorage.getItem('tp.auth.token')).toBeTruthy());
});

test('注册时两次密码不一致会被前端拦下，不发请求', async () => {
  const user = userEvent.setup();
  render(<App />);

  await screen.findByRole('heading', { name: /登录 Travel Planner/ });
  await user.click(screen.getByRole('link', { name: '立即注册' }));

  await screen.findByRole('heading', { name: '创建账号' });
  await user.type(screen.getByLabelText('用户名'), 'New User');
  await user.type(screen.getByLabelText('邮箱'), 'new@travelplanner.com');
  await user.type(screen.getByLabelText('密码'), 'newpass123');
  await user.type(screen.getByLabelText('确认密码'), 'newpass456');
  await user.click(screen.getByRole('button', { name: '注册' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('两次输入的密码不一致');
  expect(window.localStorage.getItem('tp.auth.token')).toBeNull();
});

test('登出后清除凭证并退回登录页', async () => {
  const user = userEvent.setup();
  render(<App />);

  await signIn(user);
  await screen.findByRole('heading', { name: 'Demo User' });

  await user.click(screen.getByRole('button', { name: '登出' }));

  expect(await screen.findByRole('heading', { name: /登录 Travel Planner/ })).toBeInTheDocument();
  await waitFor(() => expect(window.localStorage.getItem('tp.auth.token')).toBeNull());
});

test('登出后直接深链到受保护页面仍然会被弹回登录页', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);

  await signIn(user);
  await screen.findByRole('heading', { name: 'Demo User' });
  await user.click(screen.getByRole('button', { name: '登出' }));
  await screen.findByRole('heading', { name: /登录 Travel Planner/ });

  // BrowserRouter 只在挂载时读一次 location，得重挂才算手输 URL
  unmount();
  window.history.pushState({}, '', '/trips');
  render(<App />);

  expect(await screen.findByRole('heading', { name: /登录 Travel Planner/ })).toBeInTheDocument();
});
