import { transformControls, controls } from './world.js';

export class InputManager {
    constructor() {
        this.keys = { 
            forward: false, backward: false, left: false, right: false, 
            up: false, down: false, run: false, flyMode: false 
        };
        this.actions = { 
            onInteract: null, 
            onFlashlight: null, 
            onDebugLog: null, 
            onLightUp: null,    
            onLightDown: null,
            onFogUp: null,      // 👈 NUEVO
            onFogDown: null,    // 👈 NUEVO
            onMakerSpawn: null 
        };
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch (e.code) {
                // --- MOVIMIENTO ---
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'Space': this.keys.up = true; break;
                case 'ControlLeft': this.keys.down = true; break;
                case 'ShiftLeft': this.keys.run = true; break;

                // --- SISTEMAS DE JUEGO ---
                case 'KeyV': 
                    this.keys.flyMode = !this.keys.flyMode; 
                    console.log("✈️ Vuelo:", this.keys.flyMode ? "ON" : "OFF"); 
                    break;
                case 'KeyF': this.actions.onFlashlight?.(); break;
                case 'KeyE': this.actions.onInteract?.(); break;

                // --- HERRAMIENTAS MAKER / DEBUG ---
                case 'KeyM': this.actions.onMakerSpawn?.(); break;
                case 'KeyP': this.actions.onDebugLog?.(); break;
                
                // 👇 CONTROLES DE LUZ
                case 'ArrowUp':
                case 'Digit9':
                    this.actions.onLightUp?.(); 
                    break;
                    
                case 'ArrowDown':
                case 'Digit8':
                    this.actions.onLightDown?.(); 
                    break;

                // 👇 CONTROLES DE NIEBLA
                case 'BracketRight':  // Tecla ]
                case 'Digit7':
                    this.actions.onFogUp?.(); 
                    break;
                    
                case 'BracketLeft':   // Tecla [
                case 'Digit6':
                    this.actions.onFogDown?.(); 
                    break;

                // --- CONTROLES DEL GIZMO ---
                case 'KeyT': if(transformControls) transformControls.setMode('translate'); break;
                case 'KeyR': if(transformControls) transformControls.setMode('rotate'); break;
                case 'KeyX': if(transformControls) transformControls.setMode('scale'); break;

                // --- LIBERAR MOUSE ---
                case 'Escape': 
                    if (controls.isLocked) controls.unlock(); 
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'Space': this.keys.up = false; break;
                case 'ControlLeft': this.keys.down = false; break;
                case 'ShiftLeft': this.keys.run = false; break;
            }
        });
    }
}