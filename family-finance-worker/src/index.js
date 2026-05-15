export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), { headers });
    }

    if (path === '/api/sync-sheets' && request.method === 'POST') {
      return new Response(JSON.stringify({ message: 'Sheets sync' }), { headers });
    }

    if (path === '/api/sync-calendar' && request.method === 'POST') {
      return new Response(JSON.stringify({ message: 'Calendar sync' }), { headers });
    }

    if (path === '/api/line-webhook' && request.method === 'POST') {
      return new Response(JSON.stringify({ message: 'LINE webhook' }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  },
};