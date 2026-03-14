export const ui = {
    init: () => {
        // 1. Subtítulos
        const sub = document.createElement('div');
        sub.id = 'subtitle-container';
        sub.style.cssText = "position:fixed; bottom:10%; width:100%; text-align:center; color:white; font-family: 'Courier New', monospace; font-size: 20px; text-shadow: 2px 2px 0 #000; pointer-events:none; opacity:0; transition: opacity 1s; z-index: 9000;";
        document.body.appendChild(sub);
        
        // 2. Pantalla Negra (Cortes de escena)
        const black = document.createElement('div');
        black.id = 'black-screen';
        black.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:black; opacity:0; pointer-events:none; transition: opacity 2s; z-index: 9500;";
        document.body.appendChild(black);

        // 3. Pantalla de Despertar (Ojos / Párpados)
        const wake = document.createElement('div');
        wake.id = 'wake-screen';
        wake.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:black; opacity:0; pointer-events:none; z-index: 9999;"; 
        document.body.appendChild(wake);

        // 4. EL SCREAMER (Imagen de Susto) 👻
        const screamer = document.createElement('div');
        screamer.id = 'screamer-face';
        screamer.style.cssText = `
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: black url('assets/images/screamer.png') no-repeat center center; 
            background-size: cover; 
            opacity: 0; 
            pointer-events: none; 
            z-index: 10000; 
        `; 
        document.body.appendChild(screamer);

        // --- 5. LÓGICA DEL MINI-JUEGO DE LA LAPTOP 💻 ---
        const slider = document.getElementById('signalSlider');
        const staticNoise = document.getElementById('staticNoise');
        const clearSignal = document.getElementById('clearSignal');
        const closeBtn = document.getElementById('closeLaptopBtn');
        
        const TARGET_FREQ = 68; // El número exacto donde la señal es perfecta

        if (slider) {
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const distance = Math.abs(value - TARGET_FREQ);
                
                // Opacidad de la estática basada en qué tan lejos estamos del 68
                let staticOpacity = distance / 15; 
                if (staticOpacity > 1) staticOpacity = 1;

                if (staticNoise) staticNoise.style.opacity = staticOpacity;
                if (clearSignal) clearSignal.style.opacity = 1 - staticOpacity;
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                ui.showLaptop(false);
            });
        }
    },

    // --- Control de Ojos ---
    setWakeOpacity: (opacity) => {
        const el = document.getElementById('wake-screen');
        if(el) {
            el.style.opacity = opacity;
            el.style.transition = "none"; 
        }
    },

    fadeOutWake: (duration = 4000) => {
        const el = document.getElementById('wake-screen');
        if(el) {
            el.style.transition = `opacity ${duration}ms ease-in-out`;
            requestAnimationFrame(() => { el.style.opacity = 0; });
        }
    },

    // --- Interfaz de Juego ---
    showInteract: (visible) => {
        let el = document.getElementById('interact-msg');
        if (!el) {
            el = document.createElement('div');
            el.id = 'interact-msg';
            el.innerText = "[ E ] CONTESTAR";
            el.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); color:white; font-family:monospace; border: 2px solid white; padding: 10px; display:none; z-index: 8000;";
            document.body.appendChild(el);
        }
        el.style.display = visible ? 'block' : 'none';
    },

    showCall: (visible) => {
        let el = document.getElementById('call-ui');
        if (!el) {
            el = document.createElement('div');
            el.id = 'call-ui';
            el.innerText = "📞 EN LLAMADA...";
            el.style.cssText = "position:fixed; top:20px; right:20px; color:#0f0; font-family:monospace; font-size: 20px; display:none; animation: blink 1s infinite; z-index: 8000;";
            const style = document.createElement('style');
            style.innerHTML = `@keyframes blink { 50% { opacity: 0; } }`;
            document.head.appendChild(style);
            document.body.appendChild(el);
        }
        el.style.display = visible ? 'block' : 'none';
    },

    showBlackScreen: (visible) => {
        const el = document.getElementById('black-screen');
        if(el) el.style.opacity = visible ? 1 : 0;
    },

    showSubtitle: (text, duration = 3000) => {
        const el = document.getElementById('subtitle-container');
        if (el) {
            el.innerText = text;
            el.style.opacity = 1;
            if (el.timeout) clearTimeout(el.timeout);
            el.timeout = setTimeout(() => {
                el.style.opacity = 0;
            }, duration);
        }
    },

    // --- NUEVA UI: MOSTRAR/OCULTAR LAPTOP ---
    showLaptop: (show) => {
        const laptopUI = document.getElementById('laptopUI');
        if (!laptopUI) return;

        if (show) {
            laptopUI.style.display = 'flex';
            // Liberamos el cursor para que el jugador pueda usar el mouse en el slider
            document.exitPointerLock(); 
        } else {
            laptopUI.style.display = 'none';
            // Al cerrar, volvemos a bloquear el cursor para seguir jugando
            document.body.requestPointerLock();
        }
    },

    // --- EFECTO SCREAMER ---
    triggerScreamerEffect: () => {
        const el = document.getElementById('screamer-face');
        if(el) {
            el.style.opacity = 1; 
            el.style.transition = "transform 0.1s";
            el.style.transform = "scale(1.2)";

            setTimeout(() => {
                el.style.opacity = 0;
                el.style.transform = "scale(1.0)";
            }, 400); 
        }
    }
};

export function initUI() { ui.init(); }