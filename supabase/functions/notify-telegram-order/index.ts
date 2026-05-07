const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const CHAT_ID = '@leogandra66';

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  is_preorder?: boolean;
}

interface Payload {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  total: number;
  amountDueNow?: number;
  hasPreorderItems?: boolean;
  items: OrderItem[];
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
    if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');

    const body = await req.json();

    // Test mode: just send a ping message to verify chat is reachable
    if (body?.test === true) {
      const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: `✅ <b>Teste de notificação</b>\nO chat <code>${escapeHtml(CHAT_ID)}</code> está habilitado.\n${new Date().toLocaleString('pt-BR')}`,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      const data = await tgRes.json();
      if (!tgRes.ok) {
        console.error('Telegram test error:', tgRes.status, JSON.stringify(data));
        return new Response(
          JSON.stringify({ ok: false, status: tgRes.status, telegram: data, chat_id: CHAT_ID }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ ok: true, chat_id: CHAT_ID, telegram: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const p = body as Payload;
    if (!p?.orderId || !Array.isArray(p?.items)) {
      return new Response(JSON.stringify({ error: 'orderId and items are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lines: string[] = [];
    lines.push(`🛒 <b>Novo pedido recebido</b>`);
    lines.push(`<b>ID:</b> <code>${escapeHtml(p.orderId)}</code>`);
    if (p.customerName) lines.push(`<b>Cliente:</b> ${escapeHtml(p.customerName)}`);
    if (p.customerEmail) lines.push(`<b>Email:</b> ${escapeHtml(p.customerEmail)}`);
    if (p.customerPhone) lines.push(`<b>Telefone:</b> ${escapeHtml(p.customerPhone)}`);
    lines.push('');
    lines.push('<b>Itens:</b>');
    for (const it of p.items) {
      const tag = it.is_preorder ? ' (encomenda)' : '';
      lines.push(
        `• ${escapeHtml(it.name)}${tag} — ${it.quantity}x ${fmtBRL(it.unit_price)}`,
      );
    }
    lines.push('');
    lines.push(`<b>Total:</b> ${fmtBRL(p.total)}`);
    if (p.hasPreorderItems && typeof p.amountDueNow === 'number') {
      lines.push(`<b>A pagar agora:</b> ${fmtBRL(p.amountDueNow)}`);
    }
    lines.push(`<b>Status:</b> aguardando pagamento`);

    const text = lines.join('\n');

    const tgRes = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await tgRes.json();
    if (!tgRes.ok) {
      console.error('Telegram error:', tgRes.status, JSON.stringify(data));
      throw new Error(`Telegram API failed [${tgRes.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('notify-telegram-order error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
