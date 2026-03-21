export function initBook() {
    const bookHTML = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&display=swap');

        #bookUI {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            z-index: 10000;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        }

        #bookUI.open {
            display: flex;
            animation: fadeInBg 0.4s ease forwards;
        }

        @keyframes fadeInBg {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        .book-wrapper {
            perspective: 1200px;
            animation: bookOpen 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes bookOpen {
            from {
                opacity: 0;
                transform: rotateX(30deg) scale(0.85);
            }
            to {
                opacity: 1;
                transform: rotateX(0deg) scale(1);
            }
        }

        .book-container {
            width: 420px;
            height: 520px;
            background: #c8b89a;
            padding: 44px 44px 36px 44px;
            border-radius: 3px;
            box-sizing: border-box;
            box-shadow:
                0 0 0 1px #8a6e4a,
                0 0 30px rgba(0,0,0,0.9),
                inset 0 0 80px rgba(80,40,10,0.2);
            color: #1e120a;
            font-family: 'Special Elite', 'Courier New', serif;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .book-container::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image:
                url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 0;
            mix-blend-mode: multiply;
        }

        .book-container::after {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 18px; height: 100%;
            background: linear-gradient(to right, rgba(60,30,10,0.35), transparent);
            pointer-events: none;
            z-index: 1;
        }

        .book-lines {
            position: absolute;
            inset: 0;
            background-image: repeating-linear-gradient(
                transparent,
                transparent 27px,
                rgba(160,120,70,0.18) 27px,
                rgba(160,120,70,0.18) 28px
            );
            pointer-events: none;
            z-index: 0;
        }

        .stain-1 {
            position: absolute;
            top: -20px; right: -20px;
            width: 160px; height: 160px;
            background: radial-gradient(circle, rgba(100,60,20,0.15) 0%, transparent 65%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
        }
        .stain-2 {
            position: absolute;
            bottom: 40px; left: -30px;
            width: 200px; height: 120px;
            background: radial-gradient(ellipse, rgba(80,40,10,0.1) 0%, transparent 60%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
        }
        .stain-3 {
            position: absolute;
            top: 45%; left: 25%;
            width: 100px; height: 70px;
            background: radial-gradient(ellipse, rgba(120,70,20,0.07) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
        }

        .blood-stain {
            position: absolute;
            bottom: 52px; right: 28px;
            width: 55px; height: 50px;
            background: radial-gradient(ellipse at 40% 40%, rgba(120,0,0,0.5) 0%, rgba(100,0,0,0.2) 40%, transparent 70%);
            border-radius: 60% 40% 55% 45%;
            transform: rotate(-15deg);
            pointer-events: none;
            z-index: 1;
            mix-blend-mode: multiply;
        }
        .blood-drip {
            position: absolute;
            bottom: 40px; right: 54px;
            width: 8px; height: 18px;
            background: linear-gradient(to bottom, rgba(120,0,0,0.4), transparent);
            border-radius: 0 0 50% 50%;
            pointer-events: none;
            z-index: 1;
            mix-blend-mode: multiply;
        }

        .page-fold {
            position: absolute;
            bottom: 0; right: 0;
            width: 0; height: 0;
            border-style: solid;
            border-width: 0 0 36px 36px;
            border-color: transparent transparent #a8906e transparent;
            filter: drop-shadow(-2px -2px 3px rgba(0,0,0,0.2));
            pointer-events: none;
            z-index: 2;
        }

        .book-content {
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .book-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 1px solid rgba(100,60,20,0.4);
            padding-bottom: 8px;
            margin-bottom: 18px;
            flex-shrink: 0;
        }

        .book-title {
            font-size: 11px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #6b4226;
            opacity: 0.7;
        }

        .book-date {
            font-style: italic;
            font-size: 12px;
            color: #5c3e28;
            opacity: 0.85;
        }

        .book-text {
            font-size: 15px;
            line-height: 1.72;
            text-align: justify;
            color: #1e130a;
            flex: 1;
            overflow: hidden;
        }

        .book-text p {
            margin: 0 0 12px 0;
        }

        .scratched {
            text-decoration: line-through;
            color: #7a5535;
            opacity: 0.6;
        }

        .underlined {
            border-bottom: 2px solid rgba(80,30,10,0.5);
            padding-bottom: 1px;
        }

        .book-clue {
            font-weight: bold;
            font-size: 20px;
            color: #5a0000;
            letter-spacing: 2px;
        }

        .margin-note {
            position: absolute;
            left: -6px;
            font-size: 10px;
            color: #7a3b1e;
            transform: rotate(-4deg);
            opacity: 0.7;
            line-height: 1.2;
            max-width: 30px;
            word-break: break-word;
            z-index: 3;
            font-style: italic;
        }

        .book-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 10px;
            border-top: 1px solid rgba(100,60,20,0.3);
            flex-shrink: 0;
        }

        .book-nav-btn {
            background: none;
            border: none;
            font-family: 'Special Elite', serif;
            font-size: 12px;
            color: #6b4226;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
            padding: 4px 6px;
            letter-spacing: 1px;
        }

        .book-nav-btn:hover { opacity: 1; }
        .book-nav-btn:disabled { opacity: 0.2; cursor: default; }

        .book-page-num {
            font-size: 11px;
            color: #7a5535;
            opacity: 0.6;
            letter-spacing: 1px;
        }

        .book-text.page-turn {
            animation: pageTurn 0.3s ease forwards;
        }

        @keyframes pageTurn {
            0%   { opacity: 1; transform: translateX(0); }
            40%  { opacity: 0; transform: translateX(18px); }
            60%  { opacity: 0; transform: translateX(-18px); }
            100% { opacity: 1; transform: translateX(0); }
        }

        .book-hint {
            position: absolute;
            top: 12px; right: 16px;
            font-size: 10px;
            color: #8a6040;
            opacity: 0.4;
            letter-spacing: 1px;
            z-index: 3;
        }
    </style>

    <div id="bookUI">
        <div class="book-wrapper">
            <div class="book-container">
                <div class="book-lines"></div>
                <div class="stain-1"></div>
                <div class="stain-2"></div>
                <div class="stain-3"></div>
                <div class="blood-stain"></div>
                <div class="blood-drip"></div>
                <div class="page-fold"></div>
                <span class="book-hint">[Q] cerrar</span>

                <div class="book-content">
                    <div class="book-header">
                        <span class="book-title">Diario Encontrado</span>
                        <span class="book-date" id="bookDate"></span>
                    </div>

                    <div class="book-text" id="bookPageContent"></div>

                    <div class="book-nav">
                        <button class="book-nav-btn" id="bookPrevBtn" onclick="bookPrevPage()">← anterior</button>
                        <span class="book-page-num" id="bookPageNum">1 / 4</span>
                        <button class="book-nav-btn" id="bookNextBtn" onclick="bookNextPage()">siguiente →</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', bookHTML);
    renderBookPage(0);
}

// 👇 AQUÍ ESTÁ LA NUEVA HISTORIA ADAPTADA AL LORE DE LA MUDANZA
const BOOK_PAGES = [
    {
        date: "12 de Octubre, 1998",
        content: `
            <p>Llevamos un mes desde que nos mudamos a esta casa. Él dice que la sensación de pesadez en el aire es normal, que solo me estoy sugestionando porque el lugar llevaba <span class="underlined">demasiados años vacío</span>.</p>
            <p>Pero yo sé que no son ideas mías. Anoche volví a escuchar esos rasguños desde el pasillo.</p>
            <p>Intenté decirle que nos fuéramos, pero se enojó. Me dijo que dejara de inventar cosas para arruinar la mudanza.</p>
        `
    },
    {
        date: "24 de Octubre, 1998",
        content: `
            <p style="position:relative">
                <span class="margin-note">¡Te lo dije!</span>
                Levanté una de las tablas sueltas del piso y encontré un cajón de metal. Adentro había registros viejos de los años 60. Pertenecieron a algo llamado "La Congregación del Séptimo Umbral".
            </p>
            <p>Se reunían en esta misma sala. Decían que la disposición de los cuartos y los cimientos de la casa formaban un canal perfecto.</p>
            <p>Él vio los papeles y dijo que seguro eran de unos adolescentes jugando a ser brujos. ¿Por qué se niega a abrir los ojos?</p>
        `
    },
    {
        date: "2 de Noviembre, 1998",
        content: `
            <p>La Congregación no jugaba. Los registros hablan de <span class="underlined">sacrificios sistemáticos</span> para abrir el umbral. Siempre marcaban todo con el número <span class="book-clue">7</span>.</p>
            <p>Siete cánticos. Siete velas. Siete ofrendas. Creían que con ese número el pasaje nunca se cerraría.</p>
            <p><span class="scratched">Ayer vi una figura parada al pie de la cama.</span> Él estaba dormido. Intenté gritar pero el aire era demasiado espeso. El número 7 es la clave que los mantiene aquí.</p>
        `
    },
    {
        date: "——— de ———, 199_",
        content: `
            <p>Ya no duermo. Lo escucho caminar por las noches. Alto. Sin cara. Deteniéndose frente a nuestra puerta. Él sigue diciendo que todo está bien, pero hoy noté que sus ojos se ven vacíos.</p>
            <p>Si alguien encuentra este diario, y su pareja también les dice "que no pasa nada": <span class="underlined">no les crean y corran</span>.</p>
            <p style="font-size: 13px; opacity:0.55; font-style:italic;">La influencia de la casa los contamina primero a ellos.</p>
            <p style="font-size:12px; opacity:0.38; font-style:italic; margin-top:6px;">— El 7 es la cerradura.</p>
        `
    }
];

let currentPage = 0;

function renderBookPage(index) {
    const page     = BOOK_PAGES[index];
    const contentEl = document.getElementById('bookPageContent');
    const dateEl    = document.getElementById('bookDate');
    const numEl     = document.getElementById('bookPageNum');
    const prevBtn   = document.getElementById('bookPrevBtn');
    const nextBtn   = document.getElementById('bookNextBtn');

    if (!contentEl) return;

    contentEl.classList.remove('page-turn');
    void contentEl.offsetWidth;
    contentEl.classList.add('page-turn');

    contentEl.innerHTML = page.content;
    if (dateEl)  dateEl.textContent = page.date;
    if (numEl)   numEl.textContent  = `${index + 1} / ${BOOK_PAGES.length}`;
    if (prevBtn) prevBtn.disabled   = index === 0;
    if (nextBtn) nextBtn.disabled   = index === BOOK_PAGES.length - 1;
}

window.bookNextPage = function() {
    if (currentPage < BOOK_PAGES.length - 1) {
        currentPage++;
        renderBookPage(currentPage);
    }
};

window.bookPrevPage = function() {
    if (currentPage > 0) {
        currentPage--;
        renderBookPage(currentPage);
    }
};

export function toggleBookUI(show) {
    const bookUI = document.getElementById('bookUI');
    if (!bookUI) return;

    if (show) {
        currentPage = 0;
        renderBookPage(0);
        bookUI.style.display = ''; // limpia cualquier inline style que haya quedado
        bookUI.classList.add('open');
    } else {
        bookUI.classList.remove('open');
        setTimeout(() => {
            bookUI.style.display = 'none';
        }, 300); // Esperamos a que termine un posible fadeOut
    }
}