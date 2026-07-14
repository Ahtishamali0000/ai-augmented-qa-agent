type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({ children, tone = 'default' }: { children: string; tone?: BadgeTone }) {
  return <span className={`jiraBadge jiraBadge-${tone}`}>{children || 'N/A'}</span>;
}
