// --- src/laptopUI.js ---

export function initLaptop() {
    // 1. Inyectamos el HTML y CSS directo al body
    const laptopHTML = `
    <style>
        #laptopDesktop * { box-sizing: border-box; user-select: none; margin: 0; padding: 0; }
        #laptopDesktop { width: 100%; height: 100%; position: relative; overflow: hidden; font-family: -apple-system, 'Helvetica Neue', sans-serif; cursor: default; }
        #wallpaper { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%), linear-gradient(135deg, #2a1a0a 0%, #3d2a10 30%, #1a0f05 60%, #0d0804 100%); overflow: hidden; }
        .family-photo { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; }
        .photo-frame { position: relative; width: 75%; height: 75%; background: linear-gradient(160deg, #c8a96e 0%, #8b6a2f 40%, #5c3d15 100%); border: 3px solid #6b4c1e; box-shadow: 0 0 60px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.5); filter: sepia(0.8) contrast(0.85) brightness(0.7); overflow: hidden; }
        .photo-frame::before { content: ''; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E"); opacity: 0.5; z-index: 10; mix-blend-mode: overlay; }
        .figure { position: absolute; bottom: 15%; }
        .figure-adult { width: 80px; height: 160px; background: linear-gradient(180deg, #d4956a 0%, #8b5a3a 40%, #2a1a0a 100%); border-radius: 40px 40px 5px 5px; }
        .figure-adult::before { content: ''; position: absolute; top: -45px; left: 50%; transform: translateX(-50%); width: 55px; height: 55px; background: #c4845a; border-radius: 50%; box-shadow: inset -5px -5px 15px rgba(0,0,0,0.4); }
        .figure-child { width: 55px; height: 110px; background: linear-gradient(180deg, #d4956a 0%, #8b5a3a 40%, #2a1a0a 100%); border-radius: 28px 28px 5px 5px; }
        .figure-child::before { content: ''; position: absolute; top: -35px; left: 50%; transform: translateX(-50%); width: 40px; height: 40px; background: #c4845a; border-radius: 50%; box-shadow: inset -4px -4px 10px rgba(0,0,0,0.4); }
        .figure-1 { left: 20%; } .figure-2 { left: 38%; } .figure-3 { left: 54%; transform: scaleX(-1); } .figure-4 { left: 68%; }
        .figure-wrong { position: absolute; bottom: 12%; right: 8%; width: 65px; height: 140px; background: linear-gradient(180deg, #1a0a0a 0%, #0d0505 100%); border-radius: 33px 33px 5px 5px; filter: brightness(0.3); }
        .figure-wrong::before { content: ''; position: absolute; top: -40px; left: 50%; transform: translateX(-50%) rotate(180deg); width: 48px; height: 48px; background: #1a0a0a; border-radius: 50%; }
        .photo-text { position: absolute; bottom: 5%; left: 50%; transform: translateX(-50%); font-family: 'Courier New', monospace; font-size: 11px; color: rgba(200,160,80,0.7); letter-spacing: 2px; white-space: nowrap; z-index: 20; }
        .scratch { position: absolute; background: rgba(0,0,0,0.6); z-index: 15; }
        .scratch-1 { width: 2px; height: 40%; top: 10%; left: 45%; transform: rotate(5deg); }
        .scratch-2 { width: 1px; height: 25%; top: 30%; left: 62%; transform: rotate(-8deg); }
        #laptopMenubar { position: absolute; top: 0; left: 0; right: 0; height: 28px; background: rgba(20,10,5,0.85); backdrop-filter: blur(20px); display: flex; align-items: center; padding: 0 12px; z-index: 100; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .menubar-apple { font-size: 16px; margin-right: 16px; color: rgba(255,255,255,0.8); filter: grayscale(1); }
        .menubar-items { display: flex; gap: 16px; font-size: 13px; color: rgba(255,255,255,0.75); font-weight: 500; }
        .menubar-right { margin-left: auto; display: flex; gap: 14px; align-items: center; font-size: 12px; color: rgba(255,255,255,0.6); }
        #laptopClock { font-size: 12px; color: rgba(255,255,255,0.7); }
        .desktop-icon { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px; cursor: pointer; border-radius: 8px; transition: background 0.15s; width: 80px; }
        .desktop-icon:hover { background: rgba(255,255,255,0.12); }
        .desktop-icon.selected { background: rgba(100,150,255,0.3); }
        .icon-img { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 42px; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.8)); }
        .icon-label { font-size: 11px; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.9); text-align: center; line-height: 1.3; word-break: break-word; max-width: 75px; }
        .icon-mystery .icon-img { animation: iconFlicker 4s infinite; }
        @keyframes iconFlicker { 0%,95%,100% { opacity:1; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.8)); } 96% { opacity:0.3; filter: drop-shadow(0 0 15px rgba(255,0,0,0.5)); } 97% { opacity:1; } 98% { opacity:0.5; } }
        #laptopDock { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); display: flex; align-items: flex-end; gap: 6px; background: rgba(30,15,5,0.6); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 6px 12px; z-index: 100; box-shadow: 0 8px 32px rgba(0,0,0,0.8); }
        .dock-item { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; transition: transform 0.15s, filter 0.15s; border-radius: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
        .dock-item:hover { transform: translateY(-10px) scale(1.2); filter: drop-shadow(0 8px 16px rgba(0,0,0,0.8)); }
        .dock-separator { width: 1px; height: 40px; background: rgba(255,255,255,0.15); margin: 0 4px; }
        #appWindow { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 420px; background: #1e1e1e; border-radius: 12px; box-shadow: 0 25px 80px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.08); z-index: 200; overflow: hidden; animation: windowOpen 0.25s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes windowOpen { from { transform: translate(-50%,-50%) scale(0.7); opacity:0; } to { transform: translate(-50%,-50%) scale(1); opacity:1; } }
        .window-titlebar { height: 38px; background: linear-gradient(180deg, #3a1a1a 0%, #2a1010 100%); display: flex; align-items: center; padding: 0 14px; gap: 8px; cursor: move; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .traffic-light { width: 13px; height: 13px; border-radius: 50%; cursor: pointer; transition: filter 0.15s; }
        .tl-close { background: #ff5f56; box-shadow: 0 0 6px rgba(255,95,86,0.4); }
        .tl-min { background: #ffbd2e; box-shadow: 0 0 6px rgba(255,189,46,0.4); }
        .tl-max { background: #28c840; box-shadow: 0 0 6px rgba(40,200,64,0.4); }
        .traffic-light:hover { filter: brightness(1.3); }
        .window-title { flex:1; text-align:center; font-size:13px; font-weight:500; color:rgba(255,255,255,0.5); margin-left:-39px; }
        .window-body { padding: 20px; background: #111; }
        .app-label { font-size: 11px; color: rgba(255,255,255,0.35); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; font-family: 'Courier New', monospace; }
        #signalDisplay { width:100%; height:150px; background:#000; border: 1px solid rgba(255,255,255,0.1); border-radius:8px; margin-bottom:18px; position:relative; overflow:hidden; display:flex; justify-content:center; align-items:center; }
        #staticNoise { position:absolute; inset:0; background: repeating-radial-gradient(#000 0 0.0001%,#fff 0 0.0002%) 50% 0/2500px 2500px, repeating-conic-gradient(#000 0 0.0001%,#fff 0 0.0002%) 60% 60%/2500px 2500px; background-blend-mode:difference; animation: estatica 0.2s infinite alternate; opacity:1; z-index:2; }
        #clearSignal { position:absolute; z-index:1; opacity:0; transition:opacity 0.2s ease; text-align:center; }
        #clearSignal p { font-size:11px; color:#555; font-family:'Courier New',monospace; margin-bottom:6px; }
        #clearSignal h1 { color:lime; font-size:3.5em; text-shadow:0 0 20px lime, 0 0 40px lime; font-family:'Courier New',monospace; }
        .slider-label { font-size:11px; color:rgba(255,255,255,0.4); font-family:'Courier New',monospace; letter-spacing:1px; margin-bottom:8px; display:flex; justify-content:space-between; }
        #signalSlider { width:100%; cursor:pointer; -webkit-appearance:none; height:4px; background:linear-gradient(90deg,#333 0%,#ff3300 50%,#333 100%); border-radius:2px; outline:none; }
        #signalSlider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#fff; box-shadow:0 0 8px rgba(255,255,255,0.5); cursor:pointer; }
        .laptop-scanlines { position:absolute; inset:0; pointer-events:none; z-index:9998; background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px); }
        .icon-hint { position:absolute; bottom:75px; left:50%; transform:translateX(-50%); font-size:11px; color:rgba(255,255,255,0.3); font-family:'Courier New',monospace; letter-spacing:1px; animation:fadeHint 3s ease-in-out infinite; white-space:nowrap; z-index:50; }
        @keyframes fadeHint { 0%,100%{opacity:0.3;} 50%{opacity:0.7;} }
    </style>

    <div id="laptopUI" style="display:none; position:fixed; inset:0; z-index:10000;">
        <div id="laptopDesktop">
            <div class="laptop-scanlines"></div>
            <div id="wallpaper">
                <div class="family-photo">
                    <div class="photo-frame">
                        <div class="figure figure-adult figure-1"></div>
                        <div class="figure figure-adult figure-2"></div>
                        <div class="figure figure-adult figure-3"></div>
                        <div class="figure figure-child figure-4"></div>
                        <div class="figure-wrong"></div>
                        <div class="scratch scratch-1"></div>
                        <div class="scratch scratch-2"></div>
                        <div class="photo-text">VERANO — 199_</div>
                    </div>
                </div>
            </div>
            <div id="laptopMenubar">
                <span class="menubar-apple">&#63743;</span>
                <div class="menubar-items"><span>Finder</span><span>Archivo</span><span>Edición</span></div>
                <div class="menubar-right"><span>📶</span><span>🔋</span><span id="laptopClock">--:--</span></div>
            </div>
            <div class="desktop-icon icon-mystery" id="desktopIconObj" style="top:80px; right:30px;">
                <div class="icon-img">🖤</div>
                <div class="icon-label">????.app</div>
            </div>
            <div class="icon-hint">doble clic para abrir</div>
            <div id="laptopDock">
                <div class="dock-item">🗂️</div>
                <div class="dock-item" style="filter:grayscale(1) brightness(0.5)">🌐</div>
                <div class="dock-item" style="filter:grayscale(1) brightness(0.5)">📷</div>
                <div class="dock-separator"></div>
                <div class="dock-item icon-mystery" id="dockIconObj">🖤</div>
            </div>
            <div id="appWindow">
                <div class="window-titlebar" id="appTitlebar">
                    <div class="traffic-light tl-close" id="closeAppBtn"></div>
                    <div class="traffic-light tl-min"></div>
                    <div class="traffic-light tl-max"></div>
                    <div class="window-title">????.app</div>
                </div>
                <div class="window-body">
                    <div class="app-label">// Buscando frecuencia de audio oculta...</div>
                    <div id="signalDisplay">
                        <div id="staticNoise"></div>
                        <div id="clearSignal"><p>SEÑAL ESTABILIZADA</p><h1>[ 4 ]</h1></div>
                    </div>
                    <div class="slider-label"><span>SINTONIZADOR</span><span id="freqVal">0 MHz</span></div>
                    <input type="range" id="signalSlider" min="0" max="100" value="0">
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', laptopHTML);

    // 2. Agregamos toda la lógica JS que tenías en las etiquetas <script>
    function updateLaptopClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2,'0');
        const m = String(now.getMinutes()).padStart(2,'0');
        const el = document.getElementById('laptopClock');
        if (el) el.textContent = h + ':' + m;
    }
    updateLaptopClock();
    setInterval(updateLaptopClock, 1000);

    const desktopIcon = document.getElementById('desktopIconObj');
    const dockIcon = document.getElementById('dockIconObj');
    
    desktopIcon.onclick = () => {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        desktopIcon.classList.add('selected');
    };

    const openLaptopApp = () => {
        const win = document.getElementById('appWindow');
        win.style.display = 'block';
        win.style.animation = 'none';
        void win.offsetWidth; 
        win.style.animation = 'windowOpen 0.25s cubic-bezier(0.34,1.56,0.64,1)';
    };

    desktopIcon.ondblclick = openLaptopApp;
    dockIcon.ondblclick = openLaptopApp;

    document.getElementById('closeAppBtn').addEventListener('click', () => {
        const win = document.getElementById('appWindow');
        win.style.transition = 'all 0.15s ease';
        win.style.transform = 'translate(-50%,-50%) scale(0.8)';
        win.style.opacity = '0';
        setTimeout(() => {
            win.style.display = 'none';
            win.style.transform = '';
            win.style.opacity = '';
            win.style.transition = '';
            const slider = document.getElementById('signalSlider');
            if (slider) { slider.value = 0; slider.dispatchEvent(new Event('input')); }
        }, 150);
    });

    document.getElementById('signalSlider').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('freqVal').textContent = val + ' MHz';
        const dist = Math.abs(val - 68);
        let opacity = dist / 15;
        if (opacity > 1) opacity = 1;
        document.getElementById('staticNoise').style.opacity = opacity;
        document.getElementById('clearSignal').style.opacity = 1 - opacity;
    });

    const titlebar = document.getElementById('appTitlebar');
    const appWindow = document.getElementById('appWindow');
    let isDragging = false, startX, startY, winX, winY;
    
    titlebar.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = appWindow.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        winX = rect.left; winY = rect.top;
        appWindow.style.transform = 'none';
        appWindow.style.left = winX + 'px';
        appWindow.style.top = winY + 'px';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        appWindow.style.left = (winX + e.clientX - startX) + 'px';
        appWindow.style.top  = (winY + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', () => isDragging = false);

    setInterval(() => {
        if (Math.random() > 0.85) {
            const w = document.getElementById('wallpaper');
            if (w) {
                w.style.filter = 'hue-rotate(180deg) brightness(1.5)';
                setTimeout(() => { w.style.filter = ''; }, 80);
            }
        }
    }, 3000);
}

// 3. Función para mostrar/ocultar toda la interfaz
export function toggleLaptopUI(show) {
    const laptopUI = document.getElementById('laptopUI');
    if (!laptopUI) return;
    laptopUI.style.display = show ? 'block' : 'none';
}