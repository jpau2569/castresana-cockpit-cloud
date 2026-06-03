import { isAuthed, loadState, saveState, parseBody } from './_lib.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) { res.status(401).json({ error: 'auth' }); return; }
  try {
    if (req.method === 'GET') {
      const data = await loadState();
      res.status(200).json({ data });
    } else if (req.method === 'POST') {
      const body = parseBody(req);
      await saveState(body.data || {});
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ error: 'method' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
