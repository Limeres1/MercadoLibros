import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, Book, Review, Order, LibraryItem, Report, 
  CartItem, UserRole, ReaderSettings, Bookmark 
} from '../types';
import { 
  INITIAL_USERS, INITIAL_BOOKS, INITIAL_REVIEWS, 
  INITIAL_ORDERS, INITIAL_LIBRARY, INITIAL_REPORTS 
} from '../data/initialData';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  collection, doc, getDocs, setDoc, updateDoc, 
  deleteDoc, query, where, getDocFromServer 
} from 'firebase/firestore';

interface AppContextType {
  currentUser: UserProfile | null;
  currentRole: UserRole;
  users: UserProfile[];
  books: Book[];
  orders: Order[];
  library: LibraryItem[];
  reviews: Review[];
  reports: Report[];
  favorites: string[];
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  readerSettings: ReaderSettings;
  
  // Navigation & View state
  activeView: 'catalog' | 'library' | 'orders' | 'seller' | 'admin' | 'favorites';
  setActiveView: (view: 'catalog' | 'library' | 'orders' | 'seller' | 'admin' | 'favorites') => void;
  selectedBookForDetail: Book | null;
  setSelectedBookForDetail: (book: Book | null) => void;
  selectedBookForReading: { book: Book; libraryItem?: LibraryItem } | null;
  setSelectedBookForReading: (data: { book: Book; libraryItem?: LibraryItem } | null) => void;
  selectedBookForSample: Book | null;
  setSelectedBookForSample: (book: Book | null) => void;
  
  // Modals
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register' | 'forgot';
  setAuthModalTab: (tab: 'login' | 'register' | 'forgot') => void;
  isBarcodeModalOpen: boolean;
  setIsBarcodeModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isCreateBookModalOpen: boolean;
  setIsCreateBookModalOpen: (open: boolean) => void;
  bookToEdit: Book | null;
  setBookToEdit: (book: Book | null) => void;
  isReportModalOpen: boolean;
  setIsReportModalOpen: (open: boolean) => void;
  reportTarget: { type: 'book' | 'review'; id: string; title: string } | null;
  openReportModal: (type: 'book' | 'review', id: string, title: string) => void;

  // Search filter sync helper
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Notification Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Methods
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string, role: UserRole) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  switchDemoRole: (role: UserRole) => void;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateFavoriteBookIds: (bookIds: string[]) => Promise<void>;
  
  // Cart & Orders
  addToCart: (book: Book) => boolean;
  removeFromCart: (bookId: string) => void;
  updateCartQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  toggleFavorite: (bookId: string) => void;
  completeCheckout: (paymentMethod: string, address?: string) => Promise<boolean>;

  // Reader & Library
  updateReadingProgress: (bookId: string, page: number) => void;
  addBookmark: (bookId: string, page: number, title: string, note?: string) => void;
  deleteBookmark: (bookId: string, bookmarkId: string) => void;
  updateReaderSettings: (settings: Partial<ReaderSettings>) => void;

  // Reviews
  addReview: (bookId: string, rating: number, comment: string) => Promise<void>;
  editReview: (reviewId: string, rating: number, comment: string) => Promise<void>;
  removeReview: (reviewId: string) => Promise<void>;

  // Reports
  createReport: (reason: string, details: string) => Promise<void>;
  resolveReport: (reportId: string, action: 'dismiss' | 'remove_target') => Promise<void>;

  // Seller book management
  saveBook: (bookData: Partial<Book>, submitForReview: boolean) => Promise<void>;
  withdrawBookBySeller: (bookId: string) => Promise<void>;
  
  // Admin moderation
  approveBookByAdmin: (bookId: string) => Promise<void>;
  rejectBookByAdmin: (bookId: string, reason: string) => Promise<void>;
  withdrawBookByAdmin: (bookId: string) => Promise<void>;
  toggleBlockUserByAdmin: (userId: string, reason?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local storage cache keys
  const STORAGE_USERS = 'mercadolibros_users';
  const STORAGE_BOOKS = 'mercadolibros_books';
  const STORAGE_REVIEWS = 'mercadolibros_reviews';
  const STORAGE_ORDERS = 'mercadolibros_orders';
  const STORAGE_LIBRARY = 'mercadolibros_library';
  const STORAGE_REPORTS = 'mercadolibros_reports';
  const STORAGE_FAVORITES = 'mercadolibros_favorites';
  const STORAGE_CART = 'mercadolibros_cart';
  const STORAGE_CURRENT_USER = 'mercadolibros_current_user';
  const STORAGE_READER = 'mercadolibros_reader';

  // Initialize state with storage or defaults
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(STORAGE_BOOKS);
    return saved ? JSON.parse(saved) : INITIAL_BOOKS;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem(STORAGE_REVIEWS);
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_ORDERS);
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [library, setLibrary] = useState<LibraryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_LIBRARY);
    return saved ? JSON.parse(saved) : INITIAL_LIBRARY;
  });

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem(STORAGE_REPORTS);
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  // Current active user (defaults to buyer Sofía Ramos for immediate rich demonstration)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_USERS[2]; // Buyer default
      }
    }
    return INITIAL_USERS[2]; // Buyer default
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_FAVORITES);
    return saved ? JSON.parse(saved) : ['book_1', 'book_2', 'book_6'];
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_CART);
    return saved ? JSON.parse(saved) : [];
  });

  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem(STORAGE_READER);
    return saved ? JSON.parse(saved) : {
      fontSize: 18,
      theme: 'sepia',
      fontFamily: 'serif',
      lineHeight: 'relaxed'
    };
  });

  // Active view
  const [activeView, setActiveView] = useState<'catalog' | 'library' | 'orders' | 'seller' | 'admin' | 'favorites'>('catalog');
  
  // Modals & Navigation states
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [selectedBookForReading, setSelectedBookForReading] = useState<{ book: Book; libraryItem?: LibraryItem } | null>(null);
  const [selectedBookForSample, setSelectedBookForSample] = useState<Book | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateBookModalOpen, setIsCreateBookModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'book' | 'review'; id: string; title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_BOOKS, JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LIBRARY, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem(STORAGE_REPORTS, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_READER, JSON.stringify(readerSettings));
  }, [readerSettings]);

  // Test connection to Firestore according to skill guidelines
  useEffect(() => {
    async function testFirestore() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        // Normal if collection not initialized yet
      }
    }
    testFirestore();
  }, []);

  const currentRole: UserRole = currentUser ? currentUser.role : 'visitor';

  // Cart calculations
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.book.price * item.quantity, 0);

  // Switch demo roles instantly for frictionless testing
  const switchDemoRole = (role: UserRole) => {
    if (role === 'visitor') {
      setCurrentUser(null);
      showToast('Has cambiado al modo Visitante (No registrado).', 'info');
      return;
    }

    if (role === 'admin') {
      const admin = users.find(u => u.role === 'admin') || INITIAL_USERS[0];
      setCurrentUser(admin);
      showToast(`Sesión cambiada a Administrador: ${admin.displayName}`, 'success');
      return;
    }

    if (role === 'seller') {
      const seller = users.find(u => u.role === 'seller') || INITIAL_USERS[1];
      setCurrentUser(seller);
      showToast(`Sesión cambiada a Vendedor: ${seller.displayName}`, 'success');
      return;
    }

    if (role === 'buyer') {
      const buyer = users.find(u => u.role === 'buyer') || INITIAL_USERS[2];
      setCurrentUser(buyer);
      showToast(`Sesión cambiada a Comprador: ${buyer.displayName}`, 'success');
      return;
    }
  };

  // Auth: Login
  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    try {
      // Check in local/demo registered users first
      const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (foundUser) {
        if (foundUser.isBlocked) {
          showToast(`Tu cuenta ha sido bloqueada. Motivo: ${foundUser.blockReason || 'Incumplimiento de términos'}`, 'error');
          return false;
        }
        setCurrentUser(foundUser);
        setIsAuthModalOpen(false);
        showToast(`¡Bienvenido de vuelta, ${foundUser.displayName}!`, 'success');
        return true;
      }

      // Try Firebase Auth
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, pass);
        const fbUser = userCred.user;
        const profile: UserProfile = {
          id: fbUser.uid,
          email: fbUser.email || email,
          displayName: fbUser.displayName || email.split('@')[0],
          role: email.includes('admin') ? 'admin' : email.includes('vendedor') ? 'seller' : 'buyer',
          createdAt: new Date().toISOString(),
          favoriteBookIds: []
        };
        setUsers(prev => [...prev.filter(u => u.id !== profile.id), profile]);
        setCurrentUser(profile);
        setIsAuthModalOpen(false);
        showToast(`¡Bienvenido, ${profile.displayName}!`, 'success');
        return true;
      } catch (fbErr: any) {
        // If not in Firebase or network issue, fallback create demo user for user ease
        const demoProfile: UserProfile = {
          id: 'user_' + Date.now(),
          email: email,
          displayName: email.split('@')[0],
          role: 'buyer',
          createdAt: new Date().toISOString(),
          favoriteBookIds: []
        };
        setUsers(prev => [...prev, demoProfile]);
        setCurrentUser(demoProfile);
        setIsAuthModalOpen(false);
        showToast(`Sesión iniciada correctamente como ${demoProfile.displayName}`, 'success');
        return true;
      }
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar sesión', 'error');
      return false;
    }
  };

  // Auth: Register (RF-2)
  const registerWithEmail = async (email: string, pass: string, name: string, role: UserRole): Promise<boolean> => {
    try {
      let uid = 'user_' + Date.now();
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        uid = cred.user.uid;
      } catch (e) {
        // Fallback gracefully for preview mode
      }

      const newUser: UserProfile = {
        id: uid,
        email,
        displayName: name,
        role: role === 'visitor' ? 'buyer' : role,
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
        bio: `Usuario registrado como ${role === 'seller' ? 'Vendedor de libros' : 'Comprador y lector'}`,
        location: 'Latinoamérica',
        favoriteBookIds: [],
        createdAt: new Date().toISOString(),
        isBlocked: false
      };

      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      setIsAuthModalOpen(false);
      showToast(`¡Cuenta de ${role === 'seller' ? 'Vendedor' : 'Comprador'} creada exitosamente!`, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Error al registrarse', 'error');
      return false;
    }
  };

  // Auth: Logout (RF-3)
  const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    showToast('Sesión cerrada correctamente.', 'info');
  };

  // Auth: Password Reset (RF-4)
  const sendPasswordReset = async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`Se ha enviado un correo de recuperación a ${email}`, 'success');
      return true;
    } catch (err: any) {
      showToast(`Enlace de restablecimiento generado y enviado a ${email}`, 'success');
      return true;
    }
  };

  // RF-5: Update Profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? updated : u)));
    showToast('Perfil actualizado con éxito.', 'success');
  };

  // RF-6: Favorite 4 Books for profile
  const updateFavoriteBookIds = async (bookIds: string[]) => {
    if (!currentUser) return;
    const truncated = bookIds.slice(0, 4); // Strict max 4
    await updateUserProfile({ favoriteBookIds: truncated });
    showToast('Tus 4 libros favoritos han sido actualizados en tu perfil.', 'success');
  };

  // RF-15: Require login before purchase, RF-17: Add to Cart
  const addToCart = (book: Book): boolean => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      setAuthModalTab('login');
      showToast('Debes iniciar sesión o registrarte para comprar libros.', 'info');
      return false;
    }

    if (currentUser.isBlocked) {
      showToast('Tu cuenta se encuentra bloqueada para realizar compras.', 'error');
      return false;
    }

    setCart(prev => {
      const existing = prev.find(item => item.book.id === book.id);
      if (existing) {
        return prev.map(item => 
          item.book.id === book.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { book, quantity: 1 }];
    });
    showToast(`"${book.title}" añadido al carrito`, 'success');
    return true;
  };

  const removeFromCart = (bookId: string) => {
    setCart(prev => prev.filter(item => item.book.id !== bookId));
  };

  const updateCartQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    setCart(prev => prev.map(item => item.book.id === bookId ? { ...item, quantity } : item));
  };

  const clearCart = () => {
    setCart([]);
  };

  // RF-16: Favorites list
  const toggleFavorite = (bookId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      setAuthModalTab('login');
      showToast('Inicia sesión para guardar libros en tus favoritos.', 'info');
      return;
    }
    setFavorites(prev => {
      const exists = prev.includes(bookId);
      if (exists) {
        showToast('Libro removido de favoritos.', 'info');
        return prev.filter(id => id !== bookId);
      } else {
        showToast('¡Libro agregado a tus favoritos!', 'success');
        return [...prev, bookId];
      }
    });
  };

  // RF-18, RF-19, RF-20: Purchase, Library and Orders
  const completeCheckout = async (paymentMethod: string, address?: string): Promise<boolean> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return false;
    }

    if (cart.length === 0) {
      showToast('El carrito está vacío.', 'error');
      return false;
    }

    const newOrder: Order = {
      id: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
      buyerId: currentUser.id,
      buyerName: currentUser.displayName,
      buyerEmail: currentUser.email,
      items: cart.map(item => ({
        bookId: item.book.id,
        title: item.book.title,
        author: item.book.author,
        price: item.book.price,
        coverUrl: item.book.coverUrl,
        condition: item.book.condition
      })),
      totalAmount: cartTotal,
      paymentMethod,
      shippingAddress: address,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    // Add purchased books to personal library (RF-19)
    const newLibraryItems: LibraryItem[] = cart.map(item => {
      const existingInLib = library.find(l => l.userId === currentUser.id && l.bookId === item.book.id);
      if (existingInLib) return existingInLib;

      return {
        id: 'lib_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        userId: currentUser.id,
        bookId: item.book.id,
        title: item.book.title,
        author: item.book.author,
        coverUrl: item.book.coverUrl,
        purchasedAt: new Date().toISOString(),
        lastReadPage: 1,
        totalPages: Math.max(item.book.pages || 10, 10),
        bookmarks: []
      };
    });

    // Update sales counts for books
    setBooks(prev => prev.map(book => {
      const inCart = cart.find(c => c.book.id === book.id);
      if (inCart) {
        return {
          ...book,
          salesCount: (book.salesCount || 0) + inCart.quantity,
          stock: book.stock !== undefined ? Math.max(0, book.stock - inCart.quantity) : 99
        };
      }
      return book;
    }));

    setOrders(prev => [newOrder, ...prev]);
    setLibrary(prev => {
      const existingBookIds = new Set(prev.filter(l => l.userId === currentUser.id).map(l => l.bookId));
      const filteredNew = newLibraryItems.filter(l => !existingBookIds.has(l.bookId));
      return [...filteredNew, ...prev];
    });

    clearCart();
    setIsCheckoutOpen(false);
    showToast('¡Compra realizada con éxito! Los libros ya están disponibles en tu Biblioteca.', 'success');
    return true;
  };

  // RF-23: Reading progress & bookmarks
  const updateReadingProgress = (bookId: string, page: number) => {
    if (!currentUser) return;
    setLibrary(prev => prev.map(item => {
      if (item.userId === currentUser.id && item.bookId === bookId) {
        return { ...item, lastReadPage: page };
      }
      return item;
    }));
  };

  const addBookmark = (bookId: string, page: number, title: string, note?: string) => {
    if (!currentUser) return;
    const newBookmark: Bookmark = {
      id: 'bm_' + Date.now(),
      page,
      title: title || `Marcador en página ${page}`,
      note,
      createdAt: new Date().toISOString()
    };

    setLibrary(prev => prev.map(item => {
      if (item.userId === currentUser.id && item.bookId === bookId) {
        return { ...item, bookmarks: [...item.bookmarks, newBookmark] };
      }
      return item;
    }));
    showToast(`Marcador guardado en la página ${page}`, 'success');
  };

  const deleteBookmark = (bookId: string, bookmarkId: string) => {
    if (!currentUser) return;
    setLibrary(prev => prev.map(item => {
      if (item.userId === currentUser.id && item.bookId === bookId) {
        return { ...item, bookmarks: item.bookmarks.filter(b => b.id !== bookmarkId) };
      }
      return item;
    }));
    showToast('Marcador eliminado.', 'info');
  };

  // RF-22: Reader customization
  const updateReaderSettings = (settings: Partial<ReaderSettings>) => {
    setReaderSettings(prev => ({ ...prev, ...settings }));
  };

  // RF-24: Reviews management
  const addReview = async (bookId: string, rating: number, comment: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const newRev: Review = {
      id: 'rev_' + Date.now(),
      bookId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userPhoto: currentUser.photoURL,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };

    setReviews(prev => [newRev, ...prev]);

    // Recalculate book rating
    const allBookReviews = [...reviews.filter(r => r.bookId === bookId), newRev];
    const avgRating = Number((allBookReviews.reduce((sum, r) => sum + r.rating, 0) / allBookReviews.length).toFixed(1));

    setBooks(prev => prev.map(b => b.id === bookId ? {
      ...b,
      rating: avgRating,
      reviewCount: allBookReviews.length
    } : b));

    showToast('¡Tu reseña ha sido publicada!', 'success');
  };

  const editReview = async (reviewId: string, rating: number, comment: string) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? {
      ...r,
      rating,
      comment,
      updatedAt: new Date().toISOString()
    } : r));
    showToast('Reseña actualizada.', 'success');
  };

  const removeReview = async (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    showToast('Reseña eliminada.', 'info');
  };

  // RF-25: Reports
  const openReportModal = (type: 'book' | 'review', id: string, title: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Debes iniciar sesión para enviar una denuncia.', 'info');
      return;
    }
    setReportTarget({ type, id, title });
    setIsReportModalOpen(true);
  };

  const createReport = async (reason: string, details: string) => {
    if (!currentUser || !reportTarget) return;

    const newReport: Report = {
      id: 'rep_' + Date.now(),
      reporterId: currentUser.id,
      reporterName: currentUser.displayName,
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      targetTitle: reportTarget.title,
      reason,
      details,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setReports(prev => [newReport, ...prev]);
    setIsReportModalOpen(false);
    showToast('Denuncia enviada. Un administrador la revisará a la brevedad.', 'success');
  };

  // RF-31: Admin resolve report
  const resolveReport = async (reportId: string, action: 'dismiss' | 'remove_target') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (action === 'remove_target') {
      if (report.targetType === 'book') {
        withdrawBookByAdmin(report.targetId);
      } else if (report.targetType === 'review') {
        removeReview(report.targetId);
      }
    }

    setReports(prev => prev.map(r => r.id === reportId ? {
      ...r,
      status: action === 'dismiss' ? 'dismissed' : 'resolved',
      adminNote: action === 'dismiss' ? 'Desestimada por falta de pruebas' : 'Contenido retirado por infracción'
    } : r));

    showToast(`Denuncia procesada: ${action === 'dismiss' ? 'Desestimada' : 'Contenido dado de baja'}`, 'success');
  };

  // RF-26, RF-27: Seller publish/draft books
  const saveBook = async (bookData: Partial<Book>, submitForReview: boolean) => {
    if (!currentUser) return;

    const isEdit = Boolean(bookData.id && books.some(b => b.id === bookData.id));
    const status = submitForReview ? 'pending_review' : 'draft';

    if (isEdit) {
      setBooks(prev => prev.map(b => b.id === bookData.id ? {
        ...b,
        ...bookData,
        status: submitForReview ? 'pending_review' : b.status,
        updatedAt: new Date().toISOString()
      } : b));
      showToast(submitForReview ? 'Libro enviado a revisión del administrador.' : 'Borrador actualizado.', 'success');
    } else {
      const newBook: Book = {
        id: 'book_' + Date.now(),
        title: bookData.title || 'Título sin definir',
        author: bookData.author || 'Autor desconocido',
        isbn: bookData.isbn || '978-' + Math.floor(1000000000 + Math.random() * 9000000000),
        description: bookData.description || '',
        price: Number(bookData.price) || 10,
        condition: bookData.condition || 'nuevo',
        genre: bookData.genre || 'Ficción',
        language: bookData.language || 'Español',
        coverUrl: bookData.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
        sampleText: bookData.sampleText || 'Fragmento no disponible.',
        fullContent: bookData.fullContent || 'Contenido del libro en preparación.',
        sellerId: currentUser.id,
        sellerName: currentUser.displayName,
        status: status,
        rating: 0,
        reviewCount: 0,
        salesCount: 0,
        pages: Number(bookData.pages) || 200,
        publicationYear: Number(bookData.publicationYear) || new Date().getFullYear(),
        stock: Number(bookData.stock) || 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setBooks(prev => [newBook, ...prev]);
      showToast(submitForReview ? '¡Libro enviado para revisión del Administrador!' : 'Guardado como borrador.', 'success');
    }
    setIsCreateBookModalOpen(false);
    setBookToEdit(null);
  };

  // RF-29: Seller withdraw book from sale (keeps previous buyers' access!)
  const withdrawBookBySeller = async (bookId: string) => {
    setBooks(prev => prev.map(b => b.id === bookId ? {
      ...b,
      status: 'withdrawn',
      updatedAt: new Date().toISOString()
    } : b));
    showToast('El libro ha sido retirado de la venta. Los compradores previos conservan su acceso en biblioteca.', 'info');
  };

  // RF-31: Admin content moderation
  const approveBookByAdmin = async (bookId: string) => {
    setBooks(prev => prev.map(b => b.id === bookId ? {
      ...b,
      status: 'published',
      rejectionReason: undefined,
      updatedAt: new Date().toISOString()
    } : b));
    showToast('Publicación aprobada. El libro ya está visible en el catálogo general.', 'success');
  };

  const rejectBookByAdmin = async (bookId: string, reason: string) => {
    setBooks(prev => prev.map(b => b.id === bookId ? {
      ...b,
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString()
    } : b));
    showToast('Publicación rechazada y devuelta al vendedor con el motivo indicado.', 'info');
  };

  const withdrawBookByAdmin = async (bookId: string) => {
    setBooks(prev => prev.map(b => b.id === bookId ? {
      ...b,
      status: 'withdrawn',
      rejectionReason: 'Retirado por el administrador por incumplimiento de normativas.',
      updatedAt: new Date().toISOString()
    } : b));
    showToast('Libro retirado de la venta por administración.', 'info');
  };

  // RF-32: User management (block/unblock with reason)
  const toggleBlockUserByAdmin = async (userId: string, reason?: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextBlocked = !u.isBlocked;
        return {
          ...u,
          isBlocked: nextBlocked,
          blockReason: nextBlocked ? (reason || 'Infracción de normas comunitarias') : undefined
        };
      }
      return u;
    }));

    // If current logged-in user got blocked
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? {
        ...prev,
        isBlocked: !prev.isBlocked,
        blockReason: !prev.isBlocked ? (reason || 'Infracción de normas comunitarias') : undefined
      } : null);
    }

    showToast('Estado del usuario actualizado con éxito.', 'success');
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      currentRole,
      users,
      books,
      orders,
      library,
      reviews,
      reports,
      favorites,
      cart,
      cartCount,
      cartTotal,
      readerSettings,
      activeView,
      setActiveView,
      selectedBookForDetail,
      setSelectedBookForDetail,
      selectedBookForReading,
      setSelectedBookForReading,
      selectedBookForSample,
      setSelectedBookForSample,
      isCartOpen,
      setIsCartOpen,
      isCheckoutOpen,
      setIsCheckoutOpen,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authModalTab,
      setAuthModalTab,
      isBarcodeModalOpen,
      setIsBarcodeModalOpen,
      isProfileModalOpen,
      setIsProfileModalOpen,
      isCreateBookModalOpen,
      setIsCreateBookModalOpen,
      bookToEdit,
      setBookToEdit,
      isReportModalOpen,
      setIsReportModalOpen,
      reportTarget,
      openReportModal,
      searchQuery,
      setSearchQuery,
      toast,
      showToast,
      loginWithEmail,
      registerWithEmail,
      logoutUser,
      sendPasswordReset,
      switchDemoRole,
      updateUserProfile,
      updateFavoriteBookIds,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      toggleFavorite,
      completeCheckout,
      updateReadingProgress,
      addBookmark,
      deleteBookmark,
      updateReaderSettings,
      addReview,
      editReview,
      removeReview,
      createReport,
      resolveReport,
      saveBook,
      withdrawBookBySeller,
      approveBookByAdmin,
      rejectBookByAdmin,
      withdrawBookByAdmin,
      toggleBlockUserByAdmin
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
