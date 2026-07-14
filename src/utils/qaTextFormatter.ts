export type QaTextBlock =
  | { type: 'heading'; text: string; level: 2 | 3 | 4 }
  | { type: 'paragraph'; text: string }
  | { type: 'bulletList'; items: string[] }
  | { type: 'numberedSteps'; items: string[] }
  | { type: 'checklist'; items: Array<{ text: string; checked: boolean }> }
  | { type: 'keyValue'; label: string; value: string }
  | { type: 'warning'; text: string }
  | { type: 'codeBlock'; code: string; language?: string };

export function qaTextFormatter(value: string): QaTextBlock[] {
  const text = normalize(value);
  if (!text) return [];

  const blocks: QaTextBlock[] = [];
  const lines = text.split('\n');
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let steps: string[] = [];
  let checklist: Array<{ text: string; checked: boolean }> = [];
  let code: string[] = [];
  let codeLanguage = '';
  let inCode = false;

  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
    if (bullets.length) blocks.push({ type: 'bulletList', items: bullets });
    if (steps.length) blocks.push({ type: 'numberedSteps', items: steps });
    if (checklist.length) blocks.push({ type: 'checklist', items: checklist });
    paragraph = [];
    bullets = [];
    steps = [];
    checklist = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'codeBlock', code: code.join('\n'), language: codeLanguage || undefined });
        code = [];
        codeLanguage = '';
      } else {
        flush();
        codeLanguage = line.slice(3).trim();
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(rawLine);
      continue;
    }
    if (!line) {
      flush();
      continue;
    }

    const markdownHeading = line.match(/^(#{1,4})\s+(.+)$/);
    const boldHeading = line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (markdownHeading || boldHeading) {
      flush();
      const heading = markdownHeading?.[2] || boldHeading?.[1] || '';
      const depth = markdownHeading?.[1].length || 3;
      blocks.push({ type: 'heading', text: heading, level: depth <= 2 ? 2 : depth === 3 ? 3 : 4 });
      continue;
    }

    const check = line.match(/^[-*]?\s*\[([ xX])]\s+(.+)$/);
    if (check) {
      if (paragraph.length || bullets.length || steps.length) flush();
      checklist.push({ text: check[2], checked: check[1].toLowerCase() === 'x' });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      if (paragraph.length || steps.length || checklist.length) flush();
      bullets.push(bullet[1]);
      continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      if (paragraph.length || bullets.length || checklist.length) flush();
      steps.push(numbered[1]);
      continue;
    }

    const keyValue = line.match(/^\*\*([^*]+)\*\*\s*:?\s+(.+)$/) || line.match(/^([A-Za-z][A-Za-z /_-]{1,30}):\s+(.+)$/);
    if (keyValue) {
      flush();
      blocks.push({ type: 'keyValue', label: keyValue[1].trim(), value: keyValue[2].trim() });
      continue;
    }
    if (/^(warning|important|note):\s+/i.test(line)) {
      flush();
      blocks.push({ type: 'warning', text: line.replace(/^[^:]+:\s*/, '') });
      continue;
    }
    if (isPlainHeading(line)) {
      flush();
      blocks.push({ type: 'heading', text: line.replace(/:$/, ''), level: 3 });
      continue;
    }

    if (bullets.length || steps.length || checklist.length) flush();
    paragraph.push(line);
  }

  flush();
  if (code.length) blocks.push({ type: 'codeBlock', code: code.join('\n'), language: codeLanguage || undefined });
  return blocks;
}

function normalize(value: string) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPlainHeading(value: string) {
  return !/^(passed|failed|blocked|not run)$/i.test(value)
    && value.length <= 64
    && /^[A-Z][A-Za-z0-9 /&()+-]+:?$/.test(value)
    && !/[.!?]$/.test(value.replace(/:$/, ''));
}
