import {
  ACCOUNT_ROLES,
  AUDIT_ACTIONS,
  BOOK_CONDITIONS,
  BOOK_STATUSES,
  ORDER_STATUSES,
  READER_THEMES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  SIGNUP_ROLES,
} from '@/constants/statuses';

export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export type UserRole = AccountRole | 'visitor';
export type SignupRole = (typeof SIGNUP_ROLES)[number];
export type BookCondition = (typeof BOOK_CONDITIONS)[number];
export type BookStatus = (typeof BOOK_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  photoURL?: string;
  bio?: string;
  location?: string;
  phone?: string;
  favoriteBookIds?: string[];
  isBlocked?: boolean;
  blockReason?: string;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description: string;
  price: number;
  condition: BookCondition;
  genre: string;
  language: string;
  coverUrl: string;
  sampleText: string;
  sellerId: string;
  sellerName: string;
  status: BookStatus;
  rejectionReason?: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  pages: number;
  publicationYear: number;
  stock?: number;
  searchTokens?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BookContent {
  bookId: string;
  text: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface CartEntry {
  bookId: string;
  quantity: number;
  addedAt: string;
}

export interface FavoriteEntry {
  bookId: string;
  createdAt: string;
}

export interface OrderItem {
  bookId: string;
  sellerId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  coverUrl: string;
  condition: BookCondition;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  sellerIds: string[];
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  paymentMethod: string;
  paymentId?: string;
  shippingAddress?: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
}

export interface Bookmark {
  id: string;
  page: number;
  title: string;
  note?: string;
  createdAt: string;
}

export interface LibraryItem {
  id: string;
  userId: string;
  bookId: string;
  orderId: string;
  title: string;
  author: string;
  coverUrl: string;
  purchasedAt: string;
  lastReadPage: number;
  totalPages: number;
  bookmarks: Bookmark[];
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: string;
  reason: string;
  details: string;
  status: ReportStatus;
  adminNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: AuditAction;
  targetType: 'book' | 'review' | 'user' | 'report';
  targetId: string;
  reason?: string;
  createdAt: string;
}

export interface ReaderSettings {
  fontSize: number;
  theme: (typeof READER_THEMES)[number];
  fontFamily: 'serif' | 'sans';
  lineHeight: 'normal' | 'relaxed' | 'loose';
}
