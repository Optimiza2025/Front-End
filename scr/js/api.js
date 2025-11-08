// Helper para construir URLs de API que funcionem em desenvolvimento (localhost) e em produção
(function (window) {
  function isLocalHost() {
    try {
      const h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '';
    } catch (e) { return false; }
  }

  // Base em dev (quando frontend servido em localhost e backend em :8080)
  const DEV_BASE = 'http://localhost:8080';

  // api('/optimiza/avaliacao/historico?idCandidato=1') -> full URL when needed
  function api(path) {
    if (!path) return path;
    // remove espaços acidentais (ex.: "/optimiza /foo") e normalize barras
    let p = String(path).replace(/\s+/g, '').replace(/\\/g, '/');
    if (!p.startsWith('/')) p = '/' + p;
    const base = isLocalHost() ? DEV_BASE : '';
    return base + p;
  }

  window.api = api;
})(window);
