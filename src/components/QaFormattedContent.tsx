import { qaTextFormatter } from '../utils/qaTextFormatter';

export function QaFormattedContent({ content, emptyText = 'No content available.' }: { content: string; emptyText?: string }) {
  const blocks = qaTextFormatter(content);
  if (!blocks.length) return <p className="mutedText">{emptyText}</p>;

  return (
    <div className="qaFormattedContent">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          const Heading = `h${block.level}` as 'h2' | 'h3' | 'h4';
          return <Heading key={key}>{block.text}</Heading>;
        }
        if (block.type === 'paragraph') return <p key={key}>{block.text}</p>;
        if (block.type === 'bulletList') return <ul key={key}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
        if (block.type === 'numberedSteps') return <ol key={key}>{block.items.map((item) => <li key={item}>{item}</li>)}</ol>;
        if (block.type === 'checklist') {
          return <ul className="qaChecklist" key={key}>{block.items.map((item) => <li key={item.text}><span>{item.checked ? '✓' : '○'}</span>{item.text}</li>)}</ul>;
        }
        if (block.type === 'keyValue') return <p className="qaKeyValue" key={key}><strong>{block.label}</strong><span>{block.value}</span></p>;
        if (block.type === 'warning') return <aside className="qaWarning" key={key}>{block.text}</aside>;
        return <pre key={key}><code>{block.code}</code></pre>;
      })}
    </div>
  );
}
