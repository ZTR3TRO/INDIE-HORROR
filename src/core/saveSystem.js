// ─────────────────────────────────────────────────────────────────────────────
//  saveSystem.js — Guardado y carga de partida
//
//  Usa localStorage — persiste entre sesiones en Electron.
//  Guarda: estado del juego (GS), posición/rotación de cámara,
//          y estado de los objetos de escena (llave, baterías, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { GS } from './gameState.js';
import { camera } from './world.js';
import {
    keyMesh, batteries, uvLampMesh, doors, collectableNotes, phoneMesh,
} from '../scenes/level.js';
import {
    inventoryCollect, inventorySetBatteries, collectNote,
} from '../ui/inventoryUI.js';
import { flashlight } from '../scenes/lights.js';
import { setUVMarkVisible, setCollectableNotesVisible } from '../scenes/level.js';
import { inventorySetFlashlightMode } from '../ui/inventoryUI.js';
import { CONFIG } from '../data/config.js';
import { ui } from '../ui/ui.js';

const SAVE_KEY  = 'nightfall_save';
const SAVE_VERSION = 4; // v4: agrega sombras y pistas del código // incrementar si cambia la estructura del save

// ── Guardar ──────────────────────────────────────────────────────────────────

export function saveGame() {
    // Solo guardar en estados jugables — no en menú, cinemáticas ni endings
    const saveableStates = ['GAMEPLAY', 'PHONE_RINGING', 'IN_CALL'];
    if (!saveableStates.includes(GS.state)) return false;

    const data = {
        version: SAVE_VERSION,
        timestamp: Date.now(),

        // Estado del juego
        gs: {
            state:               GS.state,
            hasKey:              GS.hasKey,
            batteriesCollected:  GS.batteriesCollected,
            hasUVLamp:           GS.hasUVLamp,
            uvMode:              GS.uvMode,
            doorHintShown:       GS.doorHintShown,
            tutorialShown:       GS.tutorialShown,
            powerOutageCall:     GS.powerOutageCall,
            powerOutageAnswered: GS.powerOutageAnswered,
            powerRestored:       GS.powerRestored,
            fuseboxUsed:         GS.fuseboxUsed,
            numpadDialogShown:   GS.numpadDialogShown,
            finalCallTriggered:  GS.finalCallTriggered,
            finalCallAnswered:   GS.finalCallAnswered,
            cluesFound:          GS.cluesFound,
            clueBook:            GS.clueBook,
            clueLaptop:          GS.clueLaptop,
            clueStone:           GS.clueStone,
            clueUV:              GS.clueUV,
            shadowsDismissed:    [...GS.shadowsDismissed],
        },

        // Posición y rotación de la cámara
        camera: {
            px: camera.position.x, py: camera.position.y, pz: camera.position.z,
            // Solo guardamos el yaw (ry). PointerLockControls gestiona el pitch
            // internamente — restaurar rx causa que la cámara mire hacia arriba/abajo.
            ry: camera.rotation.y,
        },

        // Estado de objetos de escena
        scene: {
            phoneCollected:   phoneMesh ? !phoneMesh.visible : false,
            keyCollected:     !keyMesh?.visible,
            batteriesLeft:    batteries.map(b => b.userData.collected ?? false),
            uvLampCollected:  !uvLampMesh?.visible,
            doorsOpen:        doors.map(d => d.userData.isOpen ?? false),
            notesCollected:   collectableNotes
                ? collectableNotes.map(n => ({
                    id:       n.userData.noteId,
                    title:    n.userData.noteTitle,
                    foundAt:  n.userData.noteFoundAt,
                    body:     n.userData.noteBody,
                    collected: n.userData.collected ?? false,
                }))
                : [],
        },
    };

    // Inferir misión activa según el estado del juego
    data.activeMission = _getActiveMission();

    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
    } catch(e) {
        console.warn('NIGHTFALL: Error al guardar partida', e);
        return false;
    }
}

function _getActiveMission() {
    // Espejo exacto del flujo de interaction.js
    if (GS.finalCallAnswered && GS.cluesFound >= 4) return 'Regresa a la puerta principal';
    if (GS.finalCallAnswered)          return 'Escapa por la puerta principal';
    if (GS.fuseboxUsed && GS.cluesFound >= 4) return 'Regresa a la puerta principal';
    if (GS.fuseboxUsed)                return 'Introduce el código para salir';
    if (GS.batteriesCollected === 3)   return 'Regresa a la caja de fusibles';
    if (GS.batteriesCollected > 0)     return `Buscar los fusibles (${GS.batteriesCollected}/3)`;
    // hasKey pero no ha abierto el garaje todavía — no sabemos si abrió la puerta,
    // así que ponemos la misión más conservadora: abre el garaje
    if (GS.hasKey)                     return 'Abre la puerta del garaje';
    if (GS.powerOutageAnswered)        return 'Buscar la llave del garaje';
    if (GS.powerOutageCall)            return 'Ve a la caja de fusibles en el garaje';
    return '';
}

// ── ¿Existe save? ─────────────────────────────────────────────────────────────

export function hasSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data.version === SAVE_VERSION;
    } catch(e) {
        return false;
    }
}

export function getSaveTimestamp() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw).timestamp ?? null;
    } catch(e) {
        return null;
    }
}

export function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
}

// ── Cargar ────────────────────────────────────────────────────────────────────

export function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (data.version !== SAVE_VERSION) return false;

        // ── Restaurar GS ──────────────────────────────────────────────────
        Object.assign(GS, data.gs);
        GS.timer    = 99;  // evitar que se disparen tutoriales al cargar
        GS.paranoia = 0;
        // Asegurar que las UIs estén cerradas al cargar
        GS.isLaptopOpen  = false;
        GS.isNumpadOpen  = false;
        GS.isBookOpen    = false;
        GS.isStoneOpen   = false;
        GS.isFuseboxOpen = false;

        // ── Restaurar cámara ──────────────────────────────────────────────
        const c = data.camera;
        camera.position.set(c.px, c.py, c.pz);
        // Restaurar solo el yaw (ry) con pitch=0 — mirar al frente.
        // PointerLockControls toma el control del pitch tras el lock,
        // así que restaurarlo causa que la cámara mire hacia arriba/abajo.
        camera.rotation.order = 'YXZ';
        camera.rotation.set(0, c.ry, 0);

        // ── Restaurar objetos de escena ───────────────────────────────────
        const s = data.scene;

        // Teléfono — si ya fue recogido, ocultarlo de la escena
        if (s.phoneCollected && phoneMesh) {
            phoneMesh.visible = false;
        }

        // Llave
        if (s.keyCollected && keyMesh) {
            keyMesh.visible = false;
            inventoryCollect('key');
        }

        // Baterías
        if (s.batteriesLeft?.length) {
            let collected = 0;
            s.batteriesLeft.forEach((wasCollected, i) => {
                if (wasCollected && batteries[i]) {
                    batteries[i].visible = false;
                    batteries[i].userData.collected = true;
                    collected++;
                }
            });
            if (collected > 0) inventorySetBatteries(collected);
        }

        // Lámpara UV
        if (s.uvLampCollected && uvLampMesh) {
            uvLampMesh.visible = false;
            inventoryCollect('uvlamp');
        }

        // Modo UV de la linterna
        if (GS.uvMode === 'uv' && GS.hasUVLamp) {
            flashlight.color.setHex(0x7B00FF);
            flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY * 0.8;
            setUVMarkVisible(true);
            setCollectableNotesVisible(true);
            inventorySetFlashlightMode('uv');
        } else if (GS.uvMode === 'normal') {
            flashlight.color.setHex(0xffffff);
            flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY;
            inventorySetFlashlightMode('normal');
        } else {
            flashlight.intensity = 0;
            inventorySetFlashlightMode('off');
        }

        // Puertas
        if (s.doorsOpen?.length) {
            s.doorsOpen.forEach((wasOpen, i) => {
                if (wasOpen && doors[i] && !doors[i].userData.isOpen) {
                    doors[i].rotation.y += Math.PI / 2;
                    doors[i].userData.isOpen = true;
                }
            });
        }

        // Notas coleccionables
        if (s.notesCollected?.length && collectableNotes) {
            s.notesCollected.forEach(saved => {
                if (!saved.collected) return;
                // Ocultar el mesh de la nota en la escena
                const mesh = collectableNotes.find(n => n.userData.noteId === saved.id);
                if (mesh) {
                    mesh.visible = false;
                    mesh.userData.collected = true;
                }
                // Agregar al inventario
                collectNote(saved.id, saved.title, saved.foundAt, saved.body);
            });
        }

        // Restaurar sombras descartadas
        if (data.gs.shadowsDismissed?.length) {
            // Importar dismissShadow dinámicamente para evitar dependencia circular
            import('../effects/screamer.js').then(({ dismissShadow }) => {
                data.gs.shadowsDismissed.forEach(id => dismissShadow(id));
            });
        }

        // Restaurar misión activa
        if (data.activeMission) {
            setTimeout(() => ui.setMission(data.activeMission), 100);
        }

        return true;
    } catch(e) {
        console.warn('NIGHTFALL: Error al cargar partida', e);
        return false;
    }
}