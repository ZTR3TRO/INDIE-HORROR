// ─────────────────────────────────────────────────────────────────────────────
//  SPLASH — Intro cinemática de ZADA Productions
//
//  t=0s   Negro puro
//  t=2s   "Una producción de" aparece
//  t=4s   Texto desaparece — 2s de negro
//  t=6s   Fade a la casa (2.5s transición)
//  t=10s  Calavera aparece
//  t=13s  Calavera desaparece, fade a negro
//  t=15.8s Inicia el juego
// ─────────────────────────────────────────────────────────────────────────────

export function showSplash(onDone) {
    let done = false;

    // ── Overlay negro principal ───────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99999;
        background:#000;
        pointer-events:none;
        opacity:1;
    `;

    // "Una producción de"
    const prod = document.createElement('div');
    prod.style.cssText = `
        position:absolute;
        top:50%;left:50%;
        transform:translate(-50%,-50%);
        font-family:'Crimson Text',Georgia,serif;
        font-style:italic;
        font-size:clamp(0.9rem,2vw,1.1rem);
        color:rgba(255,255,255,0);
        letter-spacing:0.22rem;
        white-space:nowrap;
        transition:color 1.2s ease;
        pointer-events:none;
    `;
    prod.textContent = 'Una producción de';
    overlay.appendChild(prod);

    // ── Calavera ──────────────────────────────────────────────────────────────
    const skullWrap = document.createElement('div');
    skullWrap.style.cssText = `
        position:fixed;inset:0;z-index:99998;
        display:flex;align-items:center;justify-content:center;
        pointer-events:none;
        opacity:0;
        transition:opacity 2s ease;
    `;
    const skull = document.createElement('img');
    skull.src = 'assets/images/zada.png';
    skull.style.cssText = `
        width:clamp(280px,34vw,460px);
        object-fit:contain;
        mix-blend-mode:lighten;
        filter:brightness(1.4) contrast(1.1);
    `;
    skullWrap.appendChild(skull);

    document.body.appendChild(overlay);
    document.body.appendChild(skullWrap);

    // t=2s — aparece "Una producción de"
    setTimeout(() => {
        prod.style.color = 'rgba(255,255,255,0.7)';
    }, 2000);

    // t=4s — texto desaparece, 2s de negro
    setTimeout(() => {
        prod.style.color = 'rgba(255,255,255,0)';
    }, 4000);

    // t=6s — fade a la casa
    setTimeout(() => {
        overlay.style.transition = 'opacity 2.5s ease';
        overlay.style.opacity = '0';
        document.dispatchEvent(new Event('splashRevealScene'));
    }, 6000);

    // t=10s — calavera aparece
    setTimeout(() => {
        skullWrap.style.opacity = '1';
    }, 10000);

    // t=13s — calavera desaparece, fade a negro
    setTimeout(() => {
        skullWrap.style.transition = 'opacity 1s ease';
        skullWrap.style.opacity = '0';
        overlay.style.transition = 'opacity 2.5s ease';
        overlay.style.opacity = '1';
    }, 13000);

    // t=15.8s — inicia el juego
    setTimeout(() => {
        if (done) return;
        done = true;
        skullWrap.remove();
        overlay.remove();
        onDone();
    }, 15800);
}