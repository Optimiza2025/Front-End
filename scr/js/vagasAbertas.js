let filtrosExtras = {};
let todasVagas = [];
let currentVagaId = null;
function formatarTexto(texto) {
    if (!texto) return '';
    // Substitui hífens e underlines por espaço, coloca cada palavra com inicial maiúscula
    return texto.replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
function formatarIdiomas(idiomas) {
    if (!idiomas) return '';
    // Se vier como array simples
    if (Array.isArray(idiomas)) {
        return idiomas.map(i => formatarTexto(i)).join(', ');
    }
    // Se vier como objeto { "Inglês": "B2", ... }
    if (typeof idiomas === 'object') {
        return Object.entries(idiomas)
            .map(([lang, nivel]) => `${formatarTexto(lang)}${nivel ? ' (' + nivel.toUpperCase() + ')' : ''}`)
            .join(', ');
    }
    return '';
}

// Helper para evitar erros quando um id não existe no DOM
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value == null ? '' : String(value);
}

// Mapeia idArea conhecidos para nomes (fallback; pode ser ajustado conforme backend)
const MAP_AREAS = { 1: 'Financeiro', 2: 'Recursos Humanos', 3: 'TI', 4: 'Marketing', 5: 'Operações' };
function obterNomeArea(infoArea) {
    if (typeof infoArea === 'string') return formatarTexto(infoArea);
    if (typeof infoArea === 'number') return MAP_AREAS[infoArea] || String(infoArea);
    return '';
}

// Converte etapa do backend para label amigável usado na barra
function etapaParaLabel(etapa, status) {
    const raw = ((etapa || status || '') + '').toLowerCase().replace(/[_-]/g, ' ');
    // Default para novas vagas: Aguardando Aprovação RH
    if (!raw) return 'Aguardando Aprovação RH';
    if (
        raw.includes('aprovacao rh') ||
        raw.includes('aprovação rh') ||
        raw.includes('aguardando') ||
        raw.includes('vaga aberta') ||
        raw.includes('aberta')
    ) return 'Aguardando Aprovação RH';
    if (raw.includes('entrevista') || raw.includes('entrevistando')) return 'Entrevistando Candidatos';
    if (raw.includes('admiss')) return 'Admissão Concluída';
    // fallback amigável
    return 'Aguardando Aprovação RH';
}
// Retorna um índice de ordenação para cada etapa (menor = mais prioridade na listagem)
function etapaOrder(label) {
    const l = (label || '').toLowerCase();
    if (l.includes('aprovacao rh') || l.includes('aprovação rh') || l.includes('aguard')) return 0;
    if (l.includes('entrevista') || l.includes('entrevistando')) return 1;
    if (l.includes('admiss')) return 2;
    return 3;
}
function renderizarVagas(vagas) {
    const tbody = document.getElementById('talentos-list');
    tbody.innerHTML = '';
    if (vagas.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align:center; color:#888; padding:2rem;">Nenhuma vaga encontrada.</td>`;
        tbody.appendChild(tr);
        return;
    }
    vagas.forEach((vaga, idx) => {
        const rowClass = idx % 2 === 0 ? 'talentos-row talentos-row-alt' : 'talentos-row talentos-row-normal';
        const tr = document.createElement('tr');
        tr.className = rowClass;
        const tituloFormatado = formatarTexto(vaga.titulo);
        const cargoFormatado = formatarTexto(vaga.cargo);
        const nivelFormatado = formatarTexto(vaga.nivelFormacao);
        const idiomasFormatados = formatarIdiomas(vaga.idiomas);
        const etapaLabel = etapaParaLabel(vaga.etapaVaga, vaga.status);
        // Diminui a opacidade para vagas ainda não aprovadas
        if (etapaLabel === 'Vaga Aberta' || etapaLabel === 'Aguardando Aprovação RH') {
            tr.classList.add('vaga-pendente-aprovacao');
            tr.title = 'Aguardando aprovação do RH';
        }
        // Guarda o id (normalizado) no dataset para facilitar debugs
        const idNorm = vaga?.id ?? vaga?.idVaga ?? vaga?.vagaId ?? null;
        if (idNorm != null) tr.dataset.idVaga = idNorm;
        tr.innerHTML = `
                <td class="talentos-nome"><strong>${tituloFormatado}</strong></td>
                <td class="talentos-nome"><strong>${cargoFormatado}</strong></td>
                <td class="talentos-nome"><strong>${nivelFormatado}</strong></td>
                <td class="talentos-nome"><strong>${idiomasFormatados}</strong></td>
            `;

        // 👉 Aqui adiciona o clique para abrir o modal
        tr.addEventListener('click', () => abrirModal(vaga));

        tbody.appendChild(tr);
    });
}
async function carregarVagas() {
    try {
        var idArea = localStorage.getItem('idAreaUsuario');
    let url = api(`/optimiza/vagas?idArea=${idArea}`);
        let params = [];
        Object.keys(filtrosExtras).forEach(key => {
            if (filtrosExtras[key]) params.push(`${key}=${encodeURIComponent(filtrosExtras[key])}`);
        });
        if (params.length > 0) {
            url += '&' + params.join('&');
        }
        const response = await fetch(url);
        const lista = await response.json();
        // Normaliza ID para garantir que cada item tenha a propriedade "id"
        todasVagas = (Array.isArray(lista) ? lista : []).map(v => ({
            ...v,
            id: v?.id ?? v?.idVaga ?? v?.vagaId ?? v?.codigo ?? v?.ID ?? v?.Id ?? null
        }));
        filtrarEVizualizarVagas();
    } catch (error) {
        console.error('Erro ao carregar vagas:', error);
    }
}
document.addEventListener('DOMContentLoaded', function () {
    // Busca por título em tempo real
    document.getElementById('filtro-titulo').addEventListener('input', function () {
        filtrarEVizualizarVagas();
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
            carregarVagas(); // Recarrega as vagas com filtros na URL
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
                carregarVagas(); // Recarrega as vagas com filtros na URL
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
function filtrarEVizualizarVagas() {
    const termo = document.getElementById('filtro-titulo').value.trim().toLowerCase();
    let vagasFiltradas = todasVagas;
    if (termo) {
        vagasFiltradas = vagasFiltradas.filter(vaga => formatarTexto(vaga.titulo).toLowerCase().includes(termo));
    }
    Object.keys(filtrosExtras).forEach(key => {
        const valor = filtrosExtras[key].toLowerCase();
        vagasFiltradas = vagasFiltradas.filter(vaga => {
            if (key === 'idiomas') {
                if (!vaga.idiomas) return false;
                if (Array.isArray(vaga.idiomas)) {
                    return vaga.idiomas.some(idioma => formatarTexto(idioma).toLowerCase().includes(valor));
                }
                // objeto map
                return Object.keys(vaga.idiomas).some(id => formatarTexto(id).toLowerCase().includes(valor) || (vaga.idiomas[id] && vaga.idiomas[id].toLowerCase().includes(valor)));
            }
            return vaga[key] && formatarTexto(vaga[key]).toLowerCase().includes(valor);
        });
    });
    // Ordena por etapa (aguardando aprovação do RH primeiro), depois por título
    vagasFiltradas.sort((a, b) => {
        const la = etapaParaLabel(a.etapaVaga, a.status);
        const lb = etapaParaLabel(b.etapaVaga, b.status);
        const oa = etapaOrder(la);
        const ob = etapaOrder(lb);
        if (oa !== ob) return oa - ob;
        // fallback por título
        const ta = (a.titulo || '').toLowerCase();
        const tb = (b.titulo || '').toLowerCase();
        return ta < tb ? -1 : (ta > tb ? 1 : 0);
    });

    renderizarVagas(vagasFiltradas);
}
window.onload = function () {
    carregarVagas();
    document.getElementById('talentos-list').addEventListener('click', function (e) {
        if (e.target.classList.contains('talentos-link')) {
            e.preventDefault();
            document.getElementById('modal-nome').textContent = e.target.getAttribute('data-titulo');
            document.getElementById('modal-nivel').textContent = '';
            document.getElementById('modal-curso').textContent = e.target.getAttribute('data-cargo');
            document.getElementById('modal-status').textContent = '';
            document.getElementById('modal-candidato').style.display = 'flex';
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
};

// Abre o modal com as informações da vaga
async function abrirModal(vaga) {
    try {
        // tenta várias chaves comuns para ID
        const id = (vaga && (
            vaga.id ?? vaga.idVaga ?? vaga.vagaId ?? vaga.codigo ?? vaga.ID ?? vaga.Id
        )) ?? null;
        currentVagaId = id;
        let dados = vaga;
        if (id != null) {
            const resp = await fetch(api(`/optimiza/vagas/${id}`));
            if (resp.ok) {
                dados = await resp.json();
                // se a API devolver o id, confirma no estado atual
                if (dados && (dados.id != null)) currentVagaId = dados.id;
            }
        }

        // Fallback caso não haja resposta detalhada
        dados = dados || {};

        const labelEtapa = etapaParaLabel(dados.etapaVaga, dados.status);

        setText('modal-titulo', dados.titulo || vaga?.titulo || '');
        setText('modal-status-display', labelEtapa);
        setText('titulo-vaga-display', dados.titulo || '');
        setText('cargo-vaga-display', formatarTexto(dados.cargo));
        setText('experiencia-vaga-display', dados.experiencia || '');
        setText('area-vaga-display', obterNomeArea(dados.area || dados.idArea));
        setText('nivel-vaga-display', formatarTexto(dados.nivelFormacao));
        setText('idiomas-vaga-display', formatarIdiomas(dados.idiomas));

        const palavras = Array.isArray(dados.palavrasChave)
            ? dados.palavrasChave.join('\n')
            : (dados.palavrasChave || '');
        setText('palavras-vaga-display', palavras);

        atualizarProgresso((labelEtapa || '').toLowerCase());
        atualizarBotaoAcao(labelEtapa);
        // Desabilita o botão "Ver Candidatos" se a vaga ainda estiver aguardando aprovação do RH
        try {
            const verBtn = document.querySelector('.modal-actions .ver-candidatos');
            if (verBtn) {
                if (etapaOrder(labelEtapa) === 0) {
                    verBtn.disabled = true;
                    verBtn.setAttribute('aria-disabled', 'true');
                    verBtn.title = 'Aguardando aprovação do RH — não é possível ver candidatos.';
                    verBtn.classList.add('disabled');
                } else {
                    verBtn.disabled = false;
                    verBtn.setAttribute('aria-disabled', 'false');
                    verBtn.title = 'Ver candidatos';
                    verBtn.classList.remove('disabled');
                }
            }
        } catch (e) { /* ignore DOM errors */ }
        document.getElementById('modal-vaga').style.display = 'flex';
    } catch (e) {
        console.error('Erro ao abrir modal da vaga:', e);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao carregar',
            text: 'Não foi possível carregar os detalhes da vaga.',
            confirmButtonText: 'Ok'
        });
    }
}

// Fecha o modal ao clicar no botão X
document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('modal-vaga').style.display = 'none';
});

// Fecha ao clicar fora do conteúdo
window.addEventListener('click', e => {
    const modal = document.getElementById('modal-vaga');
    if (e.target === modal) modal.style.display = 'none';
});

// Atualiza as bolinhas de status (3 etapas na UI)
function atualizarProgresso(status) {
    const etapas = Array.from(document.querySelectorAll('.vaga-etapa'));
    const linhas = Array.from(document.querySelectorAll('.vaga-status .linha'));

    // Limpa estados anteriores
    etapas.forEach(etapa => etapa.classList.remove('ativa', 'concluida'));
    linhas.forEach(l => l.classList.remove('concluida', 'pendente'));

    // Calcula índice da etapa atual (0=Aprovação RH, 1=Entrevistas, 2=Admissão)
    const s = (status || '').toLowerCase();
    let idx = 0;
    if (s.includes('entrevista')) {
        idx = 1;
    } else if (s.includes('admiss')) {
        idx = 2;
    } else if (s.includes('aprov') || s.includes('aguard') || s.includes('vaga aberta') || s.includes('aberta')) {
        idx = 0;
    } else {
        idx = 0; // fallback
    }

    // Marca etapas concluídas e ativa a atual
    etapas.forEach((etapa, i) => {
        if (i < idx) etapa.classList.add('concluida');
        if (i === idx) etapa.classList.add('ativa');
    });

    // Atualiza linhas: concluídas até a etapa atual, pendentes depois
    linhas.forEach((linha, i) => {
        if (i < idx) linha.classList.add('concluida');
        else linha.classList.add('pendente');
    });
}

// Ativa/desativa o botão de ação conforme a etapa atual
function atualizarBotaoAcao(labelEtapa) {
    const btn = document.getElementById('btn-acao-vaga');
    if (!btn) return;
    const s = (labelEtapa || '').toLowerCase();
    if (s.includes('admiss')) {
        // Vaga concluída: nada a aprovar
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.textContent = 'Concluída';
        btn.title = 'A vaga já foi concluída.';
    } else if (s.includes('entrevista')) {
        // Já aprovada: não permitir nova aprovação
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.textContent = 'Aprovada';
        btn.title = 'A vaga já foi aprovada.';
    } else {
        // Aguardando aprovação
        btn.disabled = false;
        btn.setAttribute('aria-disabled', 'false');
        btn.textContent = 'Aprovar Vaga';
        btn.title = 'Enviar a vaga para Entrevistando Candidatos';
    }
}



// Preenche os campos display (chame isso dentro de abrirModal antes de mostrar o modal)
function preencherModalDisplay(vaga) {
    document.getElementById('modal-titulo').textContent = vaga.titulo || '';
    document.getElementById('modal-status-display').textContent = vaga.status || '';
    document.getElementById('titulo-vaga-display').textContent = vaga.titulo || '';
    document.getElementById('cargo-vaga-display').textContent = vaga.cargo || '';
    document.getElementById('experiencia-vaga-display').textContent = vaga.experiencia || '';
    document.getElementById('area-vaga-display').textContent = vaga.area || '';
    document.getElementById('nivel-vaga-display').textContent = vaga.nivelFormacao || '';
    document.getElementById('idiomas-vaga-display').textContent = Array.isArray(vaga.idiomas)
        ? vaga.idiomas.join(', ')
        : (vaga.idiomas ? Object.entries(vaga.idiomas).map(([k, v]) => `${k} (${v})`).join(', ') : '');

    // palavras-chave (manter quebras de linha)
    const palavras = vaga.palavrasChave ? (Array.isArray(vaga.palavrasChave) ? vaga.palavrasChave.join('\n') : String(vaga.palavrasChave)) : '';
    document.getElementById('palavras-vaga-display').textContent = palavras;
}

// Handler do botão Aprovar (chama backend e atualiza UI)
document.querySelector('.modal-actions .aprovar')?.addEventListener('click', async function () {
    if (!currentVagaId) {
        Swal.fire({
            icon: 'info',
            title: 'Sem ID da vaga',
            text: 'ID da vaga não identificado.',
            confirmButtonText: 'Ok'
        });
        return;
    }
    const confirmar = await Swal.fire({
        icon: 'question',
        title: 'Aprovar vaga?',
        text: 'Esta ação moverá a vaga para Entrevistando Candidatos.',
        showCancelButton: true,
        confirmButtonText: 'Aprovar',
        cancelButtonText: 'Cancelar'
    });
    if (!confirmar.isConfirmed) return;
    try {
        const resp = await fetch(api(`/optimiza/vagas/aprovacao-rh/${currentVagaId}?aprovado=true`), {
            method: 'PUT'
        });
        if (!resp.ok) throw new Error('Falha ao aprovar a vaga');
        // Sucesso visual
        await Swal.fire({
            icon: 'success',
            title: 'Vaga aprovada',
            text: 'A vaga foi aprovada com sucesso.',
            timer: 1600,
            showConfirmButton: false
        });
        // Após aprovação, avançamos para "Entrevistando Candidatos"
        setText('modal-status-display', 'Entrevistando Candidatos');
        atualizarProgresso('entrevistando candidatos');
        atualizarBotaoAcao('Entrevistando Candidatos');
        // Recarrega lista para refletir possíveis mudanças
        try { carregarVagas(); } catch { }
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao aprovar',
            text: 'Não foi possível aprovar a vaga. Verifique o console.',
            confirmButtonText: 'Ok'
        });
    }
});

// Navega para tela de match levando o id da vaga
document.querySelector('.modal-actions .ver-candidatos')?.addEventListener('click', function (e) {
    const btn = this;
    // Bloqueia acesso se o botão estiver desabilitado (vaga aguardando aprovação RH)
    if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        Swal.fire({
            icon: 'info',
            title: 'Aguardando aprovação',
            text: 'Esta vaga ainda está aguardando aprovação do RH. Você não pode ver os candidatos agora.',
            confirmButtonText: 'Ok'
        });
        return;
    }
    if (!currentVagaId) {
        Swal.fire({
            icon: 'info',
            title: 'Sem ID da vaga',
            text: 'ID da vaga não identificado.',
            confirmButtonText: 'Ok'
        });
        return;
    }
    const titulo = document.getElementById('modal-titulo')?.textContent || '';
    try {
        localStorage.setItem('idVaga', String(currentVagaId));
        localStorage.setItem('idVagaSelecionada', String(currentVagaId));
        if (titulo) localStorage.setItem('nomeVaga', titulo);
    } catch { }
    window.location.href = `match.html?idVaga=${encodeURIComponent(currentVagaId)}`;
});