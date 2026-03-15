import * as THREE from 'three';
import { scene, camera, controls } from '../core/world.js';
import { CONFIG } from '../data/config.js';
import { flashlight, ambientLight } from '../scenes/lights.js';
import { houseLights, streetLights, toggleDoor } from '../scenes/level.js';
import { toggleNumpadUI } from '../ui/numpadUI.js';
import { playSound, stopSound } from '../core/audio.js';
import { ui } from '../ui/ui.js';
import { inventorySetFlashlightMode } from '../ui/inventoryUI.js';

// initEnding recibe referencias a variables de estado de main.js
export function initEnding({ getGameState, setGameState, getUVMode, setUVMode, input }) {

    document.addEventListener('numpadSuccess', () => {
        if (getGameState() === 'ENDING_CINEMATIC') return; // ya disparado

        toggleNumpadUI(false);
        // NO unlock controls — el teclado deja de funcionar si se desbloquea
        // La cámara se puede mover programáticamente aunque controls esté locked
        setGameState('ENDING_CINEMATIC');

        const posA = camera.position.clone();
        const posB = new THREE.Vector3(2.041, 2.106, -0.373);
        const rotB = new THREE.Euler(-3.118, -0.034, -3.141);
        const rotC = new THREE.Euler(-3.118, 0.65,  -3.141);

        const WAIT_A = 3.0;
        const TRAVEL = 5.0;
        const WAIT_B = 4.0;
        const blackoutTime = (WAIT_A + TRAVEL + WAIT_B) * 1000;

        // FASE 2 — puerta + postes
        setTimeout(() => {
            const mainDoor = scene.getObjectByName('Door');
            if (mainDoor) toggleDoor(mainDoor);
            playSound('puerta_abierta');
            streetLights.forEach(item => {
                item.light.intensity = 8.0;
                item.mesh.material.emissiveIntensity = 3.0;
            });
        }, 1500);

        // FASE 3 — movimiento cinemático A→B + luz gradual
        let moveTimer = 0, lightTimer = 0, lightDone = false, dialogShown = false;

        scene.userData.endingUpdate = (delta) => {
            if (getGameState() !== 'ENDING_CINEMATIC') { scene.userData.endingUpdate = null; return; }
            moveTimer += delta;

            if (moveTimer >= 1.8 && !lightDone) {
                lightTimer += delta;
                const lt = Math.min(lightTimer / 8.0, 1.0);
                ambientLight.intensity = lt * 0.08;
                houseLights.forEach(item => {
                    item.light.intensity = lt * 1.2;
                    if (item.mesh.material) {
                        item.mesh.material.emissive?.setHex(0xffaa00);
                        item.mesh.material.emissiveIntensity = lt;
                    }
                });
                if (lt >= 1.0) lightDone = true;
            }

            if (moveTimer >= WAIT_A) {
                const t = Math.min((moveTimer - WAIT_A) / TRAVEL, 1.0);
                const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
                camera.position.lerpVectors(posA, posB, ease);
                camera.rotation.copy(rotB);
            }

            if (moveTimer >= WAIT_A + TRAVEL) {
                const inB = moveTimer - (WAIT_A + TRAVEL);
                const giroT = Math.min(inB / 1.5, 1.0);
                const ease = giroT < 0.5 ? 2*giroT*giroT : -1+(4-2*giroT)*giroT;
                camera.rotation.y = rotB.y + (rotC.y - rotB.y) * ease;

                // Al girar: sombra aparece parada en la oscuridad
                if (!dialogShown && inB > 0.8) {
                    dialogShown = true;
                    import('../effects/screamer.js').then(({ spawnShadowStill }) => {
                        spawnShadowStill();
                    });
                    setTimeout(() => {
                        ui.showSubtitle("Zare: '¿Qué... qué es eso?'", 3000);
                    }, 400);
                }
            }
        };

        // FASE 4 — blackout suave
        setTimeout(() => {
            scene.userData.endingUpdate = null;
            stopSound('respiracion');
            stopSound('tinitus');
            let fadeT = 0;
            const fadeIv = setInterval(() => {
                fadeT += 0.03;
                ui.setWakeOpacity(Math.min(fadeT, 1.0));
                if (fadeT >= 1.0) {
                    clearInterval(fadeIv);
                    houseLights.forEach(item => {
                        item.light.intensity = 0;
                        if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
                    });
                }
            }, 45);
        }, blackoutTime);

        // FASE 5 — despertar
        setTimeout(() => {
            const mainDoor = scene.getObjectByName('Door');
            if (mainDoor && mainDoor.userData.isOpen) {
                mainDoor.rotation.y -= Math.PI / 2;
                mainDoor.userData.isOpen = false;
            }
            camera.position.copy(CONFIG.POSITIONS.WAKE_END);
            camera.rotation.order = 'YXZ';
            const r = CONFIG.ROTATIONS.WAKE_END;
            camera.rotation.set(r.x, r.y, 0);
            flashlight.intensity = 0;
            setUVMode('off');
            inventorySetFlashlightMode('off');
            ambientLight.intensity = 0.28;
            houseLights.forEach(item => {
                item.light.intensity = 1.5;
                if (item.mesh.material) {
                    item.mesh.material.emissive.setHex(0xffaa00);
                    item.mesh.material.emissiveIntensity = 1.0;
                }
            });
            setGameState('ENDING_WAKE');
            // El movimiento del ending usa endingKeys (definido en main.js)
            // que funciona sin necesitar pointer lock
            ui.showSubtitle('[ Usa WASD para moverte ]', 4000);
        }, blackoutTime + 2000);

        // FASE 6 — parpadeos
        setTimeout(() => {
            const blinks = [
                { start: 0.0,  end: 0.18, dir: 'close' },
                { start: 0.18, end: 0.28, dir: 'open'  },
                { start: 0.32, end: 0.48, dir: 'close' },
                { start: 0.48, end: 0.55, dir: 'open'  },
                { start: 0.60, end: 0.80, dir: 'close' },
                { start: 0.80, end: 1.00, dir: 'open'  },
            ];
            let p = 0;
            const iv = setInterval(() => {
                p += 0.008;
                let op = 0;
                for (const b of blinks) {
                    if (p >= b.start && p <= b.end) {
                        const t = (p - b.start) / (b.end - b.start);
                        op = b.dir === 'close' ? t * t : 1.0 - (1.0 - t) * (1.0 - t);
                        break;
                    }
                }
                if (p > 1.0) { clearInterval(iv); ui.setWakeOpacity(0); return; }
                ui.setWakeOpacity(op);
            }, 50);
        }, blackoutTime + 2200);

        // FASE 7 — diálogos
        setTimeout(() => { ui.showSubtitle("Zare: '...fue solo una pesadilla.'", 4000); },        blackoutTime + 5000);
        setTimeout(() => { ui.showSubtitle("Zare: 'Daniel... Daniel está aquí. Estoy en casa.'", 4500); }, blackoutTime + 10000);
        setTimeout(() => { ui.showSubtitle("Zare: 'Necesito tomar un poco de aire...'", 4000); },  blackoutTime + 15500);

        // FASE 8 — control al jugador
        setTimeout(() => {
            setGameState('ENDING_OUTSIDE');
            ui.setMission("Ve a la puerta principal");
            // endingKeys maneja WASD sin pointer lock
        }, blackoutTime + 20000);
    });
}