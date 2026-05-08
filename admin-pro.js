(function () {
    let state;
    let currentTab = 'dashboard';
    let tabsScrollLeft = 0;

    const tabs = [
        ['dashboard', 'Dashboard', 'fa-chart-line'],
        ['cobradores', 'Cobradores', 'fa-users'],
        ['metas', 'Metas', 'fa-bullseye'],
        ['avances', 'Avances', 'fa-calendar-plus'],
        ['notas', 'Notas', 'fa-note-sticky'],
        ['pizarra', 'Pizarra', 'fa-chalkboard'],
        ['logros', 'Logros', 'fa-medal'],
        ['premios', 'Premios', 'fa-trophy'],
        ['frase', 'Frase', 'fa-quote-left'],
        ['ranking', 'Ranking', 'fa-ranking-star']
    ];

    const $ = (id) => document.getElementById(id);
    const h = (v) => DamasPro.escapeHtml(v);

    function avatar(c, size = 'w-10 h-10') {
        if (c.profile_image_url) {
            return `<img src="${c.profile_image_url}" alt="${h(c.nombre)}" class="${size} rounded-full object-cover border border-brand-gray-dark">`;
        }
        return `<div class="${size} rounded-full bg-brand-blue/10 text-brand-blue font-bold flex items-center justify-center border border-brand-blue/20">${h(DamasPro.initials(c.nickname || c.nombre))}</div>`;
    }

    function progressBar(percent) {
        return `<div class="h-2.5 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-brand-green rounded-full" style="width:${DamasPro.visualPct(percent)}%"></div></div>`;
    }

    function ranking() {
        return state.cobradores
            .map(c => DamasPro.resumenCobrador(state, c.id))
            .sort((a, b) => b.cumplimientoGeneral - a.cumplimientoGeneral);
    }

    function renderShell(adminName) {
        const app = $('admin-app');
        app.innerHTML = `
            <div class="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <p class="text-brand-blue text-xs font-bold uppercase tracking-widest">Panel Admin</p>
                    <h2 class="text-3xl font-banco font-bold text-brand-text tracking-wide mt-1">Gestion Cobrador PRO</h2>
                    <p class="text-brand-text/50 text-sm mt-1">Sesion: ${h(adminName)}. Datos sincronizados con el panel compartido.</p>
                </div>
                <a href="cobrador-pro.html" class="inline-flex items-center justify-center gap-2 bg-brand-dark text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-brand-dark/90">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Cobrador PRO
                </a>
            </div>
            <div id="admin-tabs" class="flex gap-2 overflow-x-auto border-b border-brand-gray-dark mb-6">
                ${tabs.map(([id, label, icon]) => `
                    <button data-tab="${id}" class="admin-tab shrink-0 pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 ${currentTab === id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-text/40 hover:text-brand-text'}">
                        <i class="fa-solid ${icon}"></i>${label}
                    </button>
                `).join('')}
            </div>
            <div id="admin-view"></div>
        `;
        const tabsEl = $('admin-tabs');
        tabsEl.scrollLeft = tabsScrollLeft;
        tabsEl.addEventListener('scroll', () => {
            tabsScrollLeft = tabsEl.scrollLeft;
        }, { passive: true });
        app.querySelectorAll('.admin-tab').forEach(btn => btn.addEventListener('click', () => {
            tabsScrollLeft = tabsEl.scrollLeft;
            currentTab = btn.dataset.tab;
            renderShell(adminName);
            renderView();
            requestAnimationFrame(() => {
                const newTabs = $('admin-tabs');
                if (newTabs) newTabs.scrollLeft = tabsScrollLeft;
            });
        }));
    }

    function renderView() {
        if (currentTab === 'dashboard') return renderDashboard();
        if (currentTab === 'cobradores') return renderCobradores();
        if (currentTab === 'metas') return renderMetas();
        if (currentTab === 'avances') return renderAvances();
        if (currentTab === 'notas') return renderNotas();
        if (currentTab === 'pizarra') return renderPizarra();
        if (currentTab === 'logros') return renderLogros();
        if (currentTab === 'premios') return renderPremios();
        if (currentTab === 'frase') return renderFrase();
        if (currentTab === 'ranking') return renderRanking();
    }

    function stat(label, value, icon) {
        return `<div class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <p class="text-xs uppercase tracking-widest text-brand-text/40 font-bold">${label}</p>
                <i class="fa-solid ${icon} text-brand-blue"></i>
            </div>
            <p class="text-2xl font-heading font-bold text-brand-text mt-2">${value}</p>
        </div>`;
    }

    function renderDashboard() {
        DamasPro.recomputeUnlocks(state);
        const active = state.cobradores.filter(c => c.estado === 'activo').length;
        const unlocked = state.premios_cobradores.length;
        const top = ranking()[0];
        $('admin-view').innerHTML = `
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                ${stat('Cobradores activos', active, 'fa-users')}
                ${stat('Premios desbloqueados', unlocked, 'fa-trophy')}
                ${stat('Frase activa', DamasPro.activePhrase(state) ? 'Si' : 'No', 'fa-quote-left')}
                ${stat('Lider semanal', top ? h(DamasPro.displayName(top.cobrador)) : '-', 'fa-ranking-star')}
            </div>
            <div class="grid lg:grid-cols-3 gap-5">
                <section class="lg:col-span-2 bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
                    <h3 class="font-heading font-bold text-brand-text mb-4">Resumen semanal</h3>
                    <div class="space-y-4">${ranking().map(r => rowResumen(r)).join('') || empty('No hay cobradores.')}</div>
                </section>
                <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
                    <h3 class="font-heading font-bold text-brand-text mb-4">Acciones rapidas</h3>
                    <div class="grid gap-2">
                        <button data-jump="cobradores" class="quick-btn text-left rounded-xl border border-brand-gray-dark p-3 hover:bg-brand-gray">Crear cobrador</button>
                        <button data-jump="avances" class="quick-btn text-left rounded-xl border border-brand-gray-dark p-3 hover:bg-brand-gray">Agregar avance diario</button>
                        <button data-jump="notas" class="quick-btn text-left rounded-xl border border-brand-gray-dark p-3 hover:bg-brand-gray">Crear nota privada</button>
                        <button data-jump="pizarra" class="quick-btn text-left rounded-xl border border-brand-gray-dark p-3 hover:bg-brand-gray">Pizarra semanal</button>
                        <button data-jump="logros" class="quick-btn text-left rounded-xl border border-brand-gray-dark p-3 hover:bg-brand-gray">Crear logro</button>
                        <button data-jump="premios" class="quick-btn text-left rounded-xl border border-brand-gray-dark p-3 hover:bg-brand-gray">Crear premio</button>
                    </div>
                </section>
            </div>
        `;
        document.querySelectorAll('.quick-btn').forEach(btn => btn.addEventListener('click', () => {
            currentTab = btn.dataset.jump;
            DamasAdmin.render();
        }));
    }

    function rowResumen(r) {
        const c = r.cobrador;
        return `<div class="rounded-xl border border-brand-gray-dark p-4">
            <div class="flex items-center gap-3">
                ${avatar(c)}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-3 mb-2">
                        <div>
                            <p class="font-bold text-brand-text truncate">${h(DamasPro.displayName(c))}</p>
                            <p class="text-xs text-brand-text/40">${h(c.username)} - ${h(c.estado)}</p>
                        </div>
                        <p class="font-heading font-bold text-brand-green">${Math.round(r.cumplimientoGeneral)}%</p>
                    </div>
                    ${progressBar(r.cumplimientoGeneral)}
                    <p class="text-xs text-brand-text/50 mt-2">${DamasPro.estadoCumplimiento(r.cumplimientoGeneral)}</p>
                </div>
            </div>
        </div>`;
    }

    function options(selected = '') {
        return state.cobradores.map(c => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${h(c.nombre)} (${h(c.username)})</option>`).join('');
    }

    function renderCobradores() {
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[360px_1fr] gap-5">
                <form id="form-cobrador" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 class="font-heading font-bold text-brand-text">Crear cobrador</h3>
                    <input name="nombre" class="field-input" placeholder="Nombre completo" required>
                    <input name="username" class="field-input" placeholder="Usuario de acceso" required>
                    <input name="telefono" class="field-input" placeholder="Telefono">
                    <input name="pin" class="field-input" placeholder="PIN de 4 a 6 digitos" inputmode="numeric" required>
                    <button class="w-full bg-brand-blue text-white rounded-xl py-3 font-bold">Crear usuario</button>
                    <p class="text-xs text-brand-text/40">El PIN se guarda hasheado con Web Crypto en localStorage.</p>
                </form>
                <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm overflow-x-auto">
                    <h3 class="font-heading font-bold text-brand-text mb-4">Usuarios cobradores</h3>
                    <table class="w-full text-sm">
                        <thead><tr class="text-left text-brand-text/40 border-b"><th class="py-2">Cobrador</th><th>Usuario</th><th>Estado</th><th>Ultimo acceso</th><th>Acciones</th></tr></thead>
                        <tbody>${state.cobradores.map(c => `<tr class="border-b last:border-0">
                            <td class="py-3"><div class="flex items-center gap-3">${avatar(c, 'w-9 h-9')}<div><p class="font-bold">${h(c.nombre)}</p><p class="text-xs text-brand-text/40">${h(c.nickname || 'Sin nickname')}</p></div></div></td>
                            <td>${h(c.username)}</td><td>${h(c.estado)}</td><td>${h(c.last_login_at || '-')}</td>
                            <td class="flex flex-wrap gap-2 py-3">
                                <button data-profile="${c.id}" class="profile-btn px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-bold">Ver perfil</button>
                                <button data-toggle="${c.id}" class="toggle-btn px-3 py-1.5 rounded-lg bg-brand-gray text-xs font-bold">${c.estado === 'activo' ? 'Desactivar' : 'Activar'}</button>
                                <button data-pin="${c.id}" class="pin-btn px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-bold">Cambiar PIN</button>
                            </td>
                        </tr>`).join('')}</tbody>
                    </table>
                </section>
            </div>`;
        $('form-cobrador').addEventListener('submit', createCobrador);
        document.querySelectorAll('.profile-btn').forEach(btn => btn.addEventListener('click', openAdminProfile));
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.addEventListener('click', toggleCobrador));
        document.querySelectorAll('.pin-btn').forEach(btn => btn.addEventListener('click', changePin));
    }

    async function createCobrador(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const pin = String(data.pin || '');
        if (!/^\d{4,6}$/.test(pin)) return alert('El PIN debe tener entre 4 y 6 digitos.');
        if (state.cobradores.some(c => c.username.toLowerCase() === data.username.toLowerCase())) return alert('Ese usuario ya existe.');
        state.cobradores.push({ id: DamasPro.uid('cob'), nombre: data.nombre.trim(), username: data.username.trim().toLowerCase(), telefono: data.telefono.trim(), nickname: '', profile_image_url: '', estado: 'activo', pin_hash: await DamasPro.hashPin(pin), role: 'cobrador', last_login_at: null, created_at: new Date().toISOString() });
        DamasPro.save(state);
        renderView();
    }

    function toggleCobrador(e) {
        const c = state.cobradores.find(x => x.id === e.target.dataset.toggle);
        c.estado = c.estado === 'activo' ? 'inactivo' : 'activo';
        DamasPro.save(state);
        renderView();
    }

    async function changePin(e) {
        const pin = prompt('Nuevo PIN de 4 a 6 digitos');
        if (pin === null) return;
        if (!/^\d{4,6}$/.test(pin)) return alert('PIN invalido.');
        const c = state.cobradores.find(x => x.id === e.target.dataset.pin);
        c.pin_hash = await DamasPro.hashPin(pin);
        DamasPro.save(state);
        alert('PIN actualizado.');
    }

    function renderMetas() {
        const week = DamasPro.weekRange();
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[360px_1fr] gap-5">
                <form id="form-meta" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 class="font-heading font-bold text-brand-text">Crear meta manual</h3>
                    ${fieldLabel('Cobrador', `<select name="cobrador_id" class="field-input">${options()}</select>`)}
                    ${fieldLabel('Fecha de inicio', `<input name="fecha_inicio_semana" class="field-input" type="date" value="${week.start}" required>`)}
                    ${fieldLabel('Fecha final', `<input name="fecha_fin_semana" class="field-input" type="date" value="${week.end}" required>`)}
                    ${fieldLabel('Meta creditos nuevos', '<input name="meta_creditos_nuevos" class="field-input" type="number" min="0" placeholder="Ej. 10" required>')}
                    ${fieldLabel('Meta renovaciones', '<input name="meta_renovaciones" class="field-input" type="number" min="0" placeholder="Ej. 8" required>')}
                    ${fieldLabel('Meta recaudo', '<input name="meta_recaudo" class="field-input" type="number" min="0" placeholder="Ej. 8000000" required>')}
                    <button class="w-full bg-brand-blue text-white rounded-xl py-3 font-bold">Guardar meta</button>
                    <p class="text-xs text-brand-text/40">Al guardar, se activa esta meta y se desactivan las metas anteriores del mismo cobrador.</p>
                </form>
                <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
                    <h3 class="font-heading font-bold text-brand-text mb-4">Metas guardadas</h3>
                    <div class="grid md:grid-cols-2 gap-3">${state.metas.slice().reverse().map(metaCard).join('') || empty('No hay metas creadas.')}</div>
                </section>
            </div>`;
        $('form-meta').addEventListener('submit', saveMeta);
        document.querySelectorAll('.meta-delete').forEach(btn => btn.addEventListener('click', deleteMeta));
    }

    function saveMeta(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        if (data.fecha_fin_semana < data.fecha_inicio_semana) return alert('La fecha final no puede ser menor que la fecha de inicio.');
        state.metas.filter(m => m.cobrador_id === data.cobrador_id).forEach(m => m.activa = false);
        state.metas.push({ id: DamasPro.uid('meta'), cobrador_id: data.cobrador_id, fecha_inicio_semana: data.fecha_inicio_semana, fecha_fin_semana: data.fecha_fin_semana, meta_creditos_nuevos: Number(data.meta_creditos_nuevos), meta_renovaciones: Number(data.meta_renovaciones), meta_recaudo: Number(data.meta_recaudo), activa: true, created_by: 'admin_mauricio', created_at: new Date().toISOString() });
        DamasPro.recomputeUnlocks(state);
        renderView();
    }

    function metaCard(m) {
        const c = state.cobradores.find(x => x.id === m.cobrador_id) || {};
        return `<div class="rounded-xl border ${m.activa ? 'border-brand-blue bg-brand-blue/5' : 'border-brand-gray-dark'} p-4">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="font-bold">${h(c.nombre || 'Cobrador')}</p>
                    <p class="text-xs text-brand-text/40 mt-1">${h(m.fecha_inicio_semana || '-')} a ${h(m.fecha_fin_semana || '-')}</p>
                </div>
                <span class="text-xs rounded-full px-2 py-1 ${m.activa ? 'bg-brand-blue text-white' : 'bg-brand-gray text-brand-text/50'}">${m.activa ? 'Activa' : 'Inactiva'}</span>
            </div>
            <p class="text-sm text-brand-text/60 mt-3">Creditos: ${m.meta_creditos_nuevos || 0}<br>Renovaciones: ${m.meta_renovaciones || 0}<br>Recaudo: ${DamasPro.money(m.meta_recaudo || 0)}</p>
            <button data-meta="${m.id}" class="meta-delete mt-4 rounded-lg bg-red-50 text-red-500 px-3 py-2 text-xs font-bold">Eliminar meta</button>
        </div>`;
    }

    function deleteMeta(e) {
        const id = e.target.dataset.meta;
        const meta = state.metas.find(m => m.id === id);
        if (!meta) return;
        if (!confirm('Eliminar esta meta? Podras crear una nueva manualmente.')) return;
        state.metas = state.metas.filter(m => m.id !== id);
        if (meta.activa) {
            const lastForCollector = state.metas.filter(m => m.cobrador_id === meta.cobrador_id).slice(-1)[0];
            if (lastForCollector) lastForCollector.activa = true;
        }
        DamasPro.recomputeUnlocks(state);
        renderView();
    }

    function renderAvances() {
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[360px_1fr] gap-5">
                <form id="form-avance" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 id="avance-form-title" class="font-heading font-bold text-brand-text">Agregar avance diario</h3>
                    <input name="id" type="hidden">
                    ${fieldLabel('Cobrador', 'Selecciona a quien le vas a sumar este avance.', `<select name="cobrador_id" class="field-input">${options()}</select>`)}
                    ${fieldLabel('Fecha del avance', 'Dia exacto en que se hizo la gestion.', `<input name="fecha" class="field-input" type="date" value="${new Date().toISOString().slice(0,10)}" required>`)}
                    ${fieldLabel('Creditos nuevos a agregar', 'Cantidad de creditos nuevos que se suman a este cobrador.', `<input name="creditos_nuevos" class="field-input text-base font-semibold" type="number" min="0" placeholder="Cuantos creditos nuevos vas a agregar" value="">`)}
                    ${fieldLabel('Renovaciones a agregar', 'Cantidad de renovaciones que se suman a este cobrador.', `<input name="renovaciones" class="field-input text-base font-semibold" type="number" min="0" placeholder="Cuantas renovaciones vas a agregar" value="">`)}
                    ${fieldLabel('Recaudo a agregar (COP)', 'Dinero recaudado que se suma a este cobrador.', `<input name="recaudo_dia" class="field-input text-base font-semibold" type="text" inputmode="numeric" placeholder="$ 0" value="">`)}
                    <div class="rounded-xl bg-brand-gray border border-brand-gray-dark p-4 space-y-2">
                        <p class="text-xs uppercase tracking-widest text-brand-text/45 font-bold">Resumen de lo que vas a agregar</p>
                        <div class="grid gap-2 text-sm">
                            <div class="flex items-center justify-between gap-3"><span class="font-bold text-brand-text/70">Creditos nuevos</span><b id="avance-preview-creditos" class="text-brand-text">Sin agregar</b></div>
                            <div class="flex items-center justify-between gap-3"><span class="font-bold text-brand-text/70">Renovaciones</span><b id="avance-preview-renovaciones" class="text-brand-text">Sin agregar</b></div>
                            <div class="flex items-center justify-between gap-3"><span class="font-bold text-brand-text/70">Recaudo</span><b id="avance-preview-recaudo" class="text-brand-text">Sin agregar</b></div>
                        </div>
                    </div>
                    ${fieldLabel('Observacion interna opcional', 'Nota administrativa. No la ve el cobrador.', `<textarea name="observacion" class="field-input resize-none" rows="3" placeholder="Ej. Buen cierre de ruta"></textarea>`)}
                    <div class="grid grid-cols-2 gap-2">
                        <button id="avance-submit" class="bg-brand-green text-white rounded-xl py-3 font-bold">Guardar avance</button>
                        <button id="avance-cancel" type="button" class="hidden bg-brand-gray text-brand-text rounded-xl py-3 font-bold">Cancelar</button>
                    </div>
                </form>
                <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
                    <h3 class="font-heading font-bold text-brand-text mb-4">Historial reciente</h3>
                    <div class="space-y-2">${state.avances.slice().reverse().slice(0, 20).map(a => {
                        const c = state.cobradores.find(x => x.id === a.cobrador_id) || {};
                        const avanceActions = `<div class="mt-3 flex gap-2"><button data-avance-edit="${a.id}" class="avance-edit rounded-lg bg-brand-blue text-white px-3 py-2 text-xs font-bold">Editar</button><button data-avance-delete="${a.id}" class="avance-delete rounded-lg bg-red-50 text-red-500 px-3 py-2 text-xs font-bold">Eliminar</button></div>`;
                        return `<div class="rounded-xl border border-brand-gray-dark p-3 text-sm">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <b>${h(c.nombre)}</b>
                                <span class="text-xs font-bold text-brand-text/40">${h(a.fecha)}</span>
                            </div>
                            <div class="grid sm:grid-cols-3 gap-2 mt-3">
                                ${avanceMetric('Creditos nuevos agregados', a.creditos_nuevos || 0)}
                                ${avanceMetric('Renovaciones agregadas', a.renovaciones || 0)}
                                ${avanceMetric('Recaudo agregado', DamasPro.money(a.recaudo_dia || 0))}
                            </div>
                            ${a.observacion_admin_opcional ? `<p class="text-xs text-brand-text/40 mt-3">${h(a.observacion_admin_opcional)}</p>` : ''}
                            ${avanceActions}
                        </div>`;
                    }).join('') || empty('No hay avances registrados.')}</div>
                </section>
            </div>`;
        $('form-avance').addEventListener('submit', saveAvance);
        $('avance-cancel').addEventListener('click', clearAvanceForm);
        setupAvancePreview();
        document.querySelectorAll('.avance-edit').forEach(btn => btn.addEventListener('click', editAvance));
        document.querySelectorAll('.avance-delete').forEach(btn => btn.addEventListener('click', deleteAvance));
    }

    function saveAvance(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const payload = { cobrador_id: data.cobrador_id, fecha: data.fecha, creditos_nuevos: Number(data.creditos_nuevos || 0), renovaciones: Number(data.renovaciones || 0), recaudo_dia: parseMoneyInput(data.recaudo_dia), observacion_admin_opcional: data.observacion.trim(), updated_at: new Date().toISOString() };
        if (data.id) {
            const avance = state.avances.find(a => a.id === data.id);
            Object.assign(avance, payload);
        } else {
            state.avances.push({ id: DamasPro.uid('av'), ...payload, created_by: 'admin_mauricio', created_at: new Date().toISOString() });
        }
        DamasPro.recomputeUnlocks(state);
        renderView();
    }

    function editAvance(e) {
        const avance = state.avances.find(a => a.id === e.target.dataset.avanceEdit);
        const form = $('form-avance');
        form.elements.id.value = avance.id;
        form.cobrador_id.value = avance.cobrador_id;
        form.fecha.value = avance.fecha;
        form.creditos_nuevos.value = avance.creditos_nuevos || 0;
        form.renovaciones.value = avance.renovaciones || 0;
        form.recaudo_dia.value = formatMoneyInput(avance.recaudo_dia || 0);
        form.observacion.value = avance.observacion_admin_opcional || '';
        $('avance-form-title').textContent = 'Editar avance diario';
        $('avance-submit').textContent = 'Guardar cambios';
        $('avance-cancel').classList.remove('hidden');
        updateAvancePreview();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function deleteAvance(e) {
        if (!confirm('Eliminar este avance diario?')) return;
        state.avances = state.avances.filter(a => a.id !== e.target.dataset.avanceDelete);
        DamasPro.recomputeUnlocks(state);
        renderView();
    }

    function clearAvanceForm() {
        const form = $('form-avance');
        form.reset();
        form.elements.id.value = '';
        form.fecha.value = new Date().toISOString().slice(0, 10);
        $('avance-form-title').textContent = 'Agregar avance diario';
        $('avance-submit').textContent = 'Guardar avance';
        $('avance-cancel').classList.add('hidden');
        updateAvancePreview();
    }

    function renderNotas() {
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[360px_1fr] gap-5">
                <form id="form-nota" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 class="font-heading font-bold text-brand-text">Pizarron de notas privadas</h3>
                    <select name="cobrador_id" class="field-input">${options()}</select>
                    <input name="titulo" class="field-input" placeholder="Titulo" required>
                    <select name="prioridad" class="field-input"><option>Normal</option><option>Importante</option><option>Urgente</option></select>
                    <textarea name="mensaje" class="field-input resize-none" rows="4" placeholder="Mensaje privado" required></textarea>
                    <button class="w-full bg-brand-blue text-white rounded-xl py-3 font-bold">Crear nota</button>
                </form>
                <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
                    <h3 class="font-heading font-bold text-brand-text mb-4">Notas creadas</h3>
                    <div class="space-y-3">${state.notas.slice().reverse().map(n => {
                        const c = state.cobradores.find(x => x.id === n.cobrador_id) || {};
                        return `<div class="rounded-xl border border-brand-gray-dark p-4"><div class="flex justify-between gap-3"><b>${h(n.titulo)}</b><span class="text-xs text-brand-text/40">${h(n.prioridad)} - ${n.leido ? 'Leida' : 'No leida'}</span></div><p class="text-sm text-brand-text/60 mt-1">${h(c.nombre)} - ${h(n.mensaje)}</p></div>`;
                    }).join('') || empty('No hay notas.')}</div>
                </section>
            </div>`;
        $('form-nota').addEventListener('submit', saveNota);
    }

    function saveNota(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        state.notas.push({ id: DamasPro.uid('nota'), cobrador_id: data.cobrador_id, admin_id: 'admin_mauricio', titulo: data.titulo.trim(), mensaje: data.mensaje.trim(), prioridad: data.prioridad, leido: false, fecha_lectura: null, created_at: new Date().toISOString() });
        DamasPro.save(state);
        renderView();
    }

    function renderPizarra() {
        const week = DamasPro.weekRange();
        const notes = pizarraNotasSemana();
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[360px_1fr] gap-5">
                <form id="form-pizarra" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 class="font-heading font-bold text-brand-text">Pizarra semanal publica</h3>
                    <p class="text-xs text-brand-text/45">Todo lo que escribas aqui sera visible para todos los cobradores.</p>
                    <input name="titulo" class="field-input" placeholder="Titulo corto" required>
                    <textarea name="mensaje" class="field-input resize-none" rows="5" placeholder="Escribe una nota para la pizarra" required></textarea>
                    <button class="w-full bg-brand-green text-white rounded-xl py-3 font-bold">Publicar en pizarra</button>
                    <button id="clear-pizarra" type="button" class="w-full border border-red-200 text-red-500 rounded-xl py-3 font-bold hover:bg-red-50">Limpiar pizarra semanal</button>
                    <p class="text-xs text-brand-text/40">Semana actual: ${week.start} a ${week.end}</p>
                </form>
                ${pizarraBoard(notes, true)}
            </div>`;
        $('form-pizarra').addEventListener('submit', savePizarraNotaAdmin);
        $('clear-pizarra').addEventListener('click', clearPizarraSemana);
        document.querySelectorAll('.pizarra-delete').forEach(btn => btn.addEventListener('click', deletePizarraNota));
    }

    function pizarraBoard(notes, canDelete) {
        return `<section class="rounded-xl p-5 shadow-sm border-4 border-[#7b4f2a]" style="background:#155f3b; box-shadow: inset 0 0 0 2px rgba(255,255,255,.08);">
            <div class="flex items-center justify-between gap-3 mb-5">
                <h3 class="font-heading font-bold text-white">Pizarra de la semana</h3>
                <span class="text-xs text-white/60 font-bold">${notes.length} notas</span>
            </div>
            <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${notes.map(n => pizarraNoteCard(n, canDelete)).join('') || `<p class="text-white/60 text-sm py-8 text-center md:col-span-2 xl:col-span-3">La pizarra esta vacia.</p>`}</div>
        </section>`;
    }

    function pizarraNoteCard(n, canDelete) {
        const color = pizarraAuthorColor(n);
        return `<article class="rounded-lg text-brand-text p-4 shadow-md rotate-[-.5deg] border-l-4" style="background:${color.bg}; border-left-color:${color.border};">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <h4 class="font-heading font-bold">${h(n.titulo)}</h4>
                    <p class="text-xs text-brand-text/45 mt-1"><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:${color.border};"></span>${h(n.autor_nombre || 'Admin')} - ${new Date(n.created_at).toLocaleDateString('es-CO')}</p>
                </div>
                ${canDelete ? `<button data-pizarra-delete="${n.id}" class="pizarra-delete text-red-500 text-xs font-bold">Eliminar</button>` : ''}
            </div>
            <p class="text-sm text-brand-text/75 mt-3 whitespace-pre-wrap">${h(n.mensaje)}</p>
        </article>`;
    }

    function pizarraNotasSemana() {
        const week = DamasPro.weekRange();
        return (state.pizarra_notas || [])
            .filter(n => n.fecha >= week.start && n.fecha <= week.end)
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    }

    function pizarraAuthorColor(n) {
        const colors = [
            { bg: '#f8f3cf', border: '#d9a441' },
            { bg: '#dbeafe', border: '#3891CB' },
            { bg: '#dcfce7', border: '#059669' },
            { bg: '#fee2e2', border: '#ef4444' },
            { bg: '#f3e8ff', border: '#8b5cf6' },
            { bg: '#ffedd5', border: '#f97316' }
        ];
        if (n.autor_tipo === 'admin') return { bg: '#f8f3cf', border: '#C8A85C' };
        const key = String(n.autor_id || n.autor_nombre || '');
        const index = Array.from(key).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % colors.length;
        return colors[index];
    }

    function savePizarraNotaAdmin(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        state.pizarra_notas.push({ id: DamasPro.uid('pz'), titulo: data.titulo.trim(), mensaje: data.mensaje.trim(), autor_tipo: 'admin', autor_id: 'admin_mauricio', autor_nombre: 'Admin Mauricio', fecha: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString() });
        DamasPro.save(state);
        renderView();
    }

    function deletePizarraNota(e) {
        if (!confirm('Eliminar esta nota de la pizarra?')) return;
        state.pizarra_notas = (state.pizarra_notas || []).filter(n => n.id !== e.target.dataset.pizarraDelete);
        DamasPro.save(state);
        renderView();
    }

    function clearPizarraSemana() {
        if (!confirm('Limpiar todas las notas de la pizarra de esta semana?')) return;
        const week = DamasPro.weekRange();
        state.pizarra_notas = (state.pizarra_notas || []).filter(n => n.fecha < week.start || n.fecha > week.end);
        DamasPro.save(state);
        renderView();
    }

    function renderLogros() {
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[380px_1fr] gap-5">
                <form id="form-logro" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 id="logro-form-title" class="font-heading font-bold text-brand-text">Crear logro</h3>
                    <input name="id" type="hidden">
                    ${fieldLabel('Nombre del logro', '<input name="nombre" class="field-input" placeholder="Ej. Primer cierre" required>')}
                    ${fieldLabel('Descripcion breve', '<textarea name="descripcion" class="field-input resize-none" rows="3" placeholder="Explica que debe lograr el cobrador" required></textarea>')}
                    ${fieldLabel('Tipo de meta asociada', '<select name="tipo" class="field-input"><option value="creditos_nuevos">Creditos nuevos</option><option value="renovaciones">Renovaciones</option><option value="recaudo">Recaudo</option><option value="cumplimiento_general">Cumplimiento general</option></select>')}
                    ${fieldLabel('Valor objetivo', 'Numero que debe alcanzar para desbloquear el logro.', '<input name="valor_objetivo" class="field-input" type="number" min="0" placeholder="Ej. 5" required>')}
                    ${fieldLabel('Nivel del logro', '<select name="nivel" class="field-input"><option>Bronce</option><option>Plata</option><option>Oro</option><option>Diamante</option></select>')}
                    ${fieldLabel('Imagen personalizada', '<input name="imagen" class="field-input" type="file" accept="image/png,image/jpeg,image/webp">')}
                    <div class="grid grid-cols-2 gap-2">
                        <button id="logro-submit" class="bg-brand-blue text-white rounded-xl py-3 font-bold">Crear logro</button>
                        <button id="logro-cancel" type="button" class="hidden bg-brand-gray text-brand-text rounded-xl py-3 font-bold">Cancelar</button>
                    </div>
                </form>
                <section class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${(state.logros || []).map(logroAdminCard).join('') || empty('No hay logros creados.')}</section>
            </div>`;
        $('form-logro').addEventListener('submit', saveLogro);
        $('logro-cancel').addEventListener('click', clearLogroForm);
        document.querySelectorAll('.logro-edit').forEach(btn => btn.addEventListener('click', editLogro));
        document.querySelectorAll('.logro-toggle').forEach(btn => btn.addEventListener('click', toggleLogro));
        document.querySelectorAll('.logro-delete').forEach(btn => btn.addEventListener('click', deleteLogro));
    }

    function logroAdminCard(l) {
        return `<article class="bg-white border border-brand-gray-dark rounded-xl p-4 shadow-sm">
            <div class="aspect-[4/3] rounded-xl bg-brand-gray flex items-center justify-center overflow-hidden mb-3">${l.imagen_url ? `<img src="${l.imagen_url}" class="w-full h-full object-cover" alt="${h(l.nombre)}">` : `<i class="fa-solid ${h(l.icono || 'fa-medal')} text-4xl text-brand-gold"></i>`}</div>
            <div class="flex justify-between gap-3"><h3 class="font-heading font-bold">${h(l.nombre)}</h3><span class="text-xs font-bold text-brand-blue">${h(l.nivel)}</span></div>
            <p class="text-sm text-brand-text/60 mt-1">${h(l.descripcion)}</p>
            <p class="text-xs text-brand-text/40 mt-2">${h(l.tipo)} >= ${h(l.valor_objetivo)}</p>
            <p class="text-xs font-bold mt-2 ${l.activo ? 'text-brand-green' : 'text-brand-text/40'}">${l.activo ? 'Activo' : 'Inactivo'}</p>
            <div class="mt-3 flex flex-wrap gap-2">
                <button data-logro-edit="${l.id}" class="logro-edit rounded-lg bg-brand-blue text-white px-3 py-2 text-xs font-bold">Editar</button>
                <button data-logro-toggle="${l.id}" class="logro-toggle rounded-lg bg-brand-gray px-3 py-2 text-xs font-bold">${l.activo ? 'Desactivar' : 'Activar'}</button>
                <button data-logro-delete="${l.id}" class="logro-delete rounded-lg bg-red-50 text-red-500 px-3 py-2 text-xs font-bold">Eliminar</button>
            </div>
        </article>`;
    }

    async function saveLogro(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        let image = '';
        const file = fd.get('imagen');
        if (file && file.size) {
            try { image = await DamasPro.fileToDataUrl(file); } catch (err) { return alert(err.message); }
        }
        const id = fd.get('id');
        const payload = {
            nombre: fd.get('nombre').trim(),
            descripcion: fd.get('descripcion').trim(),
            tipo: fd.get('tipo'),
            valor_objetivo: Number(fd.get('valor_objetivo') || 0),
            nivel: fd.get('nivel'),
            icono: 'fa-medal',
            updated_at: new Date().toISOString()
        };
        if (id) {
            const logro = state.logros.find(l => l.id === id);
            Object.assign(logro, payload);
            if (image) logro.imagen_url = image;
        } else {
            state.logros.push({ id: DamasPro.uid('logro'), ...payload, imagen_url: image, activo: true, created_by: 'admin_mauricio', created_at: new Date().toISOString() });
        }
        DamasPro.recomputeUnlocks(state);
        renderView();
    }

    function editLogro(e) {
        const l = state.logros.find(x => x.id === e.target.dataset.logroEdit);
        const form = $('form-logro');
        form.elements.id.value = l.id;
        form.nombre.value = l.nombre || '';
        form.descripcion.value = l.descripcion || '';
        form.tipo.value = l.tipo || 'creditos_nuevos';
        form.valor_objetivo.value = l.valor_objetivo || 0;
        form.nivel.value = l.nivel || 'Bronce';
        $('logro-form-title').textContent = 'Editar logro';
        $('logro-submit').textContent = 'Guardar cambios';
        $('logro-cancel').classList.remove('hidden');
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearLogroForm() {
        const form = $('form-logro');
        form.reset();
        form.elements.id.value = '';
        $('logro-form-title').textContent = 'Crear logro';
        $('logro-submit').textContent = 'Crear logro';
        $('logro-cancel').classList.add('hidden');
    }

    function toggleLogro(e) {
        const l = state.logros.find(x => x.id === e.target.dataset.logroToggle);
        if (!l) return;
        l.activo = !l.activo;
        DamasPro.save(state);
        renderView();
    }

    function deleteLogro(e) {
        const id = e.target.dataset.logroDelete;
        if (!confirm('Eliminar este logro? Tambien se quitara de los cobradores que lo hayan desbloqueado.')) return;
        state.logros = state.logros.filter(l => l.id !== id);
        state.logros_cobradores = state.logros_cobradores.filter(l => l.logro_id !== id);
        DamasPro.save(state);
        renderView();
    }

    function renderPremios() {
        const week = DamasPro.weekRange();
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[380px_1fr] gap-5">
                <form id="form-premio" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 id="premio-form-title" class="font-heading font-bold text-brand-text">Crear premio</h3>
                    <input name="id" type="hidden">
                    ${fieldLabel('Nombre del premio', '<input name="nombre" class="field-input" placeholder="Ej. Recaudo PRO" required>')}
                    ${fieldLabel('Descripcion', '<textarea name="descripcion" class="field-input resize-none" rows="2" placeholder="Que debe lograr el cobrador" required></textarea>')}
                    ${fieldLabel('Texto motivacional', '<textarea name="texto_motivacional" class="field-input resize-none" rows="2" placeholder="Mensaje al desbloquear"></textarea>')}
                    ${fieldLabel('Tipo de meta asociada', '<select name="tipo_meta" class="field-input"><option value="creditos_nuevos">Creditos nuevos</option><option value="renovaciones">Renovaciones</option><option value="recaudo">Recaudo</option><option value="cumplimiento_general">Cumplimiento general</option><option value="manual">Manual</option></select>')}
                    ${fieldLabel('Valor objetivo de la meta', 'Numero que debe cumplir para desbloquearlo. Ej: 10 creditos o 10000000 de recaudo.', '<input name="valor_objetivo" class="field-input" type="number" min="0" placeholder="Ej. 10000000">')}
                    ${fieldLabel('Valor del premio para entregar (COP)', 'Monto economico del premio. Ej: 50000.', '<input name="valor_economico" class="field-input text-lg font-bold" type="number" min="0" placeholder="Ej. 50000" value="0">')}
                    ${fieldLabel('Nivel del premio', '<select name="nivel" class="field-input"><option>Bronce</option><option>Plata</option><option>Oro</option><option>Diamante</option></select>')}
                    ${fieldLabel('Imagen del premio', '<input name="imagen" class="field-input" type="file" accept="image/png,image/jpeg,image/webp">')}
                    <div class="grid grid-cols-2 gap-2">
                        <button id="premio-submit" class="bg-brand-blue text-white rounded-xl py-3 font-bold">Crear premio</button>
                        <button id="premio-cancel" type="button" class="hidden bg-brand-gray text-brand-text rounded-xl py-3 font-bold">Cancelar</button>
                    </div>
                    <div class="rounded-xl bg-brand-gray p-4 text-xs text-brand-text/60">
                        <b>Reinicio semanal:</b> al cambiar la semana del calendario, los premios se vuelven a evaluar para el nuevo periodo. Si necesitas limpiar los desbloqueos de esta semana para corregir pruebas, usa el boton de reinicio.
                    </div>
                    <button id="reset-awards" type="button" class="w-full border border-red-200 text-red-500 rounded-xl py-3 font-bold hover:bg-red-50">
                        Reiniciar premios y logros de esta semana
                    </button>
                    <p class="text-xs text-brand-text/40">Semana actual: ${week.start} a ${week.end}. No borra premios creados ni historial de semanas anteriores.</p>
                </form>
                <section class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${state.premios.map(p => premioCard(p)).join('')}</section>
            </div>`;
        $('form-premio').addEventListener('submit', savePremio);
        $('premio-cancel').addEventListener('click', clearPremioForm);
        $('reset-awards').addEventListener('click', resetWeeklyAwards);
        document.querySelectorAll('.premio-toggle').forEach(btn => btn.addEventListener('click', togglePremio));
        document.querySelectorAll('.premio-edit').forEach(btn => btn.addEventListener('click', editPremio));
        document.querySelectorAll('.premio-delete').forEach(btn => btn.addEventListener('click', deletePremio));
    }

    function premioCard(p) {
        return `<article class="bg-white border border-brand-gray-dark rounded-xl p-4 shadow-sm">
            <div class="aspect-[4/3] rounded-xl bg-brand-gray flex items-center justify-center overflow-hidden mb-3">${p.imagen_url ? `<img src="${p.imagen_url}" class="w-full h-full object-cover" alt="${h(p.nombre)}">` : `<i class="fa-solid fa-trophy text-4xl text-brand-gold"></i>`}</div>
            <div class="flex justify-between gap-3"><h3 class="font-heading font-bold">${h(p.nombre)}</h3><span class="text-xs font-bold text-brand-blue">${h(p.nivel)}</span></div>
            <p class="text-sm text-brand-text/60 mt-1">${h(p.descripcion)}</p>
            <p class="text-sm font-bold text-brand-green mt-2">${DamasPro.money(p.valor_economico || 0)}</p>
            <p class="text-xs text-brand-text/40 mt-2">${h(p.tipo_meta)} >= ${h(p.valor_objetivo)}</p>
            <div class="mt-3 flex flex-wrap gap-2">
                <button data-edit="${p.id}" class="premio-edit rounded-lg bg-brand-blue text-white px-3 py-2 text-xs font-bold">Editar</button>
                <button data-premio="${p.id}" class="premio-toggle rounded-lg bg-brand-gray px-3 py-2 text-xs font-bold">${p.activo ? 'Desactivar' : 'Activar'}</button>
                <button data-delete="${p.id}" class="premio-delete rounded-lg bg-red-50 text-red-500 px-3 py-2 text-xs font-bold">Eliminar</button>
            </div>
        </article>`;
    }

    async function savePremio(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        let image = '';
        const file = fd.get('imagen');
        if (file && file.size) {
            try { image = await DamasPro.fileToDataUrl(file); } catch (err) { return alert(err.message); }
        }
        const id = fd.get('id');
        const payload = {
            nombre: fd.get('nombre').trim(),
            descripcion: fd.get('descripcion').trim(),
            texto_motivacional: fd.get('texto_motivacional').trim(),
            tipo_meta: fd.get('tipo_meta'),
            valor_objetivo: Number(fd.get('valor_objetivo') || 0),
            valor_economico: Number(fd.get('valor_economico') || 0),
            nivel: fd.get('nivel'),
            asignacion_manual: fd.get('tipo_meta') === 'manual',
            updated_at: new Date().toISOString()
        };
        if (id) {
            const premio = state.premios.find(p => p.id === id);
            Object.assign(premio, payload);
            if (image) premio.imagen_url = image;
        } else {
            const week = DamasPro.weekRange();
            state.premios.push({ id: DamasPro.uid('premio'), ...payload, imagen_url: image, fecha_inicio: week.start, fecha_fin: week.end, activo: true, created_by: 'admin_mauricio', created_at: new Date().toISOString() });
        }
        DamasPro.recomputeUnlocks(state);
        renderView();
    }

    function editPremio(e) {
        const p = state.premios.find(x => x.id === e.target.dataset.edit);
        const form = $('form-premio');
        form.elements.id.value = p.id;
        form.nombre.value = p.nombre || '';
        form.descripcion.value = p.descripcion || '';
        form.texto_motivacional.value = p.texto_motivacional || '';
        form.tipo_meta.value = p.tipo_meta || 'creditos_nuevos';
        form.valor_objetivo.value = p.valor_objetivo || 0;
        form.valor_economico.value = p.valor_economico || 0;
        form.nivel.value = p.nivel || 'Bronce';
        $('premio-form-title').textContent = 'Editar premio';
        $('premio-submit').textContent = 'Guardar cambios';
        $('premio-cancel').classList.remove('hidden');
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function clearPremioForm() {
        const form = $('form-premio');
        form.reset();
        form.elements.id.value = '';
        form.valor_economico.value = 0;
        $('premio-form-title').textContent = 'Crear premio';
        $('premio-submit').textContent = 'Crear premio';
        $('premio-cancel').classList.add('hidden');
    }

    function resetWeeklyAwards() {
        if (!confirm('Esto reinicia premios y logros desbloqueados de la semana actual. El historial de semanas anteriores se conserva.')) return;
        DamasPro.resetWeeklyAwards(state);
        renderView();
    }

    function togglePremio(e) {
        const p = state.premios.find(x => x.id === e.target.dataset.premio);
        p.activo = !p.activo;
        DamasPro.save(state);
        renderView();
    }

    function renderFrase() {
        $('admin-view').innerHTML = `
            <div class="grid lg:grid-cols-[420px_1fr] gap-5">
                <form id="form-frase" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm space-y-4">
                    <h3 class="font-heading font-bold text-brand-text">Frase de la semana</h3>
                    <input name="titulo" class="field-input" placeholder="Titulo opcional">
                    <textarea name="texto" class="field-input resize-none" rows="5" placeholder="Texto de la frase" required></textarea>
                    <button class="w-full bg-brand-blue text-white rounded-xl py-3 font-bold">Activar nueva frase</button>
                    <p class="text-xs text-brand-text/40">Al activar una nueva frase, las anteriores quedan inactivas.</p>
                </form>
                <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
                    <h3 class="font-heading font-bold text-brand-text mb-4">Historial</h3>
                    <div class="space-y-3">${state.frases.slice().reverse().map(fraseCard).join('') || empty('No hay frases guardadas.')}</div>
                </section>
            </div>`;
        $('form-frase').addEventListener('submit', saveFrase);
        document.querySelectorAll('.frase-activate').forEach(btn => btn.addEventListener('click', activateFrase));
        document.querySelectorAll('.frase-delete').forEach(btn => btn.addEventListener('click', deleteFrase));
    }

    function fraseCard(f) {
        return `<div class="rounded-xl border ${f.activa ? 'border-brand-blue bg-brand-blue/5' : 'border-brand-gray-dark'} p-4">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <b>${h(f.titulo || 'Frase')}</b>
                    <p class="text-brand-text/70 mt-1">${h(f.texto)}</p>
                    <p class="text-xs text-brand-text/40 mt-2">${f.activa ? 'Activa' : 'Inactiva'} - ${h(f.fecha_inicio || '-')}</p>
                </div>
                <span class="shrink-0 text-xs rounded-full px-2 py-1 ${f.activa ? 'bg-brand-blue text-white' : 'bg-brand-gray text-brand-text/50'}">${f.activa ? 'En uso' : 'Guardada'}</span>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
                <button data-frase="${f.id}" class="frase-activate rounded-lg ${f.activa ? 'bg-brand-gray text-brand-text/45' : 'bg-brand-blue text-white'} px-3 py-2 text-xs font-bold" ${f.activa ? 'disabled' : ''}>Usar esta frase</button>
                <button data-frase="${f.id}" class="frase-delete rounded-lg bg-red-50 text-red-500 px-3 py-2 text-xs font-bold">Eliminar</button>
            </div>
        </div>`;
    }

    function saveFrase(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        state.frases.forEach(f => f.activa = false);
        state.frases.push({ id: DamasPro.uid('frase'), titulo: data.titulo.trim(), texto: data.texto.trim(), activa: true, fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: '', created_by: 'admin_mauricio', created_at: new Date().toISOString() });
        DamasPro.save(state);
        renderView();
    }

    function activateFrase(e) {
        const frase = state.frases.find(f => f.id === e.target.dataset.frase);
        if (!frase) return;
        state.frases.forEach(f => f.activa = false);
        frase.activa = true;
        frase.fecha_inicio = new Date().toISOString().slice(0, 10);
        frase.fecha_fin = '';
        DamasPro.save(state);
        renderView();
    }

    function deleteFrase(e) {
        const id = e.target.dataset.frase;
        const frase = state.frases.find(f => f.id === id);
        if (!frase) return;
        if (!confirm('Eliminar esta frase del historial?')) return;
        state.frases = state.frases.filter(f => f.id !== id);
        if (frase.activa && state.frases.length) {
            state.frases[state.frases.length - 1].activa = true;
        }
        DamasPro.save(state);
        renderView();
    }

    function renderRanking() {
        $('admin-view').innerHTML = `
            <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm overflow-x-auto">
                <h3 class="font-heading font-bold text-brand-text mb-4">Ranking completo</h3>
                <table class="w-full text-sm">
                    <thead><tr class="text-left text-brand-text/40 border-b"><th class="py-2">#</th><th>Cobrador</th><th>Creditos</th><th>Renovaciones</th><th>Recaudo</th><th>Cumplimiento</th><th>Logros</th><th>Premios</th><th>Estado</th><th>Perfil</th></tr></thead>
                    <tbody>${ranking().map((r, i) => {
                        const c = r.cobrador;
                        const logros = state.logros_cobradores.filter(x => x.cobrador_id === c.id).length;
                        const premios = state.premios_cobradores.filter(x => x.cobrador_id === c.id).length;
                        return `<tr class="border-b last:border-0"><td class="py-3 font-bold">${i + 1}</td><td><div class="flex items-center gap-3">${avatar(c, 'w-9 h-9')}<b>${h(DamasPro.displayName(c))}</b></div></td><td>${r.total.creditos}/${r.meta.meta_creditos_nuevos || 0}</td><td>${r.total.renovaciones}/${r.meta.meta_renovaciones || 0}</td><td>${DamasPro.money(r.total.recaudo)}</td><td><b class="text-brand-green">${Math.round(r.cumplimientoGeneral)}%</b></td><td>${logros}</td><td>${premios}</td><td>${DamasPro.estadoCumplimiento(r.cumplimientoGeneral)}</td><td><button data-profile="${c.id}" class="profile-btn rounded-lg bg-brand-green text-white px-3 py-1.5 text-xs font-bold">Ver</button></td></tr>`;
                    }).join('')}</tbody>
                </table>
            </section>`;
        document.querySelectorAll('.profile-btn').forEach(btn => btn.addEventListener('click', openAdminProfile));
    }

    function openAdminProfile(e) {
        renderAdminProfile(e.target.dataset.profile);
    }

    function renderAdminProfile(cobradorId) {
        const target = state.cobradores.find(c => c.id === cobradorId);
        if (!target) return;
        const r = DamasPro.resumenCobrador(state, target.id);
        const week = DamasPro.weekRange();
        const unlockedLogroIds = state.logros_cobradores
            .filter(x => x.cobrador_id === target.id && x.fecha_inicio_semana === week.start)
            .map(x => x.logro_id);
        const unlockedLogros = state.logros.filter(l => unlockedLogroIds.includes(l.id));
        $('admin-view').innerHTML = `
            <button id="back-admin-profile" class="mb-5 inline-flex items-center gap-2 text-brand-blue font-bold text-sm">
                <i class="fa-solid fa-arrow-left"></i> Volver
            </button>
            <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm mb-5">
                <div class="flex flex-col sm:flex-row sm:items-center gap-5">
                    ${avatar(target, 'w-24 h-24')}
                    <div class="min-w-0 flex-1">
                        <p class="text-xs uppercase tracking-widest text-brand-text/40 font-bold">Perfil de cobrador</p>
                        <h3 class="font-heading font-bold text-2xl text-brand-text mt-1">${h(DamasPro.displayName(target))}</h3>
                        <p class="text-sm text-brand-text/50 mt-1">${h(target.nombre)} - ${h(target.username)} - ${h(target.estado)}</p>
                        <p class="text-sm font-bold text-brand-green mt-3">${Math.round(r.cumplimientoGeneral)}% cumplimiento general</p>
                    </div>
                </div>
                <div class="grid sm:grid-cols-3 gap-3 mt-5">
                    ${adminProfileMetric('Creditos', r.total.creditos, r.meta.meta_creditos_nuevos)}
                    ${adminProfileMetric('Renovaciones', r.total.renovaciones, r.meta.meta_renovaciones)}
                    ${adminProfileMetric('Recaudo', DamasPro.money(r.total.recaudo), DamasPro.money(r.meta.meta_recaudo || 0))}
                </div>
            </section>
            ${target.id === 'cob_ruta1' ? adminProfileEditForm(target) : ''}
            <section class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm">
                <h3 class="font-heading font-bold text-brand-text mb-4">Logros desbloqueados</h3>
                <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${unlockedLogros.map(adminProfileLogroCard).join('') || empty('Este cobrador aun no tiene logros desbloqueados.')}</div>
            </section>
        `;
        $('back-admin-profile').addEventListener('click', renderView);
        if (target.id === 'cob_ruta1') $('admin-profile-form').addEventListener('submit', saveAdminProfile);
    }

    function adminProfileEditForm(target) {
        return `<form id="admin-profile-form" class="bg-white border border-brand-gray-dark rounded-xl p-5 shadow-sm mb-5 space-y-4">
            <h3 class="font-heading font-bold text-brand-text">Editar perfil Ruta 1</h3>
            ${fieldLabel('Nickname', `<input name="nickname" class="field-input" value="${h(target.nickname || '')}" placeholder="Ej. Admin">`)}
            ${fieldLabel('Foto de perfil', '<input name="profile_image" class="field-input" type="file" accept="image/png,image/jpeg,image/webp">')}
            <button class="w-full bg-brand-blue text-white rounded-xl py-3 font-bold">Guardar perfil</button>
        </form>`;
    }

    async function saveAdminProfile(e) {
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const ruta1 = state.cobradores.find(c => c.id === 'cob_ruta1');
        if (!ruta1) return;
        ruta1.nickname = String(fd.get('nickname') || '').trim();
        const file = fd.get('profile_image');
        if (file && file.size) {
            try { ruta1.profile_image_url = await DamasPro.fileToDataUrl(file); } catch (err) { return alert(err.message); }
        }
        DamasPro.save(state);
        renderAdminProfile(ruta1.id);
    }

    function adminProfileMetric(label, value, target) {
        return `<div class="rounded-xl bg-brand-gray p-4">
            <p class="text-xs uppercase tracking-widest text-brand-text/40 font-bold">${label}</p>
            <p class="font-heading font-bold text-lg mt-1">${value}</p>
            <p class="text-xs text-brand-text/45 mt-1">Meta: ${target || 0}</p>
        </div>`;
    }

    function adminProfileLogroCard(l) {
        return `<article class="rounded-xl border border-brand-green bg-brand-green/5 p-4">
            <div class="flex items-center gap-3">
                ${l.imagen_url ? `<img src="${l.imagen_url}" alt="${h(l.nombre)}" class="w-12 h-12 rounded-xl object-cover border border-brand-gray-dark">` : `<i class="fa-solid ${h(l.icono || 'fa-medal')} text-brand-green"></i>`}
                <div><h4 class="font-bold">${h(l.nombre)}</h4><p class="text-xs text-brand-text/50">Desbloqueado - ${h(l.nivel)}</p></div>
            </div>
            <p class="text-sm text-brand-text/60 mt-2">${h(l.descripcion)}</p>
        </article>`;
    }

    function empty(text) {
        return `<p class="text-sm text-brand-text/40 text-center py-6">${text}</p>`;
    }

    function avanceMetric(label, value) {
        return `<div class="rounded-lg bg-brand-gray px-3 py-2">
            <p class="text-[11px] uppercase tracking-widest text-brand-text/45 font-bold">${label}</p>
            <p class="text-base font-bold text-brand-text mt-1">${h(value)}</p>
        </div>`;
    }

    function setupAvancePreview() {
        const form = $('form-avance');
        ['creditos_nuevos', 'renovaciones', 'recaudo_dia'].forEach(name => {
            form[name].addEventListener('input', updateAvancePreview);
        });
        form.recaudo_dia.addEventListener('input', formatRecaudoField);
        form.recaudo_dia.addEventListener('blur', formatRecaudoField);
        updateAvancePreview();
    }

    function updateAvancePreview() {
        const form = $('form-avance');
        if (!form) return;
        const creditos = form.creditos_nuevos.value;
        const renovaciones = form.renovaciones.value;
        const recaudo = form.recaudo_dia.value;
        $('avance-preview-creditos').textContent = creditos === '' ? 'Sin agregar' : `${creditos} creditos nuevos`;
        $('avance-preview-renovaciones').textContent = renovaciones === '' ? 'Sin agregar' : `${renovaciones} renovaciones`;
        $('avance-preview-recaudo').textContent = parseMoneyInput(recaudo) <= 0 ? 'Sin agregar' : DamasPro.money(parseMoneyInput(recaudo));
    }

    function formatRecaudoField(e) {
        const value = parseMoneyInput(e.target.value);
        e.target.value = value > 0 ? formatMoneyInput(value) : '';
        updateAvancePreview();
    }

    function parseMoneyInput(value) {
        return Number(String(value || '').replace(/\D/g, '') || 0);
    }

    function formatMoneyInput(value) {
        return parseMoneyInput(value).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    }

    function fieldLabel(label, helpOrControl, maybeControl) {
        const help = maybeControl ? helpOrControl : '';
        const control = maybeControl || helpOrControl;
        return `<label class="block">
            <span class="block text-sm font-bold text-brand-text mb-1.5">${label}</span>
            ${help ? `<span class="block text-xs text-brand-text/45 mb-2">${help}</span>` : ''}
            ${control}
        </label>`;
    }

    function deletePremio(e) {
        const id = e.target.dataset.delete;
        if (!confirm('Eliminar este premio? Se quitara de la lista de premios disponibles.')) return;
        state.premios = state.premios.filter(p => p.id !== id);
        state.premios_cobradores = state.premios_cobradores.filter(p => p.premio_id !== id);
        DamasPro.save(state);
        renderView();
    }

    async function render(adminName = 'Administrador') {
        state = await DamasPro.load();
        renderShell(adminName);
        renderView();
        DamasPro.startAutoSync((nextState) => {
            state = nextState;
            renderShell(adminName);
            renderView();
        });
    }

    window.DamasAdmin = { render };

    if (sessionStorage.getItem('admin_auth') === '1') {
        render();
    }
})();
