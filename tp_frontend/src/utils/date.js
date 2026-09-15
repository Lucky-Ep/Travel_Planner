/**
 * 后端的 startDate / endDate 是纯日期（yyyy-MM-dd，LocalDate）。
 * 直接 new Date('2026-10-01') 会按 UTC 午夜解析，再用本地时区渲染就会差一天，
 * 所以这里手动拆成本地时间构造。
 */
export function parseLocalDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const SHORT_DATE = { month: 'short', day: 'numeric' };

/** "Oct 1 – Oct 5" */
export function formatDateRange(startDate, endDate, locale = 'en-US') {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end) return '';
  return `${start.toLocaleDateString(locale, SHORT_DATE)} – ${end.toLocaleDateString(locale, SHORT_DATE)}`;
}
