import { RichTextSection } from './RichTextSection';

export type JiraCommentViewModel = {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
};

export function JiraCommentsPanel({ comments }: { comments: JiraCommentViewModel[] }) {
  return (
    <section className="jiraDocSection">
      <div className="jiraSectionTitleRow">
        <h3>Jira Comments</h3>
        <span>{comments.length} comment(s)</span>
      </div>
      {comments.length === 0 ? (
        <div className="jiraEmptyState">No Jira comments found for this ticket.</div>
      ) : (
        <div className="jiraCommentStack">
          {comments.slice(0, 8).map((comment) => (
            <article className="jiraCommentCard" key={comment.id || `${comment.author}-${comment.updated}`}>
              <div className="jiraCommentHeader">
                <strong>{comment.author || 'Unknown'}</strong>
                <span>{formatDateTime(comment.updated || comment.created)}</span>
              </div>
              <RichTextSection title="Comment" content={comment.body} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString() : 'No date';
}
