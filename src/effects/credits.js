// ─────────────────────────────────────────────────────────────────────────────
//  CRÉDITOS FINALES — La Congregación del Séptimo Umbral
//  Llamar showCredits() para iniciar la secuencia
// ─────────────────────────────────────────────────────────────────────────────

export function showCredits(existingBlackDiv = null) {
    if (existingBlackDiv) setTimeout(() => existingBlackDiv.remove(), 300);

    // ── Audio Ambiental ────────────────────────────────────────────────────────
    let audioCtx = null;
    let masterGain = null;
    let noiseNode = null;
    let droneNodes = [];

    function initAudio() {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 4);
            masterGain.connect(audioCtx.destination);

            // ── Ruido de fondo filtrado (viento oscuro) ──
            const bufferSize = audioCtx.sampleRate * 4;
            const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886*b0 + white*0.0555179;
                b1 = 0.99332*b1 + white*0.0750759;
                b2 = 0.96900*b2 + white*0.1538520;
                b3 = 0.86650*b3 + white*0.3104856;
                b4 = 0.55000*b4 + white*0.5329522;
                b5 = -0.7616*b5 - white*0.0168980;
                data[i] = (b0+b1+b2+b3+b4+b5+b6+white*0.5362) * 0.11;
                b6 = white * 0.115926;
            }
            const noiseSource = audioCtx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            noiseSource.loop = true;

            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.value = 280;
            noiseFilter.Q.value = 0.7;

            const noiseGain = audioCtx.createGain();
            noiseGain.gain.value = 0.18;

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            noiseSource.start();
            noiseNode = noiseSource;

            // ── Drones (tonos oscuros superpuestos) ──
            const droneFreqs = [36.7, 55.0, 73.4, 110.0, 146.8];
            droneFreqs.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
                osc.frequency.value = freq;

                // vibrato sutil
                const lfo = audioCtx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.08 + idx * 0.03;
                const lfoGain = audioCtx.createGain();
                lfoGain.gain.value = freq * 0.004;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start();

                const oscFilter = audioCtx.createBiquadFilter();
                oscFilter.type = 'lowpass';
                oscFilter.frequency.value = 300 + idx * 80;
                oscFilter.Q.value = 1.2;

                const oscGain = audioCtx.createGain();
                oscGain.gain.value = 0.045 / (idx + 1);

                osc.connect(oscFilter);
                oscFilter.connect(oscGain);
                oscGain.connect(masterGain);
                osc.start();
                droneNodes.push(osc, lfo);
            });

            // ── Pulsos de bajo (latidos lentos) ──
            function schedulePulse(time) {
                const pulse = audioCtx.createOscillator();
                pulse.type = 'sine';
                pulse.frequency.setValueAtTime(55, time);
                pulse.frequency.exponentialRampToValueAtTime(30, time + 0.6);

                const pulseGain = audioCtx.createGain();
                pulseGain.gain.setValueAtTime(0, time);
                pulseGain.gain.linearRampToValueAtTime(0.22, time + 0.05);
                pulseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

                pulse.connect(pulseGain);
                pulseGain.connect(masterGain);
                pulse.start(time);
                pulse.stop(time + 0.9);
            }

            let pulseTime = audioCtx.currentTime + 2;
            const interval = setInterval(() => {
                if (!audioCtx || audioCtx.state === 'closed') { clearInterval(interval); return; }
                schedulePulse(pulseTime);
                pulseTime += 3.8 + Math.random() * 1.4;
            }, 3800);

            // ── Reverb convolution ──
            const convolver = audioCtx.createConvolver();
            const revLen = audioCtx.sampleRate * 3;
            const revBuf = audioCtx.createBuffer(2, revLen, audioCtx.sampleRate);
            for (let c = 0; c < 2; c++) {
                const d = revBuf.getChannelData(c);
                for (let i = 0; i < revLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/revLen, 2.5);
            }
            convolver.buffer = revBuf;
            const dryGain = audioCtx.createGain(); dryGain.gain.value = 0.6;
            const wetGain = audioCtx.createGain(); wetGain.gain.value = 0.4;
            masterGain.connect(dryGain);
            masterGain.connect(convolver);
            convolver.connect(wetGain);
            dryGain.connect(audioCtx.destination);
            wetGain.connect(audioCtx.destination);

        } catch(e) { console.warn('Audio no disponible:', e); }
    }

    function stopAudio(fadeDuration = 3000) {
        if (!audioCtx || !masterGain) return;
        masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeDuration / 1000);
        setTimeout(() => { try { audioCtx.close(); } catch(e){} }, fadeDuration + 200);
    }

    // ── DOM Root ────────────────────────────────────────────────────────────────
    const root = document.createElement('div');
    root.style.cssText = `
        position:fixed;inset:0;background:#000;z-index:100000;
        display:flex;align-items:center;justify-content:center;
        font-family:'Cinzel',serif;
        cursor:none;
        overflow:hidden;
    `;

    // ── Canvas de partículas globales ──
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;';
    root.appendChild(canvas);

    // ── Capa de grain/ruido ──
    const grainCanvas = document.createElement('canvas');
    grainCanvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;opacity:0.045;mix-blend-mode:overlay;';
    root.appendChild(grainCanvas);

    // ── Vignette ──
    const vignette = document.createElement('div');
    vignette.style.cssText = `
        position:absolute;inset:0;pointer-events:none;z-index:3;
        background:radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%);
    `;
    root.appendChild(vignette);

    // ── Scanlines ──
    const scanlines = document.createElement('div');
    scanlines.style.cssText = `
        position:absolute;inset:0;pointer-events:none;z-index:3;
        background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
    `;
    root.appendChild(scanlines);

    root.innerHTML += `<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Cinzel+Decorative:wght@400;700;900&family=Crimson+Text:ital,wght@0,400;1,400;1,600&display=swap" rel="stylesheet">`;

    const slide = document.createElement('div');
    slide.id = 'c-slide';
    slide.style.cssText = 'text-align:center;width:100%;padding:0 40px;position:relative;z-index:10;';
    root.appendChild(slide);

    document.body.appendChild(root);

    // ── Re-append canvas (innerHTML sobrescribió) ──
    root.insertBefore(canvas, root.firstChild);
    root.insertBefore(grainCanvas, canvas.nextSibling);

    // ── Grain animado ──
    function animateGrain() {
        const gc = grainCanvas.getContext('2d');
        grainCanvas.width = window.innerWidth;
        grainCanvas.height = window.innerHeight;
        function drawGrain() {
            const id = gc.createImageData(grainCanvas.width, grainCanvas.height);
            const d = id.data;
            for (let i = 0; i < d.length; i += 4) {
                const v = Math.random() * 255 | 0;
                d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
            }
            gc.putImageData(id, 0, 0);
            requestAnimationFrame(drawGrain);
        }
        drawGrain();
    }
    animateGrain();

    // ── Sistema de partículas global en canvas ──
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    class Particle {
        constructor(intense = false) { this.reset(intense); }
        reset(intense = false) {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 10;
            this.size = intense ? 1.5 + Math.random() * 3 : 0.5 + Math.random() * 1.5;
            this.speedY = intense ? 0.4 + Math.random() * 1.2 : 0.2 + Math.random() * 0.6;
            this.speedX = (Math.random() - 0.5) * (intense ? 0.8 : 0.3);
            this.opacity = 0;
            this.maxOpacity = intense ? 0.4 + Math.random() * 0.5 : 0.1 + Math.random() * 0.3;
            this.life = 0;
            this.maxLife = intense ? 180 + Math.random() * 120 : 200 + Math.random() * 200;
            this.hue = intense ? `rgba(${40+Math.random()*60|0},${160+Math.random()*60|0},${60+Math.random()*40|0},` : `rgba(${20+Math.random()*40|0},${80+Math.random()*60|0},${30+Math.random()*30|0},`;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.02 + Math.random() * 0.03;
            this.intense = intense;
        }
        update() {
            this.life++;
            this.wobble += this.wobbleSpeed;
            this.x += this.speedX + Math.sin(this.wobble) * 0.3;
            this.y -= this.speedY;
            const t = this.life / this.maxLife;
            this.opacity = t < 0.2 ? (t/0.2)*this.maxOpacity : t > 0.7 ? ((1-t)/0.3)*this.maxOpacity : this.maxOpacity;
            if (this.life >= this.maxLife || this.y < -20) this.reset(this.intense);
        }
        draw() {
            ctx.save();
            ctx.beginPath();
            if (this.intense) {
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(60,200,80,0.8)`;
            }
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `${this.hue}${this.opacity})`;
            ctx.fill();
            ctx.restore();
        }
    }

    let particleIntensity = false;
    for (let i = 0; i < 60; i++) {
        const p = new Particle(false);
        p.life = Math.random() * p.maxLife;
        particles.push(p);
    }

    let intensePack = [];
    function enableIntenseParticles() {
        particleIntensity = true;
        for (let i = 0; i < 120; i++) {
            const p = new Particle(true);
            p.life = Math.random() * p.maxLife * 0.3;
            intensePack.push(p);
        }
    }
    function disableIntenseParticles() {
        particleIntensity = false;
        intensePack = [];
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        [...particles, ...intensePack].forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // ── Slides ─────────────────────────────────────────────────────────────────
    const slides = [
        // FIN
        {
            duration: 5000,
            onEnter: () => disableIntenseParticles(),
            html: `
                <style>
                    @keyframes fin-reveal {
                        0%   { opacity:0; letter-spacing:2rem; filter:blur(12px); }
                        100% { opacity:1; letter-spacing:0.4rem; filter:blur(0); }
                    }
                    @keyframes fin-flicker {
                        0%,92%,94%,100% { opacity:1; }
                        93%  { opacity:0.4; }
                    }
                    @keyframes sub-title-in {
                        0%   { opacity:0; transform:translateY(-6px); }
                        100% { opacity:1; transform:translateY(0); }
                    }
                    @keyframes line-expand {
                        0%   { width:0; opacity:0; }
                        100% { width:180px; opacity:1; }
                    }
                    .fin-wrap { display:flex;flex-direction:column;align-items:center;gap:1.4rem; }
                    .fin-subtitle { font-family:'Cinzel',serif;font-size:clamp(0.65rem,1.2vw,0.85rem);letter-spacing:0.55rem;color:rgba(120,200,130,0.8);text-transform:uppercase;animation:sub-title-in 2s ease forwards;animation-delay:0.3s;opacity:0;filter:saturate(0.8); }
                    .fin-text { font-family:'Cinzel Decorative',serif;font-size:clamp(5rem,13vw,9rem);font-weight:900;color:#7abf8a;letter-spacing:0.4rem;animation:fin-reveal 2.5s ease forwards,fin-flicker 8s step-end infinite;animation-delay:0.6s,3s;opacity:0;filter:saturate(0.82) brightness(0.95);text-shadow:-1px -1px 0 rgba(0,0,0,0.98),1px -1px 0 rgba(0,0,0,0.98),-1px 1px 0 rgba(0,0,0,0.98),1px 1px 0 rgba(0,0,0,0.98),0 0 3px rgba(200,255,210,0.5),0 0 18px rgba(80,160,90,0.55),0 0 45px rgba(60,110,40,0.25),0 0 80px rgba(50,100,30,0.12); }
                    .fin-line { height:1px;background:linear-gradient(90deg,transparent,rgba(80,160,70,0.6),transparent);animation:line-expand 1.5s ease forwards;animation-delay:1.8s;width:0;opacity:0; }
                </style>
                <div class="fin-wrap">
                    <div class="fin-subtitle">NIGHTFALL</div>
                    <div class="fin-text">FIN</div>
                    <div class="fin-line"></div>
                </div>
            `
        },
        // Diseño y desarrollo
        {
            duration: 3800,
            onEnter: () => {},
            html: creditSlide('Diseño y desarrollo', 'Daniel López')
        },
        // Historia
        {
            duration: 3800,
            onEnter: () => {},
            html: creditSlide('Historia y narrativa', 'Daniel López')
        },
        // Arte
        {
            duration: 3800,
            onEnter: () => {},
            html: creditSlide('Arte y modelos 3D', 'Daniel López', 'Modelos externos — Poly Pizza')
        },
        // Audio
        {
            duration: 3800,
            onEnter: () => {},
            html: creditSlide('Música y sonido', 'Daniel López', 'Efectos de sonido — SoundFree')
        },
        // Mensaje para Zare
        {
            fadeFromBlack: true,
            duration: 16000,
            onEnter: () => enableIntenseParticles(),
            html: `
                <style>
                    @keyframes z-name-in {
                        0%   { opacity:0; transform:scale(0.85) translateY(20px); filter:blur(10px); letter-spacing:1.5rem; }
                        60%  { opacity:0.9; filter:blur(1px); }
                        100% { opacity:1; transform:scale(1) translateY(0); filter:blur(0); letter-spacing:0.5rem; }
                    }
                    @keyframes z-sub-in {
                        0%   { opacity:0; transform:translateY(10px); }
                        100% { opacity:1; transform:translateY(0); }
                    }
                    @keyframes z-glow {
                        0%,100% { text-shadow:-1px -1px 0 rgba(0,0,0,0.98),1px 1px 0 rgba(0,0,0,0.98),0 0 3px rgba(200,255,210,0.5),0 0 40px rgba(80,180,90,0.5),0 0 80px rgba(60,140,70,0.2); }
                        50%     { text-shadow:-1px -1px 0 rgba(0,0,0,0.98),1px 1px 0 rgba(0,0,0,0.98),0 0 6px rgba(200,255,210,0.7),0 0 60px rgba(80,200,90,0.65),0 0 120px rgba(60,160,70,0.3),0 0 200px rgba(40,120,50,0.12); }
                    }
                    @keyframes z-heart {
                        0%,100% { transform:scale(1) rotate(-5deg);   opacity:0.6; }
                        25%     { transform:scale(1.3) rotate(0deg);   opacity:1; }
                        50%     { transform:scale(1.15) rotate(5deg);  opacity:0.8; }
                        75%     { transform:scale(1.25) rotate(-2deg); opacity:1; }
                    }
                    @keyframes z-ring-pulse {
                        0%   { transform:translate(-50%,-50%) scale(0.8); opacity:0.6; }
                        100% { transform:translate(-50%,-50%) scale(2.5); opacity:0; }
                    }
                    @keyframes z-sigil-spin {
                        from { transform:rotate(0deg); }
                        to   { transform:rotate(360deg); }
                    }
                    @keyframes z-sigil-counter {
                        from { transform:rotate(0deg); }
                        to   { transform:rotate(-360deg); }
                    }
                    @keyframes z-crack {
                        0%,89%  { opacity:0; }
                        90%     { opacity:0.6; }
                        91%     { opacity:0; }
                        95%     { opacity:0.4; }
                        96%,100%{ opacity:0; }
                    }
                    @keyframes z-rune-in {
                        0%   { opacity:0; transform:scale(0) rotate(180deg); }
                        100% { opacity:0.12; transform:scale(1) rotate(0deg); }
                    }
                    @keyframes z-ember {
                        0%   { transform:translateY(0) translateX(0) rotate(0deg) scale(1); opacity:0; }
                        10%  { opacity:1; }
                        80%  { opacity:0.5; }
                        100% { transform:translateY(calc(-1 * var(--ey))) translateX(var(--ex)) rotate(var(--er)) scale(0.1); opacity:0; }
                    }
                    @keyframes z-blood-drip {
                        0%   { height:0; opacity:0.8; }
                        80%  { height:var(--dh); opacity:0.6; }
                        100% { height:var(--dh); opacity:0; }
                    }
                    @keyframes z-line-draw {
                        0%   { stroke-dashoffset: 1000; opacity:0.8; }
                        100% { stroke-dashoffset: 0; opacity:0.3; }
                    }
                    @keyframes z-halo-breathe {
                        0%,100% { transform:translate(-50%,-50%) scale(1);   opacity:0.15; }
                        50%     { transform:translate(-50%,-50%) scale(1.15); opacity:0.28; }
                    }

                    .z-root { position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;min-height:60vh; }

                    /* Halos de fondo */
                    .z-halo {
                        position:absolute;border-radius:50%;pointer-events:none;
                        top:50%;left:50%;
                        animation:z-halo-breathe 4s ease-in-out infinite;
                    }
                    .z-halo-1 { width:700px;height:700px;background:radial-gradient(ellipse,rgba(40,120,50,0.18) 0%,transparent 65%);animation-delay:0s; }
                    .z-halo-2 { width:400px;height:400px;background:radial-gradient(ellipse,rgba(60,160,70,0.12) 0%,transparent 60%);animation-delay:1.5s; }

                    /* Runas de fondo */
                    .z-rune {
                        position:absolute;pointer-events:none;
                        font-family:'Cinzel Decorative',serif;font-size:clamp(3rem,8vw,6rem);
                        color:rgba(60,140,60,0.08);
                        animation:z-rune-in 3s ease forwards;
                        opacity:0;
                    }

                    /* Anillos pulsantes */
                    .z-ring {
                        position:absolute;top:50%;left:50%;
                        border-radius:50%;border:1px solid rgba(70,160,80,0.35);
                        pointer-events:none;
                        animation:z-ring-pulse 3s ease-out infinite;
                    }
                    .z-ring-1 { width:200px;height:200px;animation-delay:0s; }
                    .z-ring-2 { width:200px;height:200px;animation-delay:1s; }
                    .z-ring-3 { width:200px;height:200px;animation-delay:2s; }

                    /* Símbolo / sello giratorio */
                    .z-sigil-wrap {
                        position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%);
                        pointer-events:none;
                        opacity:0;
                        transition:opacity 2s ease;
                    }
                    .z-sigil-wrap.visible { opacity:1; }
                    .z-sigil-outer {
                        width:320px;height:320px;
                        border:1px solid rgba(60,140,60,0.15);
                        border-radius:50%;
                        animation:z-sigil-spin 30s linear infinite;
                        display:flex;align-items:center;justify-content:center;
                        position:relative;
                    }
                    .z-sigil-inner {
                        width:240px;height:240px;
                        border:1px solid rgba(60,140,60,0.1);
                        border-radius:50%;
                        animation:z-sigil-counter 20s linear infinite;
                        display:flex;align-items:center;justify-content:center;
                    }
                    .z-sigil-dot {
                        position:absolute;width:4px;height:4px;
                        background:rgba(70,160,80,0.4);border-radius:50%;
                        box-shadow:0 0 6px rgba(80,180,80,0.6);
                    }

                    /* Texto del mensaje */
                    .z-pre  { font-family:'Crimson Text',Georgia,serif;font-style:italic;font-size:clamp(0.9rem,2vw,1.25rem);color:rgba(140,210,150,0.85);letter-spacing:0.2rem;animation:z-sub-in 2s ease forwards;animation-delay:1.2s;opacity:0;position:relative;z-index:5;filter:saturate(0.8); }
                    .z-name { font-family:'Cinzel Decorative',serif;font-size:clamp(3.5rem,9vw,7rem);font-weight:900;color:#7abf8a;letter-spacing:0.5rem;animation:z-name-in 3s cubic-bezier(0.16,1,0.3,1) forwards,z-glow 3.5s ease-in-out infinite;animation-delay:2s,5.5s;opacity:0;position:relative;z-index:5;filter:saturate(0.82) brightness(0.95); }
                    .z-post { font-family:'Crimson Text',Georgia,serif;font-style:italic;font-size:clamp(0.8rem,1.6vw,1.05rem);color:rgba(120,190,130,0.75);letter-spacing:0.15rem;animation:z-sub-in 2s ease forwards;animation-delay:3.8s;opacity:0;position:relative;z-index:5;filter:saturate(0.8); }

                    /* Corazón */
                    .z-heart-wrap { position:relative;z-index:5;animation:z-sub-in 1.5s ease forwards;animation-delay:4.5s;opacity:0; }
                    .z-heart { display:inline-block;font-size:1.6rem;color:#7abf8a;animation:z-heart 2s ease-in-out infinite;animation-delay:5s;filter:drop-shadow(0 0 10px rgba(80,180,90,0.6)) saturate(0.8); }

                    /* Brasas / partículas SVG */
                    .z-embers { position:absolute;inset:0;pointer-events:none;z-index:4;overflow:visible; }
                    .z-ember {
                        position:absolute;
                        width:var(--es);height:var(--es);
                        background:radial-gradient(circle,rgba(100,220,80,0.9),rgba(50,160,60,0.5),transparent);
                        border-radius:50%;
                        animation:z-ember var(--ed) ease-in infinite;
                        animation-delay:var(--ede);
                        bottom:var(--eb);left:var(--el);
                        opacity:0;
                    }

                    /* Grietas de luz */
                    .z-crack { position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:3;animation:z-crack 8s step-end infinite; }

                    /* Gotas de sangre */
                    .z-drip {
                        position:absolute;top:0;
                        width:1px;background:linear-gradient(to bottom,rgba(60,150,60,0.7),transparent);
                        animation:z-blood-drip var(--dt) ease-in forwards;
                        animation-delay:var(--dd);
                        left:var(--dx);--dh:var(--dheight);
                        opacity:0;
                    }

                    /* SVG de pentagrama/sello */
                    .z-svg-seal { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.07;pointer-events:none;animation:z-sigil-spin 60s linear infinite;z-index:2; }
                </style>

                <div class="z-root">
                    <!-- Halos -->
                    <div class="z-halo z-halo-1"></div>
                    <div class="z-halo z-halo-2"></div>

                    <!-- Sello SVG de fondo -->
                    <svg class="z-svg-seal" width="600" height="600" viewBox="0 0 600 600">
                        <circle cx="300" cy="300" r="280" fill="none" stroke="rgba(70,160,80,0.8)" stroke-width="0.8"/>
                        <circle cx="300" cy="300" r="230" fill="none" stroke="rgba(70,160,80,0.5)" stroke-width="0.5"/>
                        <circle cx="300" cy="300" r="180" fill="none" stroke="rgba(70,160,80,0.4)" stroke-width="0.5"/>
                        <!-- Pentagrama -->
                        <polygon points="300,52 567,430 82,168 518,168 33,430" fill="none" stroke="rgba(70,160,80,0.6)" stroke-width="0.8"/>
                        <!-- Runas alrededor -->
                        ${Array.from({length:12},(_,i)=>{
                            const a=(i/12)*Math.PI*2-Math.PI/2;
                            const r=255;
                            const x=300+r*Math.cos(a), y=300+r*Math.sin(a);
                            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="rgba(70,160,80,0.6)"/>`;
                        }).join('')}
                        <!-- Líneas internas -->
                        ${Array.from({length:6},(_,i)=>{
                            const a=(i/6)*Math.PI*2;
                            const x=300+180*Math.cos(a), y=300+180*Math.sin(a);
                            return `<line x1="300" y1="300" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(70,160,80,0.3)" stroke-width="0.5"/>`;
                        }).join('')}
                    </svg>

                    <!-- Anillos pulsantes -->
                    <div class="z-ring z-ring-1"></div>
                    <div class="z-ring z-ring-2"></div>
                    <div class="z-ring z-ring-3"></div>

                    <!-- Sello giratorio decorativo -->
                    <div class="z-sigil-wrap" id="zSigil">
                        <div class="z-sigil-outer">
                            ${Array.from({length:12},(_,i)=>{
                                const a=(i/12)*360;
                                const r=150;
                                const x=160+r*Math.cos(a*Math.PI/180);
                                const y=160+r*Math.sin(a*Math.PI/180);
                                return `<div class="z-sigil-dot" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;transform:translate(-50%,-50%);"></div>`;
                            }).join('')}
                            <div class="z-sigil-inner"></div>
                        </div>
                    </div>

                    <!-- Grieta de luz -->
                    <div class="z-crack" style="background:linear-gradient(135deg,transparent 48%,rgba(60,160,60,0.03) 50%,transparent 52%);"></div>

                    <!-- Gotas decorativas -->
                    ${Array.from({length:8},(_,i)=>
                        `<div class="z-drip" style="--dx:${8+i*12}%;--dt:${2+Math.random()*2}s;--dd:${3+Math.random()*5}s;--dheight:${30+Math.random()*80}px;"></div>`
                    ).join('')}

                    <!-- Brasas -->
                    <div class="z-embers">
                        ${Array.from({length:40},()=>{
                            const s=1+Math.random()*4;
                            return `<div class="z-ember" style="--es:${s}px;--ed:${3+Math.random()*5}s;--ede:${Math.random()*8}s;--eb:${Math.random()*30}%;--el:${Math.random()*100}%;--ey:${100+Math.random()*200}px;--ex:${(Math.random()-0.5)*80}px;--er:${Math.random()*360}deg;"></div>`;
                        }).join('')}
                    </div>

                    <!-- Runas flotantes -->
                    <div class="z-rune" style="top:10%;left:8%;animation-delay:2.5s;">✦</div>
                    <div class="z-rune" style="top:15%;right:10%;animation-delay:3s;">✧</div>
                    <div class="z-rune" style="bottom:18%;left:12%;animation-delay:3.5s;">⁂</div>
                    <div class="z-rune" style="bottom:12%;right:8%;animation-delay:4s;">✦</div>

                    <!-- Texto principal -->
                    <div class="z-pre">Para la persona que hace que todo valga la pena —</div>
                    <div class="z-name">Te amo, Zare</div>
                    <div class="z-post">En este mundo y en cualquier otro</div>
                    <div class="z-heart-wrap"><span class="z-heart">♥</span></div>
                </div>

                <script>
                    setTimeout(() => {
                        const s = document.getElementById('zSigil');
                        if (s) s.classList.add('visible');
                    }, 1000);
                <\/script>
            `
        },
        // Reiniciar
        {
            duration: 99999,
            onEnter: () => disableIntenseParticles(),
            html: `
                <style>
                    @keyframes restart-blink {
                        0%,49%,100% { opacity:0.3; }
                        50%,99%     { opacity:0.8; }
                    }
                </style>
                <div style="font-family:'Cinzel',serif;font-size:clamp(0.8rem,1.6vw,1.1rem);letter-spacing:0.55rem;color:rgba(120,200,130,0.9);text-transform:uppercase;animation:restart-blink 2.5s step-end infinite;filter:saturate(0.8);text-shadow:-1px -1px 0 rgba(0,0,0,0.95),1px 1px 0 rgba(0,0,0,0.95),0 0 14px rgba(70,160,80,0.4);">[ R ] &nbsp; Reiniciar</div>
            `
        },
    ];

    // ── Generador de slides de créditos ────────────────────────────────────────
    function creditSlide(role, name, sub = '') {
        return `
            <style>
                @keyframes cr-role-in {
                    0%   { opacity:0; letter-spacing:0.7rem; }
                    100% { opacity:1; letter-spacing:0.5rem; }
                }
                @keyframes cr-name-in {
                    0%   { opacity:0; transform:translateY(6px); filter:blur(4px); }
                    100% { opacity:1; transform:translateY(0); filter:blur(0); }
                }
                @keyframes cr-line-in {
                    0%   { width:0; }
                    100% { width:120px; }
                }
                @keyframes cr-sub-in {
                    0%   { opacity:0; }
                    100% { opacity:1; }
                }
            </style>
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.9rem;">
                <div style="font-family:'Cinzel',serif;font-size:clamp(0.55rem,1.1vw,0.75rem);letter-spacing:0.5rem;color:rgba(120,190,130,0.8);text-transform:uppercase;filter:saturate(0.8);animation:cr-role-in 1.5s ease forwards;">${role}</div>
                <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(80,160,70,0.6),transparent);animation:cr-line-in 1s ease forwards;animation-delay:0.3s;width:0;"></div>
                <div style="font-family:'Cinzel',serif;font-size:clamp(1.4rem,3.5vw,2.4rem);font-weight:600;color:#7abf8a;letter-spacing:0.3rem;animation:cr-name-in 1.5s ease forwards;animation-delay:0.5s;opacity:0;filter:saturate(0.82) brightness(0.95);text-shadow:-1px -1px 0 rgba(0,0,0,0.98),1px 1px 0 rgba(0,0,0,0.98),0 0 3px rgba(200,255,210,0.45),0 0 14px rgba(80,160,90,0.5),0 0 30px rgba(60,110,40,0.2);">${name}</div>
                ${sub ? `<div style="font-family:'Crimson Text',Georgia,serif;font-style:italic;font-size:clamp(0.7rem,1.4vw,0.9rem);color:rgba(100,170,110,0.7);margin-top:0.4rem;letter-spacing:0.12rem;filter:saturate(0.75);animation:cr-sub-in 1.5s ease forwards;animation-delay:1s;opacity:0;">${sub}</div>` : ''}
            </div>
        `;
    }

    // ── Secuencia de slides ─────────────────────────────────────────────────────
    const FADE = 1400;

    function showSlide(i) {
        if (i >= slides.length) return;
        const s = slides[i];

        const doShow = () => {
            slide.style.transition = 'none';
            slide.style.opacity = '0';
            slide.innerHTML = s.html;

            // Ejecutar scripts inline manualmente
            slide.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.head.appendChild(newScript);
                oldScript.remove();
            });

            if (s.onEnter) s.onEnter();

            requestAnimationFrame(() => requestAnimationFrame(() => {
                slide.style.transition = `opacity ${FADE}ms ease`;
                slide.style.opacity = '1';
            }));

            if (s.duration < 99999) {
                setTimeout(() => {
                    slide.style.transition = `opacity ${FADE}ms ease`;
                    slide.style.opacity = '0';
                    setTimeout(() => showSlide(i + 1), FADE);
                }, s.duration);
            }
        };

        if (s.fadeFromBlack) {
            slide.style.transition = `opacity ${FADE}ms ease`;
            slide.style.opacity = '0';
            setTimeout(doShow, FADE + 800);
        } else {
            doShow();
        }
    }

    // ── Inicio ─────────────────────────────────────────────────────────────────
    setTimeout(() => {
        initAudio();
        showSlide(0);
    }, 400);

    // ── Tecla R ─────────────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyR') {
            stopAudio(800);
            const blackout = document.createElement('div');
            blackout.style.cssText = 'position:fixed;inset:0;background:black;z-index:999999;transition:opacity 0.5s;';
            document.body.appendChild(blackout);
            setTimeout(() => location.reload(), 900);
        }
    });

    // ── Resize ──────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        grainCanvas.width = window.innerWidth;
        grainCanvas.height = window.innerHeight;
    });
}