import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { Award, BookOpen, MapPin, UserX } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { ROUTES } from '@/constants/routes';
import { useSession } from '@/features/auth/SessionProvider';
import { BookCard } from '@/features/catalog/BookCard';
import { useBooksByIds } from '@/features/catalog/BooksProvider';
import { useFavorites } from '@/features/catalog/favorites/FavoritesProvider';
import { useLibrary } from '@/features/reader/LibraryProvider';
import { useCart } from '@/features/shop/CartProvider';
import { formatDate } from '@/lib/format';
import { firestoreRefs } from '@/services/firestore';
import { Book, UserProfile } from '@/types';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
const SELLER_BOOKS_LIMIT = 8;

export const PublicProfilePage: React.FC = () => {
  const { userId = '' } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sellerBooks, setSellerBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    getDoc(firestoreRefs.user(userId))
      .then(snapshot => isActive && setProfile(snapshot.exists() ? snapshot.data() : null))
      .catch(() => isActive && setProfile(null))
      .finally(() => isActive && setIsLoading(false));
    return () => {
      isActive = false;
    };
  }, [userId]);

  const isSeller = profile?.role === 'seller';

  useEffect(() => {
    if (!isSeller) {
      setSellerBooks([]);
      return;
    }
    let isActive = true;
    getDocs(
      query(
        firestoreRefs.books(),
        where('sellerId', '==', userId),
        where('status', '==', 'published'),
        limit(SELLER_BOOKS_LIMIT),
      ),
    )
      .then(snapshot => isActive && setSellerBooks(snapshot.docs.map(bookDoc => bookDoc.data())))
      .catch(() => isActive && setSellerBooks([]));
    return () => {
      isActive = false;
    };
  }, [isSeller, userId]);

  if (isLoading) return <PageLoader />;

  if (!profile || profile.isBlocked) {
    return (
      <EmptyState
        icon={UserX}
        title="Perfil no disponible"
        description="Este usuario no existe o su cuenta no está activa."
        action={
          <Link
            to={ROUTES.home}
            className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Ir al catálogo
          </Link>
        }
      />
    );
  }

  return <PublicProfile profile={profile} sellerBooks={sellerBooks} />;
};

const PublicProfile: React.FC<{ profile: UserProfile; sellerBooks: Book[] }> = ({ profile, sellerBooks }) => {
  const { currentUser } = useSession();
  const { books: showcase, isLoading } = useBooksByIds(profile.favoriteBookIds ?? []);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart, getCartQuantity } = useCart();
  const { hasPurchased } = useLibrary();
  const isOwnProfile = currentUser?.id === profile.id;

  const renderCard = (book: Book) => (
    <li key={book.id} className="flex">
      <BookCard
        book={book}
        cartQuantity={getCartQuantity(book.id)}
        isOwned={hasPurchased(book.id)}
        isFavorite={isFavorite(book.id)}
        onToggleFavorite={favoriteBook => toggleFavorite(favoriteBook.id)}
        onAddToCart={addToCart}
      />
    </li>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:text-left">
        <img
          src={profile.photoURL || DEFAULT_AVATAR}
          alt=""
          className="h-24 w-24 rounded-full object-cover ring-4 ring-amber-500/20"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-serif text-3xl font-bold text-slate-900">{profile.displayName}</h1>
          <p className="text-sm text-slate-500">
            {profile.role === 'seller' ? 'Vendedor' : 'Lector'} en Mercado Libros desde {formatDate(profile.createdAt)}
          </p>
          {profile.location && (
            <p className="flex items-center justify-center gap-1 text-sm text-slate-600 sm:justify-start">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {profile.location}
            </p>
          )}
          {profile.bio && <p className="max-w-prose pt-2 text-sm text-slate-700">{profile.bio}</p>}
        </div>
        {isOwnProfile && (
          <Link
            to={ROUTES.profile}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Editar mi perfil
          </Link>
        )}
      </header>

      <section aria-labelledby="vitrina" className="space-y-4">
        <h2 id="vitrina" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Award className="h-5 w-5 text-amber-600" aria-hidden="true" />
          Libros favoritos
        </h2>
        {isLoading ? (
          <PageLoader />
        ) : showcase.length === 0 ? (
          <p className="text-sm text-slate-500">
            {isOwnProfile ? 'Todavía no elegiste tus libros favoritos.' : 'Todavía no eligió sus libros favoritos.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">{showcase.map(renderCard)}</ul>
        )}
      </section>

      {profile.role === 'seller' && (
        <section aria-labelledby="publicaciones" className="space-y-4">
          <h2 id="publicaciones" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <BookOpen className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Libros que vende
          </h2>
          {sellerBooks.length === 0 ? (
            <p className="text-sm text-slate-500">No tiene libros publicados en este momento.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">{sellerBooks.map(renderCard)}</ul>
          )}
        </section>
      )}
    </div>
  );
};
