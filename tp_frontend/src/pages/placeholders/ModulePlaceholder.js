import './ModulePlaceholder.css';

/**
 * 给模块 2 / 3 / 4 预留的挂载点。
 * 对应同学接手时，把这个组件换成自己的页面即可，路由、登录态、导航都已经就绪。
 */
export default function ModulePlaceholder({ module, title, todos = [] }) {
  return (
    <div className="tp-placeholder">
      <span className="tp-placeholder-badge">模块 {module}</span>
      <h1>{title}</h1>

      <div className="tp-placeholder-box">
        <p>这个路由已由模块 1（App Framework）接通，待实现的内容：</p>
        <ul>
          {todos.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
