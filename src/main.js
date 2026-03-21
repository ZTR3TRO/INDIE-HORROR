// ─────────────────────────────────────────────────────────────────────────────
//  main.js — Punto de entrada y game loop
//  Inicialización + loop. La lógica está en los módulos especializados.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { CONFIG } from './data/config.js';
import { InputManager } from './core/input.js';
import { initWorld, scene, camera, renderer, controls } from './core/world.js';
import { initLights, flashlight, explosionLight, ambientLight } from './scenes/lights.js';
import { initLevel, phoneMesh, houseLights, streetLights, loadUVLamp, loadUVBloodMark, loadCollectableNotes } from './scenes/level.js';
import { initInventoryUI, toggleInventory, inventorySetFlashlightMode, isInventoryOpen, closeInventory, isNoteReaderOpen, goBackFromNote, showInventoryBriefly } from './ui/inventoryUI.js';
import { initUI, ui, updateSubtitle } from './ui/ui.js';
import { initLaptop, toggleLaptopUI } from './ui/laptopUI.js';
import { initNumpad, toggleNumpadUI } from './ui/numpadUI.js';
import { initBook, toggleBookUI } from './ui/bookUI.js';
import { initStoneUI, hideStoneUI } from './ui/stoneUI.js';
import { createRain, animateRain, animateExplosion } from './effects/particles.js';
import { initAudio, playSound, stopSound, updateRainVolume } from './core/audio.js';
import { updateDialogues } from './data/dialogues.js';
import { initShadow, updateShadow, initDistantShadows, updateDistantShadows, startAmbientShadows, updateAmbientShadows, showShadow, startGarageApproach, stopGarageApproach, dismissShadow } from './effects/screamer.js';
import { showSplash } from './effects/splash.js';
import { initFuseboxUI, toggleFuseboxUI } from './ui/fuseboxui.js';
import { initPauseUI, showPause, hidePause, isPaused } from './ui/pauseUI.js';
import { initEnding } from './scenes/ending.js';
import { setUVMarkVisible, setCollectableNotesVisible } from './scenes/level.js';
import { GS, dismissAndTrack, setDismissShadowFn } from './core/gameState.js';
import { updateStateMachine, setAutosave as smSetAutosave, setRegisterClue as smSetRegisterClue } from './core/stateMachine.js';
import { onInteract, setAutosave as intSetAutosave, setRegisterClue as intSetRegisterClue } from './core/interaction.js';
import { initDebugTools, isDebugEditorActive } from './utils/debug.js';
import { initAchievements, unlock as unlockAch } from './core/achievements.js';
import { loadFugglers, setOnAllFugglersCollected } from './scenes/fugglers.js';
import { initLoadingScreen, setLoadingProgress, hideLoadingScreen } from './ui/loadingScreen.js';
import { setLoadingCallbacks } from './scenes/level.js';
import { saveGame, loadGame, hasSave, getSaveTimestamp, resetAll } from './core/saveSystem.js';

// ── Inicialización ────────────────────────────────────────────────────────────
// Ocultar el canvas inmediatamente — el loading screen debe ser lo primero visible
const _canvasHide = document.createElement('style');
_canvasHide.id = 'canvas-hide';
_canvasHide.textContent = 'canvas { opacity: 0 !important; }';
document.head.appendChild(_canvasHide);

initLoadingScreen();
setLoadingProgress(0.02, 'Iniciando motor...');

initWorld();
initLights();

window._gameNeedsPointerLock = false;

// ── Pointer Lock — re-adquisición automática ─────────────────────────────────
// El browser impone un cooldown de ~1s después de soltar el lock.
// En vez de depender de clicks del usuario, detectamos cuando se pierde
// y reintentamos automáticamente tras el cooldown.

let _lockRetryTimer = null;
let _lockRetryCount = 0;
const MAX_RETRIES = 3; // máximo de reintentos automáticos antes de esperar click del usuario

function _shouldHaveLock() {
    if (isPaused()) return false;
    if (isInventoryOpen()) return false;
    if (typeof isDebugEditorActive === 'function' && isDebugEditorActive()) return false;
    const s  = GS.state;
    const ui = GS.isLaptopOpen || GS.isNumpadOpen || GS.isBookOpen || GS.isStoneOpen || GS.isFuseboxOpen;
    if (ui) return false;
    // Solo intentar lock en estados jugables — nunca en menú o cinemáticas de inicio
    return s === 'PHONE_RINGING' || s === 'IN_CALL'     || s === 'GAMEPLAY'
        || s === 'ENDING_WAKE'   || s === 'ENDING_OUTSIDE' || s === 'ENDING_CINEMATIC';
}

function _tryLock() {
    if (document.pointerLockElement) return;
    if (!_shouldHaveLock()) return;
    try { renderer.domElement.requestPointerLock(); } catch(e) {}
}

document.addEventListener('pointerlockchange', () => {
    window._gameNeedsPointerLock = !!document.pointerLockElement;

    if (!document.pointerLockElement) {
        // Lock perdido — programar un único reintento tras el cooldown del browser
        clearTimeout(_lockRetryTimer);
        _lockRetryCount = 0;
        _lockRetryTimer = setTimeout(_tryLock, 1100);
    } else {
        // Lock recuperado — resetear contador
        clearTimeout(_lockRetryTimer);
        _lockRetryCount = 0;
    }
});

// Si falla, reintentar máximo MAX_RETRIES veces — luego esperar click del usuario
// Esto evita el loop infinito de errores en la consola
document.addEventListener('pointerlockerror', () => {
    clearTimeout(_lockRetryTimer);
    if (_shouldHaveLock() && _lockRetryCount < MAX_RETRIES) {
        _lockRetryCount++;
        _lockRetryTimer = setTimeout(_tryLock, 1000);
    } else {
        _lockRetryCount = 0; // reset — el siguiente click del usuario reintentará
    }
});

// Click en el canvas — recuperar lock manualmente (resetea el contador)
renderer.domElement.addEventListener('click', () => {
    _lockRetryCount = 0;
    clearTimeout(_lockRetryTimer);
    _tryLock();
});

initLevel();
// Conectar callbacks del LoadingManager — progress y onAllLoaded
setLoadingCallbacks(
    (progress, url) => {
        // Mapear progreso 0-1 a rango 0.1-0.9 (dejando margen para init/audio)
        setLoadingProgress(0.1 + progress * 0.8, 'Cargando escena...');
    },
    () => {
        // Todos los GLBs cargados — esperar un frame y cerrar la pantalla
        setLoadingProgress(0.95, 'Preparando...');
        setTimeout(() => {
            hideLoadingScreen(() => {
                // Mostrar canvas con fade suave
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    canvas.style.transition = 'opacity 0.8s ease';
                    canvas.style.opacity    = '1';
                    // Quitar el style que ocultaba el canvas
                    document.getElementById('canvas-hide')?.remove();
                }
                // Fade in suave del menú
                const menu = document.getElementById('menu');
                if (menu) {
                    menu.style.display    = '';
                    menu.style.opacity    = '0';
                    menu.style.transition = 'opacity 1.2s ease';
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        menu.style.opacity = '1';
                    }));
                }
            });
        }, 200);
    }
);
// Ocultar el menú mientras carga
const menuEl = document.getElementById('menu');
if (menuEl) menuEl.style.display = 'none';

initUI();
initAchievements();
initLaptop();
initNumpad();
initBook();
initAudio();

// Posición de cámara para el menú de fondo
camera.position.set(-11.195, 8.356, 19.804);
camera.rotation.set(-0.208, -0.654, -0.133);

// Luces del menú
setTimeout(() => {
    houseLights.forEach(item => {
        item.light.intensity = 3.0;
        if (item.mesh.material) {
            item.mesh.material.emissive.setHex(0xffaa00);
            item.mesh.material.emissiveIntensity = 1.5;
        }
    });
    streetLights.forEach(item => {
        item.light.intensity = 15.0;
        item.mesh.material.emissiveIntensity = 4.0;
    });
    ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM;
}, 600);

createRain();
initInventoryUI();
loadUVLamp();
loadFugglers();
loadUVBloodMark();
loadCollectableNotes();
initShadow();
initDistantShadows();
initFuseboxUI();
initPauseUI({
    onContinue: () => {
        clock.getDelta();
        setTimeout(() => controls.lock(), 10);
    },
    onSave: () => saveGame(),
    onRestart:  () => { resetAll(); location.reload(); },
    onMainMenu: () => { resetAll(); location.reload(); },
});

initStoneUI(() => {
    ui.showSubtitle("Zare: '...¿Qué significa este número?'", 3000);
    // clueStone ya se registra en interaction.js al abrir la piedra
});

const input = new InputManager();
const clock = new THREE.Clock();

initEnding({
    getGameState: () => GS.state,
    setGameState: (s) => { GS.state = s; },
    getUVMode:    () => GS.uvMode,
    setUVMode:    (m) => { GS.uvMode = m; },
    input,
});

// ── Cargar partida guardada si existe ────────────────────────────────────────
// Se intenta cargar después de que todos los sistemas están inicializados.
// Si no hay save, el juego arranca normal desde el menú.
if (hasSave()) {
    // Mostrar opción de continuar en el menú
    _showContinueButton();
}

// ── Autoguardado en checkpoints ──────────────────────────────────────────────
// Se guardan los eventos más importantes del juego automáticamente.
export function autosave(label = '') {
    const ok = saveGame();
    if (ok) {
        ui.showSubtitle(label ? `Partida guardada — ${label}` : 'Partida guardada', 2000);
        console.log(`%c💾 AUTOSAVE ${label}`, 'color:#88ffcc;font-weight:bold;');
        unlockAch('SAVER');
    }
}

// Inyectar autosave y registerClue en los módulos que lo necesitan
smSetAutosave(autosave);
intSetAutosave(autosave);
smSetRegisterClue(_registerClue);
intSetRegisterClue(_registerClue);
setDismissShadowFn(dismissShadow);

// Callback cuando se recogen todos los fugglers
setOnAllFugglersCollected(() => {
    unlockAch('COLLECTOR');
});

// G — guardar manualmente durante el gameplay
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyG' && !isPaused()) {
        const ok = saveGame();
        if (ok) ui.showSubtitle('Partida guardada', 2000);
        else     ui.showSubtitle('No se puede guardar aquí', 2000);
    }
});

// Teclas del ending — independientes del PointerLock
document.addEventListener('keydown', (e) => {
    if (GS.state !== 'ENDING_WAKE' && GS.state !== 'ENDING_OUTSIDE') return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp')    GS.endingKeys.forward  = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown')  GS.endingKeys.backward = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')  GS.endingKeys.left     = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') GS.endingKeys.right    = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp')    GS.endingKeys.forward  = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown')  GS.endingKeys.backward = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')  GS.endingKeys.left     = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') GS.endingKeys.right    = false;
});

// ── Botón de inicio ───────────────────────────────────────────────────────────
const startBtn = document.getElementById('startBtn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        document.getElementById('menu').style.display = 'none';
        controls.lock();
        GS.state = 'INTRO';
        GS.timer = 0;
        showSplash(() => {
            ui.setWakeOpacity(1);
            GS.state = 'WAKING_UP';
            GS.timer = 0;
            playSound('lluvia');
            setTimeout(() => {
                houseLights.forEach(item => {
                    item.light.intensity = 3.0;
                    item.light.distance  = 18;
                    if (item.mesh.material) {
                        item.mesh.material.emissive.setHex(0xffaa00);
                        item.mesh.material.emissiveIntensity = 1.5;
                    }
                });
                streetLights.forEach(item => {
                    item.light.intensity = 15.0;
                    item.mesh.material.emissiveIntensity = 4.0;
                });
            }, 200);
        });
    });
}

// ── Input handlers ────────────────────────────────────────────────────────────
input.actions.onInteract = onInteract;

input.actions.onInventory = () => {
    if (isInventoryOpen() && isNoteReaderOpen()) { goBackFromNote(); return; }
    toggleInventory();
    if (isInventoryOpen()) {
        // Cancelar cualquier reintento pendiente antes de soltar el lock
        clearTimeout(_lockRetryTimer);
        controls.unlock();
    } else {
        setTimeout(() => { controls.lock(); }, 10);
    }
};

input.actions.onFlashlight = () => {
    if (GS.state !== 'GAMEPLAY') return;
    if (GS.uvMode === 'off') {
        GS.uvMode = 'normal';
        flashlight.color.setHex(0xffffff);
        flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY;
        setUVMarkVisible(false);
        setCollectableNotesVisible(false);
        inventorySetFlashlightMode('normal');
    } else if (GS.uvMode === 'normal') {
        if (GS.hasUVLamp) {
            GS.uvMode = 'uv';
            flashlight.color.setHex(0x7B00FF);
            flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY * 0.8;
            setUVMarkVisible(true);
            setCollectableNotesVisible(true);
            inventorySetFlashlightMode('uv');
            showInventoryBriefly(2000);
        } else {
            GS.uvMode = 'off';
            flashlight.intensity = 0;
            setCollectableNotesVisible(false);
            inventorySetFlashlightMode('off');
        }
    } else {
        GS.uvMode = 'off';
        flashlight.color.setHex(0xffffff);
        flashlight.intensity = 0;
        setUVMarkVisible(false);
        setCollectableNotesVisible(false);
        inventorySetFlashlightMode('off');
    }
};

// ── Teclas globales (Q / ESC / P) ────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // P — pausa
    const pauseableStates = ['GAMEPLAY', 'IN_CALL', 'ENDING_CINEMATIC', 'ENDING_WAKE', 'ENDING_OUTSIDE'];
    if (e.code === 'KeyP' && pauseableStates.includes(GS.state)
        && !GS.isLaptopOpen && !GS.isNumpadOpen && !GS.isBookOpen
        && !GS.isStoneOpen  && !GS.isFuseboxOpen) {
        isPaused() ? hidePause() : (controls.unlock(), showPause());
        return;
    }

    // Q / ESC — cerrar interfaces
    if (key === 'q' || e.key === 'Escape') {
        if (isPaused()) { hidePause(); return; }
        if (isInventoryOpen()) { closeInventory(); clearTimeout(_lockRetryTimer); setTimeout(() => controls.lock(), 10); }
        if (GS.isLaptopOpen)  { toggleLaptopUI(false); GS.isLaptopOpen = false; _registerClue('clueLaptop'); setTimeout(() => controls.lock(), 10); }
        if (GS.isNumpadOpen) {
            toggleNumpadUI(false); GS.isNumpadOpen = false;
            setTimeout(() => controls.lock(), 10);
            if (!GS.numpadDialogShown) {
                GS.numpadDialogShown = true;
                setTimeout(() => {
                    ui.showSubtitle("Zare: '¡¿Un candado digital?! Daniel no instaló esto...'", 4000);
                    setTimeout(() => {
                        // Mostrar contador si no tiene todas las pistas aún
                        if (GS.cluesFound >= 4) {
                            ui.setMission('Introduce el código para salir');
                        } else {
                            ui.setMission(`Busca las pistas del código (${GS.cluesFound}/4)`);
                        }
                    }, 4000);
                }, 300);
            }
        }
        if (GS.isBookOpen) {
            toggleBookUI(false); GS.isBookOpen = false;
            _registerClue('clueBook');
            setTimeout(() => { ui.showSubtitle("Zare: 'Tenía razón... esta casa está mal. Tengo que avisarle a Daniel.'", 5000); }, 500);
            setTimeout(() => controls.lock(), 10);
        }
        if (GS.isStoneOpen)   { hideStoneUI();           GS.isStoneOpen   = false; setTimeout(() => controls.lock(), 10); }
        if (GS.isFuseboxOpen) { toggleFuseboxUI(false);  GS.isFuseboxOpen = false; setTimeout(() => controls.lock(), 10); }
    }
});

// ── Eventos del juego ─────────────────────────────────────────────────────────

// Caja de fusibles activada
document.addEventListener('fuseboxActivate', () => {
    GS.isFuseboxOpen = false;
    if (GS.batteriesCollected < 3) {
        ui.showSubtitle(`Faltan fusibles (${GS.batteriesCollected}/3)`, 3000);
        setTimeout(() => controls.lock(), 10);
        return;
    }
    if (GS.powerRestored || GS.fuseboxUsed) return;

    setTimeout(() => controls.lock(), 10);
    GS.powerRestored = true;
    unlockAch('POWER_BACK');
    ui.showSubtitle("SISTEMA REINICIADO", 3000);
    playSound('zumbido_electrico');

    houseLights.forEach(item => {
        item.light.intensity = 1.5;
        if (item.mesh.material) {
            item.mesh.material.emissive.setHex(0xffaa00);
            item.mesh.material.emissiveIntensity = 1;
        }
    });
    ambientLight.intensity = 0.05;

    showShadow('garage');
    setTimeout(() => startGarageApproach(), 2000);
    setTimeout(() => ui.showSubtitle("Entidad: '...Zare...'", 3000), 4000);

    const blackoutLoop = setInterval(() => {
        houseLights.forEach(item => {
            if (Math.random() > 0.5) {
                item.light.intensity = Math.random() * 2;
                if (item.mesh.material) item.mesh.material.emissiveIntensity = 1;
            } else {
                item.light.intensity = 0;
                if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
            }
        });
        if (Math.random() > 0.7) playSound('chispazo');
        if (Math.random() > 0.8) houseLights.forEach(item => { item.light.intensity = 0; });
    }, 100);

    setTimeout(() => {
        clearInterval(blackoutLoop);
        GS.powerRestored = false;
        GS.fuseboxUsed   = true;
        houseLights.forEach(item => {
            item.light.intensity = 0;
            if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
        });
        ambientLight.intensity = 0;
        stopSound('zumbido_electrico');
        ui.showSubtitle("El sistema colapsó por completo...", 5000);
        stopGarageApproach();
        dismissAndTrack('garage');
        dismissAndTrack('closet');
        startAmbientShadows();
        setTimeout(() => {
            playSound('telefono');
            GS.finalCallTriggered = true;
            if (phoneMesh) phoneMesh.userData.isRingingAgain = true;
            autosave('Caja de fusibles usada');
        }, 5000);
    }, 15000);
});

document.addEventListener('fuseSlotFilled', () => {
    const el = document.getElementById('fuseboxUI');
    if (el) el.dataset.available = GS.batteriesCollected;
});

document.addEventListener('splashRevealScene', () => {
    houseLights.forEach(item => {
        item.light.intensity = 3.0;
        item.light.distance  = 18;
        if (item.mesh.material) {
            item.mesh.material.emissive.setHex(0xffaa00);
            item.mesh.material.emissiveIntensity = 1.5;
        }
    });
    streetLights.forEach(item => {
        item.light.intensity = 15.0;
        item.mesh.material.emissiveIntensity = 4.0;
    });
    ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM;
    playSound('lluvia');
});

// ── Herramientas de desarrollo ────────────────────────────────────────────────
if (import.meta.env.DEV) {
    initDebugTools();
}

// ── Sistema de pistas del código ────────────────────────────────────────────
// Registra que el jugador vio una pista. Cuando tiene las 4, cambia la misión.
function _registerClue(key) {
    if (GS[key]) return; // ya la había encontrado
    GS[key] = true;
    GS.cluesFound++;

    // Si el numpad ya fue descubierto, mostrar contador de pistas
    if (GS.numpadDialogShown) {
        if (GS.cluesFound >= 4) {
            ui.setMission('Introduce el código para salir');
            autosave('Código completo');
        } else {
            ui.setMission(`Busca las pistas del código (${GS.cluesFound}/4)`);
        }
    } else if (GS.cluesFound >= 4 && GS.finalCallAnswered) {
        // Tiene todo pero aún no llegó al numpad — guiarlo a la puerta
        ui.setMission('Regresa a la puerta principal');
        autosave('Código completo');
    }
    if (GS.cluesFound >= 4) unlockAch('DETECTIVE');
}

// ── Botón Continuar en el menú ───────────────────────────────────────────────
function _showContinueButton() {
    const menuContent = document.querySelector('.menu-content');
    if (!menuContent) return;

    // Fecha del último guardado
    const ts = getSaveTimestamp();
    const dateStr = ts ? new Date(ts).toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '';

    const continueBtn = document.createElement('button');
    continueBtn.id = 'continueBtn';
    continueBtn.innerHTML = `<span class="btn-text" data-text="CONTINUAR">CONTINUAR</span>`;
    continueBtn.style.cssText = `
        display: inline-flex; align-items: center; justify-content: center;
        padding: 0.5rem 0; background: transparent; border: none;
        cursor: pointer; outline: none; margin-top: 0.8rem; opacity: 0;
        animation: btn-appear 1s ease forwards; animation-delay: 2.2s;
    `;

    const dateLabel = document.createElement('div');
    dateLabel.textContent = dateStr ? `Última partida: ${dateStr}` : '';
    dateLabel.style.cssText = `
        font-family: 'Share Tech Mono', monospace; font-size: 0.6rem;
        letter-spacing: 0.2rem; color: rgba(120,180,120,0.4);
        text-align: center; margin-top: 0.3rem;
    `;

    menuContent.appendChild(continueBtn);
    if (dateStr) menuContent.appendChild(dateLabel);

    continueBtn.addEventListener('click', () => {
        // Ocultar canvas PRIMERO — antes de que el browser pinte nada más
        const canvas = document.querySelector('canvas');
        if (canvas) { canvas.style.transition = 'none'; canvas.style.opacity = '0'; }
        document.getElementById('menu').style.display = 'none';
        // Mostrar pantalla de carga
        initLoadingScreen();
        setLoadingProgress(0.3, 'Restaurando partida...');
        setTimeout(() => {
            setLoadingProgress(0.7, 'Cargando estado...');
            const ok = loadGame();
            setTimeout(() => {
                setLoadingProgress(1.0, 'Listo');
                hideLoadingScreen(() => {
                    // Revelar canvas con fade
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                        canvas.style.transition = 'opacity 0.8s ease';
                        canvas.style.opacity    = '1';
                    }
                    if (!ok) {
                        controls.lock();
                        GS.state = 'INTRO';
                        GS.timer = 0;
                        return;
                    }
                    _restoreLights();
                    controls.lock();
                });
            }, 400);
        }, 300);
    });
}

function _restoreLights() {
    // Restaurar iluminación según el estado guardado
    const postExplosion = GS.fuseboxUsed || GS.powerOutageCall;
    if (postExplosion) {
        // Post-explosión: todo apagado
        ambientLight.intensity = 0;
        houseLights.forEach(item => {
            item.light.intensity = 0;
            if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
        });
        streetLights.forEach(item => {
            item.light.intensity = 0;
            item.mesh.material.emissiveIntensity = 0;
        });
    } else {
        // Antes de la explosión: luces encendidas normales
        houseLights.forEach(item => {
            item.light.intensity = 3.0;
            item.light.distance  = 18;
            if (item.mesh.material) {
                item.mesh.material.emissive.setHex(0xffaa00);
                item.mesh.material.emissiveIntensity = 1.5;
            }
        });
        streetLights.forEach(item => {
            item.light.intensity = 15.0;
            item.mesh.material.emissiveIntensity = 4.0;
        });
        ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM;
    }
    playSound('lluvia');
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (isPaused()) {
        renderer.render(scene, camera);
        return;
    }

    animateRain();
    animateExplosion(delta);
    updateShadow(delta);
    updateDistantShadows(delta);
    updateAmbientShadows(delta);
    if (scene.userData.endingUpdate) scene.userData.endingUpdate(delta);

    updateRainVolume(
        camera.position.x > CONFIG.ENV.NO_RAIN_BOX.MIN.x &&
        camera.position.x < CONFIG.ENV.NO_RAIN_BOX.MAX.x
    );
    updateDialogues(delta);
    updateSubtitle(delta);

    updateStateMachine(delta, input, controls);

    renderer.render(scene, camera);
}

animate();