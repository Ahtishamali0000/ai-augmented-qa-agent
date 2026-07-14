export function MetricCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  return (
    <div className={`jiraMetricCard jiraMetricCard-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
