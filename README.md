# Mercado Libros

Marketplace de libros: los lectores compran libros digitales e impresos y leen los digitales en un lector integrado, los vendedores publican sus obras y un administrador modera el contenido. Incluye un asistente de recomendaciones y la redacción de sinopsis con IA (Gemini).

**Producción:** https://mercado-libros.vercel.app

## Qué se puede hacer

| Rol           | Funciones                                                                                                                                                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visitante     | Catálogo con búsqueda (título, autor o ISBN, sin tildes), filtros por género, idioma, formato y precio, orden por valoración, precio, novedad o año; ficha del libro con reseñas, muestra gratuita y escaneo de código de barras. Para comprar se le pide iniciar sesión.                                                                  |
| Comprador     | Registro e inicio de sesión (email o Google), recuperación de contraseña, perfil con 4 libros destacados, favoritos, carrito, pago con Mercado Pago, historial de pedidos, biblioteca y lector (tamaño de letra, tema, interlineado, progreso y marcadores), reseñas de libros comprados, denuncias y asistente de recomendaciones con IA. |
| Vendedor      | Publicar libros con portada, archivo EPUB/TXT y muestra; borradores y envío a revisión; motivo de rechazo; editar y retirar de la venta (los compradores lo conservan); sinopsis, género y palabras clave propuestos por IA; ventas e ingresos por período.                                                                                |
| Administrador | Aprobar o rechazar publicaciones con motivo, resolver denuncias (desestimar, retirar el libro o eliminar la reseña), buscar libros y usuarios, bloquear y desbloquear usuarios con motivo y consultar el registro de auditoría.                                                                                                            |

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · Firebase (Auth, Firestore, Admin SDK) · Gemini (Google AI Studio) · Mercado Pago · Funciones serverless de Vercel · Vitest

## Cómo correrlo

Requiere Node 22.

```bash
npm install
cp .env.example .env.local   # completar las variables (ver abajo)
npm run dev                  # http://localhost:3000, también sirve las funciones de api/
```

| Script               | Qué hace                                                                        |
| -------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`        | servidor de desarrollo con las funciones de `api/`                              |
| `npm run build`      | build de producción en `dist/`                                                  |
| `npm run lint`       | TypeScript, ESLint y Prettier                                                   |
| `npm run format`     | corrige ESLint y formatea                                                       |
| `npm test`           | tests unitarios y de pantallas (Vitest)                                         |
| `npm run test:rules` | reglas de Firestore y lógica del servidor contra el emulador (requiere Java 21) |
| `npm run seed`       | crea cuentas y libros iniciales en un proyecto de Firebase nuevo                |

## Variables de entorno

| Variable                                                                                                                                                                      | Dónde se usa                                                                                                            | Obligatoria                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | navegador (configuración web de Firebase) y servidor (`PROJECT_ID`)                                                     | sí                                 |
| `GEMINI_API_KEY`                                                                                                                                                              | servidor: `/api/ai` y `/api/recommendations`                                                                            | sí                                 |
| `FIREBASE_SERVICE_ACCOUNT`                                                                                                                                                    | servidor: JSON de la cuenta de servicio en una línea, para pagos, lector, ventas, recomendaciones y bloqueo de usuarios | sí, en Vercel                      |
| `GOOGLE_APPLICATION_CREDENTIALS`                                                                                                                                              | local: ruta al JSON de la cuenta de servicio (reemplaza a la anterior)                                                  | sólo en local                      |
| `MP_ACCESS_TOKEN`                                                                                                                                                             | servidor: Access Token **de prueba** de Mercado Pago                                                                    | no: sin él se usa el pago simulado |
| `MP_CURRENCY`                                                                                                                                                                 | moneda de Mercado Pago, por defecto `ARS`                                                                               | no                                 |
| `GEMINI_MODEL`                                                                                                                                                                | modelo de Gemini preferido                                                                                              | no                                 |
| `SEED_DEMO_PASSWORD`                                                                                                                                                          | contraseña de las cuentas creadas por `npm run seed`                                                                    | sólo para la semilla               |

Las claves del servidor nunca llevan el prefijo `VITE_`, así no llegan al navegador. `.env.local` y el JSON de la cuenta de servicio no se suben al repositorio.

## Cuentas demo

En producción hay cuentas de los tres roles, todas con la misma contraseña (la comparte el equipo):

| Rol           | Email                                                             |
| ------------- | ----------------------------------------------------------------- |
| Administrador | `admin@mercadolibros.com`                                         |
| Vendedor      | `tinta.sur@mercadolibros.com`, `mar.de.paginas@mercadolibros.com` |
| Comprador     | `renata.ortiz@mercadolibros.com`                                  |

El rol administrador sólo se asigna desde Firestore; al registrarse se elige comprador o vendedor.

## Estructura

```
src/
  app/            rutas (App.tsx) y providers
  components/     layout (Navbar, Footer) y ui (Modal, Toast, EmptyState…)
  constants/      rutas, colecciones, estados, catálogo, pagos
  features/
    auth/         sesión, login y registro, perfil, perfil público
    catalog/      catálogo, ficha, muestra, escáner, reseñas, denuncias, favoritos, recomendaciones IA
    shop/         carrito, checkout, pedidos
    reader/       biblioteca, lector, progreso y marcadores
    seller/       panel del vendedor, carga de libros, sinopsis IA, estadísticas
    admin/        revisión, denuncias, búsqueda, usuarios, registro de auditoría
  lib/  services/  types/
api/              funciones serverless de Vercel
  _lib/           lógica compartida (Firebase Admin, Gemini, Mercado Pago, pedidos…)
tests/            reglas de Firestore y lógica del servidor contra el emulador
```

Cada módulo expone su estado con un Provider y un hook (`useBooks`, `useCart`, `useLibrary`, `useOrders`…) que leen y escriben en Firestore.

## Datos y seguridad

Todo se guarda en Firestore: `users` (con `favorites`, `cart`, `library` y `purchases`), `books`, `bookContents`, `orders`, `reviews`, `reports` y `auditLog`. `firestore.rules` define quién lee y escribe cada colección y está cubierto por tests en el emulador. Se publica con `npx firebase deploy --only firestore:rules`.

- Nadie cambia su propio rol, email ni estado de bloqueo; un usuario bloqueado no puede publicar, comprar, reseñar ni denunciar.
- Los libros se crean como borrador; sólo el admin publica, y rechazar o retirar exige un motivo.
- El texto completo de un libro (`bookContents`) sólo lo leen su vendedor, el admin y quien lo compró.
- Los pedidos sólo los lee su comprador; los vendedores ven sus ventas con `/api/seller/sales`, que devuelve únicamente sus propias líneas.
- Cada acción de moderación se guarda en la misma escritura que su entrada en `auditLog` (admin, acción, objeto, motivo, fecha y hora); las entradas no se pueden editar ni borrar.

## Funciones del servidor (`api/`)

| Ruta                                          | Para qué                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `/api/ai`                                     | consulta a Gemini con la sesión del usuario (sinopsis del vendedor)               |
| `/api/recommendations`                        | asistente que recomienda hasta 3 libros del catálogo                              |
| `/api/checkout`                               | valida el carrito en el servidor, crea el pedido y la preferencia de Mercado Pago |
| `/api/payments/webhook`, `/api/payments/sync` | confirman el pago con Mercado Pago                                                |
| `/api/payments/simulate`                      | pago simulado cuando no hay `MP_ACCESS_TOKEN`                                     |
| `/api/reader/sync`                            | ajusta las páginas y el progreso del lector de un libro comprado                  |
| `/api/seller/sales`                           | ventas del vendedor que inició sesión                                             |
| `/api/admin/block`                            | bloquea o desbloquea un usuario (también deshabilita su cuenta en Firebase Auth)  |

Todas verifican el token de Firebase del usuario. Las consultas a Gemini tienen un límite de 10 por minuto por usuario y, si un modelo falla o está saturado, se prueba con otro.

### Pagos

El navegador nunca marca un pedido como pagado. `/api/checkout` crea el pedido `pending`; si el comprador tenía otro intento abierto, lo cancela y vence su link de pago, así no se paga dos veces lo mismo. Al aprobarse el pago, una sola transacción marca el pedido `paid`, descuenta stock, suma ventas, agrega los digitales a la biblioteca y vacía el carrito. Para pagar en el sandbox de Mercado Pago se usa una cuenta de prueba de comprador.

### Lector

El texto se divide en páginas de unos 18 renglones (`paginateReaderText`), partiendo los párrafos largos al final de una oración. El progreso y los marcadores se guardan en Firestore, así se conservan entre dispositivos y sesiones.

## Calidad

- `npm run lint`, `npm test` y `npm run test:rules` en verde antes de cada PR.
- Lighthouse en catálogo y ficha: accesibilidad 100, buenas prácticas 100, SEO 100.
- Sin errores de consola y sin desplazamiento horizontal en 390, 768 y 1280 px.

## Flujo de trabajo

1. Tomar la tarjeta en Trello y moverla a **En proceso**.
2. Rama desde `dev`: `feat/<código>-<descripción>` o `fix/<descripción>`.
3. Commits en inglés: `feat: …`, `fix: …`, `refactor: …`, `test: …`, `docs: …`.
4. PR a `dev` con squash merge. `main` es producción: cada push despliega en Vercel.

Convenciones del código: imports absolutos con `@/`, nombres descriptivos, rutas, colecciones y estados sólo desde `src/constants`, IDs con `createId()`, sin comentarios.

## Equipo

| Integrante         | Zona                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Lev Tsatsorin      | Infraestructura y Firebase, reglas, integración con Gemini, catálogo y ficha, pagos        |
| Katia Malena Pardo | Perfil y favoritos, denuncias, asistente de recomendaciones                                |
| Ainur Munasipov    | Carrito y checkout, pedidos, lector, muestras y búsqueda por ISBN                          |
| Joaquín Limeres    | Repositorio y despliegue, publicación de libros, sinopsis con IA, estadísticas, moderación |
