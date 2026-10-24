import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { fromFirestoreData, withoutUndefined } from '@/lib/firestoreData';

describe('fromFirestoreData', () => {
  it('converts nested timestamps to ISO strings', () => {
    const date = new Date('2026-10-24T12:00:00.000Z');
    const result = fromFirestoreData({
      createdAt: Timestamp.fromDate(date),
      bookmarks: [{ page: 2, createdAt: Timestamp.fromDate(date) }],
      title: 'Ficciones',
    });

    expect(result).toEqual({
      createdAt: '2026-10-24T12:00:00.000Z',
      bookmarks: [{ page: 2, createdAt: '2026-10-24T12:00:00.000Z' }],
      title: 'Ficciones',
    });
  });
});

describe('withoutUndefined', () => {
  it('drops undefined fields that Firestore rejects', () => {
    expect(withoutUndefined({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});
