import { Badge } from './Badge';

export type TicketHeaderViewModel = {
  key: string;
  title: string;
  issueType: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  environment: string;
  updated: string;
  url?: string;
};

export function TicketHeaderCard({ ticket }: { ticket: TicketHeaderViewModel }) {
  return (
    <section className="ticketHeaderCard">
      <div className="ticketHeaderMain">
        <div>
          <span className="ticketKey">{ticket.key}</span>
          <h2>{ticket.title}</h2>
        </div>
        <div className="ticketBadgeRow">
          <Badge tone="info">{ticket.issueType || 'Ticket'}</Badge>
          <Badge tone={statusTone(ticket.status)}>{ticket.status || 'Unknown'}</Badge>
          <Badge tone={priorityTone(ticket.priority)}>{ticket.priority || 'None'}</Badge>
        </div>
      </div>
      <div className="ticketHeaderMeta">
        <HeaderMeta label="Assignee" value={ticket.assignee || 'Unassigned'} />
        <HeaderMeta label="Reporter" value={ticket.reporter || 'N/A'} />
        <HeaderMeta label="Environment" value={ticket.environment || 'N/A'} />
        <HeaderMeta label="Updated" value={formatDate(ticket.updated)} />
      </div>
      {ticket.url && (
        <a className="ticketExternalLink" href={ticket.url} target="_blank" rel="noreferrer">
          Open in Jira
        </a>
      )}
    </section>
  );
}

function HeaderMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString() : 'No date';
}

function statusTone(value: string) {
  return /done|closed|resolved|complete/i.test(value) ? 'success' : /block|hold/i.test(value) ? 'danger' : 'info';
}

function priorityTone(value: string) {
  return /critical|highest|high/i.test(value) ? 'danger' : /medium/i.test(value) ? 'warning' : 'default';
}
