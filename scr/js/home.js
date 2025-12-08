 // Exibe o nome do usuário salvo no localStorage ao lado da foto de perfil
    window.addEventListener('DOMContentLoaded', function () {
      var nomeUsuario = localStorage.getItem('nomeUsuario');
      if (nomeUsuario) {
        document.getElementById('profile-name').textContent = nomeUsuario;
      }
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
          try {
            // Limpa chaves de sessão mais comuns
            ['nomeUsuario', 'idAreaUsuario', 'nomeAreaUsuario', 'idVaga', 'idVagaSelecionada', 'nomeVaga', 'token']
              .forEach(k => localStorage.removeItem(k));
          } catch (e) { /* ignore */ }
          window.location.href = 'Index.html';
        });
      }
    });

  // Global KPI filter state (defaults to current year and stored user id)
  window.kpiFilter = {
    userId: Number(localStorage.getItem('idUsuario') || localStorage.getItem('idAvaliador')) || 3,
    inicio: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10),
    fim: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0,10)
  };

// Renderiza gráfico de volume de vagas por mês (ApexCharts)
async function renderVagasPorMesChart() {
  const chartEl = document.querySelector('#chart');
  if (!chartEl) return;

  // Use filter state (set by the filter UI) or defaults
  const userId = window.kpiFilter.userId;
  const inicio = window.kpiFilter.inicio;
  const fim = window.kpiFilter.fim;
  const url = api(`/optimiza/data/vagas/volume-por-mes?userId=${encodeURIComponent(userId)}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`);

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Espera array de objetos { Mes: 'YYYY-MM', Total: number }
    // Inicializa mapa com 12 meses do ano
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const totals = new Array(12).fill(0);

    (Array.isArray(data) ? data : (data?.content || [])).forEach(item => {
      const mes = String(item.Mes || item.mes || '');
      // mes esperado '2025-01' ou 'YYYY-MM'
      const match = mes.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const monthIndex = Number(match[2]) - 1;
        if (monthIndex >=0 && monthIndex < 12) totals[monthIndex] = Number(item.Total ?? item.total ?? 0);
      }
    });

    const options = {
      series: [{ name: 'Vagas', data: totals }],
      chart: { height: 350, type: 'bar' },
      plotOptions: { bar: { borderRadius: 6, dataLabels: { position: 'top' } } },
      dataLabels: { enabled: true, formatter: function (val) { return String(val); }, offsetY: -20, style: { fontSize: '12px', colors: ["#304758"] } },
      xaxis: { categories: monthNames, position: 'top', axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: true } },
      yaxis: { labels: { formatter: function (val) { return String(val); } } },
      title: { text: 'Vagas por mês (2025)', floating: false, align: 'center', style: { color: '#444' } }
    };

    // Remove chart children if re-rendering
    chartEl.innerHTML = '';
    const chart = new ApexCharts(chartEl, options);
    chart.render();
  } catch (e) {
    console.error('Erro ao carregar dados do gráfico de vagas por mês:', e);
    chartEl.innerHTML = '<div style="color:#d33; padding:1rem;">Não foi possível carregar o gráfico.</div>';
  }
}

// Renderiza ao carregar a página
document.addEventListener('DOMContentLoaded', function () { renderVagasPorMesChart(); });

// Renderiza KPIs (faz chamadas paralelas e popula os campos)
async function renderKPIs() {
  const userId = window.kpiFilter.userId;
  const inicio = window.kpiFilter.inicio;
  const fim = window.kpiFilter.fim;

  const urls = {
    fracassadas: api(`/optimiza/data/vagas/fracassadas?userId=${encodeURIComponent(userId)}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`),
    mediaMatching: api(`/optimiza/data/candidaturas/media-matching?userId=${encodeURIComponent(userId)}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`),
    mediaReprovacao: api(`/optimiza/data/avaliacoes/media-reprovacao?userId=${encodeURIComponent(userId)}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`)
  };

  try {
    const [rFrac, rMatch, rReprov] = await Promise.all([
      fetch(urls.fracassadas),
      fetch(urls.mediaMatching),
      fetch(urls.mediaReprovacao)
    ]);

    const [dFrac, dMatch, dReprov] = await Promise.all([
      rFrac.ok ? rFrac.json().catch(()=>[]) : [],
      rMatch.ok ? rMatch.json().catch(()=>[]) : [],
      rReprov.ok ? rReprov.json().catch(()=>[]) : []
    ]);

    const extractNumber = (data) => {
      const arr = Array.isArray(data) ? data : (data?.content || []);
      if (!arr || arr.length === 0) return 0;
      // If objects contain Total/total, sum them
      if (arr.every(it => it && (it.Total !== undefined || it.total !== undefined))) {
        return arr.reduce((s,it) => s + Number(it.Total ?? it.total ?? 0), 0);
      }
      // If first entry has named numeric fields like media, Media, valor
      const first = arr[0];
      if (first.media !== undefined || first.Media !== undefined || first.valor !== undefined || first.valorMedio !== undefined) {
        return Number(first.media ?? first.Media ?? first.valor ?? first.valorMedio ?? 0);
      }
      // If map of counts per month, sum numeric values
      const numericValues = Object.values(first).filter(v => typeof v === 'number');
      if (numericValues.length) return numericValues.reduce((s,n)=>s+Number(n),0);
      return 0;
    };

    const fracassadas = extractNumber(dFrac);
    const mediaMatching = extractNumber(dMatch);

    // Calcula menor média entre HardSkills, SoftSkills, Experiência, Cultura
    let menorMediaValor = 0;
    let menorMediaLabel = '';
    try {
      const arr = Array.isArray(dReprov) ? dReprov : (dReprov?.content || []);
      const fonte = Array.isArray(arr) && arr.length > 0 ? arr[0] : (typeof dReprov === 'object' ? dReprov : null);
      if (fonte) {
        const mapa = {
          'Hard Skills': Number(fonte.HardSkills ?? fonte.hardSkills ?? NaN),
          'Soft Skills': Number(fonte.SoftSkills ?? fonte.softSkills ?? NaN),
          'Experiência': Number(fonte.Experiencia ?? fonte.experiencia ?? NaN),
          'Cultura': Number(fonte.Cultura ?? fonte.cultura ?? NaN)
        };
        // Filtra apenas valores numéricos válidos
        const entradas = Object.entries(mapa).filter(([,v]) => Number.isFinite(v));
        if (entradas.length) {
          entradas.sort((a,b) => a[1] - b[1]);
          menorMediaLabel = entradas[0][0];
          menorMediaValor = entradas[0][1];
        }
      }
    } catch { }

    const elFrac = document.getElementById('kpi-fracassadas');
    const elMatch = document.getElementById('kpi-matching');
    const elReprov = document.getElementById('kpi-reprovacao');
    const elReprovLabel = document.getElementById('kpi-reprovacao-label');

    if (elFrac) elFrac.textContent = String(fracassadas);
    if (elMatch) elMatch.textContent = (Number(mediaMatching)*100 || 0).toFixed(1) + '%';
    if (elReprov) {
      if (menorMediaLabel) {
        // Mostra a nota e atualiza o título com a skill
        elReprov.textContent = `${Number(menorMediaValor).toFixed(1)}`;
        if (elReprovLabel) elReprovLabel.textContent = `Principal reprovação: ${menorMediaLabel}`;
      } else {
        elReprov.textContent = '--';
        if (elReprovLabel) elReprovLabel.textContent = 'Principal reprovação';
      }
    }

  } catch (e) {
    console.error('Erro ao carregar KPIs:', e);
    document.getElementById('kpi-fracassadas').textContent = '--';
    document.getElementById('kpi-matching').textContent = '--';
    document.getElementById('kpi-reprovacao').textContent = '--';
  }
}

// Chama KPIs junto com a renderização do gráfico
document.addEventListener('DOMContentLoaded', function () { renderKPIs(); });

// Initialize KPI filter UI and wire events
function initKpiFilterUI() {
  const btn = document.getElementById('kpi-filter-btn');
  const popup = document.getElementById('kpi-filter-popup');
  const inputInicio = document.getElementById('kpi-inicio');
  const inputFim = document.getElementById('kpi-fim');
  const apply = document.getElementById('kpi-filter-apply');
  const cancel = document.getElementById('kpi-filter-cancel');
  if (!btn || !popup || !inputInicio || !inputFim || !apply || !cancel) return;

  // set initial values
  inputInicio.value = window.kpiFilter.inicio;
  inputFim.value = window.kpiFilter.fim;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    popup.classList.toggle('open');
  });

  cancel.addEventListener('click', function () { popup.classList.remove('open'); });

  apply.addEventListener('click', function () {
    const valInicio = inputInicio.value;
    const valFim = inputFim.value;
    if (!valInicio || !valFim) {
      alert('Selecione as duas datas do período.');
      return;
    }
    // update filter state and re-render
    window.kpiFilter.inicio = valInicio;
    window.kpiFilter.fim = valFim;
    popup.classList.remove('open');
    renderVagasPorMesChart();
    renderKPIs();
  });

  // close popup when clicking outside
  document.addEventListener('click', function (ev) {
    if (!popup.contains(ev.target) && ev.target !== btn) popup.classList.remove('open');
  });
}

// initialize filter UI after DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () { initKpiFilterUI(); });