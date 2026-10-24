import React from 'react';
import { ToastProvider } from '../components/ui/Toast';
import { AuthModalProvider } from '../features/auth/AuthModalProvider';
import { SessionProvider } from '../features/auth/SessionProvider';
import { BooksProvider } from '../features/catalog/BooksProvider';
import { ReviewsProvider } from '../features/catalog/reviews/ReviewsProvider';
import { ReportsProvider } from '../features/catalog/reports/ReportsProvider';
import { FavoritesProvider } from '../features/catalog/favorites/FavoritesProvider';
import { LibraryProvider } from '../features/reader/LibraryProvider';
import { OrdersProvider } from '../features/shop/OrdersProvider';
import { CartProvider } from '../features/shop/CartProvider';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <AuthModalProvider>
      <SessionProvider>
        <BooksProvider>
          <ReviewsProvider>
            <ReportsProvider>
              <FavoritesProvider>
                <LibraryProvider>
                  <OrdersProvider>
                    <CartProvider>{children}</CartProvider>
                  </OrdersProvider>
                </LibraryProvider>
              </FavoritesProvider>
            </ReportsProvider>
          </ReviewsProvider>
        </BooksProvider>
      </SessionProvider>
    </AuthModalProvider>
  </ToastProvider>
);
