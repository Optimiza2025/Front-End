let filtrosExtras = {};
let todosCandidatos = [];
let currentIdCandidato = null; // usado no modal
let currentIdCandidatura = null; // não disponível no Banco; permanece null
function formatarTexto(texto) {
    if (!texto) return '';
    return texto.replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
function updateRatingUI(media) {
    const scoreEl = document.getElementById('rating-score');
    const starsContainer = document.getElementById('rating-stars');
    if (scoreEl) scoreEl.textContent = (Number(media) || 0).toFixed(1);
    if (starsContainer) {
        const arred = Math.round(Number(media) || 0);
        starsContainer.querySelectorAll('.rating-star').forEach(st => {
            st.classList.toggle('active', Number(st.dataset.value) <= arred);
        });
    }
}
function limparHistorico() {
    const list = document.getElementById('comentarios-list');
    if (list) list.innerHTML = '<div style="color:#777; font-size:0.95rem;">Não há avaliações registradas.</div>';
    updateRatingUI(0);
}
function renderHistoricoAvaliacoes(data) {
    const list = document.getElementById('comentarios-list');
    if (!list) return;
    list.innerHTML = '';
    const avals = Array.isArray(data) ? data : (data?.content || []);
    if (!avals.length) {
        list.innerHTML = '<div style="color:#777; font-size:0.95rem;">Não há avaliações registradas.</div>';
        updateRatingUI(0);
        return;
    }
    const ultima = avals[avals.length - 1];
    const mediaUlt = ((Number(ultima.hardSkills) || 0) + (Number(ultima.softSkills) || 0) + (Number(ultima.experiencia) || 0) + (Number(ultima.cultura) || 0)) / 4;
    updateRatingUI(mediaUlt);
    avals.forEach(a => {
        const media = ((Number(a.hardSkills) || 0) + (Number(a.softSkills) || 0) + (Number(a.experiencia) || 0) + (Number(a.cultura) || 0)) / 4;
        const item = document.createElement('div');
        item.className = 'comentario-item';
        item.style.border = '1px solid #eee';
        item.style.borderRadius = '8px';
        item.style.padding = '0.75rem';
        item.style.marginBottom = '0.6rem';
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <strong>${a.nomeAvaliador || 'Avaliador'}</strong>
            <span style="color:#666; font-size:0.9rem;">${a.dataAvaliacao || ''}</span>
          </div>
          <div style="display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:0.4rem; font-size:0.9rem; margin-bottom:0.4rem;">
            <span>Hard: <strong>${Number(a.hardSkills).toFixed(1)}</strong></span>
            <span>Soft: <strong>${Number(a.softSkills).toFixed(1)}</strong></span>
            <span>Exp.: <strong>${Number(a.experiencia).toFixed(1)}</strong></span>
            <span>Cultura: <strong>${Number(a.cultura).toFixed(1)}</strong></span>
          </div>
          <div style="color:#333; margin-bottom:0.3rem;">Média: <strong>${media.toFixed(1)}</strong></div>
          <div style="white-space:pre-wrap; color:#444;">${a.comentario ? a.comentario : ''}</div>
        `;
        list.appendChild(item);
    });
}
async function carregarHistoricoAvaliacoes(idCandidato) {
    if (!idCandidato) { limparHistorico(); return; }
    try {
    const r = await fetch(api(`/optimiza/avaliacao/historico?idCandidato=${encodeURIComponent(idCandidato)}`));
        // Caso específico: API 404 = sem avaliações para o candidato
        if (r.status === 404) {
            const list = document.getElementById('comentarios-list');
            if (list) list.innerHTML = '<div style="color:#777; font-size:0.95rem;">Não tem avaliações pra esse candidato.</div>';
            updateRatingUI(0);
            return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        renderHistoricoAvaliacoes(data);
    } catch (e) {
        console.error('Erro ao carregar histórico de avaliações:', e);
        limparHistorico();
        const list = document.getElementById('comentarios-list');
        if (list) list.innerHTML = '<div style="color:#d33;">Erro ao carregar histórico.</div>';
    }
}
function renderizarCandidatos(candidatos) {
    const tbody = document.getElementById('talentos-list');
    tbody.innerHTML = '';
    if (candidatos.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="2" style="text-align:center; color:#888; padding:2rem;">Nenhum candidato encontrado.</td>`;
        tbody.appendChild(tr);
        return;
    }
    candidatos.forEach((candidato, idx) => {
        const rowClass = idx % 2 === 0 ? 'talentos-row talentos-row-alt' : 'talentos-row talentos-row-normal';
        const tr = document.createElement('tr');
        tr.className = rowClass;
        const nomeFormatado = formatarTexto(candidato.nome);
        const nivelFormatado = formatarTexto(candidato.nivelFormacao);
        const cursoFormatado = formatarTexto(candidato.curso || '');
        const statusFormatado = formatarTexto(candidato.status);
        tr.innerHTML = `
            <td class="talentos-nome">
                <strong>${nomeFormatado}</strong>
            </td>
            <td class="talentos-vermais">
                <a href="#" class="talentos-link" data-id="${candidato.id}" data-nome="${nomeFormatado}" data-nivel="${nivelFormatado}" data-curso="${cursoFormatado}" data-status="${statusFormatado}">Ver Mais</a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
async function carregarCandidatos() {
    try {
        // Monta query parameters para filtros
        const nome = document.getElementById('filtro-nome') ? document.getElementById('filtro-nome').value.trim().toLowerCase() : '';
    let url = api('/optimiza/candidatos');
        let params = [];
        if (typeof filtrosExtras !== 'undefined') {
            Object.keys(filtrosExtras).forEach(key => {
                if (filtrosExtras[key]) params.push(`${key}=${encodeURIComponent(filtrosExtras[key])}`);
            });
        }
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        const response = await fetch(url);
        let candidatos = await response.json();
        // Filtra por nome no front
        if (nome) {
            candidatos = candidatos.filter(c => c.nome && c.nome.toLowerCase().includes(nome));
        }
        todosCandidatos = candidatos;
        renderizarCandidatos(todosCandidatos);
    } catch (error) {
        console.error('Erro ao carregar candidatos:', error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Busca por nome em tempo real
    document.getElementById('filtro-nome').addEventListener('input', function () {
        carregarCandidatos();
    });
    // Dropdown de filtros extras
    const btnDropdown = document.getElementById('btn-dropdown');
    const dropdown = document.getElementById('dropdown-filtros');
    btnDropdown.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('btn-aplicar-filtro').addEventListener('click', function () {
        const campo = document.getElementById('select-filtro').value;
        const valor = document.getElementById('input-filtro').value.trim();
        if (valor) {
            filtrosExtras[campo] = valor;
            atualizarIndicadoresFiltros();
            carregarCandidatos();
        }
        dropdown.style.display = 'none';
        document.getElementById('input-filtro').value = '';
    });
    function atualizarIndicadoresFiltros() {
        const container = document.getElementById('indicadores-filtros');
        container.innerHTML = '';
        Object.keys(filtrosExtras).forEach(key => {
            const span = document.createElement('span');
            span.className = 'filtro-indicador';
            span.style.background = '#e9e9f7';
            span.style.color = '#032656';
            span.style.padding = '0.3rem 0.7rem';
            span.style.borderRadius = '1rem';
            span.style.fontSize = '0.95em';
            span.style.marginRight = '0.5rem';
            span.style.display = 'inline-flex';
            span.style.alignItems = 'center';
            span.innerHTML = `${key}: ${filtrosExtras[key]} <button class='filtro-remove' data-remove='${key}' style='margin-left:0.5rem; background:none; border:none; color:#6C63FF; font-weight:bold; cursor:pointer; font-size:1em;'>x</button>`;
            container.appendChild(span);
        });
        container.querySelectorAll('button[data-remove]').forEach(btn => {
            btn.onclick = function () {
                const campo = btn.getAttribute('data-remove');
                delete filtrosExtras[campo];
                atualizarIndicadoresFiltros();
                carregarCandidatos();
            };
        });
    }
    // Fecha dropdown ao clicar fora
    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target) && e.target !== btnDropdown) {
            dropdown.style.display = 'none';
        }
    });
});

window.onload = function () {
    carregarCandidatos();
    // Helper para formatar idiomas (objeto {lingua: nivel} ou array)
    function formatarIdiomasDetalhes(idiomas) {
        if (!idiomas) return '';
        try {
            if (Array.isArray(idiomas)) {
                return idiomas.map(i => {
                    if (typeof i === 'string') return formatarTexto(i);
                    if (i && typeof i === 'object') {
                        const lang = Object.keys(i)[0];
                        const lvl = i[lang];
                        return `${formatarTexto(lang)} (${String(lvl).toUpperCase()})`;
                    }
                    return '';
                }).filter(Boolean).join(', ');
            }
            if (typeof idiomas === 'object') {
                return Object.entries(idiomas)
                    .map(([lang, lvl]) => `${formatarTexto(lang)} (${String(lvl).toUpperCase()})`)
                    .join(', ');
            }
            return String(idiomas);
        } catch (e) {
            console.warn('Falha ao formatar idiomas:', e);
            return '';
        }
    }
    function formatarDataISO(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    document.getElementById('talentos-list').addEventListener('click', function (e) {
        if (e.target.classList.contains('talentos-link')) {
            e.preventDefault();
            // Abre modal e ativa Detalhes
            document.querySelectorAll('.cand-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.cand-panel').forEach(p => p.classList.remove('active'));
            document.querySelector('.cand-tab[data-tab="detalhes"]').classList.add('active');
            document.getElementById('tab-detalhes').classList.add('active');
            document.getElementById('modal-candidato').style.display = 'flex';

            // Limpa campos antes de carregar
            ['cand-nome', 'cand-status', 'det-nivel', 'det-curso', 'det-instituicao', 'det-idiomas', 'det-email', 'det-cargo', 'det-experiencia', 'det-curriculo', 'det-update'].forEach(id => {
                const el = document.getElementById(id); if (el) el.textContent = '';
            });
            // Prepara Avaliação
            try { document.getElementById('btn-salvar-avaliacao').style.display = 'none'; } catch (_) { }
            limparHistorico();

            // Busca dados completos por ID
            const idCandidato = e.target.getAttribute('data-id');
            currentIdCandidato = idCandidato ? Number(idCandidato) : null;
            currentIdCandidatura = null; // no Banco de Talentos não temos
            const fallback = {
                nome: e.target.getAttribute('data-nome') || '',
                status: e.target.getAttribute('data-status') || '',
                nivelFormacao: e.target.getAttribute('data-nivel') || '',
                curso: e.target.getAttribute('data-curso') || ''
            };
            if (!idCandidato) {
                // Sem ID: usa fallback dos data-attributes
                document.getElementById('cand-nome').textContent = formatarTexto(fallback.nome);
                document.getElementById('cand-status').textContent = formatarTexto(fallback.status);
                document.getElementById('det-nivel').textContent = formatarTexto(fallback.nivelFormacao);
                document.getElementById('det-curso').textContent = formatarTexto(fallback.curso);
                carregarHistoricoAvaliacoes(null);
                return;
            }
            fetch(api(`/optimiza/candidatos/${idCandidato}`))
                .then(r => r.json())
                .then(d => {
                    // ID não exibido no layout, mantido apenas internamente via data-id
                    document.getElementById('cand-nome').textContent = formatarTexto(d.nome || fallback.nome);
                    document.getElementById('cand-status').textContent = formatarTexto(d.status || fallback.status);
                    document.getElementById('det-nivel').textContent = formatarTexto(d.nivelFormacao || fallback.nivelFormacao);
                    document.getElementById('det-curso').textContent = formatarTexto(d.curso || fallback.curso);
                    document.getElementById('det-instituicao').textContent = d.instituicaoEnsino || '';
                    document.getElementById('det-cargo').textContent = d.cargo ? formatarTexto(d.cargo) : '';
                    document.getElementById('det-experiencia').textContent = d.experiencia || '';
                    document.getElementById('det-curriculo').textContent = d.curriculo || '';
                    document.getElementById('det-update').textContent = formatarDataISO(d.dataUpdate);
                    document.getElementById('det-idiomas').textContent = formatarIdiomasDetalhes(d.idiomas);
                    document.getElementById('det-email').textContent = d.email || '';
                    carregarHistoricoAvaliacoes(currentIdCandidato);
                })
                .catch(err => {
                    console.error('Erro ao carregar candidato por ID:', err);
                    // fallback básico
                    document.getElementById('cand-nome').textContent = formatarTexto(fallback.nome);
                    document.getElementById('cand-status').textContent = formatarTexto(fallback.status);
                    document.getElementById('det-nivel').textContent = formatarTexto(fallback.nivelFormacao);
                    document.getElementById('det-curso').textContent = formatarTexto(fallback.curso);
                    carregarHistoricoAvaliacoes(currentIdCandidato);
                });
        }
    });
    document.getElementById('modal-close').onclick = function () {
        document.getElementById('modal-candidato').style.display = 'none';
    };
    window.onclick = function (event) {
        if (event.target === document.getElementById('modal-candidato')) {
            document.getElementById('modal-candidato').style.display = 'none';
        }
    };
    // Troca de abas
    document.addEventListener('click', function (ev) {
        const btn = ev.target.closest('.cand-tab');
        if (!btn) return;
        document.querySelectorAll('.cand-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.cand-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        const panel = document.getElementById('tab-' + tab);
        if (panel) panel.classList.add('active');
    });
};