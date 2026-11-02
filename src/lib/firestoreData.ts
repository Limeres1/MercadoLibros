import { Timestamp } from 'firebase/firestore';

export function fromFirestoreData(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(fromFirestoreData);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, fromFirestoreData(nested)]));
  }
  return value;
}

export function withoutUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, fieldValue]) => fieldValue !== undefined)) as Partial<T>;
}
