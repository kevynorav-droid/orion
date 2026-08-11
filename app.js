var historialArticulos = [];
window.respaldoResultadosHTML = ""; // <--- Aquí guardo la lista estilo Google antes de que se borre
const GROQ_API_KEY = "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"; // Reemplazr aquí con mi API Key segura cuando la use

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

// --- RESTAURAR AJUSTES GUARDADOS ---
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

// Vuelve de un ARTÍCULO a la LISTA de resultados
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

// Vuelve de la LISTA al INICIO de ORION
window.volverAlInicio = function() {
    window.respaldoResultadosHTML = "";
    paginasRespaldadasMemoria = [];
    home.classList.remove('hidden');
    resultadosDiv.classList.add('hidden');
    resultadosDiv.innerHTML = "";
    input.value = '';
    window.scrollTo(0,0);
};

window.volverAlMenu = window.volverAlInicio; // por si quedó un botón viejo

if (smallLogo) smallLogo.addEventListener('click', window.volverAlInicio);

// --- CONTROL DEL MENÚ FLOTANTE ---
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  menuPanel.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
  if (!menuPanel.contains(e.target) && e.target !== menuBtn) {
    menuPanel.classList.add('hidden');
  }
});

// --- AJUSTES DEL MENÚ ---
darkToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark', darkToggle.checked);
  localStorage.setItem('orion_dark', darkToggle.checked);
});

fontSelect.addEventListener('change', () => {
  document.body.style.fontSize = fontSelect.value;
  localStorage.setItem('orion_font', fontSelect.value);
});

langSelect.addEventListener('change', () => {
  localStorage.setItem('orion_lang', langSelect.value);
});

// --- HISTORIAL REAL Y FAVORITOS ---
function guardarEnHistorial(titulo, query = titulo) {
  let hist = JSON.parse(localStorage.getItem('orion_history') || '[]');
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
  localStorage.setItem('orion_history', JSON.stringify(hist));
}

// BOTÓN DE HISTORIAL PROTEGIDO CON FACE ID (CÓDIGO FINAL CORREGIDO PARA GITHUB)
clearHistoryBtn.addEventListener('click', async () => {
  menuPanel.classList.add('hidden');
  
  if (!window.PublicKeyCredential) {
    alert("Tu dispositivo no soporta autenticación biométrica.");
    abrirModalHistorial();
    return;
  }

  try {
    const disponible = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!disponible) {
      alert("Face ID / Touch ID no están disponibles en este dispositivo.");
      return;
    }

    let credentialIdRaw = localStorage.getItem('orion_biometric_id');

    if (!credentialIdRaw) {
      // === PASO A: REGISTRO (Primer clic en el iPhone) ===
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { 
            name: "ORION App" 
            // SOLUCIÓN: Elimino 'id' para que el navegador asigne el dominio nativo automáticamente
          },
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
      // === PASO B: VERIFICACIÓN (A partir del segundo clic) ===
      const idBytes = Uint8Array.from(atob(credentialIdRaw), c => c.charCodeAt(0));
      
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          // SOLUCIÓN: Eliminamos 'rpId' para que coincida con el comportamiento automático del Paso A
          allowCredentials: [{
            type: "public-key",
            id: idBytes
          }],
          userVerification: "required"
        }
      });

      if (assertion) {
        abrirModalHistorial();
      }
    }

  } catch (e) {
    alert("Acceso denegado o cancelación de Face ID.");
    console.error("Error en Face ID:", e);
  }
});

// --- VALIDADOR ESTRICTO DE MATEMÁTICAS ---
function esMatematica(q) {
  q = q.toLowerCase();
  const palabrasClave = ["suma","resta","multiplica","divide","cuanto es","cuánto es","resuelve","calcula","porcentaje","raiz","raíz","potencia","ecuacion","ecuación","integral","derivada","seno","coseno","matematicas","matemáticas","numero","número"];
  const tienePalabra = palabrasClave.some(p => q.includes(p));
  const tieneNumero = /\d/.test(q);
  const tieneSimbolo = /[\+\*\/\=\%\(\)\^\-]/.test(q); // Guion corregido al final
  return tienePalabra || (tieneNumero && tieneSimbolo) || (tieneNumero && q.length < 20);
}
async function preguntarOrionAI(texto, esModoMaths = false) {
  try {
    const systemPrompt = esModoMaths 
      ? "Eres el módulo de Matemáticas de ORION. Eres estrictamente preciso, directo y resuelves operaciones y problemas matemáticos paso a paso de forma clara, fría y analítica. No uses emojis ni hables de otros temas."
      : "Eres ORION AI, eres un asistente súper amigable, buena onda, hablas como un amigo mexicano de 20 años pero respetuoso. SIEMPRE respondes en español. Usas emojis de vez en cuando. Respondes de forma útil, divertida y clara, no como Wikipedia aburrida.";

    const res = await fetch(" https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: texto }
        ]
      })
    });
    
    const data = await res.json();
    
    if (data.error) {
      return `ERROR DE GROQ: ${data.error.message}`;
    }
    
    // CORREGIDO: data.choices[0].message.content
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      return "Servidor ORION AI listo. Módulo en espera de activación por API Key.";
    }
  } catch (err) {
    // Si falla el internet o la sintaxis, te dirá qué línea falló
    return `❌ ERROR DE CÓDIGO INTERNO: ${err.message}`;
  }
}
// Variable temporal para reasignar los clics al volver
let paginasRespaldadasMemoria = [];
// --- FUNCIÓN PARA LEER EL ARTÍCULO COMPLETO DE WIKIPEDIA DENTRO DE LA APP ---
window.verArticuloCompleto = async function(title, lang, imgUrl) {
  // REGISTRO EN FOTO A LA LISTA DE RESULTADOS ANTES DE QUE SE BORRE DE LA PANTALLA
  window.respaldoResultadosHTML = resultadosDiv.innerHTML;

  resultadosDiv.innerHTML = `<p class="loading-text">Abriendo el artículo <b>${title}</b>...</p>`;
  try {
    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=0&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`);
    const data = await res.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    const textoCompleto = pages[pageId].extract || "No se pudo recuperar el cuerpo del texto.";

    let headerImagen = imgUrl && imgUrl !== 'null' 
      ? `<img src="${imgUrl}" class="article-img" style="max-width:100%; height:auto; max-height:400px; object-fit:contain; margin-bottom:20px; border-radius:12px; border:1px solid var(--border-color);">` 
      : '';

    resultadosDiv.innerHTML = `
      <button class="btn-volver" onclick="volverAResultados()">← Volver a los resultados</button>
      <h2 style="margin-top:15px; margin-bottom:15px; font-size:26px;">${title}</h2>
      ${headerImagen}
      <div class="article-text" style="font-size:16px; line-height:1.7; text-align:justify; white-space:pre-wrap;">${textoCompleto}</div>
      <a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" class="wiki-link" style="display:inline-block; margin-top:25px;">Leer artículo original en Wikipedia externa →</a>
    `;

    guardarEnHistorial(title, title);

    setTimeout(()=>{
      const btnHeart = document.createElement('button');
      let hist = JSON.parse(localStorage.getItem('orion_history') || '[]');
      const esLike = hist.find(h=>h.titulo===title)?.like;
      btnHeart.innerText = esLike ? 'GUARDADO EN FAVORITOS' : 'GUARDAR EN FAVORITOS';
      btnHeart.style.cssText = "padding:8px 16px; border-radius:20px; border:1px solid var(--border-color); background:transparent; cursor:pointer; margin-bottom:15px; font-size:12px; letter-spacing:0.5px;";
      btnHeart.onclick = () => { toggleLike(title); btnHeart.innerText = 'GUARDADO EN FAVORITOS'; };
      resultadosDiv.prepend(btnHeart);
    }, 100);

  } catch (err) {
    resultadosDiv.innerHTML = `
      <button class="btn-volver" onclick="volverAlInicio()">← Volver a los resultados</button>
      <p style="margin-top:15px; color:#ff4d4d;">Error al abrir el texto completo: ${err}</p>
    `;
  }
};

// Reasignar los clics nativos a las tarjetas cuando se restaura el HTML guardado
function recomponerEventosEnlaces() {
  const enlaces = resultadosDiv.querySelectorAll('.enlace-articulo');
  const lang = langSelect.value || 'es';
  enlaces.forEach((enlace, index) => {
    if (paginasRespaldadasMemoria[index]) {
      const item = paginasRespaldadasMemoria[index];
      enlace.addEventListener('click', (e) => {
        e.preventDefault();
        window.verArticuloCompleto(item.title, lang, item.thumbnail ? item.thumbnail.source : null);
      });
    }
  });
}

// --- PROCESAMIENTO DEL BUSCADOR ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;

  const engine = aiEngineSelect.value;
  const lang = langSelect.value || 'es';
  
  home.classList.add('hidden');
  resultadosDiv.classList.remove('hidden');
  resultadosDiv.innerHTML = `<p class="loading-text">Buscando <b>${q}</b>...</p>`;

  window.respaldoResultadosHTML = "";
  paginasRespaldadasMemoria = [];

  // === MOTOR: ORION AI O MATHS ===
  if (engine === 'orionai' || engine === 'maths') {
    if (engine === 'maths' && !esMatematica(q)) {
      resultadosDiv.innerHTML = `
        <button class="btn-volver" onclick="volverAlInicio()">← Volver</button>
        <div style="margin-top:20px; padding:20px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; text-align:center">
          <h2 style="color:#ff4d4d; margin-bottom:10px;">ERROR: CONTROL MATEMÁTICO</h2>
          <p style="margin-bottom:10px;">Por favor, introduce una consulta numérica o matemática válida.</p>
          <p style="font-size:14px; opacity:0.7;">Si deseas buscar información general, cambia el motor de búsqueda a <b>ORION AI</b> en la barra superior.</p>
        </div>
      `;
      return;
    }

    resultadosDiv.innerHTML = `<p class="loading-text">ORION procesando tu consulta sobre <b>${q}</b>...</p>`;
    const respuesta = await preguntarOrionAI(q, engine === 'maths');
    let fotosHtml = '';

    const esNumero = /^\d+[\s\d\-\+\*\/\.]*$/.test(q);
    if (engine === 'orionai' && !esNumero) {
      try {
        const urlWikiImages = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=pageimages&format=json&pithumbsize=400&origin=*`;
        const r = await fetch(urlWikiImages);
        const dataWiki = await r.json();
        
        if (dataWiki.query && dataWiki.query.pages) {
          const urls = Object.values(dataWiki.query.pages).map(p => p.thumbnail?.source).filter(Boolean);
          if (urls.length > 0) {
            fotosHtml = `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:12px; margin-top:20px;">${urls.map(s => `<img src="${s}" style="width:100%; height:130px; object-fit:cover; border-radius:12px; border:1px solid var(--border-color);">`).join('')}</div>`;
          }
        }
      } catch (e) {
        console.error("Error al recuperar imágenes ilustrativas:", e);
      }
    }

    resultadosDiv.innerHTML = `
      <button class="btn-volver" onclick="volverAlInicio()">← Volver</button>
      <div style="white-space:pre-wrap; line-height:1.6; margin-top:15px; font-size:16px;">${respuesta}</div>
      ${fotosHtml}
    `;
    return;
  }

  // === MOTOR: WIKIPEDIA ===
  if (engine === 'wikipedia') {
    try {
      const urlCompleta = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=10&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=500&pilimit=max&exintro=1&explaintext=1&exsentences=2&exlimit=max&format=json&origin=*`;
      
      const resp = await fetch(urlCompleta);
      const d = await resp.json();
      
      if (!d.query || !d.query.pages) {
        resultadosDiv.innerHTML = `
          <button class="btn-volver" onclick="volverAlInicio()">← Volver</button>
          <p style="margin-top:15px; text-align:center;">No se encontraron resultados en Wikipedia para tu búsqueda.</p>
        `;
        return;
      }

      resultadosDiv.innerHTML = `
        <button class="btn-volver" onclick="volverAlInicio()">← Volver al inicio</button>
        <h3 style="margin-top:15px; margin-bottom:20px;">Resultados para "${q}":</h3>
      `;

      const paginas = Object.values(d.query.pages);
      paginasRespaldadasMemoria = paginas;
      
      paginas.forEach(item => {
        const fotoUrl = item.thumbnail ? item.thumbnail.source : null;
        const textoLimpio = item.extract ? item.extract : "Sin resumen disponible.";
        
        const tarjeta = document.createElement('article');
        tarjeta.className = 'result-item';
        tarjeta.style.cssText = 'display:flex; gap:16px; margin-bottom:20px; align-items:flex-start; background:var(--bg-card); padding:14px; border-radius:12px; border:1px solid var(--border-color);';

        tarjeta.innerHTML = `
          ${fotoUrl ? `<img src="${fotoUrl}" class="result-thumb" style="width:90px; height:90px; object-fit:cover; border-radius:8px; flex-shrink:0;">` : ''}
          <div class="result-body" style="flex:1;">
            <a href="#" class="enlace-articulo" style="font-weight:bold; font-size:18px; color:var(--link-color); text-decoration:none; display:block; margin-bottom:6px;">${item.title}</a>
            <p style="color:var(--text-secondary); font-size:14px; line-height:1.5; margin:0;">${textoLimpio}</p>
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
        <p style="margin-top:15px; color:#ff4d4d;">Error al conectar con Wikipedia: ${err}</p>
      `;
    }
  }
});

// --- LÓGICA DEL HISTORIAL (CORREGIDA Y SIN DUPLICADOS) ---
function renderHistorial(tipo) {
  const lista = document.getElementById('listaHistorial');
  const tabG = document.getElementById('tabGeneral');
  const tabL = document.getElementById('tabLikes');
  
  if(tipo === 'general') {
    tabG.style.background = 'var(--bg, #f5f5f5)';
    tabG.style.fontWeight = '600';
    tabL.style.background = 'transparent';
    tabL.style.fontWeight = '400';
  } else {
    tabL.style.background = 'var(--bg, #f5f5f5)';
    tabL.style.fontWeight = '600';
    tabG.style.background = 'transparent';
    tabG.style.fontWeight = '400';
  }

  let hist = JSON.parse(localStorage.getItem('orion_history') || '[]');
  if(tipo === 'likes') hist = hist.filter(h => h.like);

  if(hist.length === 0) {
    lista.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:40px; font-size:13px;">No hay registros en ${tipo.toUpperCase()}</p>`;
    return;
  }

    // Corregido: Limpia comillas simples en títulos para evitar errores de sintaxis en el HTML inline
  lista.innerHTML = hist.map(h => `
    <div onclick="volverAArticulo('${h.titulo.replace(/'/g, "\\'")}')" style="display:flex; justify-content:space-between; align-items:center; padding:14px; margin-bottom:8px; background:var(--bg-input); border:1px solid var(--border-input); border-radius:12px; cursor:pointer; color:var(--text-main);">
      <div style="flex:1;">
        <div style="font-weight:500; font-size:14px; margin-bottom:4px;">${h.titulo}</div>
        <div style="font-size:11px; opacity:0.6;">${h.fecha} - ${h.hora}</div>
      </div>
      <div style="font-size:10px; opacity:0.5; letter-spacing:1px;">${h.like ? 'FAV' : ''}</div>
    </div>
  `).join('');
}

function borrarSoloGeneral() {
  if(!confirm('¿Eliminar solo el historial general? Tus favoritos se conservarán.')) return;
  let hist = JSON.parse(localStorage.getItem('orion_history') || '[]');
  hist = hist.filter(h => h.like);
  localStorage.setItem('orion_history', JSON.stringify(hist));
  renderHistorial('general');
}

function volverAArticulo(titulo) {
  document.getElementById('historialModal').classList.add('hidden');
  window.verArticuloCompleto(titulo, langSelect.value || 'es', null);
}

function toggleLike(tituloActual) {
  let hist = JSON.parse(localStorage.getItem('orion_history') || '[]');
  hist = hist.map(h => {
    if(h.titulo === tituloActual) h.like = !h.like;
    return h;
  });
  localStorage.setItem('orion_history', JSON.stringify(hist));
}

function abrirModalHistorial() {
  const modal = document.getElementById('historialModal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  renderHistorial('general');
}
