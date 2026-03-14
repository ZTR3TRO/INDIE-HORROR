// ============================================================
//  inventoryUI.js — Barra de inventario minimalista
//  Slots: linterna | llave | baterías | lámpara UV
//  Tab para mostrar/ocultar
// ============================================================

const ITEMS = {
    flashlight: { label: 'Linterna',    icon: '🔦', collected: true  }, // siempre disponible
    key:        { label: 'Llave',       icon: '🗝',  collected: false },
    batteries:  { label: 'Baterías',    icon: '🔋', collected: false, count: 0, max: 3 },
    uvlamp:     { label: 'Lámpara UV',  icon: '🔵', collected: false },
};

let inventoryVisible = false;
let inventoryEl = null;

// ── Crear DOM ──────────────────────────────────────────────
export function initInventoryUI() {
    const style = document.createElement('style');
    style.textContent = `
        #inventoryBar {
            position: fixed;
            bottom: 36px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            padding: 10px 18px;
            background: rgba(0,0,0,0.72);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 6px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
            z-index: 50;
            backdrop-filter: blur(4px);
        }
        #inventoryBar.visible { opacity: 1; }

        .inv-slot {
            width: 54px;
            height: 54px;
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 4px;
            background: rgba(255,255,255,0.03);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            position: relative;
            transition: border-color 0.2s, background 0.2s;
        }
        .inv-slot.collected {
            border-color: rgba(255,255,255,0.22);
            background: rgba(255,255,255,0.06);
        }
        .inv-slot.active-item {
            border-color: rgba(200,180,120,0.7);
            background: rgba(200,180,120,0.08);
            box-shadow: 0 0 8px rgba(200,180,120,0.25);
        }
        .inv-slot.uv-active {
            border-color: rgba(140,80,255,0.8);
            background: rgba(140,80,255,0.10);
            box-shadow: 0 0 10px rgba(140,80,255,0.35);
        }
        .inv-slot .slot-icon {
            font-size: 22px;
            line-height: 1;
            filter: grayscale(1) opacity(0.3);
            transition: filter 0.2s;
        }
        .inv-slot.collected .slot-icon { filter: none; }
        .inv-slot .slot-label {
            font-family: 'Courier New', monospace;
            font-size: 7px;
            letter-spacing: 1px;
            color: rgba(255,255,255,0.35);
            text-transform: uppercase;
        }
        .inv-slot.collected .slot-label { color: rgba(255,255,255,0.55); }
        .inv-slot .slot-count {
            position: absolute;
            top: 3px;
            right: 5px;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            color: rgba(255,255,255,0.6);
        }

        /* Hint de Tab */
        #inventoryHint {
            position: fixed;
            bottom: 14px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Courier New', monospace;
            font-size: 9px;
            letter-spacing: 3px;
            color: rgba(255,255,255,0.18);
            text-transform: uppercase;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 50;
        }
        #inventoryHint.visible { opacity: 1; }

        /* Notificación al recoger item */
        #itemPickupNotif {
            position: fixed;
            bottom: 110px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Courier New', monospace;
            font-size: 11px;
            letter-spacing: 3px;
            color: rgba(200,180,120,0.9);
            text-transform: uppercase;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.4s ease;
            z-index: 51;
            text-shadow: 0 0 10px rgba(200,180,120,0.4);
        }
    `;
    document.head.appendChild(style);

    inventoryEl = document.createElement('div');
    inventoryEl.id = 'inventoryBar';
    document.body.appendChild(inventoryEl);

    // Solo crear el slot de la linterna al inicio (siempre la tiene)
    _createSlot('flashlight');

    // Hint "Tab — inventario"
    const hint = document.createElement('div');
    hint.id = 'inventoryHint';
    hint.textContent = 'Tab — inventario';
    document.body.appendChild(hint);

    // Notificación pickup
    const notif = document.createElement('div');
    notif.id = 'itemPickupNotif';
    document.body.appendChild(notif);
}

// ── Crear slot dinámicamente ───────────────────────────────
function _createSlot(id) {
    if (document.getElementById(`inv-slot-${id}`)) return; // ya existe
    const item = ITEMS[id];
    const slot = document.createElement('div');
    slot.className = 'inv-slot collected'; // siempre visible si se crea
    slot.id = `inv-slot-${id}`;

    // Animación de entrada
    slot.style.transform = 'scale(0)';
    slot.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

    const icon = document.createElement('span');
    icon.className = 'slot-icon';
    icon.textContent = item.icon;

    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = item.label;

    slot.appendChild(icon);
    slot.appendChild(label);

    if (id === 'batteries') {
        const count = document.createElement('span');
        count.className = 'slot-count';
        count.id = 'inv-bat-count';
        count.textContent = '0/3';
        slot.appendChild(count);
    }

    inventoryEl.appendChild(slot);

    // Trigger animación de aparición
    requestAnimationFrame(() => { slot.style.transform = 'scale(1)'; });
}

// ── Toggle visibilidad ──────────────────────────────────────
export function toggleInventory() {
    inventoryVisible = !inventoryVisible;
    inventoryEl?.classList.toggle('visible', inventoryVisible);
    document.getElementById('inventoryHint')?.classList.toggle('visible', inventoryVisible);
}

export function showInventoryBriefly(ms = 2200) {
    if (inventoryVisible) return;
    inventoryEl?.classList.add('visible');
    document.getElementById('inventoryHint')?.classList.add('visible');
    setTimeout(() => {
        if (!inventoryVisible) {
            inventoryEl?.classList.remove('visible');
            document.getElementById('inventoryHint')?.classList.remove('visible');
        }
    }, ms);
}

// ── Actualizar slots ────────────────────────────────────────
export function inventoryCollect(itemId) {
    if (!ITEMS[itemId]) return;
    ITEMS[itemId].collected = true;
    _createSlot(itemId); // crea el slot si no existe
    showItemNotification(ITEMS[itemId].label);
    showInventoryBriefly(2500);
}

export function inventorySetBatteries(count) {
    ITEMS.batteries.count = count;
    ITEMS.batteries.collected = count > 0;
    if (count === 1) _createSlot('batteries'); // aparece en el inventario al recoger la primera
    const countEl = document.getElementById('inv-bat-count');
    if (countEl) countEl.textContent = `${count}/3`;
    if (count > 0) showInventoryBriefly(2000);
}

// Resalta qué modo está activo en la linterna
// mode: 'normal' | 'uv' | 'off'
export function inventorySetFlashlightMode(mode) {
    const slot = document.getElementById('inv-slot-flashlight');
    const uvSlot = document.getElementById('inv-slot-uvlamp');
    slot?.classList.remove('active-item', 'uv-active');
    uvSlot?.classList.remove('active-item', 'uv-active');

    if (mode === 'normal') {
        slot?.classList.add('active-item');
    } else if (mode === 'uv') {
        slot?.classList.add('uv-active');
        uvSlot?.classList.add('uv-active');
    }
    // 'off' → sin highlight
}

function showItemNotification(label) {
    const el = document.getElementById('itemPickupNotif');
    if (!el) return;
    el.textContent = `+ ${label}`;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

export function inventoryHasItem(itemId) {
    return ITEMS[itemId]?.collected ?? false;
}