import { strToU8 as encodeText, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import {
  checkContentSize,
  MAX_CONTENT_BYTES,
  readBookText,
  takeSample,
  validateBookFile,
} from '@/features/seller/bookFiles';

const fileOf = (content: BlobPart, name: string, type = '') => new File([content], name, { type });

const strToU8 = (text: string) => new Uint8Array(encodeText(text));

const buildEpub = () =>
  zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(
      '<container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    ),
    'OEBPS/content.opf': strToU8(
      `<package xmlns="http://www.idpf.org/2007/opf"><manifest>
        <item id="second" href="text/second.xhtml" media-type="application/xhtml+xml"/>
        <item id="first" href="text/first.xhtml" media-type="application/xhtml+xml"/>
        <item id="css" href="style.css" media-type="text/css"/>
      </manifest><spine><itemref idref="first"/><itemref idref="second"/></spine></package>`,
    ),
    'OEBPS/text/first.xhtml': strToU8(
      '<html xmlns="http://www.w3.org/1999/xhtml"><head><style>p{}</style></head><body><h1>Capítulo 1</h1><p>Era una   noche <em>oscura</em>.</p></body></html>',
    ),
    'OEBPS/text/second.xhtml': strToU8(
      '<html xmlns="http://www.w3.org/1999/xhtml"><body><div><p>Fin del libro.</p></div></body></html>',
    ),
  });

describe('validateBookFile (CA-1)', () => {
  it('rejects formats that the reader cannot open with a clear message', () => {
    expect(validateBookFile(fileOf('x', 'libro.pdf', 'application/pdf'), 'bookFile')).toMatch(/EPUB o TXT/);
    expect(validateBookFile(fileOf('x', 'libro.docx'), 'bookFile')).toBe(
      'El archivo del libro tiene que ser EPUB o TXT.',
    );
    expect(validateBookFile(fileOf('x', 'tapa.gif', 'image/gif'), 'cover')).toMatch(/JPG, PNG o WebP/);
    expect(validateBookFile(fileOf('x', 'muestra.txt'), 'sampleFile')).toBeNull();
  });

  it('rejects files above the size limit and empty files', () => {
    const heavy = fileOf(new Uint8Array(6 * 1024 * 1024), 'tapa.jpg', 'image/jpeg');
    expect(validateBookFile(heavy, 'cover')).toBe('El archivo pesa más de 5 MB. Elegí uno más liviano.');
    expect(validateBookFile(fileOf('', 'vacio.txt'), 'bookFile')).toBe('El archivo no tiene texto para leer.');
  });
});

describe('readBookText', () => {
  it('reads a TXT file into paragraphs separated by blank lines', async () => {
    const text = await readBookText(fileOf('Primera línea\r\nsigue igual.\r\n\r\n\r\nSegundo   párrafo.', 'libro.txt'));
    expect(text).toBe('Primera línea sigue igual.\n\nSegundo párrafo.');
  });

  it('reads TXT files saved in Windows encoding', async () => {
    const latin = new Uint8Array([0x43, 0x61, 0x70, 0xed, 0x74, 0x75, 0x6c, 0x6f, 0x20, 0xf1]);
    expect(await readBookText(fileOf(latin, 'viejo.txt'))).toBe('Capítulo ñ');
  });

  it('reads the chapters of an EPUB in spine order', async () => {
    const text = await readBookText(fileOf(new Uint8Array(buildEpub()), 'libro.epub'));
    expect(text).toBe('Capítulo 1\n\nEra una noche oscura.\n\nFin del libro.');
  });

  it('explains when the file cannot be read', async () => {
    await expect(readBookText(fileOf('no es un zip', 'roto.epub'))).rejects.toThrow(/No pudimos leer el archivo/);
    await expect(readBookText(fileOf('  \n\n ', 'vacio.txt'))).rejects.toThrow('El archivo no tiene texto para leer.');
  });
});

describe('content limits', () => {
  it('flags texts too large for a Firestore document', () => {
    expect(checkContentSize('a'.repeat(MAX_CONTENT_BYTES))).toBeNull();
    expect(checkContentSize('ñ'.repeat(MAX_CONTENT_BYTES / 2 + 1))).toMatch(/demasiado largo/);
  });

  it('cuts the sample at a paragraph boundary', () => {
    expect(takeSample('Uno.\n\nDos.\n\nTres.', 12)).toBe('Uno.\n\nDos.');
    expect(takeSample('Corto.', 100)).toBe('Corto.');
  });
});
