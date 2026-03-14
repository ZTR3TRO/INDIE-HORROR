export function initNumpad() {
    const numpadHTML = `
    <style>
        #numpadUI { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; justify-content: center; align-items: center; font-family: 'Courier New', monospace; }
        .numpad-container { background: #2a2a2a; padding: 30px; border-radius: 10px; border: 4px solid #111; box-shadow: 0 20px 50px rgba(0,0,0,1), inset 0 0 20px rgba(0,0,0,0.8); width: 320px; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E"); }
        .numpad-display { background: #0a0a0a; border: 3px inset #444; height: 60px; margin-bottom: 20px; color: #ff0000; font-size: 36px; text-align: center; line-height: 54px; letter-spacing: 10px; text-shadow: 0 0 10px #ff0000; overflow: hidden; }
        .numpad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .numpad-btn { background: #e0e0e0; border: none; border-bottom: 6px solid #888; border-radius: 5px; height: 60px; font-size: 24px; font-weight: bold; color: #111; cursor: pointer; transition: all 0.1s; box-shadow: 0 5px 10px rgba(0,0,0,0.5); }
        .numpad-btn:active { transform: translateY(6px); border-bottom: 0px solid #888; box-shadow: 0 0px 0px rgba(0,0,0,0); }
        .btn-clear { background: #ff4444; border-bottom-color: #aa0000; color: white; }
        .btn-enter { background: #44ff44; border-bottom-color: #00aa00; color: #000; }
        .numpad-header { color: #888; text-align: center; margin-bottom: 15px; font-size: 14px; letter-spacing: 2px; }
        #exitNumpadBtn { position: absolute; top: 20px; right: 20px; background: transparent; border: 2px solid #555; color: #aaa; padding: 10px 20px; cursor: pointer; font-family: monospace; }
        #exitNumpadBtn:hover { border-color: #fff; color: #fff; }
    </style>

    <div id="numpadUI">
        <button id="exitNumpadBtn">SALIR [ Q ]</button>
        <div class="numpad-container">
            <div class="numpad-header">SYSTEM LOCK</div>
            <div class="numpad-display" id="numpadDisplay">----</div>
            <div class="numpad-grid">
                <button class="numpad-btn" data-val="1">1</button>
                <button class="numpad-btn" data-val="2">2</button>
                <button class="numpad-btn" data-val="3">3</button>
                <button class="numpad-btn" data-val="4">4</button>
                <button class="numpad-btn" data-val="5">5</button>
                <button class="numpad-btn" data-val="6">6</button>
                <button class="numpad-btn" data-val="7">7</button>
                <button class="numpad-btn" data-val="8">8</button>
                <button class="numpad-btn" data-val="9">9</button>
                <button class="numpad-btn btn-clear" id="numpadClear">C</button>
                <button class="numpad-btn" data-val="0">0</button>
                <button class="numpad-btn btn-enter" id="numpadEnter">E</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', numpadHTML);

    let currentCode = "";
    const display = document.getElementById('numpadDisplay');

    function updateDisplay() {
        // Muestra los números tecleados o guiones
        let text = currentCode.padEnd(4, '-');
        display.textContent = text;
    }

    document.querySelectorAll('.numpad-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-val');
            if (val && currentCode.length < 4) {
                currentCode += val;
                updateDisplay();
                // Aquí podrías agregar un sonido de "beep"
            }
        });
    });

    document.getElementById('numpadClear').addEventListener('click', () => {
        currentCode = "";
        updateDisplay();
        display.style.color = "#ff0000"; // Reset a rojo
    });

    // Lógica al presionar ENTER
    document.getElementById('numpadEnter').addEventListener('click', () => {
        if (currentCode === "7494") { // <--- ESTE ES EL CÓDIGO FINAL (Cámbialo al que tú quieras)
            display.style.color = "#00ff00";
            display.textContent = "OPEN";
            // Disparamos un evento para que main.js sepa que ganamos
            document.dispatchEvent(new Event('numpadSuccess')); 
        } else {
            display.textContent = "ERR";
            setTimeout(() => {
                currentCode = "";
                updateDisplay();
            }, 1000);
        }
    });
}

export function toggleNumpadUI(show) {
    const numpadUI = document.getElementById('numpadUI');
    if (numpadUI) {
        numpadUI.style.display = show ? 'flex' : 'none';
        if (show) {
            document.getElementById('numpadDisplay').textContent = '----';
            document.getElementById('numpadDisplay').style.color = '#ff0000';
        }
    }
}