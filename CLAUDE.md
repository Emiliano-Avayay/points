# SUMMA — Demo de fidelización multiempresa

> **Documentación única del proyecto.** No crear README, PLAN, STATUS, DESIGN, DEPLOY ni similares: todo se registra acá.

## 1. Estado de entrega (2026-11-19)

**Demo comercial completa, ejecutable, probada y dockerizada.** Acceso local: **http://localhost:8081**

| Ítem | Estado |
|---|---|
| Pantallas cliente (12 secciones) | Implementadas y revisadas a 320/375/390/430/768/1280 px |
| Panel administrativo (11 secciones) | Implementado y revisado en móvil y escritorio |
| Reglas de negocio | Centralizadas en `src/domain`, 37 tests Vitest ✅ |
| Recorridos de navegador | 17 tests Playwright ✅ (contra el contenedor Docker) |
| Build de producción | `npm run build` ✅ (typecheck estricto + Vite) |
| Docker | Build, inicio, healthcheck, rutas profundas y logs verificados ✅ |
| Publicación externa | **No realizada** (solo preparada, ver §10) |

**Para retomar el trabajo:** no hay tareas pendientes de prioridad alta. Ver §12 para mejoras opcionales.

## 2. Objetivo y alcance

SUMMA es una plataforma de fidelización para varios comercios independientes. Cada comercio tiene su programa de puntos, premios, promociones, clientes, canjes y métricas. La versión actual es una **demo comercial** sin backend: no es un SaaS productivo.

Limitaciones propias de la demo (no son bugs):

- Persistencia en **LocalStorage**: los datos viven en cada navegador; no hay sincronización entre dispositivos ni entre visitantes. Docker solo sirve archivos estáticos: **no guarda los puntos de nadie**.
- **Sin autenticación real.** La pantalla de acceso permite elegir persona o comercio; no hay contraseñas. Cualquiera que acceda a una publicación de la demo interactúa con sus propios datos locales.
- La separación entre comercios es lógica (por `merchantId`), no un aislamiento de seguridad.
- Invitaciones, campañas, códigos QR, reservas, sorteos y códigos de canje son **simulados**: no se envía ni valida nada externamente.

## 3. Stack y arquitectura

React 19 · TypeScript 5.9 (strict) · Vite 8 · Tailwind CSS 4 · React Router 8 (modo librería, `BrowserRouter`) · Lucide React · Recharts 3 (solo admin, carga diferida) · Poppins autoalojada (`@fontsource`, subset latin) · Vitest 5 · Playwright 1.65.

```
src/
  domain/        Modelo y reglas puras (sin React)
    types.ts       Entidades: Merchant, Customer, Membership, Reward, Movement, Redemption, Promotion…
    points.ts      Cálculo de puntos, bonificaciones y parseo de inputs
    tiers.ts       Niveles Bronce/Plata/Oro
    selectors.ts   Saldos, estadísticas, métricas, actividad mensual (todo derivado de movimientos)
    operations.ts  Operaciones: acreditar, ajustar, canjear, favoritos, catálogo, comercios, promos, desafíos, referidos…
    ids.ts, format.ts
    domain.test.ts Tests Vitest
  data/
    seed.ts        Datos iniciales determinísticos (PRNG con semilla, fechas relativas a "hoy")
    repository.ts  Interfaz DemoRepository + LocalStorageRepository (versionado y validación)
  state/           Store sincrónico (useSyncExternalStore) + hooks de sesión cliente/admin
  components/      brand/ (logo, marcas de comercio) · ui/ (sistema de componentes) · layout/ · illustrations/ · rewards/ · points/
  pages/           AccessPage, NotFoundPage, client/*, admin/* (admin con lazy loading)
  lib/clipboard.ts
e2e/summa.spec.ts  Playwright
docker/nginx.conf  Servidor estático
public/rewards/    Fotos de premios + credits.json + cupón SVG
```

Decisiones clave:

- **Saldos derivados, nunca almacenados.** `balance = Σ movimientos (merchantId, customerId)`. Imposible que un saldo y su historial diverjan.
- **Operaciones puras** `(state, input) → Result`. La UI no muta estado: llama a `store.run(op)`. El store aplica sobre el estado más reciente de forma sincrónica y persiste.
- **Idempotencia** por `requestId` en acreditaciones, ajustes y canjes: un doble clic con la misma clave se rechaza. Además, los botones de confirmación usan una guarda sincrónica (`useRef`).
- **Capa de datos reemplazable**: la app solo depende de `DemoRepository { load, save, clear }`. Para pasar a una API real, implementar esa interfaz (o mover `operations.ts` al servidor) sin tocar las pantallas.
- **Almacenamiento versionado**: clave única `summa-demo:state` con sobre `{ schema, savedAt, state }`. Datos ausentes, dañados o de otra versión se descartan y se regenera la semilla. El reset solo borra esa clave.
- Sincronización entre pestañas del mismo navegador vía evento `storage`.
- Recharts va en un chunk aparte (`charts`) que solo carga el panel admin.

## 4. Sistema visual

Fuente de verdad: las dos capturas de referencia de SUMMA. Se consultó la skill `ui-ux-pro-max` (`--design-system`, dominios `ux`, `typography`, `chart`, stack `react`) y `dataviz`. La skill propuso un estilo "Minimalism & Swiss" (adoptado) pero una paleta azul/naranja y tipografía Inter/Playfair que **se descartaron** por contradecir la identidad de las referencias.

**Tokens** (`src/index.css`, `@theme` de Tailwind 4):

| Token | Valor | Uso |
|---|---|---|
| `lime` | `#DCFB07` | Superficies de marca, CTA, píldoras de puntos. Siempre con texto negro (≈17:1) |
| `lime-strong` / `lime-deep` | `#C6E400` / `#A9C300` | Hover, sombras lima, profundidad del símbolo |
| `lime-soft` / `lime-wash` | `#F1FDB0` / `#F8FEDB` | Fondos suaves, estados seleccionados |
| `olive` | `#4A5800` | Texto "lima" sobre blanco (≈7.6:1) |
| `ink` / `ink-2` / `ink-3` | `#0B0B0D` / `#1C1C21` / `#2C2C33` | Texto, superficies oscuras |
| `muted` / `subtle` | `#63636B` / `#8A8A93` | Texto secundario (muted ≥ 4.5:1 sobre blanco) |
| `line` / `surface` / `canvas` | `#E6E6EA` / `#F4F4F5` / `#FAFAFA` | Bordes y fondos |
| `success` / `warning` / `danger` | `#13803D` / `#A14B00` / `#C8261B` | Estados (siempre con texto/ícono) |

- **Regla de legibilidad del lima:** nunca texto lima sobre blanco; el lima es fondo.
- **Tipografía:** Poppins 400–800. Títulos 800, encabezados de tarjeta 700, cuerpo 400–500, controles 600. `text-wrap: balance` en títulos.
- **Formas:** tarjetas `rounded-[1.75rem]` blancas con sombra suave; botones y píldoras `rounded-full`; botón circular lima con flecha en tarjetas.
- **Fondos:** "swooshes" lima diagonales en Inicio y Acceso, como en la referencia.
- **Ilustraciones propias** (`components/illustrations`): regalo, mano con estrella, trofeo, calendario (trazo negro 3.2 + relleno lima + destellos) y caja de regalo negra con moño lima para el banner.
- **Marca:** `components/brand/Logo.tsx` — símbolo geométrico en S (trazo grueso lima con profundidad) + "SUMMA" 800. Es provisional y reemplazable cambiando solo ese archivo y `public/favicon.svg`.
- **Comercios:** ícono Lucide sobre su color secundario (8 tonos sobrios). El lima/negro de SUMMA no cambia.
- **Gráficos:** paleta validada con `validate_palette.js` de la skill dataviz: entregados `#4A5800`, canjeados `#8AA000` (todas las comprobaciones pasan; WARN de contraste compensado con leyenda, tooltip y vista de tabla).
- **Movimiento:** `fade-up`, `sheet-up`, `pop` (≤ 360 ms); todo se anula con `prefers-reduced-motion`.
- **Accesibilidad:** foco visible (outline negro, lima en superficies oscuras), skip links, labels asociados, errores junto al campo con `role="alert"`, `aria-pressed`/`aria-checked`/`role="switch"`, diálogos con foco atrapado, Escape y devolución de foco, objetivos táctiles ≥ 44 px, `aria-live` en toasts y resultados de búsqueda.
- **Mobile first:** header compacto con logo centrado, barra inferior fija con botón central elevado, safe areas (`env(safe-area-inset-*)`), `pb-nav` para que la barra no tape contenido, modales como hoja inferior en móvil, `inputMode` adecuado en formularios. En escritorio la barra inferior flota centrada y el admin usa sidebar.

## 5. Reglas de negocio

- **Puntos por compra:** `floor(monto / pesosPorPunto)`, por defecto 1 punto cada $100 (configurable por comercio; Nodo Tecnología usa $200). Montos negativos, no numéricos o > $100.000.000 se rechazan. Sin fracciones.
- **Acreditación manual:** entero > 0, máx. 1.000.000 por operación, motivo obligatorio.
- **Ajustes:** entero ≠ 0, justificación obligatoria (≥ 3 caracteres), nunca dejan saldo negativo. Tipos `adjust_add` / `adjust_sub`.
- **Movimiento:** `{ id, merchantId, customerId, type, points (con signo), reason, createdAt, amount?, promotionId?, redemptionId?, parentId?, requestId? }`.
- **Canje:** valida comercio y adhesión → idempotencia → premio existente, del mismo comercio, activo y con stock → saldo suficiente → crea `Redemption` (código `SUM-XXXX-XXXX`, estado Pendiente) + un único movimiento `redeem` → descuenta stock si es limitado. El admin marca Entregado (o deshace).
- **Niveles:** por puntos **históricos ganados en el mismo comercio**: Bronce 0–999, Plata 1.000–4.999, Oro 5.000+. Canjes y ajustes en contra no bajan el nivel. Umbrales fijos; beneficios editables por comercio.
- **Bonificaciones:** porcentaje extra sobre los puntos de compra (`floor(base × % / 100)`), con rango de fechas, días de la semana y franja horaria opcionales. Se aplica **una sola** (la de mayor %) por compra, como movimiento `promo_bonus` vinculado por `parentId`. El comercio puede pausar todas.
- **Referidos:** invitar registra un referido simulado; "Simular primera compra" crea al invitado como cliente ficticio, le acredita su primera compra y, por ser sus primeros puntos, el invitador recibe **100 puntos una única vez**.
- **Desafíos:** progreso simulado (compras/visitas), "Completá tu perfil" se cumple guardando el perfil; la recompensa se reclama una sola vez.
- **Eventos/encuestas/sorteos:** una participación por cliente; eventos con cupo; encuestas y eventos suman puntos (`event_bonus`), los sorteos no.
- **Independencia por comercio:** saldos, movimientos, premios, canjes, promociones, desafíos y métricas se filtran siempre por `merchantId`. Un premio de otro comercio no puede canjearse con el saldo activo.
- **Clientes activos:** con movimientos en los últimos 60 días.

## 6. Datos de demostración

`src/data/seed.ts`, determinístico (semilla fija) y con fechas relativas al momento de inicialización (≈ 6 meses de historia).

- **3 comercios:** Café Molienda (cafetería), Patitas Pet Shop (mascotas), Nodo Tecnología (tecnología, $200 = 1 pt).
- **18 clientes ficticios** (emails `@demo.summa`), 29 membresías, varios en 2 comercios.
- **Sofía Martínez:** exactamente **580 pts** en Café Molienda (Plata) y también clienta de Patitas.
- **Martín Gómez:** 6.840 pts en Café Molienda (Oro), varios canjes posibles; recibió un referido histórico.
- **18 premios** con los 8 obligatorios (Tarta a elección, Café + porción de torta, Café + dos medialunas, Un kilogramo de helado y Vaso térmico en el café; Alimento balanceado y Descuento del 20% en mascotas; Tóner de color en tecnología) y extras.
- 9 promociones (vigentes, en horario, programadas, finalizadas), 9 desafíos, 10 actividades, campañas y canjes históricos.
- Conciliación garantizada: saldos derivados de movimientos; los tests verifican saldo = ganado − canjeado − ajustes y que cada bonificación histórica corresponda a una promo vigente en su fecha.

**Restablecer la demo:** botón "Restablecer demo" (pantalla de acceso, menú cliente, perfil y sidebar admin) con confirmación. Borra solo la clave `summa-demo:state`.

## 7. Funcionalidades

**Acceso (`/`):** elegir cliente ficticio o comercio a administrar, aviso de demo, reset. Soporta `?ref=CÓDIGO` (mensaje de invitación simulado).

**Cliente (`/app/...`):** Inicio (réplica de la referencia + bonificación activa, nivel y destacados) · Tienda (búsqueda, categorías, orden, "me alcanza") · Detalle (saldo, faltante, disponibilidad, confirmación, código) · Mis puntos (saldo, ganado, usado, nivel, movimientos filtrables) · Mis canjes (estado, código copiable) · Favoritos (agrupados por comercio) · Invitá amigos (código, enlace demostrativo, copiar, compartir con Web Share si existe, simulación) · Bonificaciones · Desafíos · Niveles · Eventos/encuestas/sorteos · Sumá puntos (tarjeta de cliente con QR decorativo y calculadora) · Comercios (adherirse) · Perfil (edición) · Créditos de imágenes. Selector de comercio en Inicio y menú. Cambio a admin desde menú y perfil.

**Admin (`/admin/...`):** Dashboard (6 KPI, actividad mensual con tabla accesible, clientes por nivel, últimas operaciones) · Clientes (búsqueda, nivel/inactivos, orden; tarjetas en móvil y tabla en escritorio) · Ficha de cliente ("Ver como cliente") · Acreditar (compra con cálculo y bonificación, manual, ajuste ±) · Catálogo (alta, edición, activar/desactivar, galería local o URL https con fallback, stock) · Canjes (entregar/deshacer) · Movimientos · Promociones y niveles (CRUD de promociones, pausa general, beneficios por nivel) · Campañas (4 plantillas, variables, audiencia calculada, vista previa estilo WhatsApp, historial; sin envíos reales) · Configuración · Crear comercio (ID automático, catálogo y clientes vacíos).

## 8. Pruebas realizadas

| Prueba | Resultado |
|---|---|
| `npm run typecheck` / `npm run build` | ✅ sin errores |
| `npm test` (Vitest, 37 tests) | ✅ cálculo de puntos, acreditación, ajustes, saldo insuficiente, canjes, doble canje (dominio y store), independencia entre comercios, niveles, referidos, desafíos, encuestas, catálogo, favoritos, persistencia, datos dañados, reset, conciliación del seed, métricas |
| `npm run test:e2e` (Playwright, 17 tests, viewport móvil) contra `http://localhost:8081` | ✅ recorrido crítico completo con doble clic y sin errores de consola/CSP, saldo insuficiente, búsqueda/filtros/favoritos tras recarga, cambio de comercio, referidos/desafíos/encuestas, copiar enlace, ajuste negativo rechazado, CRUD de premios, crear comercio + estados vacíos + reset, campañas, **sin scroll horizontal en 22 rutas a 320/375/390/430/768/1280 px**, imágenes sin roturas |
| Revisión visual manual (navegador integrado y capturas) | Móvil 320/375, tablet 768 y escritorio 1280: header, grillas, barra inferior, modales, formularios, imágenes, tipografía, estados vacíos, admin responsive |

Recorrido crítico verificado: admin Café Molienda → Sofía → compra $200.000 (+2.000 + 600 por "Semana de beneficios") → saldo 3.180 → vista cliente → canje Vaso térmico (2.000) → saldo 1.180 → admin Canjes muestra el pendiente → Marcar entregado.

Nota Playwright: el config usa el Chromium ya presente en `~/Library/Caches/ms-playwright` (cualquier revisión) o `PW_CHROMIUM_PATH`, sin descargar navegadores. En otra máquina: `npx playwright install chromium`. Las capturas quedan en `playwright-screens/` (ignorado).

## 9. Problemas detectados y resueltos

- Desborde horizontal en Acceso y Dashboard (ítems de grilla con `truncate` sin `min-w-0`) → corregido; cubierto por test.
- Doble logo y clases `hidden` anuladas por `inline-flex` interno de componentes → se envuelven en `span` con la clase responsive.
- Etiquetas de la barra inferior partidas a 320 px → `whitespace-nowrap`, botón central más angosto en pantallas chicas.
- CTA "Canjear premio" fijo tapaba la descripción en móvil → ahora estático.
- Círculo decorativo de "Mis puntos" sobre el saldo → reposicionado.
- Segmented con íconos truncaba textos a 375 px → íconos ocultos < 400 px.
- `aria-label` del saldo sin separador de miles → formateado.
- Header `Cache-Control` duplicado en Nginx → eliminado `expires`.
- Fuentes: se importaban todos los subsets de Poppins → solo latin.
- Puerto 5173 ocupado por otra app (Docker) → el dev server usa **5188** (`.claude/launch.json`), sin tocar la otra app.

## 10. Guía de ejecución y Docker

**Requisitos:** Docker Engine 24+ con Docker Compose v2 (macOS: Docker Desktop; Ubuntu: `docker-ce` + `docker-compose-plugin`). Para desarrollo: Node 22+ (probado con Node 24).

**Desarrollo local**
```bash
npm install
npm run dev -- --port 5188      # http://localhost:5188
npm test                        # Vitest
npm run test:e2e                # Playwright (build + preview en :4188)
E2E_BASE_URL=http://localhost:8081 npm run test:e2e   # contra el contenedor
```

**Docker** (proyecto aislado `summa`, servicio `summa`, imagen `summa-demo:latest` ≈ 79 MB)
```bash
docker compose up -d --build     # build + inicio
docker compose ps                # estado (debe decir "healthy")
docker compose logs --tail=100   # logs
docker compose down              # detener y eliminar el contenedor
```
- Imagen multi-stage: `node:24-alpine` (npm ci, typecheck, `vite build`) → `nginxinc/nginx-unprivileged:1.27-alpine` (usuario 101, puerto interno 8080). La imagen final no contiene Node, Vite ni dependencias de desarrollo.
- Arranque automático: `restart: always` (el contenedor vuelve solo al reiniciar Docker o el servidor; en Ubuntu habilitar el servicio: `sudo systemctl enable docker`). En macOS, Docker Desktop debe iniciar con la sesión.
- Compose: bind `127.0.0.1:8081` por defecto, `read_only`, `tmpfs` para `/tmp` y caché de Nginx, `cap_drop: ALL`, `no-new-privileges`, healthcheck en `/healthz`. Sin `network_mode: host`, sin privilegios, sin socket de Docker, sin volúmenes.
- Nginx (`docker/nginx.conf`): fallback SPA (`try_files … /index.html`), assets con caché inmutable, `index.html` sin caché, gzip, CSP y headers de seguridad, `absolute_redirect off` para proxies.

**Cambiar puerto o interfaz:** copiar `.env.example` a `.env` y editar `SUMMA_PORT` / `SUMMA_BIND_HOST`, o `SUMMA_PORT=8082 docker compose up -d`. Si 8081 está ocupado, elegir otro libre sin detener la otra aplicación.

**Actualizar:** copiar el código nuevo y `docker compose up -d --build`. Para limpiar imágenes viejas: `docker image prune`.

**Restablecer datos demostrativos:** desde la app ("Restablecer demo") o borrando el almacenamiento del sitio en el navegador. Reiniciar el contenedor no afecta los datos (viven en cada navegador).

### Preparación para Ubuntu (no ejecutada)

1. Instalar Docker Engine y el plugin Compose (repositorio oficial de Docker).
2. Copiar el proyecto (sin `node_modules`, `dist`, `test-results`, `playwright-screens`), p. ej. `rsync -a --exclude node_modules --exclude dist ./ usuario@servidor:/opt/summa/`.
3. En el servidor: `cd /opt/summa && docker compose up -d --build`. No hay rutas absolutas de macOS ni archivos externos.
4. Dejar `SUMMA_BIND_HOST=127.0.0.1` y publicar a través del reverse proxy existente.

**Reverse proxy (ejemplo Nginx, a aplicar manualmente cuando se decida publicar):**
```nginx
server {
    server_name summa.ejemplo.com;
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Caddy equivalente: `summa.ejemplo.com { reverse_proxy 127.0.0.1:8081 }` (HTTPS automático).

**HTTPS más adelante:** con Nginx, `sudo certbot --nginx -d summa.ejemplo.com`; con Caddy es automático. La app funciona igual bajo HTTPS (y "Copiar" usa la Clipboard API nativa en contexto seguro; en HTTP usa un fallback).

**Recordatorio de seguridad:** no hay autenticación; cualquier visitante puede usar la demo con sus propios datos locales. No incluye secretos ni datos personales reales. No se configuraron proxies, DNS, firewall, certificados, túneles ni despliegues.

## 11. Créditos y licencias

- Fotografías de premios: 16 imágenes de **Wikimedia Commons** (CC0, CC BY 2.0/3.0/4.0, CC BY-SA 2.0/4.0), recortadas a 640×640. Autor, licencia y fuente de cada una en `public/rewards/credits.json` y visibles en la app en **Menú → Créditos de imágenes** (`/app/creditos`). Algunas muestran marcas de producto pequeñas (tóner, pendrive, auriculares) propias de la foto original.
- Cupón "Descuento del 20%", ilustraciones, logo provisional y favicon: originales de este proyecto.
- Íconos: Lucide (ISC). Fuente: Poppins (SIL OFL) vía @fontsource.

## 12. Pendientes reales y mejoras opcionales

No quedan criterios de aceptación pendientes. Mejoras posibles para una etapa siguiente:
- Backend real (API + base de datos + autenticación) implementando `DemoRepository` y moviendo `operations.ts` al servidor.
- Reemplazar el logo provisional por el SVG oficial (`components/brand/Logo.tsx`, `public/favicon.svg`).
- Fotos de mejor calidad para vaso térmico, mouse y tóner (las actuales son correctas pero sobrias).
- Modo oscuro (no requerido; los tokens ya están centralizados).
