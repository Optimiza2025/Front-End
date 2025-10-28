// Controle de sessão e permissões de navegação
// Remove botões/links de "Banco de Talentos" para áreas diferentes de Recursos Humanos

(function () {
	function getAreaNomeDoUsuario() {
		// Possíveis chaves usadas no app
		const keys = [
			'nomeAreaUsuario',
			'nomeArea',
			'areaUsuario',
			'areaNome',
		];
		for (const k of keys) {
			const v = localStorage.getItem(k);
			if (v && typeof v === 'string') return v.trim();
		}
		return null;
	}

	function getAreaIdDoUsuario() {
		const raw = localStorage.getItem('idAreaUsuario');
		if (raw == null) return null;
		const id = Number(raw);
		return Number.isFinite(id) ? id : null;
	}

	function getAreaRHIdConfigurada() {
		// Permite configurar via localStorage o ID da área de RH
		const raw = localStorage.getItem('idAreaRH');
		if (raw == null) return null;
		const id = Number(raw);
		return Number.isFinite(id) ? id : null;
	}

	function ehRecursosHumanos(areaNome) {
		if (!areaNome) return false;
		const norm = areaNome.toLowerCase();
		// Considera variações comuns
		return (
			norm === 'recursos humanos' ||
			norm === 'rh' ||
			norm === 'recursos-humanos'
		);
	}

	function removerBancoDeTalentosDoDOM() {
		// Remove links/itens de menu que apontam para bancoDeTalentos.html
		const anchors = document.querySelectorAll('a[href*="bancoDeTalentos.html"]');
		anchors.forEach(a => {
			// Se o link estiver isolado dentro de um item simples de menu (.menu-text), removemos o item
			const simpleMenuItem = a.closest('.menu-text');
			if (simpleMenuItem && !simpleMenuItem.closest('.menu-container')) {
				simpleMenuItem.remove();
				return;
			}
			a.remove();
		});

		// Opcional: remover quaisquer botões com data-feature="banco-de-talentos"
		document.querySelectorAll('[data-feature="banco-de-talentos"]').forEach(el => el.remove());
	}

	// Oculta/remover botão de Aprovar Vaga para quem não é do RH
	function ocultarBotoesAprovacaoVaga() {
		// Cobre diferentes seletores/variações possíveis do botão de ação
		const selectors = [
			'#btn-acao-vaga',
			'.modal-actions .aprovar',
			'button.aprovar',
			'[data-role="aprovar-vaga"]'
		];
		const nodes = document.querySelectorAll(selectors.join(','));
		nodes.forEach(el => {
			// Esconde sem remover para evitar nulidade em event listeners já ligados
			try {
				el.style.display = 'none';
				el.setAttribute('aria-hidden', 'true');
				if ('disabled' in el) { el.disabled = true; }
				el.classList && el.classList.add('oculto-nao-rh');
			} catch { }
		});
	}

	// Observa mutações para ocultar o botão caso ele seja inserido depois (ex.: modais)
	function observarAprovacaoQuandoNecessario() {
		try {
			const observer = new MutationObserver(() => ocultarBotoesAprovacaoVaga());
			observer.observe(document.body, { childList: true, subtree: true });
			// Guarda para possível reuso externo
			window.Sessoes = Object.assign(window.Sessoes || {}, { _observerAprovacao: observer });
		} catch { }
	}

	function aplicarRegrasDeAcesso() {
		const areaNome = getAreaNomeDoUsuario();
		const areaId = getAreaIdDoUsuario();
		const rhIdConfig = getAreaRHIdConfigurada();

		const permitidoPorNome = ehRecursosHumanos(areaNome);
		// Regra por ID:
		// 1) Se idAreaRH estiver configurado no localStorage, ele prevalece
		// 2) Caso contrário, usamos o fallback conhecido onde RH possui id = 2
		const permitidoPorId =
			areaId != null && (
				rhIdConfig != null ? areaId === rhIdConfig : areaId === 2
			);

		if (!(permitidoPorNome || permitidoPorId)) {
			// Log leve para depuração (silencioso na maioria dos casos)
			try { console.debug('Sessoes: ocultando Banco de Talentos', { areaId, areaNome, rhIdConfig }); } catch { }
			removerBancoDeTalentosDoDOM();
			// Esconde também a ação de Aprovar Vaga (ex.: em vagasAbertas.html)
			ocultarBotoesAprovacaoVaga();
			observarAprovacaoQuandoNecessario();
		}
	}

	// Executa quando o DOM estiver pronto
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', aplicarRegrasDeAcesso);
	} else {
		aplicarRegrasDeAcesso();
	}

	// Expor opcionalmente para reprocessar em páginas SPA ou após mudanças de sessão
	window.Sessoes = Object.assign(window.Sessoes || {}, {
		aplicarRegrasDeAcesso,
	});
})();

