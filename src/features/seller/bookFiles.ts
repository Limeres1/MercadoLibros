import { paginateReaderText } from '@/lib/readerPagination';

const MB = 1024 * 1024;

export const BOOK_FILE_LIMITS = {
  cover: { maxBytes: 5 * MB, extensions: ['jpg', 'jpeg', 'png', 'webp'], label: 'JPG, PNG o WebP', size: '5 MB' },
  bookFile: { maxBytes: 20 * MB, extensions: ['epub', 'txt'], label: 'EPUB o TXT', size: '20 MB' },
  sampleFile: { maxBytes: 5 * MB, extensions: ['epub', 'txt'], label: 'EPUB o TXT', size: '5 MB' },
} as const;

export type BookFileKind = keyof typeof BOOK_FILE_LIMITS;

export const MAX_CONTENT_BYTES = 900_000;
export const MAX_SAMPLE_LENGTH = 20_000;
const COVER_WIDTH = 480;
const MAX_COVER_LENGTH = 150_000;
const TEXT_BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre';

const FILE_ERRORS = {
  cover: 'La portada tiene que ser una imagen JPG, PNG o WebP.',
  bookFile: 'El archivo del libro tiene que ser EPUB o TXT.',
  sampleFile: 'La muestra tiene que ser un archivo EPUB o TXT.',
  pdf: 'Los PDF no se pueden leer en el lector integrado. Exportá el libro a EPUB o TXT y volvé a subirlo.',
  unreadable: 'No pudimos leer el archivo. Revisá que no esté dañado o protegido con DRM.',
  empty: 'El archivo no tiene texto para leer.',
  tooLong: 'El texto del libro es demasiado largo para el lector (máx. ~900 KB de texto).',
  image: 'No pudimos procesar la imagen de portada. Probá con otra.',
};

const extensionOf = (file: File) => file.name.split('.').pop()?.toLowerCase() ?? '';

export function validateBookFile(file: File, kind: BookFileKind): string | null {
  const limits = BOOK_FILE_LIMITS[kind];
  const extension = extensionOf(file);
  if (kind !== 'cover' && extension === 'pdf') return FILE_ERRORS.pdf;
  if (!(limits.extensions as readonly string[]).includes(extension)) return FILE_ERRORS[kind];
  if (file.size > limits.maxBytes) return `El archivo pesa más de ${limits.size}. Elegí uno más liviano.`;
  if (file.size === 0) return FILE_ERRORS.empty;
  return null;
}

export const normalizeText = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split(/\n\s*\n/)
    .map(paragraph =>
      paragraph
        .replace(/[ \t]*\n[ \t]*/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n');

function decodeText(bytes: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

function htmlToParagraphs(markup: string) {
  const page = new DOMParser().parseFromString(markup, 'application/xhtml+xml');
  const parsed = page.querySelector('parsererror') ? new DOMParser().parseFromString(markup, 'text/html') : page;
  parsed.querySelectorAll('script, style').forEach(element => element.remove());
  const blocks = Array.from(parsed.querySelectorAll(TEXT_BLOCKS)).filter(
    element => !element.parentElement?.closest(TEXT_BLOCKS),
  );
  const texts = blocks.length ? blocks.map(element => element.textContent ?? '') : [parsed.body?.textContent ?? ''];
  return texts.map(text => text.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

async function readEpub(file: File) {
  const { unzipSync, strFromU8 } = await import('fflate');
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const readEntry = (path: string) => (entries[path] ? strFromU8(entries[path]) : null);

  const container = readEntry('META-INF/container.xml');
  const packagePath = container?.match(/full-path="([^"]+)"/)?.[1];
  const packageXml = packagePath ? readEntry(packagePath) : null;
  if (!packagePath || !packageXml) throw new Error(FILE_ERRORS.unreadable);

  const basePath = packagePath.includes('/') ? packagePath.slice(0, packagePath.lastIndexOf('/') + 1) : '';
  const opf = new DOMParser().parseFromString(packageXml, 'application/xml');
  const manifest = new Map(
    Array.from(opf.getElementsByTagName('item')).map(item => [item.getAttribute('id'), item.getAttribute('href')]),
  );
  const chapters = Array.from(opf.getElementsByTagName('itemref'))
    .map(itemref => manifest.get(itemref.getAttribute('idref')))
    .filter((href): href is string => Boolean(href))
    .map(href => readEntry(decodeURIComponent(basePath + href.split('#')[0])))
    .filter((markup): markup is string => markup !== null);
  return chapters.flatMap(htmlToParagraphs).join('\n\n');
}

export async function readBookText(file: File): Promise<string> {
  let text: string;
  try {
    text = extensionOf(file) === 'epub' ? await readEpub(file) : decodeText(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error(FILE_ERRORS.unreadable);
  }
  const normalized = normalizeText(text);
  if (!normalized) throw new Error(FILE_ERRORS.empty);
  return normalized;
}

export function checkContentSize(text: string): string | null {
  return new TextEncoder().encode(text).length > MAX_CONTENT_BYTES ? FILE_ERRORS.tooLong : null;
}

export function takeSample(text: string, maxLength = MAX_SAMPLE_LENGTH) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastBreak = cut.lastIndexOf('\n\n');
  return lastBreak > 0 ? cut.slice(0, lastBreak) : cut;
}

export function describeText(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return { words, readerPages: paginateReaderText(text).length };
}

export async function prepareCover(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, COVER_WIDTH / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error(FILE_ERRORS.image);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.82, 0.7, 0.55]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_COVER_LENGTH) return dataUrl;
    }
  } catch {
    throw new Error(FILE_ERRORS.image);
  }
  throw new Error(FILE_ERRORS.image);
}
