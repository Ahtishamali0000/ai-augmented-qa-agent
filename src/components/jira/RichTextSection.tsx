import { QaFormattedContent } from '../QaFormattedContent';

export function RichTextSection({ title, content, emptyText = 'No content available.' }: { title: string; content: string; emptyText?: string }) {
  return (
    <section className="jiraDocSection">
      <h3>{title}</h3>
      <QaFormattedContent content={content} emptyText={emptyText} />
    </section>
  );
}
