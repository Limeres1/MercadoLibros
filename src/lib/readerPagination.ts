export const READER_LINE_LENGTH = 75;
export const READER_PAGE_LINES = 18;
export const READER_PAGE_LENGTH = READER_LINE_LENGTH * READER_PAGE_LINES;

const PARAGRAPH_BREAK = '\n\n';

const SENTENCE_END = /(?<=[.!?…;:»”"])\s+/;

const linesOf = (paragraph: string) => Math.max(1, Math.ceil(paragraph.length / READER_LINE_LENGTH));

function splitLongParagraph(paragraph: string): string[] {
  const pieces: string[] = [];
  let current = '';
  const units = paragraph
    .split(SENTENCE_END)
    .flatMap(sentence => (sentence.length > READER_PAGE_LENGTH ? sentence.split(/\s+/) : [sentence]));
  for (const unit of units) {
    const next = current ? `${current} ${unit}` : unit;
    if (current && next.length > READER_PAGE_LENGTH) {
      pieces.push(current);
      current = unit;
    } else {
      current = next;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

export function paginateReaderText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .flatMap(paragraph => (paragraph.length > READER_PAGE_LENGTH ? splitLongParagraph(paragraph) : [paragraph]));
  const pages: string[] = [];
  let page: string[] = [];
  let lines = 0;
  for (const paragraph of paragraphs) {
    const needed = (page.length > 0 ? 1 : 0) + linesOf(paragraph);
    if (page.length > 0 && lines + needed > READER_PAGE_LINES) {
      pages.push(page.join(PARAGRAPH_BREAK));
      page = [];
      lines = 0;
    }
    lines += (page.length > 0 ? 1 : 0) + linesOf(paragraph);
    page.push(paragraph);
  }
  if (page.length > 0) pages.push(page.join(PARAGRAPH_BREAK));
  return pages;
}

export function rescalePage(page: number, fromTotal: number, toTotal: number) {
  if (!Number.isFinite(page) || page <= 0) return 0;
  if (!fromTotal || fromTotal === toTotal) return Math.min(page, toTotal);
  return Math.max(1, Math.min(toTotal, Math.round((page / fromTotal) * toTotal)));
}

export function readingProgress(page: number, pageCount: number) {
  const total = Number.isInteger(pageCount) && pageCount > 0 ? pageCount : 1;
  const current = Number.isInteger(page) ? Math.max(1, Math.min(page || 1, total)) : 1;
  return { total, current, percent: Math.round((current / total) * 100) };
}
