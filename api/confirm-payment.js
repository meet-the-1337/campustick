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

  const { id, utr, payment_screenshot, notes } = req.body || {};

  if (!id || !utr) {
    return res.status(400).json({ error: 'Order ID and Transaction ID / UTR reference are required.' });
  }

  const SUPABASE_URL = "https://wzemfaudaihcyqlyaoqr.supabase.co";
  const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZW1mYXVkYWloY3lxbHlhb3FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTEyNTA0NywiZXhwIjoyMTA0NzAxMDQ3fQ.2YHMDep9ctZe75myYJ3myVQgEj81xnbTB30WZHccvQ4";

  const cleanId = id.trim().toUpperCase();
  const cleanUtr = utr.trim();

  try {
    // 1. Fetch existing order to append notes if needed
    const fetchResp = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(cleanId)}&select=id,notes,status`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    if (!fetchResp.ok) {
      return res.status(fetchResp.status).json({ error: 'Failed to find order.' });
    }

    const existingRows = await fetchResp.json();
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ error: `Order ${cleanId} not found.` });
    }

    const currentNotes = existingRows[0].notes || '';
    const newNotes = currentNotes
      ? `${currentNotes} | UTR: ${cleanUtr}${notes ? ' | ' + notes : ''}`
      : `UTR: ${cleanUtr}${notes ? ' | ' + notes : ''}`;

    const updatePayload = {
      utr: cleanUtr,
      status: 'ACCEPTED',
      notes: newNotes
    };

    if (payment_screenshot) {
      updatePayload.payment_screenshot = payment_screenshot;
    }

    // 2. Patch order in Supabase
    const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(cleanId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!patchResp.ok) {
      const errText = await patchResp.text();
      return res.status(patchResp.status).json({ error: 'Failed to update order payment: ' + errText });
    }

    const updatedRows = await patchResp.json();
    return res.status(200).json({
      success: true,
      message: 'Payment confirmed and verified successfully.',
      order: updatedRows[0] || updatePayload
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
