// ORION - Versión corregida
const historialArticulos = []; // si no lo usas, puedes borrarlo
window.respaldoResultadosHTML = "";
let paginasRespaldadasMemoria = [];

// --- Referencias DOM (con validación) ---
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

// --- Helpers de seguridad y storage ---

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function safeGetHistory() {
  try {
    return JSON.parse(localStorage.getItem('orion_history') || '[]');
  } catch {
    localStorage.removeItem('orion_history');
    return [];
  }
}

function safeSetHistory(hist) {
  localStorage.setItem('orion_history', JSON.stringify(hist));
}

// --- Carga de preferencias ---

if (localStorage.getItem('orion_dark') === 'true') {
  document.body.classList.add('dark');
  if (darkToggle) darkToggle.checked = true;
}
if (localStorage.getItem('orion_font')) {
  document.body.style.fontSize = localStorage.getItem('orion_font');
  if (fontSelect) fontSelect.value = localStorage.getItem('orion_font');
}
if (localStorage.getItem('orion_lang')) {
  if (langSelect) langSelect.value = localStorage.getItem('orion_lang');
}

// --- LÓGICA DEL HISTORIAL ---

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
    tabG.style.background = isGeneral ? 'var(--bg, #f5f5f5)' : 'transparent';
    tabG.style.fontWeight = isGeneral ? '600' : '400';
    tabL.style.background = !isGeneral ? 'var(--bg, #f5f5f5)' : 'transparent';
    tabL.style.fontWeight = !isGeneral ? '600' : '400';
  }
  
  if (!lista) return;
  let hist = safeGetHistory();
  if (tipo === 'likes') hist = hist.filter(h => h.like);

  if (hist.length === 0) {
    lista.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:40px; font-size:13px;">No hay registros disponibles.</p>`;
    return;
  }

  lista.innerHTML = ''; // Limpiamos para usar createElement y evitar XSS
  hist.forEach(h => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color); cursor:pointer;';
    row.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:500; font-size:14px; margin-bottom:4px;">${escapeHTML(h.titulo)}</div>
        <div style="font-size:11px; opacity:0.6;">${escapeHTML(h.fecha)} - ${escapeHTML(h.hora)}</div>
      </div>
      <div style="font-size:10px; opacity:0.5; letter-spacing:1px;">${h.like ? 'FAV' : ''}</div>
    `;
    row.addEventListener('click', () => volverAArticulo(h.titulo));
    lista.appendChild(row);
  });
}

function borrarSoloGeneral() {
  if (!confirm('¿Eliminar solo el historial general? Tus favoritos se conservarán.')) return;
  let hist = safeGetHistory();
  hist = hist.filter(h => h.like);
  safeSetHistory(hist);
  renderHistorial('general');
}

function volverAArticulo(titulo) {
  const modal = document.getElementById('historialModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  const lang = langSelect ? (langSelect.value || 'es') : 'es';
  window.verArticuloCompleto(titulo, lang, null);
}

function toggleLike(tituloActual) {
  let hist = safeGetHistory();
  hist = hist.map(h => {
    if (h.titulo === tituloActual) h.like = !h.like;
    return h;
  });
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
  } else {
    window.volverAlInicio();
  }
};

window.volverAlInicio = function() {
  window.respaldoResultadosHTML = "";
  paginasRespaldadasMemoria = [];
  if(home) home.classList.remove('hidden');
  if(resultadosDiv) {
    resultadosDiv.classList.add('hidden');
    resultadosDiv.innerHTML = "";
  }
  if(input) input.value = '';
  window.scrollTo(0,0);
};

window.volverAlMenu = window.volverAlInicio;
if (smallLogo) smallLogo.addEventListener('click', window.volverAlInicio);

// --- CONTROL DEL MENÚ (con guards) ---

if (menuBtn && menuPanel) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuPanel.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!menuPanel.contains(e.target) && e.target !== menuBtn) {
      menuPanel.classList.add('hidden');
    }
  });
}

if (darkToggle) {
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    localStorage.setItem('orion_dark', darkToggle.checked);
  });
}

if (fontSelect) {
  fontSelect.addEventListener('change', () => {
    document.body.style.fontSize = fontSelect.value;
    localStorage.setItem('orion_font', fontSelect.value);
  });
}

if (langSelect) {
  langSelect.addEventListener('change', () => {
    localStorage.setItem('orion_lang', langSelect.value);
  });
}

// --- HISTORIAL REAL Y FAVORITOS ---

function guardarEnHistorial(titulo, query = titulo) {
  let hist = safeGetHistory();
  const ahora = new Date();
  const nuevo = {
    titulo: titulo,
    query: query,
    fecha: ahora.toLocaleDateString(),
    hora: ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    timestamp: ahora.getTime(),
    like: false
  };
  const existente = hist.find(h => h.titulo === titulo);
  if(existente) nuevo.like = existente.like;
  hist = [nuevo, ...hist.filter(h => h.titulo !== titulo)].slice(0, 100);
  safeSetHistory(hist);
}

// BOTÓN DE HISTORIAL CON FACE ID
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
    if(menuPanel) menuPanel.classList.add('hidden');
    if (!window.PublicKeyCredential) {
      alert("Tu dispositivo no soporta autenticación biométrica.");
      abrirModalHistorial();
      return;
    }
    try {
      const disponible = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!disponible) {
        alert("Face ID / Touch ID no están disponibles. Abriendo historial.");
        abrirModalHistorial();
        return;
      }
      let credentialIdRaw = localStorage.getItem('orion_biometric_id');
      if (!credentialIdRaw) {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: "ORION" },
            user: {
              id: crypto.getRandomValues(new Uint8Array(16)),
              name: "usuario_orion",
              displayName: "Usuario Orion"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "required"
            },
            timeout: 60000
          }
        });
        if (credential) {
          const idBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          localStorage.setItem('orion_biometric_id', idBase64);
          abrirModalHistorial();
        }
      } else {
        const idBytes = Uint8Array.from(atob(credentialIdRaw), c => c.charCodeAt(0));
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ type: "public-key", id: idBytes }],
            userVerification: "required"
          }
        });
        if (assertion) abrirModalHistorial();
      }
    } catch (e) {
      alert("Acceso denegado o cancelación de Face ID.");
      console.error("Error en Face ID:", e);
    }
  });
}

// --- LEER ARTÍCULO COMPLETO ---

window.verArticuloCompleto = async function(title, lang, imgUrl) {
  if (!resultadosDiv) return;
  window.respaldoResultadosHTML = resultadosDiv.innerHTML;
  resultadosDiv.innerHTML = `<p class="loading-text">Abriendo el artículo <b>${escapeHTML(title)}</b>...</p>`;
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=0&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`);
    const data = await res.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0]; // FIX CRÍTICO
    const page = pages[pageId];
    const textoCompleto = page.extract || "No se pudo recuperar el cuerpo del texto.";

    let headerImagen = imgUrl && imgUrl !== 'null'
      ? `<img src="${escapeHTML(imgUrl)}" class="article-img" style="max-width:100%; height:auto; max-height:400px; object-fit:cover; margin-bottom:15px; border-radius:8px;">`
      : '';

    resultadosDiv.innerHTML = `
      <button class="btn-volver" onclick="volverAResultados()">← Volver a los resultados</button>
      <h2 style="margin-top:15px; margin-bottom:15px; font-size:26px;">${escapeHTML(title)}</h2>
      ${headerImagen}
      <div class="article-text" style="font-size:16px; line-height:1.7; text-align:justify; white-space:pre-wrap;">${escapeHTML(textoCompleto)}</div>
      <a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" class="wiki-link">Ver en Wikipedia oficial</a>
      <div id="likeContainer" style="margin-top:20px;"></div>
    `;
    guardarEnHistorial(title, title);
    
    const likeContainer = document.getElementById('likeContainer');
    if (likeContainer) {
      const hist = safeGetHistory();
      const esLike = hist.find(h=>h.titulo===title)?.like;
      const btnHeart = document.createElement('button');
      btnHeart.innerText = esLike ? '★ GUARDADO EN FAVORITOS' : '☆ GUARDAR EN FAVORITOS';
      btnHeart.style.cssText = "padding:8px 16px; border-radius:20px; border:1px solid var(--border-color); background:var(--bg-card); cursor:pointer;";
      btnHeart.onclick = () => { 
        const isNowLiked = toggleLike(title);
        btnHeart.innerText = isNowLiked ? '★ GUARDADO EN FAVORITOS' : '☆ GUARDAR EN FAVORITOS';
      };
      likeContainer.appendChild(btnHeart);
    }

  } catch (err) {
    resultadosDiv.innerHTML = `
      <button class="btn-volver" onclick="volverAResultados()">← Volver</button>
      <p style="margin-top:15px; color:#ff4d4d;">Error al abrir el texto completo: ${escapeHTML(err.message)}</p>
    `;
  }
};

function recomponerEventosEnlaces() {
  if (!resultadosDiv || !langSelect) return;
  const enlaces = resultadosDiv.querySelectorAll('.enlace-articulo');
  const lang = langSelect.value || 'es';
  enlaces.forEach((enlace) => {
    const title = enlace.dataset.title;
    const thumb = enlace.dataset.thumb;
    if (title) {
      enlace.addEventListener('click', (e) => {
        e.preventDefault();
        window.verArticuloCompleto(title, lang, thumb || null);
      });
    }
  });
}

// --- PROCESAMIENTO DEL BUSCADOR (FIX DE SINTAXIS) ---

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const engine = aiEngineSelect ? aiEngineSelect.value : 'wikipedia';
    const lang = langSelect ? (langSelect.value || 'es') : 'es';

    window.respaldoResultadosHTML = "";
    paginasRespaldadasMemoria = [];

    // MOTOR: WIKIPEDIA
    if (engine === 'wikipedia') {
      home.classList.add('hidden');
      resultadosDiv.classList.remove('hidden');
      resultadosDiv.innerHTML = `<p class="loading-text">Buscando <b>${escapeHTML(q)}</b> en Wikipedia...</p>`;
      try {
        const urlCompleta = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&format=json&prop=pageimages|extracts&exintro=1&explaintext=1&exchars=140&pithumbsize=150&origin=*`;
        const resp = await fetch(urlCompleta);
        const d = await resp.json();
        if (!d.query || !d.query.pages) {
          resultadosDiv.innerHTML = `
            <button class="btn-volver" onclick="volverAlInicio()">← Volver</button>
            <p style="margin-top:15px; text-align:center;">No se encontraron resultados</p>
          `;
          return;
        }
        resultadosDiv.innerHTML = `
          <button class="btn-volver" onclick="volverAlInicio()">← Volver al inicio</button>
          <h3 style="margin-top:15px; margin-bottom:20px;">Resultados para "${escapeHTML(q)}":</h3>
        `;
        const paginas = Object.values(d.query.pages);
        paginasRespaldadasMemoria = paginas;
        paginas.forEach(item => {
          const fotoUrl = item.thumbnail ? item.thumbnail.source : null;
          const textoLimpio = item.extract ? item.extract : "Sin resumen disponible.";
          const tarjeta = document.createElement('article');
          tarjeta.className = 'result-item';
          tarjeta.innerHTML = `
            ${fotoUrl ? `<img src="${escapeHTML(fotoUrl)}" class="result-thumb" loading="lazy">` : ''}
            <div class="result-body">
              <a href="#" class="enlace-articulo" data-title="${escapeHTML(item.title)}" data-thumb="${fotoUrl ? escapeHTML(fotoUrl) : ''}">${escapeHTML(item.title)}</a>
              <p class="result-snippet">${escapeHTML(textoLimpio)}</p>
            </div>
          `;
          const enlace = tarjeta.querySelector('.enlace-articulo');
          enlace.addEventListener('click', (e) => {
            e.preventDefault();
            window.verArticuloCompleto(item.title, lang, fotoUrl);
          });
          resultadosDiv.appendChild(tarjeta);
        });
      } catch (err) {
        resultadosDiv.innerHTML = `
          <button class="btn-volver" onclick="volverAlInicio()">← Volver</button>
          <p style="margin-top:15px; color:#ff4d4d;">Error al conectar con Wikipedia: ${escapeHTML(err.message)}</p>
        `;
      }
      return; // Importante para no seguir al otro motor
    }

    // MOTOR: DUCKDUCKGO - CORREGIDO
    if (engine === 'duckduckgo') {
      home.classList.add('hidden');
      resultadosDiv.classList.remove('hidden');
      resultadosDiv.innerHTML = `<p class="loading-text">Buscando <b>${escapeHTML(q)}</b> en la web con DuckDuckGo...</p>`;
      try {
        // NOTA: La API oficial de DDG no soporta CORS desde el navegador. 
        // Para producción necesitas un backend proxy. Aquí intentamos directo y si falla te avisa.
        const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&pretty=1`);
        
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        const temas = data.RelatedTopics || [];

        const listaLimpia = [];
        temas.forEach(item => {
          if (item.Topics) listaLimpia.push(...item.Topics);
          else if (item.Text && item.FirstURL) listaLimpia.push(item);
        });

        if (listaLimpia.length === 0) {
          resultadosDiv.innerHTML = `
            <button class="btn-volver" onclick="volverAlInicio()">← Volver</button>
            <p style="margin-top:15px; text-align:center;">No se encontraron resultados. Prueba con Wikipedia o usa otro término.</p>
          `;
          return;
        }

        resultadosDiv.innerHTML = `
          <button class="btn-volver" onclick="volverAlInicio()">← Volver al inicio</button>
          <h3 style="margin-top:15px; margin-bottom:20px;">Resultados para "${escapeHTML(q)}":</h3>
        `;

        listaLimpia.forEach(item => {
          const partes = item.Text.split(' - ');
          const tituloLimpio = partes[0] || "Resultado";
          const snippetLimpio = partes.slice(1).join(' - ') || item.Text;
          const tarjeta = document.createElement('article');
          tarjeta.className = 'result-item';
          tarjeta.innerHTML = `
            <div class="result-body">
              <a href="${escapeHTML(item.FirstURL)}" target="_blank" rel="noopener noreferrer" style="font-weight:bold; font-size:18px; color:var(--link-color);">${escapeHTML(tituloLimpio)}</a>
              <p style="color:var(--text-secondary); font-size:14px; line-height:1.5; margin:5px 0 0 0;">${escapeHTML(snippetLimpio)}</p>
              <span style="font-size:11px; color:#4caf50; display:block; margin-top:6px; word-break:break-all; opacity:0.6;">${escapeHTML(item.FirstURL)}</span>
            </div>
          `;
          resultadosDiv.appendChild(tarjeta);
        });
      } catch (err) {
        console.error("Error en DuckDuckGo:", err);
        resultadosDiv.innerHTML = `
          <button class="btn-volver" onclick="volverAlInicio()">← Volver</button>
          <p style="margin-top:15px; color:#ff4d4d; text-align:center;">
            DuckDuckGo bloquea peticiones directas desde el navegador (CORS).<br>
            Necesitas un proxy en tu backend o usar solo Wikipedia.<br>
            <small>${escapeHTML(err.message)}</small>
          </p>
        `;
      }
    }
  });
}

// Exponer funciones que el HTML usa con onclick=""
window.abrirModalHistorial = abrirModalHistorial;
window.renderHistorial = renderHistorial;
window.borrarSoloGeneral = borrarSoloGeneral;