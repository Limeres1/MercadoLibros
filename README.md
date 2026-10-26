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

| Script          | Qué hace                                                 |
| --------------- | -------------------------------------------------------- |
| `npm run dev`   | servidor de desarrollo                                   |
| `npm run build` | build de producción en `dist/`                           |
| `npm run lint`  | chequeo de tipos (TypeScript, sin variables sin usar)    |
| `npm test`      | tests con Vitest                                         |
| `npm run seed`  | crea las cuentas demo y los libros iniciales en Firebase |

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

El rol admin sólo se asigna desde la semilla o desde Firestore; en el registro se elige comprador o vendedor. Las reglas de `firestore.rules` se publican con `npx firebase-tools deploy --only firestore:rules`.

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
