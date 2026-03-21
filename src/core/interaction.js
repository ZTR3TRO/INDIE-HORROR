// ─────────────────────────────────────────────────────────────────────────────
//  interaction.js — Lógica de interacción con el mundo
//  Maneja todo lo que pasa cuando el jugador presiona [E]
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { camera, controls } from '../core/world.js';
import { CONFIG } from '../data/config.js';
import { DIALOGUES, playDialogueSequence } from '../data/dialogues.js';
import { playSound, stopSound } from '../core/audio.js';
import {
    phoneMesh, pickupPhone, getHoveredDoor, toggleDoor,
    batteries, keyMesh, keyWorldPosition, fuseboxMesh,
    laptopMesh, laptopWorldPosition, bookWorldPosition,
    uvLampMesh, collectableNotes, collidableObjects, doors,
} from '../scenes/level.js';
import {
    inventoryCollect, inventorySetBatteries, collectNote,
} from '../ui/inventoryUI.js';
import { ui } from '../ui/ui.js';
import { toggleLaptopUI } from '../ui/laptopUI.js';
import { toggleNumpadUI } from '../ui/numpadUI.js';
import { toggleBookUI } from '../ui/bookUI.js';
import { showStoneUI } from '../ui/stoneUI.js';
import { toggleFuseboxUI } from '../ui/fuseboxui.js';
import { triggerScreamer } from '../effects/screamer.js';
import { GS, dismissAndTrack } from '../core/gameState.js';
import { tryCollectFuggler, getNearFuggler } from '../scenes/fugglers.js';
// autosave y registerClue inyectados desde main.js
let _autosave = null;
export function setAutosave(fn) { _autosave = fn; }

let _registerClue = null;
export function setRegisterClue(fn) { _registerClue = fn; }

// Raycaster compartido para detección de objetos interactuables
const interactRay    = new THREE.Raycaster();
const INTERACT_DIST  = 1.8;

// ── Utilidad: línea de visión ────────────────────────────────────────────────
function checkLineOfSight(targetPos) {
    const dir = new THREE.Vector3().subVectors(targetPos, camera.position).normalize();
    interactRay.set(camera.position, dir);
    const hits = interactRay.intersectObjects(collidableObjects, true);
    if (!hits.length) return true;
    const distToTarget = camera.position.distanceTo(targetPos);
    return hits[0].distance >= distToTarget - 0.3;
}

function getInteractTarget() {
    interactRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    interactRay.far = INTERACT_DIST;
    const hits = interactRay.intersectObjects(collidableObjects, true);
    return hits.length ? hits[0] : null;
}

// ── Handlers por estado ──────────────────────────────────────────────────────

function handlePhoneRinging() {
    if (camera.position.distanceTo(CONFIG.POSITIONS.PHONE) < 2.5) {
        ui.showInteract(false);
        ui.showCall(true);
        stopSound('telefono');
        stopSound('pasos');
        pickupPhone();
        GS.state = 'IN_CALL';
        import('../core/achievements.js').then(({unlock}) => unlock('FIRST_CALL'));
        GS.timer = 0;
        playDialogueSequence(ui, DIALOGUES.CALL_1, () => {
            ui.showCall(false);
            ui.showBlackScreen(true);
            controls.unlock();
            GS.state = 'TIME_JUMP';
            GS.timer = 0;
            stopSound('pasos');
        });
    }
}

function handleEndingWake() {
    const door = getHoveredDoor();
    if (door) {
        const dist = camera.position.distanceTo(door.position);
        if (dist < 2.5) toggleDoor(door);
    }
}

function handleEndingOutside() {
    const door = getHoveredDoor();
    if (door && door.userData.isMainDoor) {
        const dist = camera.position.distanceTo(door.position);
        if (dist < 2.5 && !door.userData.isOpen) {
            toggleDoor(door);
            setTimeout(() => { triggerScreamer(); }, 800);
        }
    }
}

function handleGameplay() {
    // 🧸 FUGGLERS — coleccionables
    if (tryCollectFuggler(ui)) return;

    // 🔑 LLAVE
    if (!GS.hasKey && keyMesh && keyMesh.visible) {
        const distToKey = camera.position.distanceTo(keyWorldPosition);
        if (distToKey < 3.0 && checkLineOfSight(keyWorldPosition)) {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const toKey = new THREE.Vector3().subVectors(keyWorldPosition, camera.position).normalize();
            if (camDir.dot(toKey) > 0.6) {
                keyMesh.visible = false;
                GS.hasKey = true;
                inventoryCollect('key');
                playSound('objeto');
                ui.showSubtitle("Encontraste la llave del garaje", 4000);
                ui.setMission('Abre la puerta del garaje');
                setTimeout(() => _autosave?.('Llave encontrada'), 500);
                return;
            }
        }
    }

    // 🔋 FUSIBLES
    let battPickedUp = false;
    for (const bat of batteries) {
        if (battPickedUp || !bat.visible || bat.userData.collected) continue;
        const batPos = new THREE.Vector3();
        bat.getWorldPosition(batPos);
        if (camera.position.distanceTo(batPos) < 3.0 && checkLineOfSight(batPos)) {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const toBat = new THREE.Vector3().subVectors(batPos, camera.position).normalize();
            if (camDir.dot(toBat) > 0.6) {
                bat.visible = false;
                bat.userData.collected = true;
                GS.batteriesCollected++;
                battPickedUp = true;
                inventorySetBatteries(GS.batteriesCollected);
                playSound('objeto');
                ui.showSubtitle(`Fusible recogido (${GS.batteriesCollected}/3)`, 2000);
                if (GS.batteriesCollected === 3) {
                    // Tiene todos los fusibles — volver a la caja
                    ui.setMission('Regresa a la caja de fusibles');
                    setTimeout(() => { ui.showSubtitle("Zare: 'Tengo los fusibles. Iré a la caja.'", 5000); }, 2000);
                } else {
                    ui.setMission(`Buscar los fusibles (${GS.batteriesCollected}/3)`);
                }
                setTimeout(() => _autosave?.(`Fusible ${GS.batteriesCollected}/3`), 500);
            }
        }
    }
    if (battPickedUp) return;

    // 🔵 LÁMPARA UV
    if (!GS.hasUVLamp && uvLampMesh && uvLampMesh.visible) {
        const lampPos = new THREE.Vector3();
        uvLampMesh.getWorldPosition(lampPos);
        if (camera.position.distanceTo(lampPos) < 2.0) {
            GS.hasUVLamp = true;
            uvLampMesh.visible = false;
            inventoryCollect('uvlamp');
            playSound('objeto');
            ui.showSubtitle("Zare: '¿Una lámpara UV? ¿Qué hace esto aquí?'", 4000);
        }
    }

    const hit       = getInteractTarget();
    const hitObject = hit?.object ?? null;
    const hitDist   = hit?.distance ?? 999;

    // 📞 SEGUNDA LLAMADA
    if (GS.powerOutageCall && !GS.powerOutageAnswered && phoneMesh?.userData.isRingingAgain && !GS.finalCallTriggered) {
        stopSound('telefono');
        phoneMesh.userData.isRingingAgain = false;
        GS.powerOutageAnswered = true;
        ui.showCall(true);
        playDialogueSequence(ui, DIALOGUES.CALL_2, () => {
            ui.showCall(false);
            // Si ya tiene fusibles, mostrar cuántos faltan; si no, ir a la caja primero
            if (GS.batteriesCollected >= 3) {
                ui.setMission('Regresa a la caja de fusibles');
            } else if (GS.batteriesCollected > 0) {
                ui.setMission(`Buscar los fusibles (${GS.batteriesCollected}/3)`);
            } else {
                ui.setMission('Ve a la caja de fusibles en el garaje');
            }
        });
        return;
    }

    // 📞 TERCERA LLAMADA
    if (GS.finalCallTriggered && !GS.finalCallAnswered && phoneMesh?.userData.isRingingAgain) {
        stopSound('telefono');
        phoneMesh.userData.isRingingAgain = false;
        GS.finalCallAnswered = true;
        ui.showCall(true);
        playDialogueSequence(ui, DIALOGUES.CALL_FINAL, () => {
            ui.showCall(false);
            ui.setMission("Escapa por la puerta principal");
        });
        return;
    }

    // 📄 NOTAS UV
    if (GS.uvMode === 'uv' && collectableNotes?.length) {
        for (const note of collectableNotes) {
            if (note.userData.collected) continue;
            const notePos = new THREE.Vector3();
            note.getWorldPosition(notePos);
            if (camera.position.distanceTo(notePos) < 2.2) {
                const camDir = new THREE.Vector3();
                camera.getWorldDirection(camDir);
                const toNote = new THREE.Vector3().subVectors(notePos, camera.position).normalize();
                if (camDir.dot(toNote) > 0.45) {
                    note.userData.collected = true;
                    note.visible = false;
                    const _allNotes = collectableNotes?.every(n => n.userData.collected);
                    if (_allNotes) import('../core/achievements.js').then(({unlock}) => unlock('ARCHIVIST'));
                    playSound('objeto');
                    collectNote(note.userData.noteId, note.userData.noteTitle,
                                note.userData.noteFoundAt, note.userData.noteBody);
                    return;
                }
            }
        }
    }

    // Detectar tipo de objeto apuntado
    let hitIsBook = false;
    let hitIsDoor = false;
    let node = hitObject;
    while (node) {
        if (node.userData.isBook) hitIsBook = true;
        if (node.userData.isDoor) hitIsDoor = true;
        node = node.parent;
    }

    // 🪨 PIEDRAS RITUALES
    let hitStone = null;
    let closestDist = 2.8;
    for (const obj of collidableObjects) {
        if (obj.userData.isRitualStone === undefined) continue;
        const stonePos = new THREE.Vector3();
        obj.getWorldPosition(stonePos);
        const dist = camera.position.distanceTo(stonePos);
        if (dist < closestDist) {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const toStone = new THREE.Vector3().subVectors(stonePos, camera.position).normalize();
            if (camDir.dot(toStone) > 0.4) { closestDist = dist; hitStone = obj; }
        }
    }
    if (!hitStone) {
        const stoneRay = new THREE.Raycaster();
        stoneRay.setFromCamera(new THREE.Vector2(0, 0), camera);
        stoneRay.far = 3.0;
        const stoneHits = stoneRay.intersectObjects(collidableObjects, true);
        for (const h of stoneHits) {
            let n = h.object;
            while (n) { if (n.userData.isRitualStone !== undefined) { hitStone = n; break; } n = n.parent; }
            if (hitStone) break;
        }
    }
    if (hitStone) {
        if (hitStone.userData.isRitualStone) {
            GS.isStoneOpen = true;
            controls.unlock();
            showStoneUI();
            // Registrar al abrir — no requiere girar al ángulo exacto
            _registerClue?.('clueStone');
        } else {
            const msgs = ["Zare: 'Solo una piedra...'", "Zare: 'Esta no es...'", "Zare: 'No, esta no tiene nada.'"];
            ui.showSubtitle(msgs[Math.floor(Math.random() * msgs.length)], 2000);
        }
        return;
    }

    // 💻 LAPTOP
    if (laptopMesh && laptopWorldPosition.lengthSq() > 0) {
        if (camera.position.distanceTo(laptopWorldPosition) < 1.5 && hitDist < INTERACT_DIST) {
            let n = hitObject; let esLaptop = false;
            while (n) { if (n === laptopMesh) { esLaptop = true; break; } n = n.parent; }
            if (esLaptop && !GS.isLaptopOpen) {
                GS.isLaptopOpen = true;
                controls.unlock();
                toggleLaptopUI(true);
                const exitBtn = document.getElementById('exitLaptopBtn');
                if (exitBtn) {
                    exitBtn.onclick = () => { toggleLaptopUI(false); GS.isLaptopOpen = false; controls.lock(); };
                }
                return;
            }
        }
    }

    // 📖 LIBRO
    if (hitIsBook && !hitIsDoor) {
        const distToBook = bookWorldPosition?.lengthSq() > 0
            ? camera.position.distanceTo(bookWorldPosition) : 999;
        if (distToBook < 1.5 && !GS.isBookOpen) {
            GS.isBookOpen = true;
            toggleBookUI(true);
            playSound('objeto');
            controls.unlock();
        }
        return;
    }

    // ⚡ CAJA DE FUSIBLES
    if (fuseboxMesh && camera.position.distanceTo(CONFIG.POSITIONS.FUSEBOX) < 1.5
        && checkLineOfSight(CONFIG.POSITIONS.FUSEBOX)) {
        if (GS.fuseboxUsed) {
            ui.showSubtitle('La caja está quemada. Ya no funciona.', 3000);
            return;
        }
        if (!GS.isFuseboxOpen) {
            GS.isFuseboxOpen = true;
            controls.unlock();
            toggleFuseboxUI(true, GS.batteriesCollected);
            // Actualizar misión según cuántos fusibles tiene
            if (GS.batteriesCollected < 3) {
                ui.setMission(`Buscar los fusibles (${GS.batteriesCollected}/3)`);
            }
            // Si ya tiene los 3, la misión sigue siendo "Regresa a la caja" — no cambiar
        }
        return;
    }

    // 🚪 PUERTAS
    const door = getHoveredDoor();
    if (door) {
        const dist = camera.position.distanceTo(door.position);
        if (dist > 2.5) return;

        const { isGarageDoor, isGarage2Door, isMainDoor, isClosetDoor, isHallwayDoor } = door.userData;

        if (isMainDoor) {
            if (GS.finalCallAnswered) {
                playSound('puerta_bloqueada');
                if (!GS.isNumpadOpen) {
                    GS.isNumpadOpen = true;
                    // Si ya tiene todas las pistas, decirle el código directamente
                    if (GS.cluesFound >= 4) {
                        ui.setMission('Introduce el código para salir');
                    } else {
                        ui.setMission(`Busca las pistas del código (${GS.cluesFound}/4)`);
                    }
                    controls.unlock();
                    toggleNumpadUI(true);
                }
            } else {
                playSound('puerta_bloqueada');
                ui.showSubtitle("Zare: 'Está lloviendo demasiado fuerte, no saldré ahora.'", 3000);
            }
            return;
        }

        if (isGarage2Door && !door.userData.isOpen) {
            if (!GS.hasKey) {
                playSound('puerta_bloqueada');
                ui.showSubtitle("Zare: 'Maldición, tiene candado... necesito buscar la llave.'", 4000);
                setTimeout(() => { ui.setMission("Buscar la llave del garaje"); }, 4000);
                return;
            } else {
                ui.showSubtitle("Abriendo con la llave...", 2000);
                setTimeout(() => { ui.setMission('Ve a la caja de fusibles'); }, 1500);
            }
        }

        toggleDoor(door);
        if (isClosetDoor)  setTimeout(() => dismissAndTrack('closet'),  350);
        if (isHallwayDoor) setTimeout(() => dismissAndTrack('hallway'), 500);
        if (isGarage2Door) setTimeout(() => dismissAndTrack('patio'),   5000);
    }
}

// ── Punto de entrada público ────────────────────────────────────────────────
export function onInteract() {
    const state = GS.state;
    if (state === 'PHONE_RINGING')  { handlePhoneRinging();  return; }
    if (state === 'ENDING_WAKE')    { handleEndingWake();    return; }
    if (state === 'ENDING_OUTSIDE') { handleEndingOutside(); return; }
    if (state === 'GAMEPLAY')       { handleGameplay();              }
}