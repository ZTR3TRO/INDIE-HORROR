// ─────────────────────────────────────────────────────────────────────────────
//  inventoryUI.js — Modal PS1 monocromo · Objetos + Notas · v3
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  #inv-modal {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.9);
    z-index: 20000;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity 0.2s ease;
  }
  #inv-modal.open { opacity: 1; pointer-events: all; }

  #inv-panel {
    width: 560px;
    max-width: 90vw;
    border: 1px solid rgba(200,200,200,0.14);
    background: rgba(6,6,6,0.97);
  }

  /* Header con tabs */
  #inv-header {
    display: flex;
    border-bottom: 1px solid rgba(200,200,200,0.1);
  }
  .inv-tab {
    flex: 1; padding: 13px 0; text-align: center;
    font-family: 'Share Tech Mono', monospace;
    font-size: 8px; letter-spacing: 5px;
    text-transform: uppercase; cursor: pointer;
    color: rgba(140,140,140,0.35);
    border-right: 1px solid rgba(200,200,200,0.08);
    transition: color 0.2s, background 0.2s;
    user-select: none;
  }
  .inv-tab:last-child { border-right: none; }
  .inv-tab.active {
    color: rgba(218,218,218,0.88);
    background: rgba(255,255,255,0.025);
  }

  /* Footer */
  #inv-footer {
    padding: 10px 20px;
    border-top: 1px solid rgba(200,200,200,0.08);
    font-family: 'Share Tech Mono', monospace;
    font-size: 7px; letter-spacing: 4px;
    color: rgba(110,110,110,0.35);
    text-transform: uppercase; text-align: right;
  }

  /* ── Panel: OBJETOS ── */
  #panel-items {
    padding: 22px 18px;
    display: none;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  #panel-items.active { display: grid; }

  .inv-slot {
    border: 1px solid rgba(180,180,180,0.1);
    padding: 14px 8px 20px;
    display: flex; flex-direction: column;
    align-items: center; gap: 6px;
    position: relative;
    background: rgba(255,255,255,0.01);
  }
  .inv-slot.has-item {
    border-color: rgba(208,208,208,0.36);
    background: rgba(255,255,255,0.022);
  }
  .inv-slot.just-picked { animation: ps1blink 0.1s step-end 5; }
  @keyframes ps1blink {
    0%,100%{ border-color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.1); }
    50%    { border-color:rgba(180,180,180,0.1);  background:rgba(0,0,0,0.5); }
  }

  .inv-slot-icon {
    font-size: 22px; filter: grayscale(1); line-height: 1;
  }
  .inv-slot:not(.has-item) .inv-slot-icon { opacity: 0.1; }
  .inv-slot.has-item       .inv-slot-icon { opacity: 0.88; }

  .inv-slot-name {
    font-family: 'Share Tech Mono', monospace;
    font-size: 7px; letter-spacing: 2px;
    text-transform: uppercase; text-align: center;
    color: rgba(140,140,140,0.3);
  }
  .inv-slot.has-item .inv-slot-name { color: rgba(190,190,190,0.62); }

  .inv-pips {
    position: absolute; bottom: 5px; left: 50%;
    transform: translateX(-50%); display: flex; gap: 3px;
  }
  .inv-pip {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .inv-pip.on {
    background: rgba(208,208,208,0.88);
    border-color: rgba(228,228,228,0.3);
  }

  /* ── Panel: NOTAS ── */
  #panel-notes {
    display: none; min-height: 240px;
  }
  #panel-notes.active { display: block; }

  #notes-list { padding: 16px 18px; }

  .note-empty {
    padding: 50px 0; text-align: center;
    font-family: 'Share Tech Mono', monospace;
    font-size: 8px; letter-spacing: 4px;
    color: rgba(110,110,110,0.3); text-transform: uppercase;
  }

  .note-item {
    border: 1px solid rgba(190,190,190,0.1);
    padding: 11px 14px; margin-bottom: 6px;
    display: flex; align-items: center; gap: 14px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .note-item:last-child { margin-bottom: 0; }
  .note-item:hover {
    background: rgba(255,255,255,0.03);
    border-color: rgba(200,200,200,0.22);
  }
  .note-item-icon {
    font-size: 14px; filter: grayscale(1); opacity: 0.55; flex-shrink: 0;
  }
  .note-item-info { flex: 1; }
  .note-item-title {
    font-family: 'Share Tech Mono', monospace;
    font-size: 9px; letter-spacing: 2px;
    color: rgba(198,198,198,0.78); text-transform: uppercase; margin-bottom: 3px;
  }
  .note-item-found {
    font-family: 'Share Tech Mono', monospace;
    font-size: 7px; letter-spacing: 1px;
    color: rgba(120,120,120,0.38); text-transform: uppercase;
  }
  .note-badge-new {
    font-family: 'Share Tech Mono', monospace;
    font-size: 6px; letter-spacing: 2px;
    color: rgba(190,190,190,0.45); text-transform: uppercase;
    border: 1px solid rgba(190,190,190,0.18);
    padding: 2px 7px; flex-shrink: 0;
  }

  /* Lector de nota */
  #note-reader {
    display: none; padding: 24px 24px 20px;
  }
  #note-reader.active { display: block; }
  #note-reader-title {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px; letter-spacing: 4px;
    color: rgba(195,195,195,0.65); text-transform: uppercase;
    margin-bottom: 18px; padding-bottom: 12px;
    border-bottom: 1px solid rgba(200,200,200,0.08);
  }
  #note-reader-body {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px; letter-spacing: 0.3px;
    color: rgba(185,185,185,0.72); line-height: 1.9;
    white-space: pre-line;
  }
  #note-reader-back {
    margin-top: 22px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 7px; letter-spacing: 3px;
    color: rgba(120,120,120,0.35); text-transform: uppercase;
    cursor: pointer; display: inline-block;
    transition: color 0.15s;
  }
  #note-reader-back:hover { color: rgba(180,180,180,0.6); }

  /* Notificación de pickup — sin inventario abajo, solo texto flotante */
  #itemPickupNotif {
    position: fixed;
    bottom: 30px; left: 50%;
    transform: translateX(-50%);
    display: flex; align-items: center; gap: 12px;
    pointer-events: none; opacity: 0;
    transition: opacity 0.25s ease;
    z-index: 9100; white-space: nowrap;
  }
  #itemPickupNotif.show { opacity: 1; }
  #pickup-icon { font-size: 17px; filter: grayscale(1); opacity: 0.82; }
  #pickup-text {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px; letter-spacing: 3px;
    color: rgba(218,218,218,0.9); text-transform: uppercase;
    text-shadow: 0 0 8px rgba(0,0,0,1), 1px 1px 0 rgba(0,0,0,0.95);
  }
  #pickup-sub {
    font-family: 'Share Tech Mono', monospace;
    font-size: 7px; letter-spacing: 3px;
    color: rgba(140,140,140,0.38); text-transform: uppercase;
    margin-top: 3px; text-shadow: 0 0 4px rgba(0,0,0,1);
  }
`;

// ── Estado interno ────────────────────────────────────────────────────────────

const ITEMS = {
    flashlight: { label: 'TELÉFONO', icon: '📱', collected: true  },
    key:        { label: 'LLAVE',    icon: '🗝',  collected: false },
    batteries:  { label: 'FUSIBLES', icon: '⚡',  collected: false, count: 0, max: 3 },
    uvlamp:     { label: 'LUZ UV',   icon: '🔦', collected: false },
};

// Notas coleccionables: { id, title, foundAt, body, isNew }
const notes = [];

let modalOpen      = false;
let activeTab      = 'items'; // 'items' | 'notes'
let noteReaderOpen = false;
let _pickupTimeout = null;

// ── Init ──────────────────────────────────────────────────────────────────────

export function initInventoryUI() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Modal
    const modal = document.createElement('div');
    modal.id = 'inv-modal';
    modal.innerHTML = `
        <div id="inv-panel">
            <div id="inv-header">
                <div class="inv-tab active" data-tab="items">OBJETOS</div>
                <div class="inv-tab" data-tab="notes">NOTAS</div>
            </div>

            <div id="panel-items" class="active">
                <!-- slots se generan dinámicamente -->
            </div>

            <div id="panel-notes">
                <div id="note-reader">
                    <div id="note-reader-title"></div>
                    <div id="note-reader-body"></div>
                    <div id="note-reader-back">← VOLVER A NOTAS</div>
                </div>
                <div id="notes-list"></div>
            </div>

            <div id="inv-footer">[ TAB ] CERRAR</div>
        </div>
    `;
    document.body.appendChild(modal);

    // Los slots se crean dinámicamente cuando se recoge el item (inventoryCollect).
    // Aquí no se pre-generan — el panel empieza vacío.
    // El teléfono (flashlight) se tiene desde el inicio, crearlo ya.
    _createSlot('flashlight');

    // Tabs
    modal.querySelectorAll('.inv-tab').forEach(tab => {
        tab.addEventListener('click', () => _switchTab(tab.dataset.tab));
    });

    // Lector back
    document.getElementById('note-reader-back')
        .addEventListener('click', _closeNoteReader);

    // Notificación pickup
    const notif = document.createElement('div');
    notif.id = 'itemPickupNotif';
    notif.innerHTML = `
        <span id="pickup-icon"></span>
        <div>
            <div id="pickup-text"></div>
            <div id="pickup-sub">RECOGIDO</div>
        </div>
    `;
    document.body.appendChild(notif);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function toggleInventory() {
    modalOpen = !modalOpen;
    document.getElementById('inv-modal')?.classList.toggle('open', modalOpen);
    if (!modalOpen) _closeNoteReader();
}

export function openInventory()  {
    modalOpen = true;
    document.getElementById('inv-modal')?.classList.add('open');
}

// Exportar si el lector de nota está activo — main.js lo usa para Tab
export function isNoteReaderOpen() { return noteReaderOpen; }

export function closeInventory() {
    modalOpen = false;
    document.getElementById('inv-modal')?.classList.remove('open');
    _closeNoteReader();
}

export function isInventoryOpen() { return modalOpen; }

// ── Tabs ──────────────────────────────────────────────────────────────────────

function _switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.inv-tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.getElementById('panel-items')?.classList.toggle('active', tab === 'items');
    document.getElementById('panel-notes')?.classList.toggle('active', tab === 'notes');
    if (tab === 'notes') _renderNotesList();
}

// ── Slots de objetos ──────────────────────────────────────────────────────────

function _createSlot(id) {
    const panel = document.getElementById('panel-items');
    if (!panel || document.getElementById(`inv-slot-${id}`)) return;
    const item = ITEMS[id];
    const slot = document.createElement('div');
    slot.className = 'inv-slot' + (item.collected ? ' has-item' : '');
    slot.id = `inv-slot-${id}`;
    slot.innerHTML = `
        <span class="inv-slot-icon">${item.icon}</span>
        <span class="inv-slot-name">${item.label}</span>
        ${id === 'batteries' ? `
        <div class="inv-pips">
            <div class="inv-pip" id="bat-pip-0"></div>
            <div class="inv-pip" id="bat-pip-1"></div>
            <div class="inv-pip" id="bat-pip-2"></div>
        </div>` : ''}
    `;
    // Insertar antes de los slots vacíos de relleno
    panel.appendChild(slot);
}

function _blinkSlot(id) {
    const slot = document.getElementById(`inv-slot-${id}`);
    if (!slot) return;
    slot.classList.remove('just-picked');
    void slot.offsetWidth;
    slot.classList.add('just-picked');
    slot.addEventListener('animationend', () => slot.classList.remove('just-picked'), { once: true });
}

export function inventoryCollect(itemId) {
    if (!ITEMS[itemId]) return;
    ITEMS[itemId].collected = true;
    // Crear el slot si aún no existe (primera vez que se recoge el item)
    _createSlot(itemId);
    const slot = document.getElementById(`inv-slot-${itemId}`);
    if (slot) {
        slot.classList.add('has-item');
        _blinkSlot(itemId);
    }
    _showPickupNotif(ITEMS[itemId].icon, ITEMS[itemId].label);
}

export function inventorySetBatteries(count) {
    ITEMS.batteries.count     = count;
    ITEMS.batteries.collected = count > 0;
    // Crear slot la primera vez que se recoge un fusible
    if (count > 0) _createSlot('batteries');
    for (let i = 0; i < 3; i++) {
        document.getElementById(`bat-pip-${i}`)?.classList.toggle('on', i < count);
    }
    const slot = document.getElementById('inv-slot-batteries');
    if (slot && count > 0) {
        slot.classList.add('has-item');
        _blinkSlot('batteries');
    }
    _showPickupNotif(ITEMS.batteries.icon, `FUSIBLE ${count}/3`);
}

export function inventorySetFlashlightMode(_mode) {
    // Reservado para futura indicación visual
}

export function inventoryHasItem(itemId) {
    return ITEMS[itemId]?.collected ?? false;
}

// ── Notas ─────────────────────────────────────────────────────────────────────

/**
 * Agrega una nota coleccionable al inventario.
 * @param {string} id        — id único, ej: 'carta_daniel'
 * @param {string} title     — nombre de la nota
 * @param {string} foundAt   — lugar donde se encontró
 * @param {string} body      — texto completo de la nota
 */
export function collectNote(id, title, foundAt, body) {
    if (notes.find(n => n.id === id)) return; // ya recogida
    notes.push({ id, title, foundAt, body, isNew: true });
    _showPickupNotif('📄', title);

    // Marcar badge "NOTAS" si el modal está abierto en esa pestaña
    if (modalOpen && activeTab === 'notes') _renderNotesList();
}

function _renderNotesList() {
    const list = document.getElementById('notes-list');
    if (!list) return;

    if (notes.length === 0) {
        list.innerHTML = `<div class="note-empty">SIN NOTAS</div>`;
        return;
    }

    list.innerHTML = notes.map(n => `
        <div class="note-item" data-note-id="${n.id}">
            <span class="note-item-icon">📄</span>
            <div class="note-item-info">
                <div class="note-item-title">${n.title}</div>
                <div class="note-item-found">${n.foundAt}</div>
            </div>
            ${n.isNew ? `<div class="note-badge-new">NUEVA</div>` : ''}
        </div>
    `).join('');

    list.querySelectorAll('.note-item').forEach(el => {
        el.addEventListener('click', () => {
            const note = notes.find(n => n.id === el.dataset.noteId);
            if (note) { note.isNew = false; _openNoteReader(note); }
        });
    });
}

function _openNoteReader(note) {
    noteReaderOpen = true;
    document.getElementById('note-reader-title').textContent = note.title;
    document.getElementById('note-reader-body').textContent  = note.body;
    document.getElementById('note-reader').classList.add('active');
    document.getElementById('notes-list').style.display      = 'none';
    // Actualizar hint del footer: Tab vuelve a la lista
    const footer = document.getElementById('inv-footer');
    if (footer) footer.textContent = '[ TAB ] VOLVER A NOTAS  ·  [ Q ] CERRAR';
}

// Exportada para que main.js pueda usarla con Tab cuando el lector está abierto
export function goBackFromNote() { _closeNoteReader(); }

function _closeNoteReader() {
    noteReaderOpen = false;
    document.getElementById('note-reader')?.classList.remove('active');
    const list = document.getElementById('notes-list');
    if (list) list.style.display = 'block';
    if (activeTab === 'notes') _renderNotesList();
    // Restaurar hint del footer
    const footer = document.getElementById('inv-footer');
    if (footer) footer.textContent = '[ TAB ] CERRAR';
}

// ── Pickup notif ──────────────────────────────────────────────────────────────

export function showInventoryBriefly(_ms) {
    // Ya no hay barra visible en gameplay — noop intencional
}

function _showPickupNotif(icon, label) {
    const notif  = document.getElementById('itemPickupNotif');
    const iconEl = document.getElementById('pickup-icon');
    const textEl = document.getElementById('pickup-text');
    if (!notif || !iconEl || !textEl) return;

    iconEl.textContent = icon;
    textEl.textContent = label;
    notif.classList.add('show');

    if (_pickupTimeout) clearTimeout(_pickupTimeout);
    _pickupTimeout = setTimeout(() => notif.classList.remove('show'), 2800);
}