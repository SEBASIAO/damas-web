const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'damas-pro';
const STATE_KEY = 'state';

exports.handler = async function (event) {
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
    };

    try {
        const store = getStore(STORE_NAME);

        if (event.httpMethod === 'GET') {
            const state = await store.get(STATE_KEY, { type: 'json' });
            return { statusCode: 200, headers, body: JSON.stringify({ state: state || null }) };
        }

        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            if (!body.state || !body.state.version) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Estado invalido' }) };
            }

            await store.setJSON(STATE_KEY, body.state);
            return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
