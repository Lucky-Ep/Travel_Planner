import './FullPageSpinner.css';

export default function FullPageSpinner({ label }) {
  return (
    <div className="tp-spinner-page" role="status" aria-live="polite">
      <div className="tp-spinner" />
      {label ? <p className="tp-spinner-label">{label}</p> : null}
    </div>
  );
}
