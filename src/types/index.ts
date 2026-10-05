export type UserRole = 'visitor' | 'buyer' | 'seller' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  bio?: string;
  location?: string;
  phone?: string;
  favoriteBookIds?: string[]; // Max 4 libros favoritos (RF-6)
  isBlocked?: boolean;
  blockReason?: string;
  createdAt: string;
}

export type BookCondition = 'nuevo' | 'usado' | 'digital';
export type BookStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'withdrawn';

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
  fullContent: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface OrderItem {
  bookId: string;
  title: string;
  author: string;
  price: number;
  coverUrl: string;
  condition: BookCondition;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  shippingAddress?: string;
  status: 'completed' | 'pending';
  createdAt: string;
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
  targetType: 'book' | 'review';
  targetId: string;
  targetTitle: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNote?: string;
  createdAt: string;
}

export interface ReaderSettings {
  fontSize: number; // 14, 16, 18, 20, 24
  theme: 'light' | 'sepia' | 'dark';
  fontFamily: 'serif' | 'sans';
  lineHeight: 'normal' | 'relaxed' | 'loose';
}
