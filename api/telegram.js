// Webhook de Telegram: recibe un mensaje, Claude lo interpreta y actualiza el cockpit.
import { loadState, saveState, parseBody } from './_lib.js';

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

function tg(method, payload) {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

const SYSTEM = `Eres el parser del "cockpit" de Pau, agente inmobiliario de Asesoría Castresana (Asturias).
Recibes un mensaje suyo (texto o transcripción de voz) y devuelves SOLO un JSON, sin texto extra ni markdown, con esta forma:
{"reply":"confirmación corta y natural en español","actions":[ ... ]}

Acciones posibles (usa solo las que correspondan; pueden ser varias):
- {"action":"add_visita","fecha":"YYYY-MM-DD","hora":"HH:MM","piso":"texto","cliente":"texto"}
- {"action":"add_lead","nombre":"texto","info":"qué busca/nota","estado":"Nuevo|Contactado|Visita|Oferta|Cerrado"}
- {"action":"add_inmueble","ref":"texto","zona":"texto","precio":numero,"link":"url","estado":"Activo|Reservado|Vendido"}
- {"action":"add_tarea","texto":"texto"}
- {"action":"add_finanza","concepto":"texto","importe":numero,"tipo":"com|ing|gas"}  (com=comisión, ing=ingreso, gas=gasto)
- {"action":"add_comida","alimento":"texto","kcal":numero}
- {"action":"set_salud","pasos":numero,"ejercicio":minutos}
- {"action":"nota_append","texto":"texto"}

Reglas:
- Interpreta fechas relativas ("mañana", "el viernes") respecto a HOY, que se te da abajo, en formato YYYY-MM-DD.
- Si falta la hora, déjala vacía "".
- Para finanzas, "comisión" => tipo "com"; gastos => "gas"; resto => "ing".
- Si no hay nada que guardar, devuelve actions vacío y explica en reply qué necesitas.`;

async function askClaude(message) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM + `\n\nHOY es ${today()}.`,
      messages: [{ role: 'user', content: message }],
    }),
  });
  const j = await r.json();
  let txt = (j.content && j.content[0] && j.content[0].text) || '';
  txt = txt.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  try { return JSON.parse(txt); } catch { return { reply: 'No he podido interpretar el mensaje.', actions: [] }; }
}

function applyActions(S, actions) {
  let n = 0;
  S.visitas = S.visitas || []; S.leads = S.leads || []; S.inmuebles = S.inmuebles || [];
  S.tareas = S.tareas || []; S.finanzas = S.finanzas || []; S.comidas = S.comidas || {}; S.salud = S.salud || {};
  for (const a of (actions || [])) {
    switch (a.action) {
      case 'add_visita':
        S.visitas.push({ id: uid(), fecha: a.fecha || today(), hora: a.hora || '', piso: a.piso || '', cliente: a.cliente || '', hecho: false }); n++; break;
      case 'add_lead':
        S.leads.push({ id: uid(), nombre: a.nombre || '', info: a.info || '', estado: a.estado || 'Nuevo', fecha: today() }); n++; break;
      case 'add_inmueble':
        S.inmuebles.push({ id: uid(), ref: a.ref || '', zona: a.zona || '', precio: +a.precio || 0, link: a.link || '', estado: a.estado || 'Activo', alta: today() }); n++; break;
      case 'add_tarea':
        S.tareas.push({ id: uid(), texto: a.texto || '', hecho: false }); n++; break;
      case 'add_finanza': {
        let imp = +a.importe || 0;
        imp = a.tipo === 'gas' ? -Math.abs(imp) : Math.abs(imp);
        S.finanzas.push({ id: uid(), concepto: a.concepto || '', importe: imp, tipo: a.tipo || 'ing', fecha: today() }); n++; break;
      }
      case 'add_comida': {
        const d = today(); S.comidas[d] = S.comidas[d] || {};
        S.comidas[d][uid()] = { alimento: a.alimento || '', kcal: +a.kcal || 0 }; n++; break;
      }
      case 'set_salud':
        if (a.pasos != null) S.salud.pasos = +a.pasos;
        if (a.ejercicio != null) S.salud.ejercicio = +a.ejercicio; n++; break;
      case 'nota_append':
        S.notas = ((S.notas || '') + '\n' + (a.texto || '')).trim(); n++; break;
    }
  }
  return n;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(200).send('ok'); return; }
  // seguridad: Telegram envía este header con el secret que configuramos en setWebhook
  if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).send('no'); return;
  }
  const update = parseBody(req);
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) { res.status(200).send('ok'); return; }

  const chatId = msg.chat.id;
  const owner = process.env.OWNER_TELEGRAM_CHAT_ID;

  // primera vez: si aún no has fijado tu chat_id, el bot te lo dice
  if (!owner) {
    await tg('sendMessage', { chat_id: chatId, text: `Tu chat_id es: ${chatId}\nGuárdalo en OWNER_TELEGRAM_CHAT_ID (Vercel → Settings → Environment Variables) y haz Redeploy.` });
    res.status(200).send('ok'); return;
  }
  if (String(chatId) !== String(owner)) { res.status(200).send('ok'); return; }

  try {
    const parsed = await askClaude(msg.text.trim());
    const state = await loadState();
    const applied = applyActions(state, parsed.actions);
    if (applied > 0) await saveState(state);
    const reply = parsed.reply || (applied ? `✅ Guardado (${applied})` : 'No he entendido qué guardar.');
    await tg('sendMessage', { chat_id: chatId, text: reply + (applied ? '\n\nAbre el cockpit para verlo.' : '') });
  } catch (e) {
    await tg('sendMessage', { chat_id: chatId, text: '⚠️ Error: ' + e.message });
  }
  res.status(200).send('ok');
}
