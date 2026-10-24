import React from 'react';

import { ToastProvider } from '@/components/ui/Toast';
import { AuthModalProvider } from '@/features/auth/AuthModalProvider';
import { SessionProvider } from '@/features/auth/SessionProvider';
import { BooksProvider } from '@/features/catalog/BooksProvider';
import { FavoritesProvider } from '@/features/catalog/favorites/FavoritesProvider';
import { ReportsProvider } from '@/features/catalog/reports/ReportsProvider';
import { ReviewsProvider } from '@/features/catalog/reviews/ReviewsProvider';
import { LibraryProvider } from '@/features/reader/LibraryProvider';
import { CartProvider } from '@/features/shop/CartProvider';
import { OrdersProvider } from '@/features/shop/OrdersProvider';

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
