// ─────────────────────────────────────────────────────────────────────────────
//  loadingScreen.js — Pantalla de carga con logo de Zada Studios
//
//  Flujo:
//  1. Aparece el logo de Zada con fade in suave
//  2. La barra carga los assets en paralelo
//  3. Mínimo 5 segundos de pantalla para que se sienta intencional
//  4. Fade out suave antes de mostrar el menú
// ─────────────────────────────────────────────────────────────────────────────

const MIN_DURATION = 5000; // ms mínimos en pantalla aunque los assets carguen antes
const FADE_DURATION = 1200; // ms del fade out final

const CSS = `
  #ls-root {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3rem;
    opacity: 0;
    pointer-events: all;
    transition: opacity ${FADE_DURATION}ms ease;
  }
  #ls-root.visible  { opacity: 1; }
  #ls-root.fade-out { opacity: 0; pointer-events: none; }

  /* Logo Zada */
  #ls-logo-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 1.4s ease, transform 1.4s ease;
  }
  #ls-logo-wrap.show { opacity: 1; transform: translateY(0); }

  #ls-logo {
    width: clamp(60px, 10vw, 100px);
    height: auto;
    filter: grayscale(1) brightness(0.7);
    opacity: 0.85;
  }

  #ls-studio {
    font-family: 'Cinzel', serif;
    font-size: clamp(0.55rem, 1.2vw, 0.75rem);
    letter-spacing: 0.55rem;
    color: rgba(160,160,160,0.45);
    text-transform: uppercase;
  }

  /* Separador */
  #ls-divider {
    width: clamp(80px, 15vw, 140px);
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(180,180,180,0.12), transparent);
    opacity: 0;
    transition: opacity 1s ease 0.6s;
  }
  #ls-logo-wrap.show ~ #ls-divider { opacity: 1; }

  /* Título del juego */
  #ls-game-title {
    font-family: 'Cinzel', serif;
    font-size: clamp(1rem, 2.5vw, 1.6rem);
    font-weight: 900;
    letter-spacing: 0.7rem;
    color: rgba(122, 191, 138, 0.0);
    text-shadow:
      0 0 10px rgba(80,160,90,0),
      0 0 30px rgba(60,120,60,0);
    filter: saturate(0.8);
    transition: color 1.6s ease 1s, text-shadow 1.6s ease 1s;
  }
  #ls-game-title.show {
    color: rgba(122, 191, 138, 0.75);
    text-shadow:
      0 0 10px rgba(80,160,90,0.45),
      0 0 30px rgba(60,120,60,0.18);
  }

  /* Barra de progreso */
  #ls-bar-wrap {
    width: clamp(180px, 35vw, 320px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    opacity: 0;
    transition: opacity 1s ease 1.8s;
  }
  #ls-bar-wrap.show { opacity: 1; }

  #ls-bar-track {
    width: 100%;
    height: 1px;
    background: rgba(255,255,255,0.05);
    border: none;
    position: relative;
    overflow: hidden;
  }

  #ls-bar-fill {
    height: 100%;
    width: 0%;
    background: rgba(122,191,138,0.7);
    box-shadow: 0 0 6px rgba(80,160,90,0.5);
    transition: width 0.5s ease;
  }

  #ls-status {
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    font-size: 0.5rem;
    letter-spacing: 0.3rem;
    color: rgba(110,110,110,0.3);
    text-transform: uppercase;
    text-align: center;
  }

  /* Scanlines */
  #ls-root::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px, transparent 2px,
      rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px
    );
    pointer-events: none;
    opacity: 0.35;
  }
`;

let _root      = null;
let _fill      = null;
let _status    = null;
let _progress  = 0;
let _assetsReady  = false;
let _startTime    = 0;
let _onDoneCb     = null;
let _logoWrap  = null;
let _gameTitle = null;
let _barWrap   = null;

export function initLoadingScreen() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    _root = document.createElement('div');
    _root.id = 'ls-root';
    _root.innerHTML = `
        <div id="ls-logo-wrap">
            <img id="ls-logo" src="assets/images/zada.png" alt="Zada Studios" />
            <div id="ls-studio">Zada Studios</div>
        </div>
        <div id="ls-divider"></div>
        <div id="ls-game-title">NIGHTFALL</div>
        <div id="ls-bar-wrap">
            <div id="ls-bar-track">
                <div id="ls-bar-fill"></div>
            </div>
            <div id="ls-status">Cargando...</div>
        </div>
    `;
    document.body.appendChild(_root);

    _fill      = document.getElementById('ls-bar-fill');
    _status    = document.getElementById('ls-status');
    _logoWrap  = document.getElementById('ls-logo-wrap');
    _gameTitle = document.getElementById('ls-game-title');
    _barWrap   = document.getElementById('ls-bar-wrap');

    _progress   = 0;
    _assetsReady = false;
    _startTime   = Date.now();

    // Fade in inicial
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            _root.classList.add('visible');
            // Logo aparece primero
            setTimeout(() => { _logoWrap.classList.add('show'); }, 200);
            // Título aparece después
            setTimeout(() => { _gameTitle.classList.add('show'); }, 600);
            // Barra aparece al final
            setTimeout(() => { _barWrap.classList.add('show'); }, 1800);
        });
    });
}

export function setLoadingProgress(progress, statusText = '') {
    _progress = Math.max(_progress, Math.min(progress, 0.99)); // no llegar al 100 hasta hideLoadingScreen
    const pct = Math.round(_progress * 100);
    if (_fill)   _fill.style.width  = `${pct}%`;
    if (_status && statusText) _status.textContent = statusText;
}

export function hideLoadingScreen(onDone) {
    if (!_root) { onDone?.(); return; }
    _onDoneCb    = onDone;
    _assetsReady = true;
    _tryFinish();
}

function _tryFinish() {
    if (!_assetsReady) return;

    const elapsed = Date.now() - _startTime;
    const remaining = Math.max(0, MIN_DURATION - elapsed);

    setTimeout(() => {
        // Completar la barra suavemente
        if (_fill)   _fill.style.width  = '100%';
        if (_status) _status.textContent = 'Listo';

        // Esperar un momento con la barra al 100% antes del fade
        setTimeout(() => {
            _root.classList.add('fade-out');
            _root.classList.remove('visible');
            setTimeout(() => {
                _root.remove();
                _root = null;
                _onDoneCb?.();
            }, FADE_DURATION);
        }, 600);
    }, remaining);
}

export function isLoadingVisible() {
    return !!_root;
}