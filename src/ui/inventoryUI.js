// ============================================================
//  inventoryUI.js — PS1 style, compact
// ============================================================

const ITEMS = {
    flashlight: { label: 'TELEFONO', icon: '📱', collected: true  },
    key:        { label: 'LLAVE',    icon: '🗝',  collected: false },
    batteries:  { label: 'FUSIBLES', icon: '⚡',  collected: false, count: 0, max: 3 },
    uvlamp:     { label: 'LUZ UV',   icon: '🔦', collected: false },
};

let inventoryVisible = false;
let inventoryEl = null;

export function initInventoryUI() {
    const style = document.createElement('style');
    style.textContent = `
        /* ── Inventario completo (Tab) ── */
        #inventoryBar {
            position: fixed;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 6px;
            padding: 8px 12px;
            background: rgba(0,0,0,0.88);
            border: 1px solid rgba(180,0,0,0.3);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            z-index: 50;
            image-rendering: pixelated;
        }
        #inventoryBar.visible { opacity: 1; }

        .inv-slot {
            width: 44px;
            height: 50px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.02);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            position: relative;
            padding: 3px 2px 10px;
        }
        .inv-slot.collected {
            border-color: rgba(160,130,80,0.4);
            background: rgba(160,130,80,0.04);
        }
        .inv-slot.active-item {
            border-color: rgba(200,160,80,0.9);
            box-shadow: 0 0 8px rgba(200,160,80,0.25);
        }
        .inv-slot.uv-active {
            border-color: rgba(140,60,255,0.9);
            box-shadow: 0 0 10px rgba(140,60,255,0.3);
        }
        .inv-slot .slot-icon {
            font-size: 16px;
            line-height: 1;
            filter: grayscale(1) opacity(0.2);
            display: block;
            text-align: center;
            width: 100%;
        }
        .inv-slot.collected .slot-icon  { filter: grayscale(0.2) opacity(0.9); }
        .inv-slot.active-item .slot-icon { filter: none; }

        .inv-slot .slot-label {
            font-family: 'Courier New', monospace;
            font-size: 5.5px;
            letter-spacing: 0.05em;
            color: rgba(160,130,80,0.6);
            text-transform: uppercase;
            text-align: center;
            width: 100%;
            display: block;
            white-space: nowrap;
        }

        /* Tres puntos para fusibles */
        .bat-pips {
            position: absolute;
            bottom: 3px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 2px;
        }
        .bat-pip {
            width: 4px; height: 4px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.12);
        }
        .bat-pip.filled {
            background: rgba(200,160,80,0.9);
            border-color: rgba(220,180,100,0.5);
            box-shadow: 0 0 3px rgba(200,160,80,0.5);
        }

        #inventoryHint {
            position: fixed;
            bottom: 14px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Courier New', monospace;
            font-size: 7px;
            letter-spacing: 4px;
            color: rgba(255,255,255,0.1);
            text-transform: uppercase;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 50;
        }
        #inventoryHint.visible { opacity: 1; }

        /* ── Notificación al recoger (solo el item) ── */
        #itemPickupNotif {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(0,0,0,0.85);
            border: 1px solid rgba(160,130,80,0.35);
            padding: 7px 16px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            z-index: 51;
        }
        #itemPickupNotif.show { opacity: 1; }
        #pickup-icon {
            font-size: 18px;
            line-height: 1;
        }
        #pickup-text {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            letter-spacing: 3px;
            color: rgba(200,160,80,0.9);
            text-transform: uppercase;
        }
        #pickup-sub {
            font-family: 'Courier New', monospace;
            font-size: 7px;
            letter-spacing: 2px;
            color: rgba(255,255,255,0.3);
            text-transform: uppercase;
            margin-top: 1px;
        }
    `;
    document.head.appendChild(style);

    inventoryEl = document.createElement('div');
    inventoryEl.id = 'inventoryBar';
    document.body.appendChild(inventoryEl);

    _createSlot('flashlight');

    const hint = document.createElement('div');
    hint.id = 'inventoryHint';
    hint.textContent = 'TAB — INVENTARIO';
    document.body.appendChild(hint);

    // Notificación de pickup
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

function _createSlot(id) {
    if (document.getElementById(`inv-slot-${id}`)) return;
    const item = ITEMS[id];
    const slot = document.createElement('div');
    slot.className = 'inv-slot collected';
    slot.id = `inv-slot-${id}`;

    const icon = document.createElement('span');
    icon.className = 'slot-icon';
    icon.textContent = item.icon;

    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = item.label;

    slot.appendChild(icon);
    slot.appendChild(label);

    if (id === 'batteries') {
        const pips = document.createElement('div');
        pips.className = 'bat-pips';
        for (let i = 0; i < 3; i++) {
            const pip = document.createElement('div');
            pip.className = 'bat-pip';
            pip.id = `bat-pip-${i}`;
            pips.appendChild(pip);
        }
        slot.appendChild(pips);
    }

    inventoryEl.appendChild(slot);
}

export function toggleInventory() {
    inventoryVisible = !inventoryVisible;
    inventoryEl?.classList.toggle('visible', inventoryVisible);
    document.getElementById('inventoryHint')?.classList.toggle('visible', inventoryVisible);
}

export function showInventoryBriefly(ms = 2200) {
    // No muestra el inventario completo — solo usa la notificación de pickup
}

export function inventoryCollect(itemId) {
    if (!ITEMS[itemId]) return;
    ITEMS[itemId].collected = true;
    _createSlot(itemId);
    _showPickupNotif(ITEMS[itemId].icon, ITEMS[itemId].label);
}

export function inventorySetBatteries(count) {
    ITEMS.batteries.count = count;
    ITEMS.batteries.collected = count > 0;
    if (count === 1) _createSlot('batteries');
    for (let i = 0; i < 3; i++) {
        const pip = document.getElementById(`bat-pip-${i}`);
        if (pip) pip.classList.toggle('filled', i < count);
    }
    _showPickupNotif(ITEMS.batteries.icon, `FUSIBLE ${count}/3`);
}

export function inventorySetFlashlightMode(mode) {
    const slot   = document.getElementById('inv-slot-flashlight');
    const uvSlot = document.getElementById('inv-slot-uvlamp');
    slot?.classList.remove('active-item', 'uv-active');
    uvSlot?.classList.remove('active-item', 'uv-active');
    if (mode === 'normal') slot?.classList.add('active-item');
    else if (mode === 'uv') {
        slot?.classList.add('uv-active');
        uvSlot?.classList.add('uv-active');
    }
}

let _pickupTimeout = null;
function _showPickupNotif(icon, label) {
    const notif   = document.getElementById('itemPickupNotif');
    const iconEl  = document.getElementById('pickup-icon');
    const textEl  = document.getElementById('pickup-text');
    if (!notif || !iconEl || !textEl) return;

    iconEl.textContent = icon;
    textEl.textContent = label;
    notif.classList.add('show');

    if (_pickupTimeout) clearTimeout(_pickupTimeout);
    _pickupTimeout = setTimeout(() => {
        notif.classList.remove('show');
    }, 2500);
}

export function inventoryHasItem(itemId) {
    return ITEMS[itemId]?.collected ?? false;
}