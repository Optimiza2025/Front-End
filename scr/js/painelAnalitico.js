// Painel Analítico - Script principal
// Fallback api() helper caso api.js não carregue
if (typeof api === 'undefined') {
    function api(path) {
        const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8080'
            : 'https://optimiza-api.com';
        return base + path;
    }
}

// Definir data padrão (últimos 30 dias)
function setDefaultDates() {
    const hoje = new Date();
    // intervalo padrão: último ano (hoje - 1 ano até hoje)
    const umAnoAtras = new Date(hoje);
    umAnoAtras.setFullYear(hoje.getFullYear() - 1);

    // Preenche os inputs de data com os objetos Date
    const inputFim = document.getElementById('data-fim');
    const inputInicio = document.getElementById('data-inicio');
    if (inputFim) inputFim.valueAsDate = hoje;
    if (inputInicio) inputInicio.valueAsDate = umAnoAtras;
}

// Formata datas para ISO (YYYY-MM-DD)
function formatDateISO(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Obtém range de datas dos inputs
function getDateRange() {
    const inicio = document.getElementById('data-inicio').value;
    const fim = document.getElementById('data-fim').value;
    return { inicio, fim };
}

// ====================
// GRÁFICO 1: VISÃO VAGAS POR ÁREA
// ====================
let chartVagasArea = null;

async function carregarVagasPorArea() {
    try {
        const { inicio, fim } = getDateRange();
        const url = api(`/optimiza/data/rh/vagas/volume-global?inicio=${inicio}&fim=${fim}`);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Falha ao buscar vagas por área');
        
        const dados = await resp.json();
        
        // Formato real: [{"Mes":"2025-11","Area":"Recursos Humanos","Status":"ativa","Total":1}]
        // Agrupa por área e status
        const areaMap = {};
        
        if (Array.isArray(dados)) {
            dados.forEach(item => {
                const area = item.Area || 'Sem Nome';
                const status = (item.Status || '').toLowerCase();
                const total = item.Total || 0;
                
                if (!areaMap[area]) {
                    areaMap[area] = { abertas: 0, encerradas: 0 };
                }
                
                if (status === 'ativa' || status === 'aberta') {
                    areaMap[area].abertas += total;
                } else if (status === 'encerrada' || status === 'concluida' || status === 'concluída') {
                    areaMap[area].encerradas += total;
                }
            });
        }
        
        const categorias = Object.keys(areaMap);
        const vagasEncerradas = categorias.map(area => areaMap[area].encerradas);
        const vagasAbertas = categorias.map(area => areaMap[area].abertas);
        
        const options = {
            series: [
                { name: 'Vagas Encerradas', data: vagasEncerradas },
                { name: 'Vagas Abertas', data: vagasAbertas }
            ],
            chart: {
                type: 'bar',
                height: '100%',
                toolbar: { show: false }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                }
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            xaxis: {
                categories: categorias,
                labels: { style: { colors: '#032656', fontSize: '12px' } }
            },
            yaxis: {
                title: { text: 'Quantidade de Vagas', style: { color: '#032656', fontSize: '13px', fontWeight: 600 } },
                labels: { style: { colors: '#032656' } }
            },
            fill: { opacity: 1 },
            colors: ['#6C63FF', '#032656'],
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + ' vagas';
                    }
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'center',
                labels: { colors: '#032656' }
            }
        };
        
        if (chartVagasArea) chartVagasArea.destroy();
        chartVagasArea = new ApexCharts(document.querySelector('#chart-vagas-area'), options);
        chartVagasArea.render();
    } catch (err) {
        console.error('Erro ao carregar vagas por área:', err);
    }
}

// ====================
// GRÁFICO 2: CAUSA REPROVAÇÃO CANDIDATO
// ====================
let chartReprovacao = null;

async function carregarCausaReprovacao() {
    try {
        const { inicio, fim } = getDateRange();
        const url = api(`/optimiza/data/rh/avaliacoes/media-reprovacao-global?inicio=${inicio}&fim=${fim}`);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Falha ao buscar causas de reprovação');
        
        const dados = await resp.json();
        
        // Formato real: [{"HardSkills":0.0,"SoftSkills":0.0,"Experiencia":0.0,"Cultura":0.0}]
        let labels = ['Hard Skills', 'Soft Skills', 'Experiência', 'Cultura'];
        let valores = [0, 0, 0, 0];
        
        if (Array.isArray(dados) && dados.length > 0) {
            const item = dados[0];
            valores = [
                item.HardSkills || 0,
                item.SoftSkills || 0,
                item.Experiencia || 0,
                item.Cultura || 0
            ];
        } else if (dados.HardSkills !== undefined) {
            // Caso seja um objeto direto
            valores = [
                dados.HardSkills || 0,
                dados.SoftSkills || 0,
                dados.Experiencia || 0,
                dados.Cultura || 0
            ];
        }
        
        const options = {
            series: [{ name: 'Média Reprovação', data: valores }],
            chart: {
                type: 'bar',
                height: '100%',
                toolbar: { show: false },
                width: '100%',
                offsetX: -10
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                }
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            xaxis: {
                categories: labels,
                labels: {
                    style: { colors: '#032656', fontSize: '11px' },
                    formatter: function(val) {
                        // Para rótulos compostos, quebrar em duas linhas na primeira ocorrência de espaço
                        if (typeof val === 'string' && val.includes(' ')) {
                            const idx = val.indexOf(' ');
                            return val.slice(0, idx) + "\n" + val.slice(idx + 1);
                        }
                        return val;
                    }
                }
            },
            yaxis: {
                title: { text: 'Média de Reprovação', style: { color: '#032656', fontSize: '13px', fontWeight: 600 } },
                labels: { 
                    style: { colors: '#032656' },
                    formatter: function(val) {
                        return val.toFixed(1);
                    }
                }
            },
            fill: { opacity: 1 },
            colors: ['#6C63FF'],
            grid: {
                padding: { left: 0, right: 0 }
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val.toFixed(2);
                    }
                }
            }
        };
        
        if (chartReprovacao) chartReprovacao.destroy();
        chartReprovacao = new ApexCharts(document.querySelector('#chart-reprovacao'), options);
        chartReprovacao.render();
    } catch (err) {
        console.error('Erro ao carregar causas de reprovação:', err);
    }
}

// ====================
// GRÁFICO 3: QUALIFICAÇÃO BANCO DE TALENTOS
// ====================
let chartQualificacao = null;

async function carregarQualificacaoBT() {
    try {
        const { inicio, fim } = getDateRange();
        const url = api(`/optimiza/data/rh/candidatos/perfil-academico?inicio=${inicio}&fim=${fim}`);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Falha ao buscar qualificação do banco de talentos');
        
        const dados = await resp.json();
        
        // Formato real: [] (array vazio ou com estrutura similar ao de vagas)
        // Se vier vazio, mostra gráfico sem dados
        let labels = [];
        let valores = [];

        // Normaliza/formatar nomes de qualificações
        function formatNivel(nomeRaw) {
            if (!nomeRaw) return 'Não Informado';
            const sOrig = String(nomeRaw).trim();
            // Normaliza: minúsculas, remove acentos, troca separadores por espaço e colapsa múltiplos espaços
            const sNorm = sOrig
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[_.-]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            // Mapeamento sem acentos (chaves normalizadas)
            const map = {
                'fundamental completo': 'Fundamental Completo',
                'fundamental incompleto': 'Fundamental Incompleto',
                'medio completo': 'Médio Completo',
                'medio incompleto': 'Médio Incompleto',
                '2º medio completo': '2º Médio Completo',
                '2º medio incompleto': '2º Médio Incompleto',
                '2o medio completo': '2º Médio Completo',
                '2o medio incompleto': '2º Médio Incompleto',
                'segundo medio completo': '2º Médio Completo',
                'segundo medio incompleto': '2º Médio Incompleto',
                'superior cursando': 'Superior Cursando',
                'superior completo': 'Superior Completo',
                'pos graduacao': 'Pós-graduação',
                'pos graduacao completa': 'Pós-graduação',
                'pos graduacao incompleta': 'Pós-graduação',
                'pos graduacao latu sensu': 'Pós-graduação',
                'pos graduacao stricto sensu': 'Pós-graduação',
                'pos graduacao lato sensu': 'Pós-graduação',
                'pos graduacao stricto': 'Pós-graduação',
                'pos graduacao pos': 'Pós-graduação',
                'pos graduacao academica': 'Pós-graduação',
                'mestrado': 'Mestrado',
                'doutorado': 'Doutorado',
                'licenciado': 'Licenciado',
                'graduacao': 'Graduação',
                'graduacao completa': 'Graduação',
                'graduacao incompleta': 'Graduação',
                'certificado': 'Certificado',
                'bilingue': 'Bilíngue',
                'bilinque': 'Bilíngue',
                'bilingue fluente': 'Bilíngue'
            };
            if (map[sNorm]) return map[sNorm];
            // Title Case mantendo acentos do original quando possível
            const cleaned = sOrig.replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
            return cleaned.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
        }

        // Abreviações para labels longas
        function abreviarNivel(nomeFmt) {
            const map = {
                'Fundamental Completo': 'Fund. Comp.',
                'Fundamental Incompleto': 'Fund. Incomp.',
                'Médio Completo': 'Méd. Comp.',
                'Médio Incompleto': 'Méd. Incomp.',
                '2º Médio Completo': '2º Méd. Comp.',
                '2º Médio Incompleto': '2º Méd. Incomp.',
                'Superior Cursando': 'Sup. Curs.',
                'Superior Completo': 'Sup. Comp.',
                'Pós-graduação': 'Pós-grad.',
                'Mestrado': 'Mestr.',
                'Doutorado': 'Dout.',
                'Licenciado': 'Licenc.',
                'Graduação': 'Grad.',
                'Certificado': 'Cert.',
                'Bilíngue': 'Bilíng.'
            };
            if (map[nomeFmt]) return map[nomeFmt];
            // Abrevia heurística: encurta palavras maiores que 10 caracteres
            return nomeFmt.split(' ').map(p => p.length > 10 ? p.slice(0, 10) + '.' : p).join(' ');
        }
        
        if (Array.isArray(dados) && dados.length > 0) {
            // Tenta extrair informações se houver estrutura
            // Pode ter campos como: Formacao, NivelFormacao, Total, etc.
            const nivelMap = {};
            
            dados.forEach(item => {
                const nivel = item.NivelFormacao || item.Formacao || item.Nivel || 'Não Informado';
                const total = item.Total || item.Quantidade || 1;
                
                if (!nivelMap[nivel]) {
                    nivelMap[nivel] = 0;
                }
                nivelMap[nivel] += total;
            });
            
            labels = Object.keys(nivelMap).map(formatNivel);
            // Recalcular valores após formatação agregando por label formatado
            const agg = {};
            Object.keys(nivelMap).forEach(k => {
                const fk = formatNivel(k);
                agg[fk] = (agg[fk] || 0) + (nivelMap[k] || 0);
            });
            valores = labels.map(l => agg[l] || 0);
            // Aplicar abreviação nas labels para exibição
            labels = labels.map(abreviarNivel);
        }
        
        // Se não houver dados, mostra labels padrão com zeros
        if (labels.length === 0) {
            labels = ['Grad.', 'Cert.', 'Licenc.', 'Bilíng.', 'Pós-grad.', 'Mestr.'];
            valores = [0, 0, 0, 0, 0, 0];
        }
        
        const options = {
            series: [{ name: 'Candidatos', data: valores }],
            chart: {
                type: 'bar',
                height: '100%',
                toolbar: { show: false },
                width: '100%',
                offsetX: -10
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    endingShape: 'rounded'
                }
            },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            xaxis: {
                categories: labels,
                labels: { style: { colors: '#032656', fontSize: '11px' } }
            },
            yaxis: {
                title: { text: 'Quantidade', style: { color: '#032656', fontSize: '13px', fontWeight: 600 } },
                labels: { style: { colors: '#032656' } }
            },
            fill: { opacity: 1 },
            colors: ['#6C63FF'],
            grid: {
                padding: { left: 0, right: 0 }
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + ' candidatos';
                    }
                }
            }
        };
        
        if (chartQualificacao) chartQualificacao.destroy();
        chartQualificacao = new ApexCharts(document.querySelector('#chart-qualificacao'), options);
        chartQualificacao.render();
    } catch (err) {
        console.error('Erro ao carregar qualificação banco de talentos:', err);
    }
}

// ====================
// KPIs
// ====================
async function carregarKPIs() {
    const { inicio, fim } = getDateRange();
    
    // KPI 1: Tempo Médio de Conclusão Vaga
    // Formato real: [] (array vazio)
    try {
        const url = api(`/optimiza/data/rh/kpi/tempo-medio-contratacao?inicio=${inicio}&fim=${fim}`);
        const resp = await fetch(url);
        if (resp.ok) {
            const dados = await resp.json();
            let valor = 0;
            
            if (Array.isArray(dados) && dados.length > 0) {
                valor = dados[0].MediaDias || dados[0].Valor || dados[0].Total || 0;
            } else if (dados.MediaDias !== undefined) {
                valor = dados.MediaDias;
            }
            
            document.getElementById('kpi-tempo-conclusao').textContent = Math.round(valor);
        }
    } catch (err) {
        console.error('Erro ao buscar tempo médio contratação:', err);
        document.getElementById('kpi-tempo-conclusao').textContent = '--';
    }
    
    // KPI 2: Vagas Encerradas Sem Contratação (Fracassadas)
    // Formato real: {"TotalFracassadas":0}
    try {
        const url = api(`/optimiza/data/rh/vagas/fracassadas-global?inicio=${inicio}&fim=${fim}`);
        const resp = await fetch(url);
        if (resp.ok) {
            const dados = await resp.json();
            const valor = dados.TotalFracassadas ?? dados.total ?? dados.Total ?? 0;
            document.getElementById('kpi-vagas-fracassadas').textContent = valor;
        }
    } catch (err) {
        console.error('Erro ao buscar vagas fracassadas:', err);
        document.getElementById('kpi-vagas-fracassadas').textContent = '--';
    }
    
    // KPI 3: Currículos Avaliados
    // Formato real: [] (array vazio)
    try {
        const url = api(`/optimiza/data/rh/candidaturas/volume-global?inicio=${inicio}&fim=${fim}`);
        const resp = await fetch(url);
        if (resp.ok) {
            const dados = await resp.json();
            let valor = 0;
            
            if (Array.isArray(dados)) {
                // Soma todos os totais do array
                valor = dados.reduce((acc, item) => acc + (item.Total || item.Quantidade || 0), 0);
            } else if (dados.total !== undefined || dados.Total !== undefined) {
                valor = dados.total || dados.Total;
            }
            
            document.getElementById('kpi-curriculos-avaliados').textContent = valor;
        }
    } catch (err) {
        console.error('Erro ao buscar currículos avaliados:', err);
        document.getElementById('kpi-curriculos-avaliados').textContent = '--';
    }
    
    // KPI 4: Tempo Médio Aproveitamento BT (Recência Banco)
    // Formato real: {"MediaDiasSemAtualizar":105.0}
    try {
        const url = api(`/optimiza/data/rh/kpi/recencia-banco`);
        const resp = await fetch(url);
        if (resp.ok) {
            const dados = await resp.json();
            const valor = dados.MediaDiasSemAtualizar ?? dados.MediaDias ?? dados.Recencia ?? 0;
            document.getElementById('kpi-recencia-banco').textContent = Math.round(valor);
        }
    } catch (err) {
        console.error('Erro ao buscar recência banco:', err);
        document.getElementById('kpi-recencia-banco').textContent = '--';
    }
}

// ====================
// EXPORTAR DADOS
// ====================
async function exportarDados() {
    try {
        const confirmacao = await Swal.fire({
            icon: 'question',
            title: 'Exportar dados?',
            text: 'Será gerado um arquivo CSV com os dados atuais do painel.',
            showCancelButton: true,
            confirmButtonText: 'Exportar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacao.isConfirmed) return;

        // Coletar dados atuais dos gráficos e KPIs
        const { inicio, fim } = getDateRange();
        const periodStr = `Periodo;${inicio};${fim}`;

        // Helper para CSV escape
        function toCSVRow(arr) {
            return arr.map(v => {
                if (v == null) return '';
                const s = String(v);
                // Escapar ponto e vírgula e aspas
                const needsQuotes = /[;"\n]/.test(s);
                const escaped = s.replace(/"/g, '""');
                return needsQuotes ? `"${escaped}"` : escaped;
            }).join(';');
        }

        const linhas = [];
        linhas.push(['Painel Analítico - Optimiza']);
        linhas.push([periodStr]);
        linhas.push(['']);

        // KPIs
        try {
            const tempoConclusao = document.getElementById('kpi-tempo-conclusao')?.textContent || '';
            const vagasFracassadas = document.getElementById('kpi-vagas-fracassadas')?.textContent || '';
            const curriculosAvaliados = document.getElementById('kpi-curriculos-avaliados')?.textContent || '';
            const recenciaBanco = document.getElementById('kpi-recencia-banco')?.textContent || '';
            linhas.push(['KPIs']);
            linhas.push(toCSVRow(['Tempo Médio de Conclusão Vaga (Dias)', tempoConclusao]).split('\n'));
            linhas.push(toCSVRow(['Vagas Encerradas Sem Contratação', vagasFracassadas]).split('\n'));
            linhas.push(toCSVRow(['Currículos Avaliados', curriculosAvaliados]).split('\n'));
            linhas.push(toCSVRow(['Tempo Médio Aproveitamento BT (Dias)', recenciaBanco]).split('\n'));
            linhas.push(['']);
        } catch {}

        // Gráfico: Vagas por Área
        if (chartVagasArea) {
            const opts = chartVagasArea.w?.config || chartVagasArea.opts || {};
            const cats = opts.xaxis?.categories || [];
            const enc = (opts.series?.[0]?.data) || [];
            const ab = (opts.series?.[1]?.data) || [];
            linhas.push(['Vagas por Área']);
            linhas.push(toCSVRow(['Área', 'Vagas Encerradas', 'Vagas Abertas']).split('\n'));
            for (let i = 0; i < cats.length; i++) {
                linhas.push(toCSVRow([cats[i], enc[i] ?? 0, ab[i] ?? 0]).split('\n'));
            }
            linhas.push(['']);
        }

        // Gráfico: Causa Reprovação
        if (chartReprovacao) {
            const opts = chartReprovacao.w?.config || chartReprovacao.opts || {};
            const cats = opts.xaxis?.categories || [];
            const vals = (opts.series?.[0]?.data) || [];
            linhas.push(['Causa Reprovação Candidato']);
            linhas.push(toCSVRow(['Causa', 'Média']).split('\n'));
            for (let i = 0; i < cats.length; i++) {
                linhas.push(toCSVRow([cats[i], vals[i] ?? 0]).split('\n'));
            }
            linhas.push(['']);
        }

        // Gráfico: Qualificação Banco de Talentos
        if (chartQualificacao) {
            const opts = chartQualificacao.w?.config || chartQualificacao.opts || {};
            const cats = opts.xaxis?.categories || [];
            const vals = (opts.series?.[0]?.data) || [];
            linhas.push(['Qualificação Banco de Talentos']);
            linhas.push(toCSVRow(['Qualificação', 'Quantidade']).split('\n'));
            for (let i = 0; i < cats.length; i++) {
                linhas.push(toCSVRow([cats[i], vals[i] ?? 0]).split('\n'));
            }
            linhas.push(['']);
        }

        // Montar CSV final
        const csv = linhas
            .map(l => Array.isArray(l) ? l.join(';') : l)
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const hoje = new Date();
        const nomeArquivo = `painel_analitico_${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}.csv`;
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire({
            icon: 'success',
            title: 'CSV gerado',
            text: 'Download iniciado com sucesso.',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (err) {
        console.error('Erro ao exportar:', err);
        Swal.fire({ icon: 'error', title: 'Erro ao exportar', text: 'Tente novamente em instantes.' });
    }
}

// ====================
// CARREGAR TODOS OS DADOS
// ====================
async function carregarTodosPaineis() {
    await Promise.all([
        carregarVagasPorArea(),
        carregarCausaReprovacao(),
        carregarQualificacaoBT(),
        carregarKPIs()
    ]);
}

// ====================
// INICIALIZAÇÃO
// ====================
document.addEventListener('DOMContentLoaded', function() {
    setDefaultDates();
    carregarTodosPaineis();
    
    // Botão de filtrar
    document.getElementById('btn-filtrar').addEventListener('click', function() {
        carregarTodosPaineis();
    });
    
    // Botão de exportar
    document.getElementById('btn-exportar').addEventListener('click', exportarDados);
});
