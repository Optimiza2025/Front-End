function renderizarCandidatos(candidatos) {
  const container = document.getElementById('all-candidates');
  container.innerHTML = '';

  if (candidatos.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#888; margin-top:2vh;">Nenhum candidato encontrado.</p>`;
    return;
  }

  //ordenar por porcentagem (maior primeiro)
  candidatos.sort((a, b) => b.porcentagem - a.porcentagem);

  candidatos.forEach(candidato => {
    // Definir a classe da borda pela porcentagem
    let cardClass = "candidate-card";
    if (candidato.porcentagem >= 60) {
      cardClass += " success"; // verde
    } else if (candidato.porcentagem >= 30) {
      cardClass += " warning"; // amarelo
    } else {
      cardClass += " danger"; // podemos criar vermelho depois se quiser
    }

    // Criar card
    const div = document.createElement('div');
    div.className = cardClass;
    div.innerHTML = `
            <div class="candidate-info">
                <strong>${candidato.nomeCandidato}</strong>
                <p>Banco de Talentos Interno</p>
        <a href="#" class="cand-vermais" data-id="${candidato.idCandidato || ''}" data-candidatura="${candidato.idCandidatura || ''}" data-nome="${candidato.nomeCandidato}">Ver Mais</a>
            </div>
            <div class="candidate-score">
                <span>${candidato.porcentagem}%</span>
            </div>
        `;

    container.appendChild(div);
  });
}

function getIdVagaFromContext() {
  const urlParams = new URLSearchParams(window.location.search);
  return (
    urlParams.get('idVaga') ||
    localStorage.getItem('idVaga') ||
    localStorage.getItem('idVagaSelecionada') ||
    null
  );
}

function normalizarPorcentagem(matching) {
  if (matching === null || matching === undefined) return 0;
  const num = Number(matching);
  if (Number.isNaN(num)) return 0;
  if (num <= 1) return Math.round(num * 100);
  if (num > 100) return 100;
  return Math.round(num);
}

async function carregarCandidaturas(idVaga) {
  const container = document.getElementById('all-candidates');
  container.innerHTML = `<p style="text-align:center; color:#888; margin-top:2vh;">Carregando...</p>`;
  try {
    const resp = await fetch(api(`/optimiza/candidaturas/vaga?idVaga=${encodeURIComponent(idVaga)}`));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const lista = Array.isArray(data) ? data : (data?.content || []);
    // Normaliza para o contrato do backend (idCandidatura, idVaga, nomeCandidato, matching, ...)
    const candidatos = lista.map(c => ({
      idCandidatura: c?.idCandidatura ?? null,
      idVaga: c?.idVaga ?? idVaga,
      idCandidato: c?.idCandidato ?? c?.candidato?.id ?? null,
      nomeCandidato: c?.nomeCandidato || c?.candidato?.nome || 'Candidato',
      cargoCandidato: c?.cargoCandidato || c?.candidato?.cargo || '',
      status: c?.status || '',
      porcentagem: normalizarPorcentagem(c?.matching)
    }));
    renderizarCandidatos(candidatos);
  } catch (err) {
    console.error('Erro ao carregar candidaturas:', err);
    container.innerHTML = `<p style="text-align:center; color:#d33; margin-top:2vh;">Erro ao carregar candidatos.</p>`;
  }
}

(function init() {
  const idVaga = getIdVagaFromContext();
  const container = document.getElementById('all-candidates');
  if (!idVaga) {
    container.innerHTML = `<p style="text-align:center; color:#888; margin-top:2vh;">Informe uma vaga para ver os perfis correspondentes.</p>`;
    return;
  }
  carregarCandidaturas(idVaga);
})();

// Estado atual do modal
let currentIdCandidato = null;
let currentIdCandidatura = null;

// Helpers de formatação
function formatarTexto(txt) {
  if (!txt) return '';
  return String(txt).replace(/[-_]/g, ' ').split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
}
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
      return Object.entries(idiomas).map(([lang, lvl]) => `${formatarTexto(lang)} (${String(lvl).toUpperCase()})`).join(', ');
    }
    return String(idiomas);
  } catch { return ''; }
}
function formatarDataISO(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Atualiza UI de rating (Aba Avaliação) com base na média
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
// cache for fetched user names by id to avoid repeated requests
const _userNameCache = {};
async function fetchUserNameById(id) {
  if (!id) return 'Avaliador';
  if (_userNameCache[id]) return _userNameCache[id];
  try {
    const r = await fetch(api(`/optimiza/usuarios/${encodeURIComponent(id)}`));
    if (!r.ok) return 'Avaliador';
    const d = await r.json();
    const name = d?.nome || d?.nomeUsuario || d?.nomeCompleto || d?.nomeAvaliador || 'Avaliador';
    _userNameCache[id] = name;
    return name;
  } catch (e) {
    console.debug('Não foi possível resolver nome do usuário', id, e);
    return 'Avaliador';
  }
}

async function renderHistoricoAvaliacoes(data) {
  const list = document.getElementById('comentarios-list');
  if (!list) return;
  list.innerHTML = '';
  const avals = Array.isArray(data) ? data : (data?.content || []);
  if (!avals.length) {
    list.innerHTML = '<div style="color:#777; font-size:0.95rem;">Não há avaliações registradas.</div>';
    updateRatingUI(0);
    return;
  }
  // Usa a última avaliação para o score do topo
  const ultima = avals[avals.length - 1];
  const mediaUlt = ((Number(ultima.hardSkills) || 0) + (Number(ultima.softSkills) || 0) + (Number(ultima.experiencia) || 0) + (Number(ultima.cultura) || 0)) / 4;
  updateRatingUI(mediaUlt);
  // Renderiza histórico; resolve nomes quando necessário
  for (const a of avals) {
    const media = ((Number(a.hardSkills) || 0) + (Number(a.softSkills) || 0) + (Number(a.experiencia) || 0) + (Number(a.cultura) || 0)) / 4;
    const nomeAvaliador = a.nomeAvaliador || (a.idAvaliador ? await fetchUserNameById(a.idAvaliador) : 'Avaliador');
    const item = document.createElement('div');
    item.className = 'comentario-item';
    item.style.border = '1px solid #eee';
    item.style.borderRadius = '8px';
    item.style.padding = '0.75rem';
    item.style.marginBottom = '0.6rem';
    const dataFormatada = a.dataAvaliacao ? formatarDataISO(a.dataAvaliacao) : '';
    item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <strong>${nomeAvaliador}</strong>
          <span style="color:#666; font-size:0.9rem;">${dataFormatada}</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:0.4rem; font-size:0.9rem; margin-bottom:0.4rem;">
          <span>Hard: <strong>${(Number(a.hardSkills) || 0).toFixed(1)}</strong></span>
          <span>Soft: <strong>${(Number(a.softSkills) || 0).toFixed(1)}</strong></span>
          <span>Exp.: <strong>${(Number(a.experiencia) || 0).toFixed(1)}</strong></span>
          <span>Cultura: <strong>${(Number(a.cultura) || 0).toFixed(1)}</strong></span>
        </div>
        <div style="color:#333; margin-bottom:0.3rem;">Média: <strong>${media.toFixed(1)}</strong></div>
        <div style="white-space:pre-wrap; color:#444;">${a.comentario ? a.comentario : ''}</div>
      `;
    list.appendChild(item);
  }
}

async function carregarHistoricoAvaliacoes(idCandidato) {
  if (!idCandidato) { limparHistorico(); return; }
  try {
    const r = await fetch(api(`/optimiza/avaliacao/historico?idCandidato=${encodeURIComponent(idCandidato)}`));
    // Caso específico: endpoint retorna 404 quando não há avaliações
    if (r.status === 404) {
      const list = document.getElementById('comentarios-list');
      if (list) list.innerHTML = '<div style="color:#777; font-size:0.95rem;">Não tem avaliações pra esse candidato.</div>';
      updateRatingUI(0);
      return;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    await renderHistoricoAvaliacoes(data);
  } catch (e) {
    console.error('Erro ao carregar histórico de avaliações:', e);
    limparHistorico();
    const list = document.getElementById('comentarios-list');
    if (list) list.innerHTML = '<div style="color:#d33;">Erro ao carregar histórico.</div>';
  }
}

// Abre modal e carrega detalhes do candidato
async function abrirModalCandidato(idCandidato, fallbackNome) {
  currentIdCandidato = idCandidato || null;
  // Ativa aba Detalhes
  document.querySelectorAll('.cand-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.cand-panel').forEach(p => p.classList.remove('active'));
  const tabBtn = document.querySelector('.cand-tab[data-tab="detalhes"]');
  const tabPanel = document.getElementById('tab-detalhes');
  if (tabBtn) tabBtn.classList.add('active');
  if (tabPanel) tabPanel.classList.add('active');

  // Limpa campos
  ['cand-nome', 'cand-status', 'det-nivel', 'det-curso', 'det-instituicao', 'det-idiomas', 'det-email', 'det-cargo', 'det-experiencia', 'det-curriculo', 'det-update'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '';
  });

  // Prepara UI da Avaliação
  try { document.getElementById('btn-salvar-avaliacao').style.display = 'none'; } catch (_) { }
  limparHistorico();

  document.getElementById('modal-candidato').style.display = 'flex';

  try {
    if (!idCandidato) {
      document.getElementById('cand-nome').textContent = formatarTexto(fallbackNome || 'Candidato');
      carregarHistoricoAvaliacoes(null);
      return;
    }
    const resp = await fetch(api(`/optimiza/candidatos/${idCandidato}`));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const d = await resp.json();
    document.getElementById('cand-nome').textContent = formatarTexto(d.nome || fallbackNome || 'Candidato');
    document.getElementById('cand-status').textContent = formatarTexto(d.status || '');
    document.getElementById('det-nivel').textContent = formatarTexto(d.nivelFormacao || '');
    document.getElementById('det-curso').textContent = formatarTexto(d.curso || '');
    document.getElementById('det-instituicao').textContent = d.instituicaoEnsino || '';
    document.getElementById('det-cargo').textContent = formatarTexto(d.cargo || '');
    document.getElementById('det-experiencia').textContent = d.experiencia || '';
    document.getElementById('det-curriculo').textContent = d.curriculo || '';
    document.getElementById('det-update').textContent = formatarDataISO(d.dataUpdate);
    document.getElementById('det-idiomas').textContent = formatarIdiomasDetalhes(d.idiomas);
    document.getElementById('det-email').textContent = d.email || '';
    carregarHistoricoAvaliacoes(idCandidato);
  } catch (e) {
    console.error('Erro ao carregar candidato por ID:', e);
    document.getElementById('cand-nome').textContent = formatarTexto(fallbackNome || 'Candidato');
    carregarHistoricoAvaliacoes(idCandidato);
  }
}

// Delegação de clique: "Ver Mais"
document.getElementById('all-candidates').addEventListener('click', function (e) {
  const link = e.target.closest('.cand-vermais');
  if (!link) return;
  e.preventDefault();
  const id = link.getAttribute('data-id');
  const idCand = link.getAttribute('data-candidatura');
  currentIdCandidato = id || null;
  currentIdCandidatura = idCand ? Number(idCand) : null;
  const nome = link.getAttribute('data-nome') || '';
  abrirModalCandidato(id, nome);
});

// Fechar modal e interações de abas
document.getElementById('modal-close')?.addEventListener('click', () => {
  document.getElementById('modal-candidato').style.display = 'none';
});
window.addEventListener('click', (ev) => {
  const overlay = document.getElementById('modal-candidato');
  if (ev.target === overlay) overlay.style.display = 'none';
});
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

// Envio da Avaliação de Entrevista (POST)
document.getElementById('btn-agendar-entrevista')?.addEventListener('click', async () => {
  if (!currentIdCandidatura) {
    Swal.fire({
      icon: 'info',
      title: 'Sem candidatura',
      text: 'Abra pelo Match para avaliar este candidato na vaga.',
      confirmButtonText: 'Ok'
    });
    return;
  }
  const hard = parseFloat(document.getElementById('ent-hard-val')?.value) || 0;
  const soft = parseFloat(document.getElementById('ent-soft-val')?.value) || 0;
  const exp = parseFloat(document.getElementById('ent-exp-val')?.value) || 0;
  const cult = parseFloat(document.getElementById('ent-cultura-val')?.value) || 0;
  const coment = document.getElementById('ent-coment')?.value || '';
  const idAvaliador = Number(localStorage.getItem('idAvaliador') || localStorage.getItem('idUsuario') || 1);
  const payload = {
    idCandidatura: Number(currentIdCandidatura),
    idAvaliador: idAvaliador,
    hardSkills: hard,
    softSkills: soft,
    experiencia: exp,
    cultura: cult,
    comentario: coment
  };

  const aprovadoSwitch = document.getElementById('aprovado-switch');
  const aprovado = !!(aprovadoSwitch && aprovadoSwitch.checked);
  const url = api(`/optimiza/avaliacao/avaliar?aprovado=${aprovado ? 'true' : 'false'}`);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    Swal.fire({
      icon: 'success',
      title: 'Avaliação enviada',
      text: 'Sua avaliação foi registrada com sucesso.',
      timer: 1800,
      showConfirmButton: false
    });
    // Limpa campos e atualiza histórico
    ['ent-hard-val', 'ent-soft-val', 'ent-exp-val', 'ent-cultura-val'].forEach(id => { const el = document.getElementById(id); if (el) el.value = '0'; });
    // reset stars and scores
    [
      ['ent-hard-stars', 'ent-hard-score'],
      ['ent-soft-stars', 'ent-soft-score'],
      ['ent-exp-stars', 'ent-exp-score'],
      ['ent-cultura-stars', 'ent-cultura-score']
    ].forEach(([cid, sid]) => {
      const cont = document.getElementById(cid);
      const score = document.getElementById(sid);
      if (cont) cont.querySelectorAll('.rating-star').forEach(st => st.classList.remove('active'));
      if (score) score.textContent = '0.0';
    });
    const comentEl = document.getElementById('ent-coment'); if (comentEl) comentEl.value = '';
    // Reseta o switch para Não (segurança)
    if (aprovadoSwitch) aprovadoSwitch.checked = false;
    if (currentIdCandidato) carregarHistoricoAvaliacoes(currentIdCandidato);
  } catch (e) {
    console.error('Falha ao enviar avaliação de entrevista:', e);
    Swal.fire({
      icon: 'error',
      title: 'Erro ao enviar',
      text: 'Não foi possível enviar a avaliação agora.',
      confirmButtonText: 'Tentar novamente'
    });
  }
});

// Binding estrelas por critério na Entrevista
function bindStarGroup(containerId, hiddenId, scoreId) {
  const cont = document.getElementById(containerId);
  const hidden = document.getElementById(hiddenId);
  const score = document.getElementById(scoreId);
  if (!cont || !hidden) return;
  cont.addEventListener('click', (e) => {
    const btn = e.target.closest('.rating-star');
    if (!btn) return;
    const val = Number(btn.dataset.value);
    hidden.value = val.toFixed(1);
    if (score) score.textContent = hidden.value;
    cont.querySelectorAll('.rating-star').forEach(st => {
      st.classList.toggle('active', Number(st.dataset.value) <= val);
    });
  });
}
bindStarGroup('ent-hard-stars', 'ent-hard-val', 'ent-hard-score');
bindStarGroup('ent-soft-stars', 'ent-soft-val', 'ent-soft-score');
bindStarGroup('ent-exp-stars', 'ent-exp-val', 'ent-exp-score');
bindStarGroup('ent-cultura-stars', 'ent-cultura-val', 'ent-cultura-score');

// Switch de aprovação não requer bind adicional; o estado é lido no envio.