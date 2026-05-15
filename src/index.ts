export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      if (path === '/health') {
        return new Response(
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
          { headers }
        );
      }

      if (path === '/api/sync-sheets' && request.method === 'POST') {
        return new Response(JSON.stringify({ message: 'Sheets sync - Coming soon' }), { headers });
      }

      if (path === '/api/sync-calendar' && request.method === 'POST') {
        return new Response(JSON.stringify({ message: 'Calendar sync - Coming soon' }), { headers });
      }

      if (path === '/api/line-webhook' && request.method === 'POST') {
        return new Response(JSON.stringify({ message: 'LINE webhook - Coming soon' }), { headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
  },
};