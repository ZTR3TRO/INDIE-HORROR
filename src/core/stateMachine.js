// ─────────────────────────────────────────────────────────────────────────────
//  stateMachine.js — Máquina de estados del juego
//  Cada función maneja un estado. updateStateMachine(delta) se llama
//  desde el game loop en main.js una vez por frame.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { camera, controls, scene } from '../core/world.js';
import { CONFIG } from '../data/config.js';
import { DIALOGUES } from '../data/dialogues.js';
import { playSound, stopSound } from '../core/audio.js';
import { phoneMesh, getHoveredDoor, houseLights, streetLights, collectableNotes, uvBloodMark } from '../scenes/level.js';
import { flashlight, explosionLight, ambientLight } from '../scenes/lights.js';
import { moveWithCollision, getWall, getFloor, getGroundY, updatePlayer } from '../core/player.js';
import { ui } from '../ui/ui.js';
import { isPaused } from '../ui/pauseUI.js';
import { inventorySetFlashlightMode, showInventoryBriefly } from '../ui/inventoryUI.js';
import { setUVMarkVisible, setCollectableNotesVisible } from '../scenes/level.js';
import { createExplosionEffect } from '../effects/particles.js';
import { GS } from '../core/gameState.js';
// autosave y registerClue se inyectan desde main.js (evitar dependencia circular)
let _autosave = null;
export function setAutosave(fn) { _autosave = fn; }

let _registerClue = null;
export function setRegisterClue(fn) { _registerClue = fn; }

// ── START ────────────────────────────────────────────────────────────────────
function stateStart(delta) {
    camera.rotation.y -= delta * 0.008; // paneo lento del menú
}

// ── INTRO ────────────────────────────────────────────────────────────────────
function stateIntro(delta) {
    GS.timer += delta;
    const angle  = -0.654 + GS.timer * 0.06;
    const radius = 22;
    camera.position.set(Math.sin(angle) * radius, 8, Math.cos(angle) * radius);
    camera.lookAt(0, 2, 0);
}

// ── WAKING_UP ────────────────────────────────────────────────────────────────
function stateWakingUp(delta) {
    GS.timer += delta;
    const progress = Math.min(GS.timer / CONFIG.TIMING.WAKE_DURATION, 1.0);
    const t = (1 - Math.cos(progress * Math.PI)) / 2;
    camera.position.lerpVectors(CONFIG.POSITIONS.BED, CONFIG.POSITIONS.SIT, t);
    camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SIT), t);

    let eyeOpacity = 1.0;
    if      (progress < 0.2) eyeOpacity = 1.0;
    else if (progress < 0.3) eyeOpacity = 0.2;
    else if (progress < 0.4) eyeOpacity = 0.8;
    else if (progress < 0.6) eyeOpacity = 0.1;
    else if (progress < 0.7) eyeOpacity = 0.4;
    else                      eyeOpacity = 1.0 - progress;
    if (progress >= 0.95) eyeOpacity = 0;

    ui.setWakeOpacity(eyeOpacity);

    if (progress >= 1.0) {
        GS.state = 'PHONE_RINGING';
        ui.setWakeOpacity(0);
        ui.showInteract(true, 'CONTESTAR');
        playSound('telefono');
    }
}

// ── TIME_JUMP ────────────────────────────────────────────────────────────────
function stateTimeJump(delta) {
    GS.timer += delta;
    if (GS.timer > 4.0) {
        ui.showBlackScreen(false);
        camera.position.copy(CONFIG.POSITIONS.VIEW);
        if (CONFIG.ROTATIONS.VIEW) camera.rotation.copy(CONFIG.ROTATIONS.VIEW);
        GS.state = 'PRE_EXPLOSION';
        GS.timer = 0;
        ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM;
    }
}

// ── PRE_EXPLOSION ────────────────────────────────────────────────────────────
function statePreExplosion(delta) {
    GS.timer += delta;
    if (GS.timer > CONFIG.TIMING.EXPLOSION_DELAY) {
        GS.state = 'EXPLODING';
        playSound('explosion');
        triggerExplosion();
    }
}

// ── TRAVELING ────────────────────────────────────────────────────────────────
function stateTraveling(delta) {
    GS.timer += delta;
    const progress = Math.min(GS.timer / CONFIG.TIMING.TRAVEL_DURATION, 1.0);
    if (progress > 0.8) ui.setWakeOpacity((progress - 0.8) * 5);
    const t = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    camera.position.lerpVectors(CONFIG.POSITIONS.VIEW, CONFIG.POSITIONS.SPAWN, t);
    camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SPAWN), t);

    if (progress >= 1.0) {
        camera.rotation.order = 'YXZ';
        const s = CONFIG.ROTATIONS.SPAWN;
        camera.rotation.set(s.x, s.y, 0);
        controls.lock();
        GS.state = 'GAMEPLAY';
        GS.timer = 0;
        ambientLight.intensity = 0.0;
        // Autoguardado al entrar al gameplay por primera vez
        setTimeout(() => { _autosave?.('Inicio del juego'); }, 3000);
        houseLights.forEach(item => {
            item.light.intensity = 0;
            if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
        });
        ui.fadeOutWake(3000);
        playSound('respiracion');
        playSound('tinitus');
        if (phoneMesh) phoneMesh.userData.isRingingAgain = false;
    }
}

// ── GAMEPLAY ────────────────────────────────────────────────────────────────
function stateGameplay(delta) {
    GS.timer   += delta;
    GS.paranoia += delta;

    // Sistema de paranoia
    if (GS.paranoia > 15) {
        if (Math.random() < 0.3) {
            const esTocando = Math.random() > 0.5;
            playSound(esTocando ? 'tocando' : 'puerta_scream');
            const frases = esTocando ? DIALOGUES.PARANOIA_TOCANDO : DIALOGUES.PARANOIA_PUERTA;
            setTimeout(() => { ui.showSubtitle(frases[Math.floor(Math.random() * frases.length)], 3000); }, 800);
        }
        GS.paranoia = 0;
    }

    if (!GS.tutorialShown && GS.timer > 2.0) {
        ui.showSubtitle("Presiona [ F ] para el Teléfono", 4000);
        GS.tutorialShown = true;
    }

    // Hint [E] al acercarse a la primera puerta
    if (!GS.doorHintShown) {
        const nearDoor = getHoveredDoor();
        if (nearDoor && camera.position.distanceTo(nearDoor.position) < 2.5) {
            ui.showInteract(true, 'INTERACTUAR');
            GS.doorHintShown = true;
            setTimeout(() => { ui.showInteract(false); }, 3000);
        }
    }

    // Hint [E] RECOGER al acercarse a nota con UV activa
    if (GS.uvMode === 'uv' && collectableNotes) {
        let nearNote = null;
        for (const note of collectableNotes) {
            if (note.userData.collected || !note.visible) continue;
            const np = new THREE.Vector3();
            note.getWorldPosition(np);
            if (camera.position.distanceTo(np) < 2.2) {
                const camDir = new THREE.Vector3();
                camera.getWorldDirection(camDir);
                const toNote = new THREE.Vector3().subVectors(np, camera.position).normalize();
                if (camDir.dot(toNote) > 0.4) { nearNote = note; break; }
            }
        }
        if (nearNote) {
            ui.showInteract(true, 'RECOGER');
        } else {
            const el    = document.getElementById('interact-msg');
            const keyEl = document.getElementById('interact-key');
            if (el?.classList.contains('visible') && keyEl?.textContent.includes('RECOGER')) {
                ui.showInteract(false);
            }
        }
    }

    // Detectar si el jugador está mirando la marca UV — registrar pista
    if (GS.uvMode === 'uv' && !GS.clueUV && uvBloodMark) {
        const markPos = new THREE.Vector3(8.10, 5.77, -7.87);
        if (camera.position.distanceTo(markPos) < 3.5) {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const toMark = new THREE.Vector3().subVectors(markPos, camera.position).normalize();
            if (camDir.dot(toMark) > 0.4) {
                _registerClue?.('clueUV');
            }
        }
    }

    // Segunda llamada — suena 6s después de entrar al gameplay
    if (!GS.powerOutageCall && !GS.powerRestored && GS.timer > 6.0) {
        playSound('telefono');
        GS.powerOutageCall = true;
        if (phoneMesh) phoneMesh.userData.isRingingAgain = true;
    }
}

// ── ENDING_WAKE / ENDING_OUTSIDE — movimiento libre sin PointerLock ──────────
function stateEndingMove(delta, input) {
    const spd = 1.4 * delta;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0; fwd.normalize();
    const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    rgt.y = 0; rgt.normalize();

    let dx = 0, dz = 0;
    if (GS.endingKeys.forward)  { dx += fwd.x * spd; dz += fwd.z * spd; }
    if (GS.endingKeys.backward) { dx -= fwd.x * spd; dz -= fwd.z * spd; }
    if (GS.endingKeys.left)     { dx -= rgt.x * spd; dz -= rgt.z * spd; }
    if (GS.endingKeys.right)    { dx += rgt.x * spd; dz += rgt.z * spd; }
    if (dx !== 0 || dz !== 0)   moveWithCollision(dx, dz, getWall());

    const moveDir = new THREE.Vector3(dx, 0, dz);
    const groundY = getGroundY(getFloor(), moveDir.length() > 0 ? moveDir.normalize() : null);
    if (groundY !== null) {
        const targetY = groundY + 1.7;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, Math.min(delta * 20, 1));
    }
}

// ── Explosión ────────────────────────────────────────────────────────────────
function triggerExplosion() {
    createExplosionEffect();
    let f = 0;
    const interval = setInterval(() => {
        f++;
        explosionLight.intensity = f % 2 === 0 ? 200 : 0;
        if (f > 10) {
            clearInterval(interval);
            explosionLight.intensity = 0;
            GS.state = 'TRAVELING';
            GS.timer = 0;
        }
    }, 80);
    streetLights.forEach(item => {
        item.light.intensity = 0;
        item.mesh.material.emissiveIntensity = 0;
    });
}

// ── Punto de entrada público ────────────────────────────────────────────────
export function updateStateMachine(delta, input, controls_) {
    const s = GS.state;

    if (s === 'START')           stateStart(delta);
    if (s === 'INTRO')           stateIntro(delta);
    if (s === 'WAKING_UP')       stateWakingUp(delta);
    if (s === 'TIME_JUMP')       stateTimeJump(delta);
    if (s === 'PRE_EXPLOSION')   statePreExplosion(delta);
    if (s === 'TRAVELING')       stateTraveling(delta);
    if (s === 'GAMEPLAY')        stateGameplay(delta);
    if (s === 'ENDING_WAKE' || s === 'ENDING_OUTSIDE') stateEndingMove(delta);

    // Movimiento del jugador — activo en los estados jugables
    if (s === 'PHONE_RINGING' || s === 'IN_CALL' || s === 'GAMEPLAY') {
        if ((controls_.isLocked || input.keys.flyMode)
            && !GS.isLaptopOpen && !GS.isNumpadOpen && !GS.isBookOpen
            && !GS.isStoneOpen  && !GS.isFuseboxOpen && !isPaused()) {
            updatePlayer(delta, input);
        }
        // Animación del teléfono sonando
        if ((s === 'PHONE_RINGING' || phoneMesh?.userData.isRingingAgain) && phoneMesh?.visible) {
            phoneMesh.rotation.z = Math.sin(Date.now() * 0.02) * 0.1;
        }
    }
}