(function () {
    const STORE_KEY = 'damas_cobrador_pro_state_v1';
    const SYNC_ENDPOINT = '/.netlify/functions/pro-state';
    const DATA_RESET_VERSION = 3;
    const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;
    const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const CLIENT_KEY = 'damas_cobrador_pro_client_id';
    let lastSyncAt = '';
    let syncTimer = null;

    const todayIso = () => new Date().toISOString().slice(0, 10);

    function uid(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    function clientId() {
        let id = localStorage.getItem(CLIENT_KEY);
        if (!id) {
            id = uid('client');
            localStorage.setItem(CLIENT_KEY, id);
        }
        return id;
    }

    async function sha256(value) {
        const bytes = new TextEncoder().encode(value);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashPin(pin) {
        return sha256(`damas-pro:${pin}`);
    }

    function weekRange(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay() || 7;
        const start = new Date(d);
        start.setDate(d.getDate() - day + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    }

    function defaultState() {
        const week = weekRange();
        return {
            version: 1,
            data_reset_version: DATA_RESET_VERSION,
            admins: [
                { id: 'admin_mauricio', username: 'mauricio', name: 'Mauricio', pin_hash: '', role: 'admin', status: 'activo' }
            ],
            cobradores: [
                { id: 'cob_ruta1', nombre: 'Ruta 1', username: 'ruta1', telefono: '', nickname: 'Admin', profile_image_url: '', estado: 'activo', pin_hash: '', role: 'cobrador', admin_id: 'admin_mauricio', last_login_at: null, created_at: todayIso() },
                { id: 'cob_ruta2', nombre: 'Ruta 2', username: 'ruta2', telefono: '', nickname: '', profile_image_url: '', estado: 'activo', pin_hash: '', role: 'cobrador', last_login_at: null, created_at: todayIso() },
                { id: 'cob_ruta4', nombre: 'Ruta 4', username: 'ruta4', telefono: '', nickname: '', profile_image_url: '', estado: 'activo', pin_hash: '', role: 'cobrador', last_login_at: null, created_at: todayIso() }
            ],
            metas: [],
            avances: [],
            notas: [],
            mensajes: [],
            pizarra_notas: [],
            logros: [],
            logros_cobradores: [],
            premios: [],
            premios_cobradores: [],
            frases: [
                { id: 'frase_default', titulo: 'Frase de la semana', texto: 'Esta semana se gana con disciplina, constancia y resultados.', activa: true, fecha_inicio: week.start, fecha_fin: '', created_by: 'admin_mauricio', created_at: todayIso() }
            ]
        };
    }

    async function ensurePins(state) {
        let changed = false;
        for (const admin of state.admins || []) {
            if (!admin.pin_hash) {
                admin.pin_hash = await hashPin(admin.username === 'mauricio' ? '1296' : '0000');
                changed = true;
            }
        }
        for (const cob of state.cobradores || []) {
            if (!cob.pin_hash) {
                cob.pin_hash = await hashPin('0000');
                changed = true;
            }
        }
        if (changed) save(state);
        return state;
    }

    function normalizeState(state) {
        let changed = false;
        if (Number(state.data_reset_version || 0) < DATA_RESET_VERSION) {
            state.metas = [];
            state.avances = [];
            state.premios = [];
            state.premios_cobradores = [];
            state.logros = [];
            state.logros_cobradores = [];
            state.data_reset_version = DATA_RESET_VERSION;
            changed = true;
        }
        state.cobradores = state.cobradores || [];
        if (!state.cobradores.some(c => c.id === 'cob_ruta1' || c.username === 'ruta1')) {
            state.cobradores.unshift({ id: 'cob_ruta1', nombre: 'Ruta 1', username: 'ruta1', telefono: '', nickname: 'Admin', profile_image_url: '', estado: 'activo', pin_hash: '', role: 'cobrador', admin_id: 'admin_mauricio', last_login_at: null, created_at: todayIso() });
            changed = true;
        }
        state.metas = state.metas || [];
        state.avances = state.avances || [];
        state.notas = state.notas || [];
        state.mensajes = state.mensajes || [];
        state.pizarra_notas = state.pizarra_notas || [];
        state.premios = state.premios || [];
        state.premios.forEach(p => {
            if (p.valor_economico === undefined) {
                p.valor_economico = 0;
                changed = true;
            }
        });
        state.premios_cobradores = state.premios_cobradores || [];
        state.logros = state.logros || [];
        state.logros.forEach(l => {
            if (l.imagen_url === undefined) {
                l.imagen_url = '';
                changed = true;
            }
        });
        state.logros_cobradores = state.logros_cobradores || [];
        if (changed) save(state);
        return state;
    }

    async function load() {
        let state = await loadRemote();
        if (!state) {
            try { state = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { state = null; }
        }
        if (!state || !state.version) {
            state = defaultState();
            save(state);
        }
        const normalized = await ensurePins(normalizeState(state));
        saveLocal(normalized);
        lastSyncAt = normalized._sync?.updated_at || '';
        return normalized;
    }

    function saveLocal(state) {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
    }

    function save(state) {
        state._sync = { updated_at: new Date().toISOString(), client_id: clientId() };
        lastSyncAt = state._sync.updated_at;
        saveLocal(state);
        return saveRemote(state);
    }

    async function loadRemote() {
        try {
            const res = await fetch(SYNC_ENDPOINT, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            return data && data.state && data.state.version ? data.state : null;
        } catch (_) {
            return null;
        }
    }

    async function saveRemote(state) {
        try {
            await fetch(SYNC_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state })
            });
        } catch (_) {
            // Offline/local file fallback: localStorage still keeps the latest change in this browser.
        }
    }

    function startAutoSync(onUpdate, intervalMs = 5000) {
        if (syncTimer) clearInterval(syncTimer);
        syncTimer = setInterval(async () => {
            const remote = await loadRemote();
            if (!remote || !remote.version) return;
            const remoteSyncAt = remote._sync?.updated_at || '';
            if (!remoteSyncAt || remoteSyncAt <= lastSyncAt) return;
            lastSyncAt = remoteSyncAt;
            saveLocal(remote);
            onUpdate(normalizeState(remote));
        }, intervalMs);
        return () => {
            clearInterval(syncTimer);
            syncTimer = null;
        };
    }

    async function verifyPin(hash, pin) {
        return hash === await hashPin(pin);
    }

    function currentMeta(state, cobradorId, date = todayIso()) {
        const metas = (state.metas || []).filter(m => m.cobrador_id === cobradorId && m.activa);
        return metas.find(m => (!m.fecha_inicio_semana || m.fecha_inicio_semana <= date) && (!m.fecha_fin_semana || m.fecha_fin_semana >= date)) ||
            metas.slice().sort((a, b) => String(b.fecha_inicio_semana || '').localeCompare(String(a.fecha_inicio_semana || '')))[0] || null;
    }

    function weeklyAvances(state, cobradorId) {
        const week = weekRange();
        return state.avances.filter(a => a.cobrador_id === cobradorId && a.fecha >= week.start && a.fecha <= week.end);
    }

    function totals(state, cobradorId) {
        const meta = currentMeta(state, cobradorId);
        const week = weekRange();
        const range = meta ? { start: meta.fecha_inicio_semana || week.start, end: meta.fecha_fin_semana || week.end } : week;
        return state.avances.filter(a => a.cobrador_id === cobradorId && a.fecha >= range.start && a.fecha <= range.end).reduce((acc, a) => {
            acc.creditos += Number(a.creditos_nuevos || 0);
            acc.renovaciones += Number(a.renovaciones || 0);
            acc.recaudo += Number(a.recaudo_dia || 0);
            return acc;
        }, { creditos: 0, renovaciones: 0, recaudo: 0 });
    }

    function pct(actual, meta) {
        const m = Number(meta || 0);
        if (m <= 0) return 0;
        return (Number(actual || 0) / m) * 100;
    }

    function visualPct(value) {
        return Math.min(Math.max(Number(value || 0), 0), 100);
    }

    function resumenCobrador(state, cobradorId) {
        const cobrador = state.cobradores.find(c => c.id === cobradorId);
        const meta = currentMeta(state, cobradorId) || {};
        const total = totals(state, cobradorId);
        const pCreditos = pct(total.creditos, meta.meta_creditos_nuevos);
        const pRenovaciones = pct(total.renovaciones, meta.meta_renovaciones);
        const pRecaudo = pct(total.recaudo, meta.meta_recaudo);
        const valid = [meta.meta_creditos_nuevos, meta.meta_renovaciones, meta.meta_recaudo].filter(v => Number(v || 0) > 0).length || 1;
        const cumplimientoGeneral = (pCreditos + pRenovaciones + pRecaudo) / valid;
        return { cobrador, meta, total, pCreditos, pRenovaciones, pRecaudo, cumplimientoGeneral };
    }

    function estadoCumplimiento(p, publico = false) {
        if (p >= 120) return 'Meta superada';
        if (p >= 100) return 'Meta cumplida';
        if (p >= 70) return 'Buen avance';
        if (p >= 40) return 'En progreso';
        return publico ? 'En progreso' : 'Bajo';
    }

    function metricValue(resumen, tipo) {
        if (tipo === 'creditos_nuevos') return resumen.total.creditos;
        if (tipo === 'renovaciones') return resumen.total.renovaciones;
        if (tipo === 'recaudo') return resumen.total.recaudo;
        if (tipo === 'cumplimiento_general') return resumen.cumplimientoGeneral;
        return 0;
    }

    function addMessage(state, payload) {
        state.mensajes = state.mensajes || [];
        const now = new Date().toISOString();
        const message = {
            id: uid('msg'),
            thread_id: payload.thread_id || uid('thread'),
            reply_to: payload.reply_to || '',
            sender_type: payload.sender_type || 'system',
            sender_id: payload.sender_id || 'system',
            sender_name: payload.sender_name || 'Sistema',
            recipient_type: payload.recipient_type,
            recipient_id: payload.recipient_id,
            recipient_name: payload.recipient_name || '',
            title: payload.title || 'Mensaje',
            body: payload.body || '',
            category: payload.category || 'mensaje',
            read: false,
            read_at: null,
            created_at: now
        };
        state.mensajes.push(message);
        return message;
    }

    function unlockForCobrador(state, cobradorId) {
        let changed = false;
        const week = weekRange();
        const resumen = resumenCobrador(state, cobradorId);
        const cobrador = state.cobradores.find(c => c.id === cobradorId);
        const now = new Date().toISOString();
        for (const logro of state.logros.filter(l => l.activo)) {
            const exists = state.logros_cobradores.some(x => x.cobrador_id === cobradorId && x.logro_id === logro.id && x.fecha_inicio_semana === week.start);
            if (!exists && metricValue(resumen, logro.tipo) >= Number(logro.valor_objetivo || 0)) {
                state.logros_cobradores.push({ id: uid('lc'), cobrador_id: cobradorId, logro_id: logro.id, fecha_inicio_semana: week.start, fecha_desbloqueo: now, created_at: now });
                addMessage(state, {
                    recipient_type: 'cobrador',
                    recipient_id: cobradorId,
                    recipient_name: displayName(cobrador),
                    title: 'Logro desbloqueado',
                    body: `Desbloqueaste el logro "${logro.nombre}". Sigue asi.`,
                    category: 'logro'
                });
                changed = true;
            }
        }
        for (const premio of state.premios.filter(p => p.activo && !p.asignacion_manual)) {
            const exists = state.premios_cobradores.some(x => x.cobrador_id === cobradorId && x.premio_id === premio.id && x.fecha_inicio_periodo === week.start);
            if (!exists && metricValue(resumen, premio.tipo_meta) >= Number(premio.valor_objetivo || 0)) {
                state.premios_cobradores.push({ id: uid('pc'), cobrador_id: cobradorId, premio_id: premio.id, fecha_inicio_periodo: week.start, fecha_fin_periodo: week.end, desbloqueado: true, fecha_desbloqueo: now, asignado_manualmente: false, asignado_por: null, created_at: now });
                addMessage(state, {
                    recipient_type: 'cobrador',
                    recipient_id: cobradorId,
                    recipient_name: displayName(cobrador),
                    title: 'Premio desbloqueado',
                    body: `Ganaste el premio "${premio.nombre}" por valor de ${money(premio.valor_economico || 0)}.`,
                    category: 'premio'
                });
                changed = true;
            }
        }
        return changed;
    }

    function recomputeUnlocks(state) {
        let changed = false;
        state.cobradores.forEach(c => {
            if (unlockForCobrador(state, c.id)) changed = true;
        });
        if (changed) save(state);
        return changed;
    }

    function resetWeeklyAwards(state) {
        const week = weekRange();
        state.premios_cobradores = state.premios_cobradores.filter(p => p.fecha_inicio_periodo !== week.start);
        state.logros_cobradores = state.logros_cobradores.filter(l => l.fecha_inicio_semana !== week.start);
        save(state);
    }

    function activePhrase(state) {
        return state.frases.find(f => f.activa) || null;
    }

    function displayName(c) {
        return (c.nickname || c.nombre || c.username || '').trim();
    }

    function initials(name) {
        return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    }

    function money(value) {
        return Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function validateImage(file) {
        if (!file) return 'Selecciona una imagen.';
        if (!IMAGE_TYPES.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WEBP.';
        if (file.size > MAX_IMAGE_SIZE) return 'La imagen supera el tamano maximo de 1.5 MB.';
        return '';
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const err = validateImage(file);
            if (err) reject(new Error(err));
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            reader.readAsDataURL(file);
        });
    }

    window.DamasPro = {
        load, save, uid, hashPin, verifyPin, weekRange, currentMeta, weeklyAvances, totals,
        pct, visualPct, resumenCobrador, estadoCumplimiento, metricValue, unlockForCobrador,
        recomputeUnlocks, resetWeeklyAwards, activePhrase, displayName, initials, money, escapeHtml, validateImage, fileToDataUrl
        , addMessage
        , startAutoSync
    };
})();
