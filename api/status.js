export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = req.query.id || (req.body && req.body.id);
  const email = req.query.email || (req.body && req.body.email);

  if (!id && !email) {
    return res.status(400).json({ error: 'Please provide a Request ID or Email address.' });
  }

  const SUPABASE_URL = "https://wzemfaudaihcyqlyaoqr.supabase.co";
  const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZW1mYXVkYWloY3lxbHlhb3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTEyNTA0NywiZXhwIjoyMTA0NzAxMDQ3fQ.2YHMDep9ctZe75myYJ3myVQgEj81xnbTB30WZHccvQ4";

  try {
    let queryUrl = `${SUPABASE_URL}/rest/v1/orders?select=id,status,modules,speed,amount,created_at,admin_reply,notes,email,ig_handle,codechef_username,utr,payment_screenshot`;
    if (id) {
      queryUrl += `&id=eq.${encodeURIComponent(id.trim())}`;
    } else if (email) {
      queryUrl += `&email=eq.${encodeURIComponent(email.trim().toLowerCase())}`;
    }
    queryUrl += `&order=created_at.desc&limit=1`;

    const resp = await fetch(queryUrl, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Failed to query database.' });
    }

    const rows = await resp.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No request found matching this ID or College Email.' });
    }

    const row = rows[0];
    return res.status(200).json({
      success: true,
      order: {
        id: row.id,
        status: row.status || 'PENDING',
        email: row.email,
        ig_handle: row.ig_handle,
        codechef_username: row.codechef_username,
        modules: row.modules,
        speed: row.speed,
        amount: row.amount,
        created_at: row.created_at,
        admin_reply: row.admin_reply || null,
        notes: row.notes || null,
        utr: row.utr || null,
        payment_screenshot: row.payment_screenshot || null
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
