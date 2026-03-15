export const ui = {
    init: () => {
        // 1. Subtítulos PS1
        const sub = document.createElement('div');
        sub.id = 'subtitle-container';
        sub.style.cssText = `
            position: fixed;
            bottom: 18%;
            width: 100%;
            text-align: center;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.4s;
            z-index: 9000;
            padding: 0 10%;
        `;
        document.body.appendChild(sub);

        const subStyle = document.createElement('style');
        subStyle.textContent = `
            #subtitle-container span {
                display: inline-block;
                background: rgba(0,0,0,0.82);
                border-left: 2px solid rgba(200,160,80,0.7);
                padding: 6px 18px 6px 14px;
                font-family: 'Courier New', monospace;
                font-size: 15px;
                color: #e8e0cc;
                letter-spacing: 0.04em;
                line-height: 1.5;
                max-width: 700px;
            }
            #missionHUD {
                position: fixed;
                top: 20px;
                right: 20px;
                display: none;
                flex-direction: column;
                align-items: flex-end;
                gap: 3px;
                z-index: 8500;
                pointer-events: none;
            }
            #missionHUD.visible { display: flex; }
            #mission-label {
                font-family: 'Courier New', monospace;
                font-size: 7px;
                letter-spacing: 4px;
                color: rgba(200,160,80,0.5);
                text-transform: uppercase;
            }
            #mission-text {
                font-family: 'Courier New', monospace;
                font-size: 11px;
                letter-spacing: 1px;
                color: rgba(220,200,160,0.9);
                text-transform: uppercase;
                text-align: right;
                background: rgba(0,0,0,0.6);
                border-right: 2px solid rgba(200,160,80,0.6);
                padding: 4px 10px 4px 14px;
                max-width: 260px;
            }
        `;
        document.head.appendChild(subStyle);

        // 2. Pantalla negra
        const black = document.createElement('div');
        black.id = 'black-screen';
        black.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:black;opacity:0;pointer-events:none;transition:opacity 2s;z-index:9500;";
        document.body.appendChild(black);

        // 3. Pantalla despertar
        const wake = document.createElement('div');
        wake.id = 'wake-screen';
        wake.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:black;opacity:0;pointer-events:none;z-index:9999;";
        document.body.appendChild(wake);

        // 4. Screamer
        const screamer = document.createElement('div');
        screamer.id = 'screamer-face';
        screamer.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:black url('assets/images/screamer.png') no-repeat center center;background-size:cover;opacity:0;pointer-events:none;z-index:10000;";
        document.body.appendChild(screamer);

        // 5. Laptop
        const slider   = document.getElementById('signalSlider');
        const staticNoise = document.getElementById('staticNoise');
        const clearSignal = document.getElementById('clearSignal');
        const closeBtn = document.getElementById('closeLaptopBtn');
        const TARGET_FREQ = 68;
        if (slider) {
            slider.addEventListener('input', (e) => {
                const distance = Math.abs(parseInt(e.target.value) - TARGET_FREQ);
                let op = distance / 15;
                if (op > 1) op = 1;
                if (staticNoise) staticNoise.style.opacity = op;
                if (clearSignal) clearSignal.style.opacity = 1 - op;
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', () => { ui.showLaptop(false); });

        // 6. Misión HUD
        const mission = document.createElement('div');
        mission.id = 'missionHUD';
        mission.innerHTML = `
            <div id="mission-label">OBJETIVO</div>
            <div id="mission-text"></div>
        `;
        document.body.appendChild(mission);
    },

    setWakeOpacity: (opacity) => {
        const el = document.getElementById('wake-screen');
        if (el) { el.style.opacity = opacity; el.style.transition = "none"; }
    },

    fadeOutWake: (duration = 4000) => {
        const el = document.getElementById('wake-screen');
        if (el) {
            el.style.transition = `opacity ${duration}ms ease-in-out`;
            requestAnimationFrame(() => { el.style.opacity = 0; });
        }
    },

    showInteract: (visible) => {
        let el = document.getElementById('interact-msg');
        if (!el) {
            el = document.createElement('div');
            el.id = 'interact-msg';
            el.innerText = "[ E ] CONTESTAR";
            el.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-family:monospace;border:2px solid white;padding:10px;display:none;z-index:8000;";
            document.body.appendChild(el);
        }
        el.style.display = visible ? 'block' : 'none';
    },

    showCall: (visible) => {
        let el = document.getElementById('call-ui');
        if (!el) {
            el = document.createElement('div');
            el.id = 'call-ui';
            el.style.cssText = "position:fixed;top:24px;right:24px;display:none;z-index:8000;font-family:'Courier New',monospace;";
            el.innerHTML = `
                <style>
                    @keyframes callPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,255,80,0.4)}50%{box-shadow:0 0 0 8px rgba(0,255,80,0)} }
                    @keyframes waveBar  { 0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)} }
                    #call-inner{background:rgba(0,0,0,0.82);border:1px solid rgba(0,255,80,0.3);border-radius:6px;padding:12px 18px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(6px)}
                    #call-dot{width:9px;height:9px;border-radius:50%;background:#00ff50;animation:callPulse 1.2s ease infinite;flex-shrink:0}
                    #call-info{display:flex;flex-direction:column;gap:2px}
                    #call-name{font-size:13px;font-weight:bold;color:#fff;letter-spacing:0.05rem}
                    #call-status{font-size:10px;color:#00ff50;letter-spacing:0.12rem;text-transform:uppercase}
                    #call-timer{font-size:10px;color:#555;letter-spacing:0.08rem;margin-top:1px}
                    #call-waves{display:flex;align-items:center;gap:2px;height:20px;margin-left:4px}
                    .call-wave-bar{width:3px;background:rgba(0,255,80,0.6);border-radius:2px;height:100%;transform-origin:bottom}
                    .call-wave-bar:nth-child(1){animation:waveBar 0.6s ease infinite 0.0s}
                    .call-wave-bar:nth-child(2){animation:waveBar 0.6s ease infinite 0.15s}
                    .call-wave-bar:nth-child(3){animation:waveBar 0.6s ease infinite 0.3s}
                    .call-wave-bar:nth-child(4){animation:waveBar 0.6s ease infinite 0.45s}
                    .call-wave-bar:nth-child(5){animation:waveBar 0.6s ease infinite 0.6s}
                </style>
                <div id="call-inner">
                    <div id="call-dot"></div>
                    <div id="call-info">
                        <div id="call-name">❤ DANIEL</div>
                        <div id="call-status">EN LLAMADA</div>
                        <div id="call-timer">00:00</div>
                    </div>
                    <div id="call-waves">
                        <div class="call-wave-bar"></div>
                        <div class="call-wave-bar"></div>
                        <div class="call-wave-bar"></div>
                        <div class="call-wave-bar"></div>
                        <div class="call-wave-bar"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(el);
            let secs = 0;
            el._timerInterval = setInterval(() => {
                if (el.style.display === 'none') return;
                secs++;
                const m = String(Math.floor(secs / 60)).padStart(2, '0');
                const s = String(secs % 60).padStart(2, '0');
                const t = document.getElementById('call-timer');
                if (t) t.textContent = `${m}:${s}`;
            }, 1000);
        }
        el.style.display = visible ? 'block' : 'none';
        if (visible) { const t = document.getElementById('call-timer'); if (t) t.textContent = '00:00'; }
    },

    showBlackScreen: (visible) => {
        const el = document.getElementById('black-screen');
        if (el) el.style.opacity = visible ? 1 : 0;
    },

    showSubtitle: (text, duration = 3000) => {
        const el = document.getElementById('subtitle-container');
        if (el) {
            el.innerHTML = `<span>${text}</span>`;
            el.style.opacity = 1;
            if (el.timeout) clearTimeout(el.timeout);
            el.timeout = setTimeout(() => { el.style.opacity = 0; }, duration);
        }
    },

    setMission: (text) => {
        const hud    = document.getElementById('missionHUD');
        const textEl = document.getElementById('mission-text');
        if (!hud || !textEl) return;
        textEl.textContent = text;
        hud.classList.add('visible');
    },

    clearMission: () => {
        const hud = document.getElementById('missionHUD');
        if (hud) hud.classList.remove('visible');
    },

    showLaptop: (show) => {
        const laptopUI = document.getElementById('laptopUI');
        if (!laptopUI) return;
        if (show) { laptopUI.style.display = 'flex'; document.exitPointerLock(); }
        else       { laptopUI.style.display = 'none'; document.body.requestPointerLock(); }
    },

    triggerScreamerEffect: () => {
        const el = document.getElementById('screamer-face');
        if (el) {
            el.style.opacity = 1;
            el.style.transition = "transform 0.1s";
            el.style.transform = "scale(1.2)";
            setTimeout(() => { el.style.opacity = 0; el.style.transform = "scale(1.0)"; }, 400);
        }
    }
};

export function initUI() { ui.init(); }