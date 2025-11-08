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
                ['nomeUsuario', 'idAreaUsuario', 'nomeAreaUsuario', 'idVaga', 'idVagaSelecionada', 'nomeVaga', 'token']
                    .forEach(k => localStorage.removeItem(k));
            } catch (e) { }
            window.location.href = 'Index.html';
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.querySelector('.btn-languages');
    const languagesContainer = document.querySelector('.languages-block').parentNode;

    addButton.addEventListener('click', () => {
        // cria um novo bloco de idiomas
        const newBlock = document.createElement('div');
        newBlock.classList.add('languages-block');

        newBlock.innerHTML = `
            <div class="form-group">
                <label>Idiomas</label>
                <input type="text" name="languages[]">
            </div>
            <div class="form-group">
                <label>Nível do Idioma</label>
                <select name="languagesLevel[]">
                    <option value=""></option>
                    <option value="A1">A1 - BÁSICO INICIANTE</option>
                    <option value="A2">A2 - BÁSICO INTERMEDIÁRIO</option>
                    <option value="B1">B1 - FALANTE INDEPENDENTE BÁSICO</option>
                    <option value="B2">B2 - FALANTE INDEPENDENTE AVANÇADO</option>
                    <option value="C1">C1 - PROFICIENTE AVANÇADO</option>
                    <option value="C2">C2 - DOMÍNIO PLENO</option>
                </select>
            </div>
            <div class="languages-button">
                <button class="btn-remove" type="button">×</button>
            </div>
        `;

        // Os inputs têm name="languages[]" e name="languagesLevel[]" para facilitar o envio como arrays no back-end.

        // adiciona o novo bloco antes do botão principal
        languagesContainer.insertBefore(newBlock, addButton.closest('.languages-block').nextSibling);

        // adiciona evento para remover o bloco se clicar no "x"
        const removeBtn = newBlock.querySelector('.btn-remove');
        removeBtn.addEventListener('click', () => {
            newBlock.remove();
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;

    // helper: encontra ou cria <small class="error"> dentro do mesmo form-group
    function getErrorEl(field) {
        if (!field) return null;
        const parent = field.parentElement || field;
        let existing = parent.querySelector('small.error');
        if (existing) return existing;

        if (field.id) {
            const byId = document.getElementById('error-' + field.id);
            if (byId) return byId;
        }

        const small = document.createElement('small');
        small.className = 'error';
        small.id = 'error-' + (field.id || Math.random().toString(36).slice(2, 7));
        parent.appendChild(small);
        return small;
    }

    function setError(field, message) {
        if (!field) return;
        const err = getErrorEl(field);
        if (!err) return;
        err.textContent = message;
        err.style.color = '#d32f2f';
        err.style.display = 'block';
        field.classList.add('input-error');
    }

    function clearError(field) {
        if (!field) return;
        const parent = field.parentElement || field;
        const existing = parent.querySelector('small.error');
        if (existing) existing.textContent = '';
        field.classList.remove('input-error');
    }

    // limpa tudo
    function clearAllErrors() {
        form.querySelectorAll('small.error').forEach(s => s.textContent = '');
        form.querySelectorAll('.input-error').forEach(i => i.classList.remove('input-error'));
    }

    // adiciona listeners para limpar erro quando o usuário digitar/mudar
    ['jobTitle', 'position', 'experience', 'levelDegree', 'education', 'degree', 'languages', 'languagesLevel', 'keywords'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const event = el.tagName.toLowerCase() === 'select' ? 'change' : 'input';
        el.addEventListener(event, () => clearError(el));
    });

    // valida os campos
    function validate() {
        clearAllErrors();

        const jobTitle = document.getElementById('jobTitle');
        const position = document.getElementById('position');
        const experience = document.getElementById('experience');
        const levelDegree = document.getElementById('levelDegree');
        const education = document.getElementById('education'); // não obrigatório
        const degree = document.getElementById('degree');
        const languages = document.getElementById('languages');
        const languagesLevel = document.getElementById('languagesLevel');
        const keywords = document.getElementById('keywords');

        let valid = true;

        if (!jobTitle.value.trim()) {
            setError(jobTitle, 'Título da Vaga é obrigatório.');
            valid = false;
        }

        if (!position.value.trim()) {
            setError(position, 'Cargo é obrigatório.');
            valid = false;
        }

        if (!experience.value.trim()) {
            setError(experience, 'Experiência é obrigatória.');
            valid = false;
        }

        if (!levelDegree.value.trim()) {
            setError(levelDegree, 'Nível de Graduação é obrigatório.');
            valid = false;
        }

        if (!degree.value.trim()) {
            setError(degree, 'Formação é obrigatória.');
            valid = false;
        }

        if (languages.value.trim() && !languagesLevel.value.trim()) {
            setError(languagesLevel, 'Se informar um idioma, o nível é obrigatório.');
            valid = false;
        }

        if (!keywords.value.trim()) {
            setError(keywords, 'Palavras-Chave são obrigatórias. Separe por vírgula, ponto e vírgula ou por linha.');
            valid = false;
        }

        return valid;
    }

    window.validateVagaForm = validate;

    form.addEventListener('submit', (e) => {
        if (!validate()) {
            e.preventDefault();
        }
    });
});

// ==== Funções de mapeamento e idiomas (novas) ==== //
function mapCargo(cargo) {
    if (!cargo) return '';
    cargo = cargo.toLowerCase();
    const allowed = ['jovem-aprendiz', 'estagiario', 'analista-jr', 'analista-pl', 'analista-sr', 'specialist', 'tech-lead', 'manager'];
    cargo = cargo
        .replace(/est.a[gí]rio?/, 'estagiario')
        .replace(/j[óo]vem.?aprendiz/, 'jovem-aprendiz')
        .replace(/analista.?junior|analista.?j[r]?/, 'analista-jr')
        .replace(/analista.?pleno|analista.?pl/, 'analista-pl')
        .replace(/analista.?s[eê]nior|analista.?sr/, 'analista-sr')
        .replace(/tech.?lead/, 'tech-lead');
    if (allowed.includes(cargo)) return cargo;
    const found = allowed.find(a => cargo.includes(a.split('-')[0]));
    return found || '';
}
function mapExperiencia(exp) {
    if (!exp) return '';
    exp = exp.toLowerCase();
    if (exp === '1-3' || /1.*3/.test(exp)) return '1-3';
    if (exp === '3-5' || /3.*5/.test(exp)) return '3-5';
    if (exp.includes('5') && !exp.includes('3-5')) return '5plus';
    if (exp.includes('none') || exp.includes('nenhuma')) return 'none';
    return '';
}
function mapNivelFormacao(nv) {
    if (!nv) return '';
    nv = nv.toLowerCase().replace(/ /g, '_');
    if (nv.includes('fundamental')) return 'Ensino_Fundamental_completo';
    if (nv.includes('medio_incompleto') || nv.includes('médio_incompleto')) return 'Ensino_Medio_incompleto';
    if (nv.includes('medio_completo') || nv.includes('médio_completo')) return 'Ensino_Medio_completo';
    if (nv.includes('superior_cursando')) return 'Ensino_Superior_cursando';
    if (nv.includes('superior_completo')) return 'Ensino_Superior_completo';
    if (nv.includes('pos') || nv.includes('pós') || nv.includes('pos_graduacao')) return 'Pos_graduacao';
    if (nv.includes('mestrado')) return 'Mestrado';
    if (nv.includes('doutorado')) return 'Doutorado';
    return '';
}
function resetLanguageBlocks() {
    const blocks = document.querySelectorAll('.languages-block');
    blocks.forEach((b, i) => {
        if (i === 0) {
            const langInput = b.querySelector('#languages');
            const levelSelect = b.querySelector('#languagesLevel');
            if (langInput) langInput.value = '';
            if (levelSelect) levelSelect.value = '';
        } else { b.remove(); }
    });
}
function createLanguageBlock(lang, level) {
    const formRight = document.querySelector('.form-right');
    if (!formRight) return;
    const newBlock = document.createElement('div');
    newBlock.classList.add('languages-block');
    newBlock.innerHTML = `
        <div class="form-group">
            <label>Idiomas</label>
            <input type="text" name="languages[]" value="${lang}">
        </div>
        <div class="form-group">
            <label>Nível do Idioma</label>
            <select name="languagesLevel[]">
                <option value=""></option>
                <option value="A1">A1 - BÁSICO INICIANTE</option>
                <option value="A2">A2 - BÁSICO INTERMEDIÁRIO</option>
                <option value="B1">B1 - FALANTE INDEPENDENTE BÁSICO</option>
                <option value="B2">B2 - FALANTE INDEPENDENTE AVANÇADO</option>
                <option value="C1">C1 - PROFICIENTE AVANÇADO</option>
                <option value="C2">C2 - DOMÍNIO PLENO</option>
            </select>
        </div>
        <div class="languages-button">
            <button class="btn-remove" type="button">×</button>
        </div>`;
    const baseBlock = document.querySelector('.languages-block');
    formRight.insertBefore(newBlock, baseBlock.nextSibling);
    const select = newBlock.querySelector('select');
    if (select) select.value = level || '';
    const removeBtn = newBlock.querySelector('.btn-remove');
    if (removeBtn) removeBtn.addEventListener('click', () => newBlock.remove());
}
function applyIdiomas(idiomasObj) {
    resetLanguageBlocks();
    const entries = Object.entries(idiomasObj || {});
    if (entries.length === 0) return;
    const first = entries[0];
    const baseInput = document.getElementById('languages');
    const baseSelect = document.getElementById('languagesLevel');
    if (baseInput) baseInput.value = first[0];
    if (baseSelect) baseSelect.value = first[1];
    for (let i = 1; i < entries.length; i++) {
        createLanguageBlock(entries[i][0], entries[i][1]);
    }
}
document.querySelector('form').addEventListener('submit', async function (e) {
    e.preventDefault();
    // Pega o id da área do usuário do localStorage
    const idAreaUsuario = localStorage.getItem('idAreaUsuario');
    if (!idAreaUsuario) {
        Swal.fire({ icon: 'warning', title: 'Área não definida', text: 'Área do usuário não encontrada. Refaça o login.' });
        return;
    }
    // Monta mapa de idiomas: { idioma: nivel }
    function collectIdiomas() {
        const map = {};
        // bloco base
        const baseLang = document.getElementById('languages')?.value.trim();
        const baseLevel = document.getElementById('languagesLevel')?.value.trim();
        if (baseLang && baseLevel) map[baseLang] = baseLevel;
        // blocos adicionais
        document.querySelectorAll('.languages-block').forEach(block => {
            const inputEl = block.querySelector('input[name="languages[]"]');
            const selectEl = block.querySelector('select[name="languagesLevel[]"]');
            if (inputEl && selectEl) {
                const lang = inputEl.value.trim();
                const lvl = selectEl.value.trim();
                if (lang && lvl) map[lang] = lvl;
            }
        });
        return Object.keys(map).length ? map : null;
    }
    function parsePalavrasChave(raw) {
        if (!raw) return [];
        return raw
            .split(/[,;\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    function formatFormacao(value) {
        if (!value) return '';
        value = value.trim().toLowerCase();
        let result = '';
        if (value.includes('fundamental')) result = 'Ensino_Fundamental_completo';
        else if (value.includes('médio incompleto')) result = 'Ensino_Medio_incompleto';
        else if (value.includes('médio completo')) result = 'Ensino_Medio_completo';
        else if (value.includes('superior cursando')) result = 'Ensino_Superior_cursando';
        else if (value.includes('superior completo')) result = 'Ensino_Superior_completo';
        else if (value.includes('pós')) result = 'Pos_graduacao';
        else if (value.includes('mestrado')) result = 'Mestrado';
        else if (value.includes('doutorado')) result = 'Doutorado';
        else result = value;
        // Garante primeira letra maiúscula
        return result.charAt(0).toUpperCase() + result.slice(1);
    }
    const data = {
        titulo: document.getElementById('jobTitle').value || null,
        cargo: document.getElementById('position').value || null,
        experiencia: document.getElementById('experience').value || null,
        nivelFormacao: formatFormacao(document.getElementById('levelDegree').value) || null,
        instituicaoEnsino: document.getElementById('education').value || null,
        curso: document.getElementById('degree').value || null,
        idiomas: collectIdiomas(),
        palavrasChave: parsePalavrasChave(document.getElementById('keywords').value),
        idArea: parseInt(idAreaUsuario)
    };
    try {
    const response = await fetch(api('/optimiza/vagas'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            document.querySelector('form').reset();
            Swal.fire({
                icon: 'success',
                title: 'Vaga aberta com sucesso!',
                text: 'Você será redirecionado para Vagas Abertas.',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.href = 'vagasAbertas.html';
            });
        } else {
            const errorData = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'Erro ao abrir vaga',
                text: 'Erro ao abrir a vaga. Tente novamente.'
            });
        }
    } catch (error) {
        alert('Erro de conexão com o servidor.');
    }
});

document.getElementById('btn-sugestao-vaga').onclick = async function () {
    const modal = document.getElementById('modal-sugestao-vaga');
    const lista = document.getElementById('lista-sugestao-vagas');
    lista.innerHTML = '<li style="color:#888;">Carregando...</li>';
    modal.style.display = 'flex';
    try {
    const response = await fetch(api('/optimiza/vagas/layout-vagas'));
        if (response.ok) {
            const vagas = await response.json();
            lista.innerHTML = '';
            vagas.forEach(vaga => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.justifyContent = 'space-between';
                li.style.padding = '0.7rem 0.5rem';
                li.style.borderBottom = '1px solid #e9e9f7';
                li.style.color = '#032656';
                li.style.fontSize = '1.1rem';
                li.textContent = vaga.titulo;
                const btnAplicar = document.createElement('button');
                btnAplicar.textContent = 'Aplicar';
                btnAplicar.className = 'btn-aplicar-sugestao';
                btnAplicar.style.marginLeft = '1rem';
                btnAplicar.style.background = '#6C63FF';
                btnAplicar.style.color = '#fff';
                btnAplicar.style.border = 'none';
                btnAplicar.style.borderRadius = '0.4rem';
                btnAplicar.style.padding = '0.4rem 1.2rem';
                btnAplicar.style.cursor = 'pointer';
                btnAplicar.onclick = async function () {
                    btnAplicar.disabled = true;
                    btnAplicar.textContent = 'Aplicando...';
                    try {
                        const res = await fetch(api(`/optimiza/vagas/layout-vagas?idLayoutVaga=${vaga.id}`));
                        if (res.ok) {
                            const dados = await res.json();
                            document.getElementById('jobTitle').value = dados.titulo || '';
                            document.getElementById('position').value = mapCargo(dados.cargo);
                            document.getElementById('experience').value = mapExperiencia(dados.experienciaEsperada);
                            document.getElementById('levelDegree').value = mapNivelFormacao(dados.nivelFormacaoEsperada);
                            document.getElementById('degree').value = dados.cursoEsperado || '';
                            applyIdiomas(dados.idiomasEsperados || {});
                            document.getElementById('keywords').value = '';
                            modal.style.display = 'none';
                        } else {
                            Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível aplicar a sugestão.' });
                        }
                    } catch (err) {
                        Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro de conexão.' });
                    } finally {
                        btnAplicar.disabled = false;
                        btnAplicar.textContent = 'Aplicar';
                    }
                };
                li.appendChild(btnAplicar);
                lista.appendChild(li);
            });
            if (vagas.length === 0) {
                lista.innerHTML = '<li style="color:#888;">Nenhuma sugestão encontrada.</li>';
            }
        } else {
            lista.innerHTML = '<li style="color:#d00;">Erro ao buscar sugestões.</li>';
        }
    } catch (error) {
        lista.innerHTML = '<li style="color:#d00;">Erro de conexão.</li>';
    }
};

// Funções auxiliares para mapear valores do backend para os selects
document.getElementById('close-modal-sugestao').onclick = function () {
    document.getElementById('modal-sugestao-vaga').style.display = 'none';
};
window.onclick = function (event) {
    const modal = document.getElementById('modal-sugestao-vaga');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};