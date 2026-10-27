# Mercado Libros

Marketplace de libros digitales: los lectores compran y leen en un lector integrado, los vendedores publican sus obras y un administrador modera el contenido.

**Producción:** https://mercado-libros.vercel.app

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · Firebase (Auth, Firestore) · Gemini (Google AI Studio) · Vitest

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # completar VITE_FIREBASE_* (Firebase → Configuración del proyecto) y GEMINI_API_KEY
npm run dev                  # http://localhost:3000, incluye /api/ai
```

| Script               | Qué hace                                                     |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | servidor de desarrollo                                       |
| `npm run build`      | build de producción en `dist/`                               |
| `npm run lint`       | chequeo de tipos (TypeScript, sin variables sin usar)        |
| `npm test`           | tests con Vitest                                             |
| `npm run test:rules` | tests de `firestore.rules` en el emulador (requiere Java 21) |
| `npm run seed`       | crea las cuentas demo y los libros iniciales en Firebase     |

## Cuentas demo

`npm run seed` crea (o actualiza) en Firebase Auth las cuentas demo con UID fijos y carga en Firestore sus perfiles, los libros y los contenidos iniciales. Necesita en `.env.local`:

- `GOOGLE_APPLICATION_CREDENTIALS`: ruta al JSON de la cuenta de servicio (Firebase → Configuración → Cuentas de servicio → Generar clave). No se sube al repo.
- `SEED_DEMO_PASSWORD`: contraseña común de las cuentas demo.

| Rol       | Email                               |
| --------- | ----------------------------------- |
| Admin     | `admin@mercadolibros.com`           |
| Vendedor  | `libreria.atenea@mercadolibros.com` |
| Vendedor  | `libros.antiguos@mercadolibros.com` |
| Comprador | `sofia.lectora@mercadolibros.com`   |

El rol admin sólo se asigna desde la semilla o desde Firestore; en el registro se elige comprador o vendedor. ## Catálogo y búsqueda

El catálogo no descarga todos los libros: pide a Firestore páginas de 24 (`useCatalogBooks`) y carga la siguiente al llegar al final de la lista. Género, idioma, formato y orden se resuelven en Firestore; la búsqueda usa el campo `searchTokens` (palabras de título y autor sin tildes y sus prefijos, más el ISBN), que `BooksProvider` calcula con `buildSearchTokens` cada vez que se crea o edita un libro. Cada combinación de filtro y orden necesita los índices de `firestore.indexes.json`; se publican con `npx firebase deploy --only firestore:indexes`.

Para mostrar libros sueltos (ficha, lector, favoritos, biblioteca, carrito) se usan `useBook(id)` y `useBooksByIds(ids)`, que leen sólo esos documentos.

## Pagos (Mercado Pago)

El navegador nunca marca un pedido como pagado: el carrito se lee en el servidor y todo el circuito pasa por funciones de Vercel en `api/`.

1. `POST /api/checkout` valida el carrito (libros publicados, stock, digitales no comprados, dirección para impresos), crea el pedido `pending` y la preferencia de Mercado Pago (Checkout Pro). Devuelve el link de pago.
2. Mercado Pago avisa a `POST /api/payments/webhook`; la función consulta el pago en la API de Mercado Pago y, si está aprobado, en una sola transacción marca el pedido `paid`, descuenta stock, suma ventas, agrega los digitales a la biblioteca, registra las compras y vacía esos libros del carrito. Repetir el aviso no duplica nada; un pago rechazado deja el pedido `rejected`.
3. Mientras el usuario tenga un pedido de Mercado Pago pendiente, la app llama sola a `POST /api/payments/sync` (al volver a la pestaña y cada 5 segundos), que busca el pago por `external_reference`. Así el pedido se confirma aunque el webhook no llegue (en `localhost` Mercado Pago no permite webhook ni retorno automático: `auto_return` exige una URL https).

En el checkout se elige el medio de pago (tarjeta, dinero en cuenta o efectivo en Rapipago/Pago Fácil); la preferencia excluye los demás tipos (`PAYMENT_OPTIONS` en `src/constants/payments.ts`).

Variables del servidor: `MP_ACCESS_TOKEN` (Access Token **de prueba** de una aplicación de Mercado Pago), `MP_CURRENCY` (por defecto `ARS`) y `FIREBASE_SERVICE_ACCOUNT` (JSON de la cuenta de servicio en una línea; en local alcanza con `GOOGLE_APPLICATION_CREDENTIALS`). Para pagar en el sandbox, en el checkout entrar con una **cuenta de prueba de comprador** de Mercado Pago.

Sin `MP_ACCESS_TOKEN` el checkout lleva a `/pago/simulado`, donde se aprueba o rechaza el pago con los mismos estados (plan B para demos). La lógica de pedidos se prueba contra el emulador en `tests/server/`.

## Reglas de Firestore

`firestore.rules` define quién lee y escribe cada colección; los tests están en `tests/rules/` y corren contra el emulador con `npm run test:rules` (necesita Java 21: `brew install openjdk@21`). Se publican con `npx firebase deploy --only firestore:rules`.

- `users`: cada uno crea su perfil como comprador o vendedor; nadie cambia su propio `role`, `email` ni `isBlocked`.
- `users/{uid}/favorites`, `cart`, `library`: sólo el dueño (y el admin para leer). La biblioteca no se crea desde el navegador: la escribe el flujo de pago con Admin SDK; el dueño sólo guarda `lastReadPage` y `bookmarks`.
- `books`: los crea un vendedor activo, siempre como `draft`; el vendedor pasa a `pending_review` o `withdrawn`, sólo el admin publica o rechaza. `rating` y `reviewCount` se actualizan en el mismo batch que la reseña.
- `bookContents`: el texto completo lo leen el vendedor, el admin y quien tiene el libro en su biblioteca.
- `orders`: el comprador crea pedidos `pending` con `totalAmount = subtotal + shippingCost`; el pago (servidor) los marca `paid`.
- `reviews`: sólo quien tiene el libro en su biblioteca, puntaje 1–5, id `docIds.review(bookId, userId)`.
- `reports`: cualquier usuario activo denuncia; sólo el admin resuelve.
- `auditLog`: sólo el admin escribe (con `logAdminAction` de `@/services/auditLog`) y nadie edita ni borra.
- Usuarios bloqueados no pueden crear libros, pedidos, reseñas ni denuncias.

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
api/
  ai.ts           función serverless de Vercel que consulta a Gemini
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

## IA con Gemini

El navegador nunca ve la API key: el front llama a `/api/ai` (función de Vercel en `api/ai.ts`) y la función consulta a Gemini con `GEMINI_API_KEY`. Sólo responde a usuarios con sesión de Firebase y hasta 10 consultas por minuto por usuario. En local, `npm run dev` sirve la misma función tomando la key de `.env.local`; en Vercel se carga en Settings → Environment Variables. `GEMINI_MODEL` es opcional (por defecto `gemini-3.8-flash`); si el modelo está saturado se reintenta con `gemini-3.6-flash`.

Desde cualquier pantalla se usa el hook `useAI()`:

```tsx
import { useAI } from '@/hooks/useAI';

const BookSummary: React.FC<{ book: Book }> = ({ book }) => {
  const { ask, isLoading, error } = useAI();
  const [summary, setSummary] = useState<string | null>(null);

  const summarize = async () => {
    const text = await ask({
      systemInstruction: 'Sos un librero. Respondé en español, en 3 oraciones.',
      prompt: `Resumí "${book.title}" de ${book.author}: ${book.description}`,
    });
    if (text) setSummary(text);
  };

  return (
    <>
      <button onClick={summarize} disabled={isLoading}>
        {isLoading ? 'Pensando…' : 'Resumir con IA'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
      {summary && <p>{summary}</p>}
    </>
  );
};
```

- `ask({ prompt, systemInstruction?, json? })` devuelve el texto o `null` si falló; en ese caso `error` trae un mensaje listo para mostrar (sin sesión, límite de consultas, IA caída, sin conexión).
- Con `json: true` Gemini responde JSON; pedir el formato en el prompt y hacer `JSON.parse(text)`.
- La app sigue funcionando aunque la IA falle: mostrar `error` y no bloquear la pantalla.

## Flujo de trabajo

1. Tomar la tarjeta en Trello y moverla a **En proceso**.
2. Rama desde `dev` actualizado: `feat/<código>-<descripción>` (ej. `feat/b1-catalogo`) o `fix/<descripción>`.
3. Commits en inglés: `feat: …`, `fix: …`, `refactor: …`, `test: …`, `docs: …`.
4. Antes del PR: `npm run lint`, `npm test`, `npm run build` en verde.
5. PR a `dev` (squash merge). `main` sólo para entregas.

## Equipo

Joaquín Limeres · Katia Malena Pardo · Ainur Munasipov · Lev Tsatsorin
