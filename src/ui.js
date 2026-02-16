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
        // Configurado para buscar la imagen en tu carpeta local
        // Asegúrate de que la imagen exista en: public/assets/images/screamer.png
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

    // --- EFECTO SCREAMER ---
    triggerScreamerEffect: () => {
        const el = document.getElementById('screamer-face');
        if(el) {
            // 1. Aparece de golpe
            el.style.opacity = 1; 
            
            // 2. Efecto de "Zoom violento" hacia la cara
            el.style.transition = "transform 0.1s";
            el.style.transform = "scale(1.2)";

            // 3. Desaparece rápido (400ms)
            setTimeout(() => {
                el.style.opacity = 0;
                el.style.transform = "scale(1.0)";
            }, 400); 
        }
    }
};

export function initUI() { ui.init(); }