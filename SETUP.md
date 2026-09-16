# Puesta en marcha de Moviexpress

Esta guía conecta la aplicación con tu empresa. No hace falta cambiar el código para introducir tus claves públicas. Usa un proyecto Supabase nuevo para seguir estos pasos.

## 1. Abrir la aplicación localmente

1. Instala Node.js LTS (22.12 o superior) desde su sitio oficial.
2. Descomprime el proyecto. Abre una terminal dentro de la carpeta donde está `package.json`.
3. Ejecuta `npm install` y después `npm run dev`.
4. Abre la dirección que indique la terminal. **Explorar demostración** muestra registros ficticios de solo lectura. No es un usuario real ni guarda cambios.

## 2. Crear tu proyecto Supabase

1. Entra a [Supabase](https://supabase.com/dashboard), inicia sesión y pulsa **New project**.
2. Elige tu organización, nombre del proyecto, región y una contraseña segura para PostgreSQL. Esa contraseña no va en el frontend.
3. Espera a que el proyecto esté listo.
4. Abre **SQL Editor → New query**.
5. Abre `supabase/migrations/001_core.sql`, copia todo su contenido en SQL Editor y pulsa **Run**. Debe terminar sin errores.
6. Crea otra consulta y ejecuta del mismo modo `supabase/migrations/002_documents.sql`.
7. En **Table Editor**, comprueba que existen `organizations`, `profiles`, `drivers`, `vehicles`, `reports`, `vehicle_locations`, `vehicle_photos`, `audit_logs` y `record_documents`.
8. En **Storage**, comprueba los buckets `fleet-photos` y `fleet-documents`. Ambos deben ser **Private**, no públicos. Las migraciones ya los crean; no dupliques buckets ni desactives RLS.

Si un script falla, conserva el mensaje y corrige la causa antes de continuar. Las migraciones usan transacciones. No elimines tablas de un sistema en uso para reinstalarlo.

## 3. Configurar el acceso privado

1. Abre **Authentication**. En la configuración de usuarios/proveedores, desactiva la opción que permite nuevas inscripciones públicas (**Allow new users to sign up**). Los nombres pueden variar ligeramente con las actualizaciones de Supabase.
2. Mantén activo el proveedor **Email**.
3. En **URL Configuration**, configura la dirección de desarrollo como Site URL mientras pruebas: `http://localhost:5173/`. Si tu terminal muestra `127.0.0.1`, usa `http://127.0.0.1:5173/`.
4. Añade a **Redirect URLs** las direcciones que vayas a usar, incluyendo:

```text
http://localhost:5173/
http://localhost:5173/?flow=recovery
http://localhost:5173/?flow=invite
http://127.0.0.1:5173/
http://127.0.0.1:5173/?flow=recovery
http://127.0.0.1:5173/?flow=invite
```

El callback de recuperación llega a la raíz, fuera de HashRouter; Supabase procesa el fragmento de autenticación y la aplicación muestra la nueva contraseña. No sustituir el redirect de recuperación por `/#/login`. Mantener las plantillas de recuperación/invitación que usan el enlace de confirmación estándar de Supabase.

5. Configura un proveedor SMTP para invitar y recuperar contraseñas con correos de tu dominio. El servicio de correo de prueba de Supabase tiene límites; no asumir que permitirá enviar a cualquier destinatario.

## 4. Crear el primer administrador

1. Abre **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y una contraseña. Confirma el correo desde el panel si corresponde a una cuenta que controlas. No uses los nombres de demostración para personal real.
3. Copia el **User UID** del usuario creado.
4. En **SQL Editor → New query**, pega lo siguiente. Sustituye los valores de ejemplo entre comillas. El UID debe ser exactamente el que acabas de copiar.

```sql
do $$
declare organization_uuid uuid;
begin
  insert into public.organizations(name)
  values ('Moviexpress') returning id into organization_uuid;

  insert into public.profiles(id, organization_id, full_name, role)
  values (
    'SUSTITUIR-POR-USER-UID',
    organization_uuid,
    'Tu nombre completo',
    'admin'
  );
end $$;
```

5. Ejecuta una sola vez. Si el UID no es válido, la transacción no crea la organización.
6. En Table Editor verifica el perfil y su `organization_id`.

Para incorporar una segunda empresa, crea otra organización y su primer administrador con este mismo procedimiento. No reutilices la organización de la primera empresa.

## 5. Conectar el frontend

1. En el panel de Supabase localiza la **Project URL** y la clave **publishable** o **anon** en la configuración de API/Connect del proyecto.
2. En la carpeta del proyecto copia `.env.example` como `.env.local`.
3. Escribe:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publica
```

4. No uses `service_role` ni claves secretas. `.env.local` está excluido por `.gitignore`.
5. Reinicia `npm run dev` y entra con el correo y contraseña del administrador.
6. Registra primero un conductor, después una unidad y por último un reporte.

## 6. Preparar GitHub

1. En GitHub pulsa **New repository**. Dale un nombre, por ejemplo `moviexpress-control`.
2. Copia/sube el contenido del proyecto con Git o GitHub Desktop. Debe verse `package.json` en la raíz, no dentro de una carpeta adicional.
3. Incluye las carpetas ocultas `.github` y el archivo `.env.example`. No subas `.env.local`, `node_modules` ni `dist`.
4. Usa la rama **main**.
5. Abre **Settings → Secrets and variables → Actions → New repository secret**.
6. Crea `VITE_SUPABASE_URL` con la URL del proyecto y `VITE_SUPABASE_ANON_KEY` con la clave pública.

## 7. Publicar con GitHub Pages

1. Abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Abre la pestaña **Actions**. Selecciona **Publicar Moviexpress en GitHub Pages** y pulsa **Run workflow** sobre `main`, o haz un push nuevo.
4. Espera a que terminen en verde los trabajos **build** y **deploy**.
5. Abre el enlace del deployment. Tendrá una forma como `https://tuusuario.github.io/moviexpress-control/`.
6. En Supabase cambia **Site URL** a esa dirección exacta, con la barra final.
7. Añade a **Redirect URLs**:

```text
https://tuusuario.github.io/moviexpress-control/
https://tuusuario.github.io/moviexpress-control/?flow=recovery
https://tuusuario.github.io/moviexpress-control/?flow=invite
```

8. Prueba inicio de sesión, recarga en una ruta interna y recuperación de contraseña. Cambiar un secret de GitHub requiere volver a ejecutar el workflow para recompilar.

## 8. Activar invitaciones desde el panel

La operación privilegiada se ejecuta en Supabase, nunca en el navegador. Con Supabase CLI instalado en una computadora de confianza:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase secrets set APP_ORIGIN=https://tuusuario.github.io
npx supabase secrets set APP_URL=https://tuusuario.github.io/moviexpress-control/
npx supabase functions deploy invite-user --no-verify-jwt
```

`APP_ORIGIN` incluye solo protocolo y dominio; `APP_URL` incluye la ruta del repositorio y barra final. Para desarrollo local cambia ambos a tu origen local. La función acepta un solo origen configurado a la vez.

`--no-verify-jwt` desactiva la comprobación heredada del gateway para admitir las claves públicas modernas. **La función valida explícitamente el token de usuario con `auth.getUser()`, comprueba el perfil activo y exige rol administrador antes de usar privilegios.** No quitar esa validación del código.

Supabase proporciona `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` al entorno de Edge Functions. La clave privilegiada solo se usa ahí. No copiarla a GitHub, `.env.local` ni JavaScript del navegador.

Abre **Usuarios → Invitar usuario**, escribe nombre, correo y rol. El destinatario debe abrir su enlace y definir su propia contraseña. Para un correo que ya tiene una cuenta, la función devuelve error y no lo mueve a otra empresa. Gestiona esa situación desde la consola de confianza.

## 9. Probar antes de usar datos reales

1. Crea un operador y una cuenta de consulta por invitación.
2. Verifica que consulta no puede modificar y operador no puede administrar usuarios.
3. Crea un conductor y una unidad ficticios; sube una foto y un documento PDF.
4. Crea dos reportes. Comprueba que los folios son distintos.
5. Exporta un PDF y revisa datos, logo y fotos.
6. En **Mapa**, selecciona la unidad y activa ubicación desde un dispositivo de prueba. Verifica coordenadas, hora, precisión y nuevas filas. Detén el seguimiento.
7. Cierra sesión y confirma que la información privada desaparece.
8. Desde otra organización, comprueba que no se ven los registros anteriores.
9. Completa el aviso de privacidad y responsable en **Configuración**.

## 10. Instalar en celular

- Android/Chrome: abre el sitio por HTTPS y usa **Instalar aplicación**, si aparece, desde Configuración o el menú del navegador.
- iPhone/Safari: **Compartir → Añadir a pantalla de inicio**.
- En computadora: botón de instalación del navegador, cuando sea compatible.

Sin conexión solo se conservan los archivos estáticos de la aplicación. No se guardan fotografías, datos personales ni respuestas de Supabase para consulta offline. El GPS del navegador requiere la aplicación abierta; no equivale a un rastreador permanente.

## Problemas frecuentes

| Mensaje / situación | Revisión |
| --- | --- |
| Conexión pendiente | Completar las dos variables y reiniciar/recompilar. |
| No se pudo cargar tu perfil | Crear la fila de `profiles` con el UID correcto y `active=true`. |
| Error RLS al guardar | Confirmar organización, rol y ejecución de ambas migraciones. No desactivar RLS. |
| La invitación no llega | Revisar SMTP, logs de Edge Functions, APP_ORIGIN, APP_URL y Redirect URLs. |
| El correo ya tiene cuenta | No repetir invitaciones ni reasignar empresas automáticamente; administrar desde Supabase. |
| Ubicación denegada | Revisar permisos del sitio en el navegador y usar HTTPS. |
| No se puede eliminar un vehículo | Tiene dependencias; archívalo para conservar trazabilidad. |
| El mapa no carga | Comprobar internet, disponibilidad de OpenStreetMap y bloqueadores de contenido. |
| Error al publicar | Abrir el workflow en Actions, revisar el primer paso fallido y los secrets. |

Guarda copias de seguridad y configura una política de retención acorde a tu operación. Las pruebas locales no equivalen a una certificación del proyecto Supabase que configures.
