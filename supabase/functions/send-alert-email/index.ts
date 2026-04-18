import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_ADDRESS = Deno.env.get('FROM_ADDRESS') ?? 'alerts@goldtracker.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, alertName, message, price, symbol } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subject = `📊 GoldTracker Alert: ${alertName ?? 'Price Alert'}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:16px;border:1px solid #2E2E2E;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #2E2E2E;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#F5A623;text-transform:uppercase;letter-spacing:1px;">GoldTracker</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#FFFFFF;">Price Alert Triggered</h1>
            </td>
          </tr>

          <!-- Symbol badge + price -->
          <tr>
            <td style="padding:24px 32px 16px;">
              <span style="display:inline-block;background:#F5A62322;border:1px solid #F5A623;border-radius:8px;padding:4px 12px;font-size:13px;font-weight:800;color:#F5A623;letter-spacing:1px;">
                ${symbol ?? ''}
              </span>
              ${price != null ? `<p style="margin:12px 0 0;font-size:32px;font-weight:900;color:#FFFFFF;">$${Number(price).toFixed(2)}</p>` : ''}
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:16px;color:#B0B0B0;line-height:1.6;">${message}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #2E2E2E;">
              <p style="margin:0;font-size:12px;color:#666;">You received this because you set up an alert in GoldTracker. Open the app to manage your alerts.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[send-alert-email] Resend error:', data);
      return new Response(
        JSON.stringify({ error: data.message ?? 'Email send failed' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-alert-email] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
