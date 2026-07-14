export type RichTextBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: RichTextListItem[] };

export type RichTextListItem = {
  text: string;
  children?: string[];
};

const sectionLabels = [
  'Description',
  'Acceptance Criteria',
  'Desktop',
  'Desktop Footer',
  'Mobile',
  'Mobile Footer',
  'Legal/Policy Pages',
  'Legal/Policy Pages to add',
  'Alignment & Spacing',
  'Assets',
  'Out of Scope',
  'Dependencies',
  'Suggested Subtasks',
  'Jira Comments',
  'How to Test This Ticket',
  'Manual Testing Strategy',
  'Coverage Gap Summary',
  'Suggested Automation',
];

export function formatJiraContent(value: string): RichTextBlock[] {
  try {
    return parseJiraText(value);
  } catch {
    return [{ type: 'paragraph', text: value || 'No content available.' }];
  }
}

function parseJiraText(value: string): RichTextBlock[] {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [{ type: 'paragraph', text: 'No content available.' }];
  }

  const lines = normalized.split('\n');
  const blocks: RichTextBlock[] = [];
  let paragraph: string[] = [];
  let list: RichTextListItem[] = [];
  let lastListItem: RichTextListItem | undefined;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(' ').trim();
    if (text) {
      blocks.push(...splitObviousListParagraph(text));
    }
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: 'list', items: list });
    list = [];
    lastListItem = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = normalizeHeading(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: heading });
      continue;
    }

    const nestedBullet = line.match(/^\s{2,}[-*•]\s+(.+)/);
    if (nestedBullet && lastListItem) {
      lastListItem.children = [...(lastListItem.children || []), nestedBullet[1].trim()];
      continue;
    }

    const bullet = line.match(/^[-*•☐]\s+(.+)/);
    if (bullet) {
      flushParagraph();
      const item = { text: bullet[1].trim() };
      list.push(item);
      lastListItem = item;
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.length ? blocks : [{ type: 'paragraph', text: normalized }];
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeHeading(value: string) {
  const cleaned = value.replace(/:$/, '').trim();
  const lowered = cleaned.toLowerCase();

  if (sectionLabels.some((label) => label.toLowerCase() === lowered)) {
    return cleaned;
  }

  if (cleaned.length <= 72 && /^[A-Z][A-Za-z0-9/&+ -]+(\([^)]*\))?$/.test(cleaned) && !cleaned.endsWith('.')) {
    return cleaned;
  }

  return '';
}

function splitObviousListParagraph(text: string): RichTextBlock[] {
  const colonIndex = text.indexOf(':');

  if (colonIndex < 0 || text.length < 90) {
    return [{ type: 'paragraph', text }];
  }

  const intro = text.slice(0, colonIndex + 1).trim();
  const rest = text.slice(colonIndex + 1).trim();
  const items = rest
    .split(/,\s+(?=[A-Z][A-Za-z ]{2,})/g)
    .map((item) => item.trim().replace(/\.$/, ''))
    .filter((item) => item.length > 4);

  if (items.length < 3) {
    return [{ type: 'paragraph', text }];
  }

  return [
    { type: 'paragraph', text: intro },
    { type: 'list', items: items.map((item) => ({ text: item })) },
  ];
}
