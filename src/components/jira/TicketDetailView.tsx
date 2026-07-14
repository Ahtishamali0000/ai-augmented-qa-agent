import { AcceptanceCriteriaChecklist } from './AcceptanceCriteriaChecklist';
import { JiraCommentsPanel, type JiraCommentViewModel } from './JiraCommentsPanel';
import { RichTextSection } from './RichTextSection';
import { TicketHeaderCard, type TicketHeaderViewModel } from './TicketHeaderCard';

export type TicketDetailViewModel = TicketHeaderViewModel & {
  description: string;
  acceptanceCriteria: string[];
  components: string[];
  comments: JiraCommentViewModel[];
};

export function TicketDetailView({ ticket }: { ticket: TicketDetailViewModel | null }) {
  if (!ticket) {
    return <div className="jiraEmptyState">Select a Jira ticket to see details, analysis, coverage, and script generation.</div>;
  }

  return (
    <div className="ticketDetailView">
      <TicketHeaderCard ticket={ticket} />
      <div className="ticketDocumentLayout">
        <main className="ticketDocumentMain">
          <RichTextSection title="Description" content={ticket.description} emptyText="No Jira description available." />
          <AcceptanceCriteriaChecklist items={ticket.acceptanceCriteria} />
          <JiraCommentsPanel comments={ticket.comments} />
        </main>
        <aside className="ticketSummarySidebar">
          <section>
            <h3>Components</h3>
            <div className="chipRow">
              {(ticket.components.length ? ticket.components : ['General UI']).map((component) => <span key={component}>{component}</span>)}
            </div>
          </section>
          <section>
            <h3>Readable Format</h3>
            <p>Descriptions, criteria, and comments are rendered as sections, paragraphs, bullets, and checklists for QA review.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
