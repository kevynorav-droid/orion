// ORION - 0.1
let historialArticulos = []; // reservado, puedes borrarlo si no lo usas
window.respaldoResultadosHTML = "";
let paginasRespaldadasMemoria = [];

// --- Referencias DOM ---
const smallLogo = document.getElementById('smallLogo');
const form = document.getElementById('orionForm');
const input = document.getElementById('q');
const resultadosDiv = document.getElementById('resultados');
const home = document.getElementById('home');
const menuBtn = document.getElementById('menuBtn');
const menuPanel = document.getElementById('menuPanel');
const aiEngineSelect = document.getElementById('aiEngineSelect');
const langSelect = document.getElementById('langSelect');
const fontSelect = document.getElementById('fontSelect');
const darkToggle = document.getElementById('darkToggle');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const modoSelect = document.getElementById('modoSelect'); // NUEVO

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
function safeGetHistory() {
  try { return JSON.parse(localStorage.getItem('orion_history') || '[]'); }
  catch { localStorage.removeItem('orion_history'); return []; }
}
function safeSetHistory(hist) { localStorage.setItem('orion_history', JSON.stringify(hist)); }

// --- Preferencias ---
if (localStorage.getItem('orion_dark') === 'true') {
  document.body.classList.add('dark');
  if (darkToggle) darkToggle.checked = true;
}
if (localStorage.getItem('orion_font')) {
  document.body.style.fontSize = localStorage.getItem('orion_font');
  if (fontSelect) fontSelect.value = localStorage.getItem('orion_font');
}
if (localStorage.getItem('orion_lang') && langSelect) {
  langSelect.value = localStorage.getItem('orion_lang');
}
if (localStorage.getItem('orion_modo') && modoSelect) {
  modoSelect.value = localStorage.getItem('orion_modo');
}

// --- HISTORIAL ---
function abrirModalHistorial() {
  const modal = document.getElementById('historialModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    renderHistorial('general');
  }
}
function renderHistorial(tipo) {
  const lista = document.getElementById('listaHistorial');
  const tabG = document.getElementById('tabGeneral');
  const tabL = document.getElementById('tabLikes');
  if (tabG && tabL) {
    const isGeneral = tipo === 'general';
    tabG.classList.toggle('active', isGeneral);
    tabL.classList.toggle('active', !isGeneral);
  }
  if (!lista) return;
  let hist = safeGetHistory();
  if (tipo === 'likes') hist = hist.filter(h => h.like);
  if (hist.length === 0) {
    lista.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:40px; font-size:13px;">No hay registros disponibles.</p>`;
    return;
  }
  lista.innerHTML = '';
  hist.forEach(h => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color); cursor:pointer;';
    row.innerHTML = `<div style="flex:1;"><div style="font-weight:500; font-size:14px; margin-bottom:4px;">${escapeHTML(h.titulo)}</div><div style="font-size:11px; opacity:0.6;">${escapeHTML(h.fecha)} - ${escapeHTML(h.hora)}</div></div><div style="font-size:10px; opacity:0.5;">${h.like ? 'FAV' : ''}</div>`;
    row.addEventListener('click', () => volverAArticulo(h.titulo));
    lista.appendChild(row);
  });
}
function borrarSoloGeneral() {
  if (!confirm('¿Eliminar solo el historial general? Tus favoritos se conservarán.')) return;
  let hist = safeGetHistory().filter(h => h.like);
  safeSetHistory(hist);
  renderHistorial('general');
}
function volverAArticulo(titulo) {
  const modal = document.getElementById('historialModal');
  if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
  const lang = langSelect ? (langSelect.value || 'es') : 'es';
  window.verArticuloCompleto(titulo, lang, null);
}
function toggleLike(tituloActual) {
  let hist = safeGetHistory();
  hist = hist.map(h => { if (h.titulo === tituloActual) h.like = !h.like; return h; });
  safeSetHistory(hist);
  return hist.find(h => h.titulo === tituloActual)?.like;
}

// --- NAVEGACIÓN ---
window.volverAResultados = function() {
  if (window.respaldoResultadosHTML) {
    resultadosDiv.innerHTML = window.respaldoResultadosHTML;
    resultadosDiv.classList.remove('hidden');
    home.classList.add('hidden');
    recomponerEventosEnlaces();
    window.scrollTo(0,0);
  } else { window.volverAlInicio(); }
};
window.volverAlInicio = function() {
  window.respaldoResultadosHTML = "";
  paginasRespaldadasMemoria = [];
  if(home) home.classList.remove('hidden');
  if(resultadosDiv) { resultadosDiv.classList.add('hidden'); resultadosDiv.innerHTML = ""; }
  if(input) input.value = '';
  window.scrollTo(0,0);
};
window.volverAlMenu = window.volverAlInicio;
if (smallLogo) smallLogo.addEventListener('click', window.volverAlInicio);

// --- MENÚ ---
if (menuBtn && menuPanel) {
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menuPanel.classList.toggle('hidden'); });
  document.addEventListener('click', (e) => {
    if (!menuPanel.contains(e.target) && e.target !== menuBtn) menuPanel.classList.add('hidden');
  });
}
if (darkToggle) darkToggle.addEventListener('change', () => { document.body.classList.toggle('dark', darkToggle.checked); localStorage.setItem('orion_dark', darkToggle.checked); });
if (fontSelect) fontSelect.addEventListener('change', () => { document.body.style.fontSize = fontSelect.value; localStorage.setItem('orion_font', fontSelect.value); });
if (langSelect) langSelect.addEventListener('change', () => { localStorage.setItem('orion_lang', langSelect.value); });
if (modoSelect) modoSelect.addEventListener('change', () => { localStorage.setItem('orion_modo', modoSelect.value); });

function guardarEnHistorial(titulo, query = titulo) {
  let hist = safeGetHistory();
  const ahora = new Date();
  const nuevo = { titulo, query, fecha: ahora.toLocaleDateString(), hora: ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), timestamp: ahora.getTime(), like: false };
  const existente = hist.find(h => h.titulo === titulo);
  if(existente) nuevo.like = existente.like;
  hist = [nuevo, ...hist.filter(h => h.titulo !== titulo)].slice(0, 100);
  safeSetHistory(hist);
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
    if(menuPanel) menuPanel.classList.add('hidden');
    if (!window.PublicKeyCredential) { abrirModalHistorial(); return; }
    try {
      const disponible = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!disponible) { abrirModalHistorial(); return; }
      let credentialIdRaw = localStorage.getItem('orion_biometric_id');
      if (!credentialIdRaw) {
        const credential = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "ORION" }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "usuario_orion", displayName: "Usuario Orion" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "required" }, timeout: 60000 } });
        if (credential) { localStorage.setItem('orion_biometric_id', btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))); abrirModalHistorial(); }
      } else {
        const idBytes = Uint8Array.from(atob(credentialIdRaw), c => c.charCodeAt(0));
        const assertion = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: "public-key", id: idBytes }], userVerification: "required" } });
        if (assertion) abrirModalHistorial();
      }
    } catch (e) { alert("Acceso denegado Face ID."); console.error(e); }
  });
}

// --- ARTICULO COMPLETO ---
window.verArticuloCompleto = async function(title, lang, imgUrl) {
  if (!resultadosDiv) return;
  window.respaldoResultadosHTML = resultadosDiv.innerHTML;
  resultadosDiv.innerHTML = `<p class="loading-text">Abriendo <b>${escapeHTML(title)}</b>...</p>`;
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=0&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`);
    const data = await res.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    const textoCompleto = pages[pageId].extract || "No se pudo recuperar el texto.";
    let headerImagen = imgUrl && imgUrl !== 'null' ? `<img src="${escapeHTML(imgUrl)}" class="article-img">` : '';
    resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAResultados()">← Volver</button><h2 style="margin:15px 0; font-size:26px;">${escapeHTML(title)}</h2>${headerImagen}<div class="article-text">${escapeHTML(textoCompleto)}</div><a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" class="wiki-link">Ver en Wikipedia</a><div id="likeContainer" style="margin-top:20px;"></div>`;
    guardarEnHistorial(title, title);
    const likeContainer = document.getElementById('likeContainer');
    if (likeContainer) {
      const esLike = safeGetHistory().find(h=>h.titulo===title)?.like;
      const btnHeart = document.createElement('button');
      btnHeart.innerText = esLike ? '★ GUARDADO' : '☆ GUARDAR';
      btnHeart.style.cssText = "padding:8px 16px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); cursor:pointer;";
      btnHeart.onclick = () => { const l = toggleLike(title); btnHeart.innerText = l ? '★ GUARDADO' : '☆ GUARDAR'; };
      likeContainer.appendChild(btnHeart);
    }
  } catch (err) {
    resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAResultados()">← Volver</button><p style="color:#ff4d4d;">Error: ${escapeHTML(err.message)}</p>`;
  }
};

function recomponerEventosEnlaces() {
  if (!resultadosDiv || !langSelect) return;
  const enlaces = resultadosDiv.querySelectorAll('.enlace-articulo');
  const lang = langSelect.value || 'es';
  enlaces.forEach(enlace => {
    const title = enlace.dataset.title;
    const thumb = enlace.dataset.thumb;
    if (title) enlace.addEventListener('click', (e) => { e.preventDefault(); window.verArticuloCompleto(title, lang, thumb || null); });
  });
}

// --- BUSCADOR ---
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const engine = aiEngineSelect ? aiEngineSelect.value : 'wikipedia';
    const lang = langSelect ? (langSelect.value || 'es') : 'es';
    window.respaldoResultadosHTML = "";
    paginasRespaldadasMemoria = [];

    if (engine === 'wikipedia') {
      home.classList.add('hidden');
      resultadosDiv.classList.remove('hidden');
      resultadosDiv.innerHTML = `<p class="loading-text">Buscando <b>${escapeHTML(q)}</b> en Wikipedia...</p>`;
      try {
        const urlCompleta = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&format=json&prop=pageimages|extracts&exintro=1&explaintext=1&exchars=140&pithumbsize=150&origin=*`;
        const resp = await fetch(urlCompleta);
        const d = await resp.json();
        if (!d.query || !d.query.pages) { resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAlInicio()">← Volver</button><p style="text-align:center;">No se encontraron resultados</p>`; return; }
        resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAlInicio()">← Volver</button><h3 style="margin:15px 0;">Resultados para "${escapeHTML(q)}":</h3>`;
        const paginas = Object.values(d.query.pages);
        paginasRespaldadasMemoria = paginas;
        paginas.forEach(item => {
          const fotoUrl = item.thumbnail ? item.thumbnail.source : null;
          const tarjeta = document.createElement('article');
          tarjeta.className = 'result-item';
          tarjeta.innerHTML = `${fotoUrl ? `<img src="${escapeHTML(fotoUrl)}" class="result-thumb" loading="lazy">` : ''}<div class="result-body"><a href="#" class="enlace-articulo" data-title="${escapeHTML(item.title)}" data-thumb="${fotoUrl ? escapeHTML(fotoUrl) : ''}">${escapeHTML(item.title)}</a><p>${escapeHTML(item.extract || "Sin resumen")}</p></div>`;
          tarjeta.querySelector('.enlace-articulo').addEventListener('click', (e) => { e.preventDefault(); window.verArticuloCompleto(item.title, lang, fotoUrl); });
          resultadosDiv.appendChild(tarjeta);
        });
      } catch (err) { resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAlInicio()">← Volver</button><p style="color:#ff4d4d;">Error Wikipedia: ${escapeHTML(err.message)}</p>`; }
      return;
    }

    if (engine === 'duckduckgo') {
      home.classList.add('hidden');
      resultadosDiv.classList.remove('hidden');
      resultadosDiv.innerHTML = `<p class="loading-text">Buscando <b>${escapeHTML(q)}</b> en DuckDuckGo...</p>`;
      try {
        const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&pretty=1`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const temas = data.RelatedTopics || [];
        const listaLimpia = [];
        temas.forEach(item => { if (item.Topics) listaLimpia.push(...item.Topics); else if (item.Text && item.FirstURL) listaLimpia.push(item); });
        if (listaLimpia.length === 0) { resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAlInicio()">← Volver</button><p style="text-align:center;">Sin resultados en DUCK, prueba WIKI</p>`; return; }
        resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAlInicio()">← Volver</button><h3 style="margin:15px 0;">Resultados para "${escapeHTML(q)}":</h3>`;
        listaLimpia.forEach(item => {
          const partes = item.Text.split(' - ');
          const tarjeta = document.createElement('article');
          tarjeta.className = 'result-item';
          tarjeta.innerHTML = `<div class="result-body"><a href="${escapeHTML(item.FirstURL)}" target="_blank" rel="noopener">${escapeHTML(partes[0] || "Resultado")}</a><p>${escapeHTML(partes.slice(1).join(' - ') || item.Text)}</p><span style="font-size:11px; color:#4caf50; word-break:break-all;">${escapeHTML(item.FirstURL)}</span></div>`;
          resultadosDiv.appendChild(tarjeta);
        });
      } catch (err) {
        resultadosDiv.innerHTML = `<button class="btn-volver" onclick="volverAlInicio()">← Volver</button><p style="color:#ff4d4d; text-align:center;">DuckDuckGo bloquea CORS desde navegador. Usa WIKI.<br><small>${escapeHTML(err.message)}</small></p>`;
      }
    }
  });
}

window.abrirModalHistorial = abrirModalHistorial;
window.renderHistorial = renderHistorial;
window.borrarSoloGeneral = borrarSoloGeneral;