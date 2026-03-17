// ─────────────────────────────────────────────────────────────────────────────
//  ui.js — HUD · PS1 monocromo · v3
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  :root {
    --hud-font:  'Share Tech Mono', 'Courier New', monospace;
    --hud-white: rgba(235, 235, 235, 0.95);
    --hud-dim:   rgba(185, 185, 185, 0.52);
    --hud-ghost: rgba(150, 150, 150, 0.28);
  }

  /* ── Misión top-right ── */
  #missionHUD {
    position: fixed;
    top: 16px; right: 16px;
    text-align: right;
    pointer-events: none;
    z-index: 8500;
    opacity: 0;
    transition: opacity 0.6s ease;
  }
  #missionHUD.visible { opacity: 1; }
  #mission-label {
    font-family: var(--hud-font);
    font-size: 7px; letter-spacing: 5px;
    color: var(--hud-ghost);
    text-transform: uppercase; margin-bottom: 4px;
  }
  #mission-text {
    font-family: var(--hud-font);
    font-size: 10px; letter-spacing: 2px;
    color: var(--hud-dim);
    text-transform: uppercase;
  }

  /* ── Subtítulos: texto puro, speaker con líneas ── */
  #subtitle-container {
    position: fixed;
    bottom: 100px;
    width: 100%; text-align: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.35s ease;
    z-index: 9000;
    padding: 0 10%;
  }
  #subtitle-container.visible { opacity: 1; }

  #subtitle-speaker {
    font-family: var(--hud-font);
    font-size: 10px; letter-spacing: 6px;
    color: rgba(210, 210, 210, 0.38);
    text-transform: uppercase;
    margin-bottom: 8px;
    min-height: 16px;
    display: flex; align-items: center;
    justify-content: center; gap: 14px;
  }
  #subtitle-speaker::before,
  #subtitle-speaker::after {
    content: '';
    flex: 0 0 28px; height: 1px;
    background: rgba(255,255,255,0.1);
  }
  #subtitle-text {
    font-family: var(--hud-font);
    font-size: 16px; letter-spacing: 0.3px;
    color: var(--hud-white);
    line-height: 1.65;
    text-shadow:
      0 0 10px rgba(0,0,0,1),
      0 0 4px  rgba(0,0,0,1),
       1px  1px 0 rgba(0,0,0,0.95),
      -1px -1px 0 rgba(0,0,0,0.95),
       1px -1px 0 rgba(0,0,0,0.95),
      -1px  1px 0 rgba(0,0,0,0.95);
    max-width: 680px; margin: 0 auto;
  }

  /* ── Llamada activa top-left — más presencia ── */
  #call-ui {
    position: fixed;
    top: 16px; left: 16px;
    display: none; align-items: center; gap: 10px;
    z-index: 8000; pointer-events: none;
    border: 1px solid rgba(220,220,220,0.16);
    padding: 8px 14px 8px 10px;
    background: rgba(0,0,0,0.65);
  }
  #call-ui.visible { display: flex; }
  #call-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #ccc;
    animation: callBlink 1.1s step-end infinite;
    flex-shrink: 0;
  }
  @keyframes callBlink { 0%,100%{opacity:1} 50%{opacity:0} }
  #call-info { display: flex; flex-direction: column; gap: 2px; }
  #call-name {
    font-family: var(--hud-font);
    font-size: 12px; letter-spacing: 4px;
    color: rgba(225,225,225,0.88);
    text-transform: uppercase;
  }
  #call-status {
    font-family: var(--hud-font);
    font-size: 7px; letter-spacing: 3px;
    color: rgba(160,160,160,0.4);
    text-transform: uppercase;
  }
  #call-waves {
    display: flex; align-items: flex-end;
    gap: 2px; height: 14px;
  }
  .call-wave { width: 3px; background: rgba(185,185,185,0.4); border-radius: 1px; }
  .call-wave:nth-child(1){animation:waveAnim 0.7s ease infinite 0.00s}
  .call-wave:nth-child(2){animation:waveAnim 0.7s ease infinite 0.18s}
  .call-wave:nth-child(3){animation:waveAnim 0.7s ease infinite 0.36s}
  .call-wave:nth-child(4){animation:waveAnim 0.7s ease infinite 0.54s}
  @keyframes waveAnim { 0%,100%{height:2px} 50%{height:14px} }

  /* ── Interact — mismo estilo que F linterna, abajo ── */
  #interact-msg {
    position: fixed;
    bottom: 52px; left: 50%;
    transform: translateX(-50%);
    text-align: center;
    pointer-events: none;
    z-index: 8000; display: none;
  }
  #interact-msg.visible { display: block; }
  #interact-key {
    font-family: var(--hud-font);
    font-size: 12px; letter-spacing: 5px;
    color: rgba(215,215,215,0.82);
    text-transform: uppercase;
    text-shadow:
      0 0 8px rgba(0,0,0,1),
      1px 1px 0 rgba(0,0,0,0.95),
      -1px -1px 0 rgba(0,0,0,0.95);
  }
  #interact-action {
    font-family: var(--hud-font);
    font-size: 8px; letter-spacing: 4px; margin-top: 5px;
    color: rgba(150,150,150,0.38);
    text-transform: uppercase;
    text-shadow: 0 0 4px rgba(0,0,0,1);
  }

  /* ── Pantallas ── */
  #black-screen {
    position: fixed; inset: 0; background: black;
    opacity: 0; pointer-events: none;
    transition: opacity 2s; z-index: 9500;
  }
  #wake-screen {
    position: fixed; inset: 0; background: black;
    opacity: 0; pointer-events: none; z-index: 9999;
  }
  #screamer-face {
    position: fixed; inset: 0;
    background: black center/cover no-repeat;
    opacity: 0; pointer-events: none; z-index: 10000;
  }
`;

export const ui = {
    init() {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        // Misión HUD
        const mission = document.createElement('div');
        mission.id = 'missionHUD';
        mission.innerHTML = `
            <div id="mission-label">objetivo</div>
            <div id="mission-text"></div>
        `;
        document.body.appendChild(mission);

        // Subtítulos
        const sub = document.createElement('div');
        sub.id = 'subtitle-container';
        sub.innerHTML = `
            <div id="subtitle-speaker"></div>
            <div id="subtitle-text"></div>
        `;
        document.body.appendChild(sub);

        // Llamada
        const call = document.createElement('div');
        call.id = 'call-ui';
        call.innerHTML = `
            <div id="call-dot"></div>
            <div id="call-info">
                <div id="call-name">DANIEL</div>
                <div id="call-status">EN LLAMADA</div>
            </div>
            <div id="call-waves">
                <div class="call-wave"></div>
                <div class="call-wave"></div>
                <div class="call-wave"></div>
                <div class="call-wave"></div>
            </div>
        `;
        document.body.appendChild(call);

        // Interact prompt — texto plano igual que F
        const interact = document.createElement('div');
        interact.id = 'interact-msg';
        interact.innerHTML = `
            <div id="interact-key">[ E ] CONTESTAR</div>
            <div id="interact-action"></div>
        `;
        document.body.appendChild(interact);

        // Pantallas
        ['black-screen', 'wake-screen'].forEach(id => {
            const el = document.createElement('div');
            el.id = id;
            document.body.appendChild(el);
        });

        const screamer = document.createElement('div');
        screamer.id = 'screamer-face';
        screamer.style.backgroundImage = "url('assets/images/screamer.png')";
        document.body.appendChild(screamer);
    },

    setMission(text) {
        const hud    = document.getElementById('missionHUD');
        const textEl = document.getElementById('mission-text');
        if (!hud || !textEl) return;
        textEl.textContent = text;
        hud.classList.add('visible');
    },

    clearMission() {
        document.getElementById('missionHUD')?.classList.remove('visible');
    },

    showSubtitle(raw, duration = 3000) {
        const container = document.getElementById('subtitle-container');
        const speakerEl = document.getElementById('subtitle-speaker');
        const textEl    = document.getElementById('subtitle-text');
        if (!container || !textEl) return;

        // "Personaje: 'texto'" → separar speaker del diálogo
        const match = raw.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            speakerEl.textContent = match[1].trim().toUpperCase();
            textEl.textContent    = match[2].trim();
        } else {
            speakerEl.textContent = '';
            textEl.textContent    = raw;
        }

        container.classList.add('visible');

        // Guardar cuántos ms le quedan — lo descuenta updateSubtitle(delta)
        // desde el game loop, así se congela automáticamente al pausar.
        container._subtitleMs = duration;
    },

    showCall(visible) {
        document.getElementById('call-ui')?.classList.toggle('visible', visible);
    },

    showInteract(visible, label = 'CONTESTAR') {
        const el    = document.getElementById('interact-msg');
        const keyEl = document.getElementById('interact-key');
        if (!el) return;
        if (keyEl) keyEl.textContent = `[ E ] ${label}`;
        el.classList.toggle('visible', visible);
    },

    setWakeOpacity(opacity) {
        const el = document.getElementById('wake-screen');
        if (el) { el.style.opacity = opacity; el.style.transition = 'none'; }
    },

    fadeOutWake(duration = 4000) {
        const el = document.getElementById('wake-screen');
        if (el) {
            el.style.transition = `opacity ${duration}ms ease-in-out`;
            requestAnimationFrame(() => { el.style.opacity = 0; });
        }
    },

    showBlackScreen(visible) {
        const el = document.getElementById('black-screen');
        if (el) el.style.opacity = visible ? 1 : 0;
    },

    triggerScreamerEffect() {
        const el = document.getElementById('screamer-face');
        if (!el) return;
        el.style.opacity    = 1;
        el.style.transition = 'transform 0.1s';
        el.style.transform  = 'scale(1.08)';
        setTimeout(() => {
            el.style.opacity   = 0;
            el.style.transform = 'scale(1.0)';
        }, 400);
    },

    showLaptop(show) {
        const laptopUI = document.getElementById('laptopUI');
        if (!laptopUI) return;
        if (show) { laptopUI.style.display = 'flex'; document.exitPointerLock(); }
        else       { laptopUI.style.display = 'none';  document.body.requestPointerLock(); }
    },
};

// Llamar desde el game loop con delta en segundos.
// Gestiona el tiempo restante del subtítulo sin setTimeout.
export function updateSubtitle(delta) {
    const container = document.getElementById('subtitle-container');
    if (!container || !container.classList.contains('visible')) return;
    if (container._subtitleMs == null) return;

    container._subtitleMs -= delta * 1000;
    if (container._subtitleMs <= 0) {
        container._subtitleMs = null;
        container.classList.remove('visible');
    }
}

export function initUI() { ui.init(); }