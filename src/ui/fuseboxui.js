// ─────────────────────────────────────────────────────────────────────────────
//  FUSEBOX UI — Modal inspirado en el modelo GLB de la caja
//  Lado izquierdo: puerta con instrucciones
//  Lado derecho: placa verde con 3 slots de fusibles naranjas
// ─────────────────────────────────────────────────────────────────────────────

export function initFuseboxUI() {
    const html = `
    <style>
        #fuseboxUI {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.92);
            z-index: 10000;
            justify-content: center;
            align-items: center;
            font-family: 'Courier New', monospace;
        }
        #fuseboxUI.active { display: flex; }

        /* ── Caja exterior ── */
        .fb-box {
            position: relative;
            display: flex;
            width: 580px;
            height: 420px;
            background: #5a6e7f;
            border: 3px solid #3a4e5f;
            border-radius: 4px;
            box-shadow:
                0 0 0 1px #2a3e4f,
                0 40px 100px rgba(0,0,0,0.95),
                inset 0 1px 0 rgba(255,255,255,0.08);
            overflow: hidden;
        }

        /* Bisagra central */
        .fb-hinge {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 14px;
            height: 60px;
            background: linear-gradient(180deg, #7a8e9f, #8a9eaf, #6a7e8f);
            border: 1px solid #4a5e6f;
            border-radius: 3px;
            z-index: 10;
            box-shadow: 1px 0 3px rgba(0,0,0,0.5);
        }

        /* ── LADO IZQUIERDO — puerta ── */
        .fb-left {
            flex: 1;
            padding: 20px 18px 20px 22px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            border-right: 2px solid #3a4e5f;
            background: #5a6e7f;
        }

        /* Papel de instrucciones */
        .fb-paper {
            flex: 1;
            background: #d8d0c0;
            border: 1px solid #b0a890;
            padding: 12px 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
        }

        .fb-paper-line {
            height: 4px;
            background: #222;
            border-radius: 2px;
            opacity: 0.7;
        }
        .fb-paper-line:nth-child(2) { width: 85%; opacity: 0.6; }
        .fb-paper-line:nth-child(3) { width: 90%; }
        .fb-paper-line:nth-child(4) { width: 70%; opacity: 0.5; }
        .fb-paper-line:nth-child(5) { width: 80%; }
        .fb-paper-line:nth-child(6) { width: 60%; opacity: 0.4; }
        .fb-paper-title {
            font-size: 7px;
            letter-spacing: 1px;
            color: #333;
            margin-bottom: 4px;
            font-weight: bold;
        }

        /* Etiqueta café */
        .fb-label-tag {
            background: #c8a060;
            border: 1px solid #a08040;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .fb-label-line {
            height: 3px;
            background: #6a4020;
            border-radius: 1px;
            opacity: 0.6;
        }
        .fb-label-line:nth-child(2) { width: 70%; }

        /* ── LADO DERECHO — placa ── */
        .fb-right {
            flex: 1;
            padding: 16px 16px 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #4a5e6f;
        }

        /* Placa verde PCB */
        .fb-pcb {
            flex: 1;
            background: #2d7a2d;
            border: 2px solid #1a5a1a;
            border-radius: 2px;
            padding: 10px;
            position: relative;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
            /* Trazos de circuito amarillo */
            background-image:
                linear-gradient(90deg, transparent 30%, rgba(200,180,0,0.15) 30%, rgba(200,180,0,0.15) 32%, transparent 32%),
                linear-gradient(0deg, transparent 40%, rgba(200,180,0,0.12) 40%, rgba(200,180,0,0.12) 42%, transparent 42%),
                linear-gradient(90deg, transparent 60%, rgba(200,180,0,0.1) 60%, rgba(200,180,0,0.1) 62%, transparent 62%),
                linear-gradient(0deg, transparent 65%, rgba(200,180,0,0.1) 65%, rgba(200,180,0,0.1) 67%, transparent 67%);
        }

        /* Puntos azules arriba de la placa */
        .fb-pcb-dots {
            display: flex;
            gap: 5px;
            margin-bottom: 8px;
        }
        .fb-pcb-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #3399ff;
            box-shadow: 0 0 4px rgba(50,150,255,0.6);
        }

        /* Switches negros (decorativos) */
        .fb-switches {
            display: flex;
            flex-direction: column;
            gap: 3px;
            margin-bottom: 8px;
        }
        .fb-switch {
            width: 32px;
            height: 8px;
            background: #111;
            border: 1px solid #333;
            border-radius: 1px;
            position: relative;
        }
        .fb-switch::after {
            content: '';
            position: absolute;
            top: 1px; left: 3px;
            width: 12px; height: 6px;
            background: #555;
            border-radius: 1px;
        }

        /* Chip negro grande */
        .fb-chip {
            position: absolute;
            bottom: 30px; right: 12px;
            width: 40px; height: 35px;
            background: #111;
            border: 1px solid #333;
            border-radius: 2px;
        }

        /* ── SLOTS DE FUSIBLES ── */
        .fb-slots-row {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        .fb-slot-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }

        .fb-slot {
            width: 22px;
            height: 52px;
            background: #1a1a18;
            border: 2px solid #333;
            border-radius: 3px;
            position: relative;
            cursor: pointer;
            transition: border-color 0.2s;
            box-shadow: inset 0 3px 8px rgba(0,0,0,0.8);
            overflow: hidden;
        }

        .fb-slot:not(.filled):hover {
            border-color: #c8820a;
        }

        /* Guías internas del slot */
        .fb-slot::before {
            content: '';
            position: absolute;
            top: 4px; left: 50%;
            transform: translateX(-50%);
            width: 10px; height: 2px;
            background: #222;
            border-radius: 1px;
        }
        .fb-slot::after {
            content: '';
            position: absolute;
            bottom: 4px; left: 50%;
            transform: translateX(-50%);
            width: 10px; height: 2px;
            background: #222;
            border-radius: 1px;
        }

        /* Flecha de inserción */
        .fb-slot-arrow {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            font-size: 10px;
            color: #333;
            transition: color 0.2s;
            user-select: none;
        }
        .fb-slot:hover:not(.filled) .fb-slot-arrow { color: #c8820a; }

        /* Fusible insertado */
        .fb-fuse {
            display: none;
            position: absolute;
            top: 4px; left: 50%;
            transform: translateX(-50%);
            width: 14px;
            height: 44px;
            border-radius: 3px;
            background: linear-gradient(180deg,
                #888 0%, #aaa 8%,
                #d4881a 10%, #e8a020 30%,
                #f0b030 50%,
                #e8a020 70%, #d4881a 90%,
                #aaa 92%, #888 100%
            );
            box-shadow:
                0 0 6px rgba(200,130,0,0.5),
                inset 0 1px 2px rgba(255,255,255,0.3);
            animation: fuse-drop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }

        /* Banda negra del fusible */
        .fb-fuse::before {
            content: '';
            position: absolute;
            top: 50%; left: 0; right: 0;
            transform: translateY(-50%);
            height: 8px;
            background: #111;
            border-top: 1px solid #333;
            border-bottom: 1px solid #333;
        }

        @keyframes fuse-drop {
            0%   { transform: translateX(-50%) translateY(-16px); opacity: 0; }
            100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        .fb-slot.filled {
            border-color: rgba(200,130,0,0.5);
            box-shadow: inset 0 3px 8px rgba(0,0,0,0.6), 0 0 8px rgba(180,100,0,0.2);
        }

        /* Chispa al insertar */
        .fb-spark {
            position: absolute;
            inset: 0;
            background: rgba(255,200,50,0.7);
            animation: spark 0.2s ease forwards;
            pointer-events: none;
            z-index: 5;
        }
        @keyframes spark { 0%{opacity:1} 100%{opacity:0} }

        /* LED bajo el slot */
        .fb-slot-led {
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #1a0800;
            transition: background 0.4s, box-shadow 0.4s;
        }
        .fb-slot-led.on {
            background: #ff6600;
            box-shadow: 0 0 5px rgba(255,100,0,0.9), 0 0 10px rgba(200,60,0,0.5);
        }

        /* ── Inventario de fusibles disponibles ── */
        .fb-inventory {
            display: flex;
            gap: 6px;
            padding: 8px 10px;
            background: rgba(0,0,0,0.4);
            border: 1px solid #333;
            border-radius: 3px;
            align-items: center;
        }
        .fb-inv-label {
            font-size: 7px;
            letter-spacing: 2px;
            color: #555;
            text-transform: uppercase;
            flex: 1;
        }
        .fb-inv-fuse {
            width: 14px;
            height: 32px;
            border-radius: 2px;
            background: linear-gradient(180deg,
                #888 0%, #aaa 8%,
                #d4881a 10%, #e8a020 50%,
                #d4881a 90%, #888 100%
            );
            box-shadow: 0 0 4px rgba(200,130,0,0.4);
            position: relative;
            cursor: grab;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .fb-inv-fuse::before {
            content: '';
            position: absolute;
            top: 50%; left: 0; right: 0;
            transform: translateY(-50%);
            height: 5px;
            background: #111;
        }
        .fb-inv-fuse:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(200,130,0,0.6);
        }
        .fb-inv-fuse.used { opacity: 0.2; cursor: default; pointer-events: none; }

        /* ── Barra de estado ── */
        .fb-footer {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .fb-progress-bar {
            height: 2px;
            background: #111;
            border-radius: 1px;
        }
        .fb-progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #aa5500, #ff8800);
            box-shadow: 0 0 4px rgba(200,100,0,0.6);
            transition: width 0.5s ease;
            border-radius: 1px;
        }
        .fb-status {
            font-size: 8px;
            letter-spacing: 2px;
            color: #444;
            text-transform: uppercase;
            text-align: center;
        }
        .fb-status.ready { color: #cc7700; }

        .fb-activate {
            width: 100%;
            padding: 7px;
            background: transparent;
            border: 1px solid #333;
            color: #444;
            font-family: 'Courier New', monospace;
            font-size: 8px;
            letter-spacing: 3px;
            text-transform: uppercase;
            cursor: not-allowed;
            transition: all 0.3s;
            border-radius: 2px;
        }
        .fb-activate.ready {
            border-color: #aa5500;
            color: #cc7700;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(150,80,0,0.15);
        }
        .fb-activate.ready:hover {
            background: rgba(120,60,0,0.2);
            border-color: #ff8800;
            color: #ffaa00;
        }

        /* Botón salir */
        #exitFuseboxBtn {
            position: absolute;
            top: 10px; right: 10px;
            background: transparent;
            border: 1px solid #3a4e5f;
            color: #5a6e7f;
            padding: 4px 10px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 8px;
            letter-spacing: 2px;
            transition: all 0.2s;
            z-index: 20;
        }
        #exitFuseboxBtn:hover { border-color: #8a9eaf; color: #8a9eaf; }

        /* Instrucción */
        .fb-hint {
            position: absolute;
            bottom: -28px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8px;
            letter-spacing: 2px;
            color: #444;
            text-transform: uppercase;
            white-space: nowrap;
        }
    </style>

    <div id="fuseboxUI">
        <div style="position:relative;">
            <div class="fb-box">
                <button id="exitFuseboxBtn">SALIR [ Q ]</button>

                <!-- Bisagra -->
                <div class="fb-hinge"></div>

                <!-- LADO IZQUIERDO — puerta -->
                <div class="fb-left">
                    <div class="fb-paper">
                        <div class="fb-paper-title">PANEL ELÉCTRICO</div>
                        <div class="fb-paper-line"></div>
                        <div class="fb-paper-line"></div>
                        <div class="fb-paper-line"></div>
                        <div class="fb-paper-line"></div>
                        <div class="fb-paper-line"></div>
                        <div class="fb-paper-line"></div>
                    </div>
                    <div class="fb-label-tag">
                        <div class="fb-label-line"></div>
                        <div class="fb-label-line"></div>
                    </div>

                    <!-- Inventario de fusibles disponibles -->
                    <div class="fb-inventory">
                        <div class="fb-inv-label">Fusibles</div>
                        <div class="fb-inv-fuse" id="invFuse0" onclick="window._insertNextFuse()"></div>
                        <div class="fb-inv-fuse" id="invFuse1" onclick="window._insertNextFuse()"></div>
                        <div class="fb-inv-fuse" id="invFuse2" onclick="window._insertNextFuse()"></div>
                    </div>
                </div>

                <!-- LADO DERECHO — placa PCB -->
                <div class="fb-right">
                    <div class="fb-pcb">
                        <!-- Puntos azules -->
                        <div class="fb-pcb-dots">
                            <div class="fb-pcb-dot"></div>
                            <div class="fb-pcb-dot"></div>
                            <div class="fb-pcb-dot"></div>
                            <div class="fb-pcb-dot"></div>
                        </div>
                        <!-- Switches -->
                        <div class="fb-switches">
                            <div class="fb-switch"></div>
                            <div class="fb-switch"></div>
                            <div class="fb-switch"></div>
                        </div>
                        <!-- Slots de fusibles -->
                        <div class="fb-slots-row">
                            <div class="fb-slot-wrap">
                                <div class="fb-slot" id="fbSlot0" onclick="window._insertNextFuse()">
                                    <span class="fb-slot-arrow">↓</span>
                                    <div class="fb-fuse" id="fbFuse0"></div>
                                </div>
                                <div class="fb-slot-led" id="fbLed0"></div>
                            </div>
                            <div class="fb-slot-wrap">
                                <div class="fb-slot" id="fbSlot1" onclick="window._insertNextFuse()">
                                    <span class="fb-slot-arrow">↓</span>
                                    <div class="fb-fuse" id="fbFuse1"></div>
                                </div>
                                <div class="fb-slot-led" id="fbLed1"></div>
                            </div>
                            <div class="fb-slot-wrap">
                                <div class="fb-slot" id="fbSlot2" onclick="window._insertNextFuse()">
                                    <span class="fb-slot-arrow">↓</span>
                                    <div class="fb-fuse" id="fbFuse2"></div>
                                </div>
                                <div class="fb-slot-led" id="fbLed2"></div>
                            </div>
                        </div>
                        <!-- Chip decorativo -->
                        <div class="fb-chip"></div>
                    </div>

                    <!-- Footer -->
                    <div class="fb-footer">
                        <div class="fb-progress-bar">
                            <div class="fb-progress-fill" id="fbProgressFill"></div>
                        </div>
                        <div class="fb-status" id="fbStatus">Inserta los fusibles</div>
                        <button class="fb-activate" id="fbActivateBtn" disabled>Activar sistema</button>
                    </div>
                </div>
            </div>
            <div class="fb-hint">Haz clic en un fusible del inventario o en un slot para insertar</div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('exitFuseboxBtn').addEventListener('click', () => {
        toggleFuseboxUI(false);
    });

    document.getElementById('fbActivateBtn').addEventListener('click', () => {
        if (!document.getElementById('fbActivateBtn').classList.contains('ready')) return;
        document.dispatchEvent(new Event('fuseboxActivate'));
        toggleFuseboxUI(false);
    });
}

let _fusesInserted = 0;
let _fusesAvailable = 0;

export function toggleFuseboxUI(show, fusesAvailable = 0) {
    const el = document.getElementById('fuseboxUI');
    if (!el) return;
    if (show) {
        _fusesAvailable = fusesAvailable;
        _fusesInserted = 0;
        el.style.display = 'flex';
        _resetUI(fusesAvailable);
    } else {
        el.style.display = 'none';
    }
}

function _resetUI(available) {
    // Reset slots
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`fbSlot${i}`);
        const fuse = document.getElementById(`fbFuse${i}`);
        const led  = document.getElementById(`fbLed${i}`);
        slot.classList.remove('filled');
        fuse.style.display = 'none';
        led.classList.remove('on');
        slot.querySelector('.fb-slot-arrow').style.display = '';
    }
    // Reset inventario
    for (let i = 0; i < 3; i++) {
        const inv = document.getElementById(`invFuse${i}`);
        if (inv) inv.classList.toggle('used', i >= available);
    }
    _fusesInserted = 0;
    _updateStatus();

    // Global helper para los onclick inline
    window._insertNextFuse = _insertNextFuse;
}

function _insertNextFuse() {
    // Buscar el siguiente slot vacío
    for (let i = 0; i < 3; i++) {
        const slot = document.getElementById(`fbSlot${i}`);
        if (!slot.classList.contains('filled')) {
            // Verificar que tiene fusibles disponibles
            if (_fusesInserted >= _fusesAvailable) {
                document.getElementById('fbStatus').textContent = 'No tienes más fusibles';
                return;
            }
            _doInsert(i);
            return;
        }
    }
}

function _doInsert(index) {
    const slot = document.getElementById(`fbSlot${index}`);
    const fuse = document.getElementById(`fbFuse${index}`);
    const led  = document.getElementById(`fbLed${index}`);
    const inv  = document.getElementById(`invFuse${_fusesInserted}`);

    slot.classList.add('filled');
    slot.querySelector('.fb-slot-arrow').style.display = 'none';
    fuse.style.display = 'block';
    if (inv) inv.classList.add('used');

    // Chispa
    const spark = document.createElement('div');
    spark.className = 'fb-spark';
    slot.appendChild(spark);
    setTimeout(() => spark.remove(), 220);

    setTimeout(() => led.classList.add('on'), 180);

    _fusesInserted++;
    _updateStatus();
}

function _updateStatus() {
    const pct  = Math.round((_fusesInserted / 3) * 100);
    document.getElementById('fbProgressFill').style.width = `${pct}%`;
    const status = document.getElementById('fbStatus');
    const btn    = document.getElementById('fbActivateBtn');

    if (_fusesInserted >= 3) {
        status.textContent = 'Sistema listo';
        status.classList.add('ready');
        btn.disabled = false;
        btn.classList.add('ready');
    } else {
        status.textContent = `${_fusesInserted}/3 fusibles insertados`;
        status.classList.remove('ready');
        btn.disabled = true;
        btn.classList.remove('ready');
    }
}

export function insertFuseInSlot(index) {
    _doInsert(index);
}