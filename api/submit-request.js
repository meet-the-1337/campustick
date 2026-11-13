export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, ig_handle, codechef_username, codechef_password, phone, modules, speed, amount, notes, email, screenshot } = req.body || {};

  if (!email || !email.includes('@' + Buffer.from('dGhhcGFyLmVkdQ==', 'base64').toString('ascii'))) {
    return res.status(400).json({ error: 'Valid institutional student email is strictly required.' });
  }

  if (!ig_handle || !codechef_username) {
    return res.status(400).json({ error: 'Instagram ID and CodeChef username are required.' });
  }

  const SUPABASE_URL = "https://wzemfaudaihcyqlyaoqr.supabase.co";
  const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZW1mYXVkYWloY3lxbHlhb3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTEyNTA0NywiZXhwIjoyMTA0NzAxMDQ3fQ.2YHMDep9ctZe75myYJ3myVQgEj81xnbTB30WZHccvQ4";

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Anti-spam check: Strictly one request permitted per college email!
    const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/orders?email=eq.${encodeURIComponent(cleanEmail)}&select=id,status,created_at&limit=1`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    if (checkResp.ok) {
      const existing = await checkResp.json();
      if (existing && existing.length > 0) {
        return res.status(409).json({
          error: `A request for this College Email (${cleanEmail}) is already registered under ID ${existing[0].id}. You only have one request per email ID to prevent queue spam. Please use the "Check Status" button to view your replies or DM @campus.tick on Instagram.`,
          existingId: existing[0].id
        });
      }
    }

    // 2. Insert into Supabase
    const payload = {
      id: id || ('ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase()),
      email: cleanEmail,
      ig_handle: ig_handle.replace(/^@/, '').trim(),
      codechef_username: codechef_username.trim(),
      codechef_password: codechef_password || null,
      phone: phone || null,
      modules: Array.isArray(modules) ? modules : [modules || 'COMPLETE_COURSE'],
      speed: speed || 'standard',
      amount: parseInt(amount || 0, 10),
      notes: notes || null,
      screenshot: screenshot || null,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!insertResp.ok) {
      const errText = await insertResp.text();
      return res.status(insertResp.status).json({ error: 'Database insert failed: ' + errText });
    }

    const insertedRows = await insertResp.json();
    return res.status(201).json({
      success: true,
      order: insertedRows[0] || payload
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
