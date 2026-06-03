# Castresana Cockpit · Fase 1 (Cloud) — Guía de despliegue

Pasas del cockpit local (un solo equipo) a un cockpit **en la nube**:
- Tus datos viven en **Supabase** y se ven igual desde el PC y el móvil.
- Entras con **contraseña**.
- Un **bot de Telegram** entiende lenguaje natural ("visita mañana 18h piso Uría, cliente García")
  y lo guarda solo, gracias a Claude.

Tiempo aproximado: **20–30 min**. Todo gratis salvo el uso de la API de Claude (céntimos).

---

## Qué hay en esta carpeta
```
index.html        → el cockpit (web)
api/login.js      → comprueba la contraseña
api/state.js      → lee/guarda tus datos en Supabase
api/telegram.js   → recibe mensajes del bot y los interpreta con Claude
api/_lib.js       → utilidades comunes
supabase.sql      → crea la tabla en la base de datos
package.json      → dependencias
.env.example      → lista de variables que tendrás que rellenar
```

---

## Paso 1 — Subir el proyecto a GitHub
1. Crea una cuenta en https://github.com (si no tienes).
2. **New repository** → nombre `castresana-cockpit-cloud` → **Create**.
3. Sube **todos los archivos de esta carpeta** (botón *uploading an existing file* o arrastrándolos).

> Esta carpeta NO contiene secretos: las claves se ponen luego en Vercel.

## Paso 2 — Crear la base de datos (Supabase)
1. https://supabase.com → **New project**. Pon nombre, contraseña de BD (guárdala) y región (Europa).
2. Cuando esté listo: barra lateral → **SQL Editor → New query**.
3. Abre `supabase.sql` de esta carpeta, copia TODO, pégalo y pulsa **Run**.
4. Barra lateral → **Project Settings → API**. Copia y guarda:
   - **Project URL** (ej. `https://abcd.supabase.co`) → será `SUPABASE_URL`
   - **service_role key** (en *Project API keys*, pulsa para revelar) → será `SUPABASE_SERVICE_ROLE_KEY` · **secreta**

## Paso 3 — Desplegar en Vercel
1. https://vercel.com → entra con tu GitHub → **Add New → Project → Import** tu repo.
2. Framework: deja **Other** (no hace falta build).
3. En **Environment Variables** añade (mínimo para que funcione el panel):
   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | la Project URL del Paso 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | la service_role key |
   | `DASHBOARD_PASSWORD` | la contraseña con la que entrarás |
   | `AUTH_SECRET` | una cadena aleatoria larga (aporrea el teclado, 30+ caracteres) |
4. **Deploy**. En 1–2 min tendrás una URL `https://....vercel.app`.
5. Ábrela, escribe tu `DASHBOARD_PASSWORD` y entra. ✅

## Paso 4 — Pasar tus datos del cockpit local (opcional)
1. Abre tu `castresana-cockpit-premium.html` local → botón **⬇ Backup** (descarga un `.json`).
2. En el cockpit cloud → botón **⬆** (Restaurar) → elige ese `.json`. Se sube todo a la nube.

## Paso 5 — Activar el bot de Telegram
1. En Telegram, habla con **@BotFather** → `/newbot` → te da un **token** → será `TELEGRAM_BOT_TOKEN`.
2. Consigue una **API key de Claude** en https://console.anthropic.com → será `ANTHROPIC_API_KEY`.
3. Inventa una cadena aleatoria para `TELEGRAM_WEBHOOK_SECRET`.
4. En Vercel → **Project → Settings → Environment Variables**, añade:
   `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
   (deja `OWNER_TELEGRAM_CHAT_ID` vacío de momento). Luego **Redeploy**.
5. Conecta el bot a tu app (cambia las dos partes en mayúsculas y ejecútalo en tu navegador o terminal):
   ```
   https://api.telegram.org/botTU_TOKEN/setWebhook?url=https://TU-APP.vercel.app/api/telegram&secret_token=TU_WEBHOOK_SECRET
   ```
6. Escríbele cualquier cosa al bot. Te responderá con **tu chat_id**.
7. Copia ese número en `OWNER_TELEGRAM_CHAT_ID` (Vercel → Environment Variables) y **Redeploy**.
   > Esto hace que el bot SOLO te obedezca a ti.
8. Pruébalo: escríbele *"nueva visita mañana a las 6 piso en Uría 12, cliente García"* y abre el cockpit. Debe aparecer.

### Frases que entiende el bot (ejemplos)
- "visita el viernes 17:30 piso de Mieres, cliente López"
- "lead nuevo Marta, busca 2 hab en Oviedo centro hasta 140mil"
- "captación: piso Calle Uría 12, Oviedo, 165000, https://idealista.com/inmueble/123"
- "tarea: llamar al notario"
- "comisión 3200 venta García"  /  "gasto 60 gasolina"
- "hoy he andado 8500 pasos y 30 min de ejercicio"
- "comida: ensalada de pollo 450 kcal"
- "nota: revisar el contrato de arras de los López"

---

## Mantenimiento
- **Backups**: usa ⬇ de vez en cuando (también puedes exportar la fila de Supabase).
- **Coste**: Supabase y Vercel tienen plan gratis de sobra para uso personal. Claude cobra por uso del bot (muy poco, es el modelo Haiku).
- **Enlaces fijos** (Inmoweb, CRM, Copia y Punto): ahora se guardan en la nube. Ponlos con **✎ enlaces** una vez y quedan.
