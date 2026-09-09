import { useAuth } from './AuthContext';
import '../pages/AuthPage.css';

export default function AuthRecoveryError() {
  const { retryRecovery } = useAuth();

  return (
    <main className="tp-auth-page">
      <section className="tp-auth-card" aria-labelledby="auth-recovery-title">
        <div className="tp-auth-header">
          <h1 id="auth-recovery-title">暂时无法恢复登录</h1>
        </div>
        <p className="tp-form-error" role="alert">
          网络连接或服务暂时不可用。请稍后重试，无需重新输入密码。
        </p>
        <button type="button" className="tp-btn tp-btn-primary tp-btn-block" onClick={retryRecovery}>
          重试
        </button>
      </section>
    </main>
  );
}
