# Validación de la entrega

Fecha: 16 de septiembre de 2026.

- Instalación de dependencias completada; lockfile incluido.
- `npm run build`: correcto. Vite informa una advertencia de tamaño para el paquete principal; no impide la compilación. La exportación PDF se carga bajo demanda.
- `npm run lint`: sin errores ni advertencias.
- `npm test`: 16 pruebas aprobadas en tres archivos.
- Auditoría npm en la instalación final: 0 vulnerabilidades reportadas.
- Interfaz revisada en navegador: acceso, demostración, dashboard, búsqueda de conductor, formulario, expediente, documentos y mapa.
- Vista móvil revisada a 390 × 844, sin desbordamiento horizontal; navegación inferior y logo visibles. Sidebar fuera de pantalla oculto para accesibilidad.
- WebMCP: navegación válida comprobada y módulo inválido rechazado.
- PDF de demostración generado y revisado visualmente en sus dos páginas: logo, información, acentos, numeración y pies legibles.
- PWA: manifest, iconos 192/512 y service worker presentes en `dist`; sin reglas de caché para respuestas de Supabase.
- Pruebas de base de datos: migraciones ejecutadas sobre PostgreSQL embebido, RLS entre empresas, roles, documentos, fotos, folios, integridad de relaciones, bitácora e historial de ubicaciones.

## Requiere tu entorno

No se aportaron credenciales públicas de un proyecto Supabase ni un repositorio remoto. Por eso no se ejecutaron pruebas contra Auth, correo SMTP, Storage, Edge Functions o Realtime de un proyecto real, ni se publicó en GitHub Pages. Las pruebas SQL usan una implementación mínima de `auth` y `storage` para verificar políticas, no los servicios de nube completos.

No se solicitó la ubicación real del dispositivo durante la revisión. La autorización de geolocalización, precisión y comportamiento en Android/iPhone deben probarse en los dispositivos de la empresa. No se garantiza seguimiento con el navegador cerrado.

La descarga mediante el evento automatizado del navegador integrado no pudo confirmarse; el generador PDF sí se ejecutó y su archivo se renderizó y revisó localmente. Verifica la descarga final desde Chrome o Safari una vez publicado.

Consulta `SETUP.md` para completar la puesta en marcha y las verificaciones de producción.
