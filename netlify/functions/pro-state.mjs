import { getStore } from '@netlify/blobs';

const STORE_NAME = 'damas-pro';
const STATE_KEY = 'state';

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });

export default async (request) => {
    try {
        const store = getStore(STORE_NAME);

        if (request.method === 'GET') {
            const state = await store.get(STATE_KEY, { type: 'json' });
            return json({ state: state || null });
        }

        if (request.method === 'POST') {
            const body = await request.json();
            if (!body.state || !body.state.version) {
                return json({ error: 'Estado invalido' }, 400);
            }

            await store.setJSON(STATE_KEY, body.state);
            return json({ ok: true });
        }

        return json({ error: 'Method Not Allowed' }, 405);
    } catch (err) {
        return json({ error: err.message }, 500);
    }
};
