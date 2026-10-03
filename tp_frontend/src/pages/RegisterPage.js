import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './AuthPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 前端先校验一遍，减少无效请求；后端仍然要校验一次（模块 6） */
function validate({ displayName, email, password, confirmPassword }) {
  if (!displayName.trim()) return '请填写用户名';
  if (!EMAIL_RE.test(email)) return '请输入有效的邮箱地址';
  if (password.length < 8) return '密码至少 8 位';
  if (password !== confirmPassword) return '两次输入的密码不一致';
  return '';
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const clientError = validate(form);
    if (clientError) {
      setError(clientError);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      // 注册成功直接拿到 token，自动登录，省掉一次跳转
      await register({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="tp-auth-page">
      <div className="tp-auth-card">
        <div className="tp-auth-header">
          <span className="tp-auth-mark">TP</span>
          <h1>创建账号</h1>
          <p>几秒钟就能开始规划行程</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="tp-field">
            <span>用户名</span>
            <input
              type="text"
              value={form.displayName}
              onChange={update('displayName')}
              autoComplete="nickname"
              placeholder="William"
              required
            />
          </label>

          <label className="tp-field">
            <span>邮箱</span>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="tp-field">
            <span>密码</span>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              placeholder="至少 8 位"
              required
            />
          </label>

          <label className="tp-field">
            <span>确认密码</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              autoComplete="new-password"
              placeholder="再输入一次"
              required
            />
          </label>

          {error ? (
            <p className="tp-form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="tp-btn tp-btn-primary tp-btn-block" disabled={submitting}>
            {submitting ? '注册中…' : '注册'}
          </button>
        </form>

        <p className="tp-auth-footer">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
}
