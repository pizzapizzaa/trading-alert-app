import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_ADDRESS = Deno.env.get('FROM_ADDRESS') ?? 'alerts@goldtracker.app';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Escape HTML special characters to prevent XSS in the email body. */
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

    // Verify the caller's Supabase JWT and use their verified email as the
    // recipient — never trust a `to` field supplied by the client.
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const to = user.email;

    const { alertName, message, price, symbol } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitise all user-controlled values before inserting into HTML
    const safeAlertName = escHtml(String(alertName ?? 'Price Alert'));
    const safeMessage = escHtml(String(message));
    const safeSymbol = escHtml(String(symbol ?? ''));
    const safePrice = price != null ? escHtml(Number(price).toFixed(2)) : null;

    const subject = `\uD83D\uDCCA GoldTracker Alert: ${safeAlertName}`;

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
                ${safeSymbol}
              </span>
              ${safePrice != null ? `<p style="margin:12px 0 0;font-size:32px;font-weight:900;color:#FFFFFF;">$${safePrice}</p>` : ''}
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:16px;color:#B0B0B0;line-height:1.6;">${safeMessage}</p>
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
