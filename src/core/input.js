import { controls } from './world.js';

export class InputManager {
    constructor() {
        this.keys = {
            forward: false, backward: false, left: false, right: false,
            up: false, down: false, run: false
        };
        this.actions = {
            onInteract:   null,
            onFlashlight: null,
            onInventory:  null,
        };
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch (e.code) {
                // Movimiento
                case 'KeyW': this.keys.forward  = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left     = true; break;
                case 'KeyD': this.keys.right    = true; break;
                case 'Space':        this.keys.up   = true; break;
                case 'ControlLeft':  this.keys.down = true; break;
                case 'ShiftLeft':    this.keys.run  = true; break;

                // Sistemas de juego
                case 'KeyF': this.actions.onFlashlight?.(); break;
                case 'KeyE': this.actions.onInteract?.();   break;
                case 'Tab':
                    e.preventDefault();
                    this.actions.onInventory?.();
                    break;

                // Liberar mouse
                case 'Escape':
                    if (controls.isLocked) controls.unlock();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward  = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left     = false; break;
                case 'KeyD': this.keys.right    = false; break;
                case 'Space':       this.keys.up   = false; break;
                case 'ControlLeft': this.keys.down = false; break;
                case 'ShiftLeft':   this.keys.run  = false; break;
            }
        });
    }
}