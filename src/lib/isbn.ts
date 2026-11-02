const weightedSum = (digits: string, weight: (index: number) => number) =>
  [...digits].reduce((sum, digit, index) => sum + (digit === 'x' ? 10 : Number(digit)) * weight(index), 0);

export function normalizeIsbn(value: string): string | null {
  const isbn = value.replace(/[-\s]/g, '').toLowerCase();
  if (/^\d{9}[\dx]$/.test(isbn) && !/^0+$/.test(isbn)) {
    return weightedSum(isbn, index => 10 - index) % 11 === 0 ? isbn : null;
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    return weightedSum(isbn, index => (index % 2 === 0 ? 1 : 3)) % 10 === 0 ? isbn : null;
  }
  return null;
}

export function isbnSearchVariants(isbn: string): string[] {
  if (isbn.length === 10) {
    const body = `978${isbn.slice(0, 9)}`;
    const check = (10 - (weightedSum(body, index => (index % 2 === 0 ? 1 : 3)) % 10)) % 10;
    return [isbn, `${body}${check}`];
  }
  if (isbn.startsWith('978')) {
    const body = isbn.slice(3, 12);
    const check = (11 - (weightedSum(body, index => 10 - index) % 11)) % 11;
    return [isbn, `${body}${check === 10 ? 'x' : check}`];
  }
  return [isbn];
}
