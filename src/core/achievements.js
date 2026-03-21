// ─────────────────────────────────────────────────────────────────────────────
//  achievements.js — Sistema de logros
//  Guardados en localStorage. Notificación UI al desbloquear.
// ─────────────────────────────────────────────────────────────────────────────

const SAVE_KEY = 'nightfall_achievements';

export const ACHIEVEMENTS = {
    // Historia
    FIRST_CALL:    { id: 'FIRST_CALL',    icon: '', title: 'Primera llamada',     desc: 'Contestaste la llamada de Daniel' },
    POWER_BACK:    { id: 'POWER_BACK',    icon: '', title: 'Hay que pagar la luz', desc: 'Reiniciaste el sistema eléctrico' },
    WAKE_UP:       { id: 'WAKE_UP',       icon: '', title: 'Solo fue un sueño',    desc: 'Despertaste de la pesadilla' },
    NIGHTFALL:     { id: 'NIGHTFALL',     icon: '', title: 'Nightfall',            desc: 'Completaste el juego' },
    // Exploración
    ARCHIVIST:     { id: 'ARCHIVIST',     icon: '', title: 'Archivista',           desc: 'Encontraste todas las notas UV' },
    COLLECTOR:     { id: 'COLLECTOR',     icon: '', title: 'Coleccionista',        desc: 'Encontraste todos los fugglers' },
    DETECTIVE:     { id: 'DETECTIVE',     icon: '', title: 'Detective',            desc: 'Encontraste las 4 pistas del código' },
    SAVER:         { id: 'SAVER',         icon: '', title: 'Prevención',           desc: 'Guardaste la partida por primera vez' },
    // Secreto
    FRIDGE:        { id: 'FRIDGE',        icon: '', title: '¿Qué hace esto aquí?', desc: 'Encontraste el fuggler del refrigerador' },
};

// Estado en memoria
let _unlocked = new Set();

// ── Init ──────────────────────────────────────────────────────────────────────
export function initAchievements() {
    _injectCSS();
    _injectHTML();
    _load();
}

// ── Desbloquear ───────────────────────────────────────────────────────────────
export function unlock(id) {
    if (_unlocked.has(id)) return; // ya desbloqueado
    const ach = ACHIEVEMENTS[id];
    if (!ach) return;

    _unlocked.add(id);
    _save();
    _showNotification(ach);
    console.log(`%c🏆 LOGRO: ${ach.title}`, 'color:#ffcc44;font-weight:bold;font-size:13px;');
}

export function isUnlocked(id) { return _unlocked.has(id); }
export function getUnlocked()  { return [..._unlocked]; }

export function resetAchievements() {
    _unlocked.clear();
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

// ── Persistencia ──────────────────────────────────────────────────────────────
function _save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify([..._unlocked])); } catch(e) {}
}

function _load() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) JSON.parse(raw).forEach(id => _unlocked.add(id));
    } catch(e) {}
}

// ── Notificación ──────────────────────────────────────────────────────────────
let _queue   = [];
let _showing = false;

function _showNotification(ach) {
    _queue.push(ach);
    if (!_showing) _processQueue();
}

function _processQueue() {
    if (!_queue.length) { _showing = false; return; }
    _showing = true;
    const ach = _queue.shift();

    const el = document.getElementById('ach-notif');
    if (!el) return;

    document.getElementById('ach-icon').textContent  = ach.icon;
    document.getElementById('ach-title').textContent = ach.title;
    document.getElementById('ach-desc').textContent  = ach.desc;

    el.classList.remove('ach-hide');
    el.classList.add('ach-show');

    setTimeout(() => {
        el.classList.remove('ach-show');
        el.classList.add('ach-hide');
        setTimeout(() => {
            el.classList.remove('ach-hide');
            _processQueue();
        }, 600);
    }, 4000);
}

// ── UI ────────────────────────────────────────────────────────────────────────
function _injectHTML() {
    const div = document.createElement('div');
    div.innerHTML = `
        <div id="ach-notif">
            <div id="ach-icon-wrap"><span id="ach-icon"></span></div>
            <div id="ach-body">
                <div id="ach-label">LOGRO DESBLOQUEADO</div>
                <div id="ach-title"></div>
                <div id="ach-desc"></div>
            </div>
        </div>`;
    document.body.appendChild(div.firstElementChild);
}

function _injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
        #ach-notif {
            position: fixed;
            bottom: 28px;
            left: 28px;
            display: flex;
            align-items: center;
            gap: 14px;
            background: rgba(6,6,6,0.92);
            border: 1px solid rgba(200,200,200,0.12);
            padding: 12px 18px 12px 14px;
            z-index: 99998;
            pointer-events: none;
            opacity: 0;
            transform: translateY(12px);
            transition: opacity 0.4s ease, transform 0.4s ease;
            max-width: 320px;
        }
        #ach-notif.ach-show {
            opacity: 1;
            transform: translateY(0);
        }
        #ach-notif.ach-hide {
            opacity: 0;
            transform: translateY(8px);
        }
        #ach-icon-wrap {
            font-size: 28px;
            line-height: 1;
            filter: grayscale(0.2);
            flex-shrink: 0;
        }
        #ach-label {
            font-family: 'Share Tech Mono', monospace;
            font-size: 7px;
            letter-spacing: 3px;
            color: rgba(150,200,150,0.5);
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        #ach-title {
            font-family: 'Cinzel', serif;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.15rem;
            color: rgba(220,220,220,0.9);
            margin-bottom: 2px;
        }
        #ach-desc {
            font-family: 'Share Tech Mono', monospace;
            font-size: 9px;
            letter-spacing: 0.5px;
            color: rgba(140,140,140,0.5);
        }
    `;
    document.head.appendChild(style);
}