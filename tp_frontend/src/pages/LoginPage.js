import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './AuthPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 被 ProtectedRoute 弹回来时记下的原地址，登录成功后跳回去
  const redirectTo = location.state?.from?.pathname || '/';

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
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
          <h1>登录 Travel Planner</h1>
          <p>规划你的下一段旅程</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
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
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? (
            <p className="tp-form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="tp-btn tp-btn-primary tp-btn-block" disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>

        <p className="tp-auth-footer">
          还没有账号？<Link to="/register">立即注册</Link>
        </p>

        <p className="tp-auth-hint">演示账号：demo@travelplanner.com / demo1234</p>
      </div>
    </div>
  );
}
