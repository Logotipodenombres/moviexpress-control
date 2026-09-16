# Moviexpress · Centro de control

Aplicación privada de registro y seguimiento de transportistas. React, Vite, TypeScript, Supabase Auth/PostgreSQL/Storage/Realtime, React Router con HashRouter, Leaflet + OpenStreetMap, Lucide y PWA. Interfaz grafito con amarillo y rojo de Moviexpress, logo proporcionado, animaciones discretas, menú lateral y navegación inferior en celular. Los estilos usan CSS propio para conservar una identidad visual específica; no se requiere Tailwind.

**Estado de entrega:** código implementado, compilación y pruebas locales. No se ha creado ni conectado un proyecto Supabase real ni publicado un repositorio remoto. Para operar con datos reales hay que completar [SETUP.md](SETUP.md). La demostración es opcional, de solo lectura y contiene únicamente datos ficticios.

## Requisitos y ejecución

- Node.js 22.12 o posterior y npm.
- Cuenta de GitHub y proyecto Supabase para producción.
- HTTPS para geolocalización e instalación PWA; localhost funciona en desarrollo.

```bash
npm install
cp .env.example .env.local
npm run dev
```

En Windows puedes copiar `.env.example` y cambiar el nombre de la copia a `.env.local` desde el explorador. Reinicia el servidor al cambiar variables.

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

Se admite la clave pública `anon` o una clave `publishable`. **Nunca** colocar `service_role`, secret keys, contraseñas de base de datos ni tokens de administración en variables `VITE_*`. Estas dos variables son públicas por diseño; la protección de datos reside en RLS.

```bash
npm run lint
npm test
npm run build
npm run preview
```

El resultado está en `dist/`. `base: './'` admite tanto la raíz como `/nombre-repositorio/`; HashRouter evita errores 404 al actualizar las rutas. Se usa esbuild en WebAssembly para compatibilidad con entornos Windows restringidos. No se necesita un servidor Node en producción.

## Funciones implementadas

| Área | Comportamiento |
| --- | --- |
| Acceso | Supabase Auth, sesión persistente, cierre de sesión, recuperación, nueva contraseña e invitación privada. Sin formulario de registro público. |
| Seguridad | Organizaciones separadas por RLS, roles administrados en servidor, validaciones SQL, referencias compuestas que bloquean relaciones entre empresas. |
| Conductores | Alta, edición, consulta, archivo/restauración, edad calculada, contactos, licencia, fotografía. |
| Vehículos | Identificación, placas, asignación a conductor, propietario, carga, archivo, fotografías principal y adicionales. |
| Reportes | Folio PostgreSQL, estatus, lugar, incidente, carga, contacto, denuncia, datos enlazados de conductor y unidad. |
| Ubicaciones | Historial append-only, última posición por unidad, coordenadas, precisión, mapa y recorrido. |
| Expedientes | Información, fotografías, reportes asociados, ubicaciones, PDF adjuntos y bitácora para administradores. |
| Búsqueda | Buscador global agrupado y listados con búsqueda, estatus, paginación y ordenamiento. Cards en móvil. |
| Exportación | CSV para administradores y reporte PDF multipágina con logo, fotos disponibles, datos y ubicación. |
| Usuarios | Invitación por Edge Function, cambios de rol y activación/desactivación por administradores. |
| PWA | Instalación según navegador, iconos, manifest, actualización bajo aviso y caché de archivos estáticos. |

## Supabase

1. Crear el proyecto.
2. Ejecutar en **SQL Editor**, en orden: `supabase/migrations/001_core.sql` y `002_documents.sql`. Son migraciones iniciales para un proyecto nuevo; no volver a ejecutar la misma migración.
3. Los scripts crean tablas, índices, RLS, triggers, publicación Realtime y los buckets **privados** `fleet-photos` y `fleet-documents`.
4. Desactivar nuevas inscripciones públicas en Auth; mantener Email como proveedor. Configurar SMTP para correo de producción.
5. Configurar Site URL y Redirect URLs según [SETUP.md](SETUP.md).
6. Crear el primer usuario en Supabase Auth y asignar organización + perfil administrador mediante el SQL documentado en SETUP.
7. Configurar las dos variables públicas y volver a compilar.
8. Desplegar `invite-user` para habilitar invitaciones desde el panel.

### Modelo de acceso

- **Consulta:** lectura de registros de su empresa; sin escritura.
- **Operador:** consulta, altas, ediciones, fotografías, documentos y nuevas posiciones; sin eliminación ni administración de usuarios.
- **Administrador:** funciones anteriores, eliminación, usuarios, configuración y bitácora de su organización.
- Los perfiles se crean mediante consola o Edge Function, nunca mediante registro público.
- Un usuario no puede modificar su propio rol ni desactivarse. La organización de un registro es inmutable.
- Una organización adicional se crea desde una consola administrativa de confianza. Su primer administrador se configura como la primera organización.
- Las posiciones se agregan al historial y no admiten UPDATE. La eliminación de posiciones solo está autorizada al administrador vía API; la interfaz habitual preserva el historial.
- Registros con dependencias pueden impedir la eliminación por integridad referencial. Preferir archivar conductores y vehículos.
- `roles` permite incorporar roles futuros mediante una migración; extender también las etiquetas y guardas de interfaz. `vehicle_types` deja preparada la arquitectura del catálogo; los tipos ofrecidos inicialmente están en `src/features/fields.ts`.

### Fotografías y documentos

Fotografías JPG, PNG o WebP: máximo original 10 MB, redimensionadas a 1600 px y convertidas a JPEG; máximo final 5 MB. `capture` permite usar cámara si el dispositivo lo admite y existe selector alternativo de archivos. PDF adjuntos: máximo 10 MB, validación de firma y tipo. Los buckets imponen tamaño y MIME del lado servidor. Las URLs firmadas de fotos duran cinco minutos, se renuevan en la interfaz; las de documentos duran un minuto.

No se guarda información del sistema en localStorage, IndexedDB ni caché offline. Supabase Auth conserva sus propios tokens de sesión para mantener el acceso, como corresponde al requisito. Las URLs firmadas son enlaces temporales: quien tenga una URL vigente podrá usarla hasta su vencimiento. No se guardan contraseñas ni tokens en tablas o bitácora.

Reemplazar una fotografía crea un objeto nuevo. Si falla el guardado del registro tras la subida, puede quedar un objeto privado huérfano. Definir una tarea administrativa de retención/limpieza antes de un uso de gran volumen; no borrar objetos sin contrastar referencias.

## GPS

`src/services/gps.ts` define `GpsProviderAdapter` y la implementación real `BrowserGeolocationProvider`. El usuario selecciona una unidad, opcionalmente un reporte, y activa el seguimiento voluntariamente. Se registra la posición del **dispositivo que tiene abierta la aplicación**, no la de un camión remoto. Detener o salir de la pantalla cancela `watchPosition()`.

Por defecto se guarda al transcurrir 30 segundos **o** recorrer 50 metros; ambos umbrales son configurables. Se guardan coordenadas, precisión, velocidad y rumbo cuando el navegador los ofrece. Los errores detienen el seguimiento y se muestran al usuario.

**Una PWA no garantiza GPS permanente con la pantalla apagada, en segundo plano o con el navegador cerrado.** El sistema no anuncia monitoreo continuo: el indicador resume unidades con una posición en las últimas 24 horas. Para GPS independiente del navegador hay que implementar un proveedor autenticado en backend/webhook, normalizar los eventos y agregar posiciones respetando organización y unidad. Samsara, Geotab, Wialon y Teltonika aparecen como **Integración pendiente**. No hay conexiones ficticias ni claves de esos proveedores.

## PDF

El botón `Generar PDF` del expediente de un reporte descarga un documento confidencial paginado, con logo, folio, datos, fotos disponibles, última ubicación, contactos y denuncia. Las imágenes se solicitan con acceso temporal y no se publican. Si una fotografía registrada no se puede recuperar, la exportación informa el error en vez de omitirla silenciosamente. El archivo resultante queda bajo responsabilidad de quien lo descarga.

## GitHub Pages

El repositorio incluye `.github/workflows/deploy.yml`. Al hacer push a `main`, instala dependencias, revisa lint, ejecuta las pruebas, compila y publica `dist`.

1. Crear repositorio y subir **el contenido de esta carpeta**, incluidos `.github`, `.env.example` y `package-lock.json`.
2. Añadir secrets de Actions `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Elegir **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Hacer push a `main` o ejecutar el workflow manualmente.
5. Usar la URL de Pages para configurar los redirects de Supabase.

GitHub Pages distribuye el código frontend; todos los datos reales siguen protegidos por Supabase. Nunca subir `.env.local`, `node_modules`, credenciales administrativas ni archivos con datos reales.

## Verificación y límites de la entrega

Las pruebas `tests/security.test.ts` ejecutan las migraciones en PostgreSQL local embebido (PGlite), con un esquema Auth/Storage mínimo de prueba. Comprueban aislamiento A/B, permisos, escalamiento, claves foráneas, folios, bitácora e historial. No sustituyen pruebas de correo, sesión, Edge Functions, Storage real ni Realtime en tu proyecto Supabase.

La carga actual pagina las consultas de servidor en bloques de 1000 y reúne el conjunto autorizado en memoria para búsqueda y dashboard. Para flotas/historiales de gran escala, incorporar búsqueda y agregación del lado servidor, paginación remota y límites de retención.

Las teselas de OpenStreetMap y las fuentes de Google requieren internet y están sujetas a la disponibilidad de esos servicios. Para despliegues de alto tráfico, configurar un proveedor de mapas adecuado y autoalojar las fuentes. La aplicación no ofrece llamadas automáticas a emergencias ni presenta denuncias.

## Estructura

```text
src/
  components/       Marca, navegación, fotos, documentos y modales
  features/         Definición de campos y formulario compartido
  hooks/            Auth, datos e instalación PWA
  lib/              Cliente Supabase, demostración y utilidades
  pages/            Dashboard, listados, expediente, mapa y administración
  services/         GPS, fotografías y PDF
  types.ts          Interfaces del dominio
supabase/
  migrations/       SQL de tablas, seguridad, Storage y bitácora
  functions/invite-user/
tests/              Pruebas de seguridad y cálculos
.github/workflows/deploy.yml
```

Referencias: [Auth y contraseñas](https://supabase.com/docs/guides/auth/passwords), [URLs de redirección](https://supabase.com/docs/guides/auth/redirect-urls), [Storage y RLS](https://supabase.com/docs/guides/storage/security/access-control).
