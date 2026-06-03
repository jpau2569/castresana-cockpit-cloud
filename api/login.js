import { parseBody } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  const { password } = parseBody(req);
  if (password && password === process.env.DASHBOARD_PASSWORD) {
    res.setHeader(
      'Set-Cookie',
      `cockpit_auth=${process.env.AUTH_SECRET}; HttpOnly; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
}
