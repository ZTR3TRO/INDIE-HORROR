// ─────────────────────────────────────────────────────────────────────────────
//  PAUSE UI — Menú de pausa
// ─────────────────────────────────────────────────────────────────────────────
import { suspendAudio, resumeAudio, setMasterVolume } from '../core/audio.js';

let _visible = false;
let _onContinue = null;
let _onRestart = null;
let _onMainMenu = null;

export function initPauseUI({ onContinue, onRestart, onMainMenu }) {
    _onContinue  = onContinue;
    _onRestart   = onRestart;
    _onMainMenu  = onMainMenu;

    const html = `
    <style>
        #pauseUI {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 50000;
            background: rgba(0,0,0,0.75);
            backdrop-filter: blur(3px);
            justify-content: center;
            align-items: center;
            font-family: 'Cinzel', serif;
        }
        #pauseUI.active { display: flex; }

        .pause-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0;
            position: relative;
        }

        /* Línea decorativa */
        .pause-line {
            width: 180px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(100,160,100,0.4), transparent);
            margin: 12px 0;
        }

        .pause-title {
            font-family: 'Cinzel', serif;
            font-size: clamp(1.4rem, 3vw, 2rem);
            font-weight: 900;
            color: #7abf8a;
            letter-spacing: 0.5rem;
            text-transform: uppercase;
            text-shadow:
                0 0 8px rgba(80,160,90,0.6),
                0 0 20px rgba(60,120,60,0.3);
            filter: saturate(0.85) brightness(0.95);
            margin-bottom: 4px;
        }

        .pause-subtitle {
            font-family: 'Crimson Text', Georgia, serif;
            font-style: italic;
            font-size: 0.75rem;
            color: rgba(150,200,150,0.35);
            letter-spacing: 0.2rem;
            margin-bottom: 0;
        }

        /* Opciones */
        .pause-menu {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            margin: 8px 0;
        }

        .pause-btn {
            background: transparent;
            border: none;
            font-family: 'Cinzel', serif;
            font-size: clamp(0.75rem, 1.4vw, 0.95rem);
            letter-spacing: 0.35rem;
            text-transform: uppercase;
            color: rgba(180,220,180,0.55);
            cursor: pointer;
            padding: 8px 24px;
            transition: color 0.2s, text-shadow 0.2s, letter-spacing 0.2s;
            position: relative;
        }

        .pause-btn::before {
            content: '';
            position: absolute;
            left: 0; top: 50%;
            transform: translateY(-50%);
            width: 0; height: 1px;
            background: rgba(100,180,100,0.5);
            transition: width 0.3s ease;
        }

        .pause-btn:hover {
            color: rgba(180,230,180,0.95);
            letter-spacing: 0.45rem;
            text-shadow:
                0 0 8px rgba(80,160,80,0.6),
                0 0 20px rgba(60,120,60,0.25);
        }

        .pause-btn:hover::before { width: 16px; }

        .pause-btn.danger {
            color: rgba(200,120,120,0.5);
        }
        .pause-btn.danger:hover {
            color: rgba(220,140,140,0.9);
            text-shadow: 0 0 8px rgba(180,60,60,0.5);
        }
        .pause-btn.danger::before {
            background: rgba(180,80,80,0.5);
        }

        /* Volumen */
        .pause-volume {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 12px 0 4px;
        }

        .pause-vol-label {
            font-size: 7px;
            letter-spacing: 3px;
            color: rgba(150,200,150,0.35);
            text-transform: uppercase;
        }

        .pause-vol-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .pause-vol-name {
            font-size: 8px;
            letter-spacing: 2px;
            color: rgba(150,200,150,0.45);
            text-transform: uppercase;
            width: 60px;
            text-align: right;
        }

        .pause-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 120px;
            height: 2px;
            background: rgba(80,120,80,0.3);
            outline: none;
            border-radius: 1px;
            cursor: pointer;
        }
        .pause-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 10px; height: 10px;
            border-radius: 50%;
            background: #7abf8a;
            box-shadow: 0 0 6px rgba(80,160,80,0.6);
            cursor: pointer;
        }

        .pause-vol-pct {
            font-size: 8px;
            letter-spacing: 1px;
            color: rgba(150,200,150,0.4);
            width: 28px;
        }

        /* Hint ESC */
        .pause-hint {
            font-size: 7px;
            letter-spacing: 3px;
            color: rgba(120,160,120,0.25);
            text-transform: uppercase;
            margin-top: 8px;
        }
    </style>

    <div id="pauseUI">
        <div class="pause-container">
            <div class="pause-title">Pausado</div>
            <div class="pause-subtitle">NIGHTFALL</div>
            <div class="pause-line"></div>

            <div class="pause-menu">
                <button class="pause-btn" id="pauseContinue">Continuar</button>
                <button class="pause-btn" id="pauseRestart">Reiniciar</button>
                <button class="pause-btn danger" id="pauseMainMenu">Menú principal</button>
            </div>

            <div class="pause-line"></div>

            <!-- Volumen -->
            <div class="pause-volume">
                <div class="pause-vol-label">Volumen</div>
                <div class="pause-vol-row">
                    <div class="pause-vol-name">Master</div>
                    <input type="range" class="pause-slider" id="volMaster" min="0" max="100" value="80">
                    <div class="pause-vol-pct" id="volMasterPct">80%</div>
                </div>
                <div class="pause-vol-row">
                    <div class="pause-vol-name">Música</div>
                    <input type="range" class="pause-slider" id="volMusic" min="0" max="100" value="60">
                    <div class="pause-vol-pct" id="volMusicPct">60%</div>
                </div>
                <div class="pause-vol-row">
                    <div class="pause-vol-name">Efectos</div>
                    <input type="range" class="pause-slider" id="volSFX" min="0" max="100" value="100">
                    <div class="pause-vol-pct" id="volSFXPct">100%</div>
                </div>
            </div>

            <div class="pause-hint">[ P ] o [ ESC ] para continuar</div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Botones
    document.getElementById('pauseContinue').addEventListener('click', (e) => {
        hidePause();
        // Dar foco al canvas para que el siguiente click reactive el pointer lock
        const canvas = document.querySelector('canvas');
        if (canvas) setTimeout(() => canvas.focus(), 50);
    });
    document.getElementById('pauseRestart').addEventListener('click', () => {
        hidePause();
        if (_onRestart) _onRestart();
    });
    document.getElementById('pauseMainMenu').addEventListener('click', () => {
        hidePause();
        if (_onMainMenu) _onMainMenu();
    });

    // Sliders de volumen
    _initSlider('volMaster', 'volMasterPct', (v) => setMasterVolume(v));
    _initSlider('volMusic',  'volMusicPct',  (v) => setMusicVolume(v));
    _initSlider('volSFX',    'volSFXPct',    (v) => setSFXVolume(v));
}

function _initSlider(id, pctId, onChange) {
    const slider = document.getElementById(id);
    const pct    = document.getElementById(pctId);
    if (!slider) return;
    slider.addEventListener('input', () => {
        const v = slider.value / 100;
        pct.textContent = `${slider.value}%`;
        onChange(v);
    });
}

export function showPause() {
    if (_visible) return;
    _visible = true;
    pauseAllSounds();
    const el = document.getElementById('pauseUI');
    if (el) el.classList.add('active');
    // El pointer lock se suelta automáticamente al mostrar el UI
}

export function hidePause() {
    if (!_visible) return;
    _visible = false;
    resumeAllSounds();
    const el = document.getElementById('pauseUI');
    if (el) el.classList.remove('active');
    if (_onContinue) _onContinue();
}

export function isPaused() { return _visible; }

// ── Audio durante la pausa ───────────────────────────────────────────────────
// Suspender el AudioContext congela TODA la Web Audio API de golpe —
// mucho más fiable que stop()/play() sonido a sonido.

function pauseAllSounds() {
    suspendAudio();
    // Diálogos se congelan solos: el game loop no llama updateDialogues() mientras isPaused()
}

function resumeAllSounds() {
    resumeAudio();
    // Diálogos se reanudan solos cuando el game loop vuelve a correr
}

// setMasterVolume viene directamente de audio.js donde está implementado
// correctamente con volúmenes base. Aquí solo lo conectamos al slider.

function setMusicVolume(v) { /* reservado para música de fondo */ }
function setSFXVolume(v)   { /* reservado para efectos */ }