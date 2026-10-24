# Mercado Libros

Marketplace de libros digitales: los lectores compran y leen en un lector integrado, los vendedores publican sus obras y un administrador modera el contenido.

**Producción:** https://mercado-libros.vercel.app

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · Firebase (Auth, Firestore) · Gemini (Google AI Studio) · Vitest

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # completar las variables VITE_FIREBASE_* (Firebase → Configuración del proyecto)
npm run dev                  # http://localhost:3000
```

| Script          | Qué hace                                              |
| --------------- | ----------------------------------------------------- |
| `npm run dev`   | servidor de desarrollo                                |
| `npm run build` | build de producción en `dist/`                        |
| `npm run lint`  | chequeo de tipos (TypeScript, sin variables sin usar) |
| `npm test`      | tests con Vitest                                      |

## Estructura

```
src/
  app/            App (rutas) y AppProviders
  components/
    layout/       Navbar, Footer, AppLayout, 404
    ui/           Modal, Toast, EmptyState, ErrorBoundary
  constants/      ROUTES / paths, STORAGE_KEYS
  features/
    auth/         sesión, login/registro, RequireRole, perfil        (Zona A)
    catalog/      catálogo, ficha, muestra, escáner, reseñas,
                  denuncias, favoritos                                (Zona B)
    shop/         carrito, checkout, pedidos                          (Zona C)
    reader/       biblioteca, lector, progreso y marcadores           (Zona C)
    seller/       panel y formulario del vendedor                     (Zona D)
    admin/        moderación y usuarios                               (Zona D)
  hooks/  lib/  services/firebase.ts  types/  data/
```

Cada módulo expone su estado con un Provider + hook (`useBooks`, `useCart`, `useLibrary`, `useReviews`…). Hoy guardan datos de ejemplo en `localStorage`; cada zona reemplaza la implementación de **su** Provider por Firestore sin cambiar la interfaz que usan las pantallas.

## Convenciones

- Imports siempre absolutos con `@/` (ej. `@/constants/routes`); los relativos están prohibidos por ESLint. El orden y la separación en grupos (librerías → `@/` → estilos) los aplica `npm run format`.
- Nombres descriptivos: nada de variables de una letra (`book`, `event`, `review`…), ESLint lo marca.
- IDs nuevos con `createId()` (`@/lib/ids`); los IDs compuestos de Firestore con `docIds` (`@/constants/firestore`).
- VS Code: instalar las extensiones recomendadas (Prettier y ESLint); se formatea al guardar.
- Rutas: nunca strings sueltos. Se declaran en `src/constants/routes.ts` y se usan `ROUTES.library`, `paths.book(id)`.
- Claves de `localStorage` en `src/constants/storageKeys.ts`; colecciones de Firestore en `src/constants/firestore.ts` y acceso con `firestoreRefs` (`src/services/firestore.ts`).
- Estados y valores permitidos sólo desde `src/constants/statuses.ts`.
- Páginas protegidas con `<RequireRole roles={[...]}>` en `src/app/App.tsx`.
- Modales con `components/ui/Modal` (cierra con Esc y clic afuera).
- Sin comentarios en el código.

## Flujo de trabajo

1. Tomar la tarjeta en Trello y moverla a **En proceso**.
2. Rama desde `dev` actualizado: `feat/<código>-<descripción>` (ej. `feat/b1-catalogo`) o `fix/<descripción>`.
3. Commits en inglés: `feat: …`, `fix: …`, `refactor: …`, `test: …`, `docs: …`.
4. Antes del PR: `npm run lint`, `npm test`, `npm run build` en verde.
5. PR a `dev` (squash merge). `main` sólo para entregas.

## Equipo

Joaquín Limeres · Katia Malena Pardo · Ainur Munasipov · Lev Tsatsorin
