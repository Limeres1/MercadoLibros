export function paginateReaderText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
  return Array.from({ length: Math.ceil(paragraphs.length / 2) }, (_slot, index) =>
    paragraphs.slice(index * 2, index * 2 + 2).join('\n\n'),
  );
}

export function readingProgress(page: number, pageCount: number) {
  const total = Number.isInteger(pageCount) && pageCount > 0 ? pageCount : 1;
  const current = Number.isInteger(page) ? Math.max(1, Math.min(page || 1, total)) : 1;
  return { total, current, percent: Math.round((current / total) * 100) };
}
