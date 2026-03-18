// ─────────────────────────────────────────────────────────────────────────────
//  debug.js — Herramientas de desarrollo
//  Solo activas en entorno DEV. Quitar el import en producción.
//
//  Shift+C → créditos directos
//  KeyC    → imprime posición de cámara
//  KeyN    → spawna nota frente a la cámara para posicionarla
//  Shift+B → spawna fuggler frente a la cámara para posicionarlo
//  T / R   → modo mover / rotar del TransformControls
//  KeyP    → imprime coordenadas listas para copiar (nota o fuggler)
//  KeyO    → suelta el objeto del editor
//  KeyX    → fuerza spawn de sombra ambient (testing)
//  KeyZ    → lista todas las puertas con nombre y posición
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { camera, scene, controls, transformControls } from '../core/world.js';
import { doors, houseLights, streetLights } from '../scenes/level.js';
import { showCredits } from '../effects/credits.js';
import { debugSpawnNearestAmbient } from '../effects/screamer.js';
import { flashlight, ambientLight } from '../scenes/lights.js';
import { GS } from '../core/gameState.js';
import { toggleNumpadUI } from '../ui/numpadUI.js';
import { CONFIG } from '../data/config.js';

let _noteEditorObj    = null;
let _fugglerEditorObj = null;
let _fugglerEditorIdx = 0;

// main.js consulta esto para saber si el editor está activo y no intentar re-lockear
export function isDebugEditorActive() {
    return !!(_noteEditorObj || _fugglerEditorObj);
}

export function initDebugTools() {
    document.addEventListener('keydown', (e) => {

        if (e.shiftKey && e.code === 'KeyC') {
            showCredits();
            return;
        }

        if (e.code === 'KeyC') {
            const p = camera.position;
            const r = camera.rotation;
            console.log(`📷 CAM  pos(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})  rotY(${r.y.toFixed(3)})`);
            return;
        }

        if (e.code === 'KeyN' && !e.shiftKey) {
            const geo  = new THREE.PlaneGeometry(0.18, 0.22);
            const mat  = new THREE.MeshBasicMaterial({ color: 0xffee88, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geo, mat);
            const fwd  = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            mesh.position.copy(camera.position).addScaledVector(fwd, 1.2);
            mesh.position.y -= 0.1;
            mesh.rotation.y = camera.rotation.y;
            mesh.name = 'note_editor_preview';
            scene.add(mesh);
            _noteEditorObj = mesh;
            controls.unlock();
            transformControls.attach(mesh);
            transformControls.setMode('translate');
            console.log('%c📄 NOTA spawneada — T=mover  R=rotar  P=copiar coords  O=soltar', 'color:#ffee88;font-weight:bold;');
            return;
        }

        if (e.code === 'KeyT' && (_noteEditorObj || _fugglerEditorObj)) { transformControls.setMode('translate'); return; }
        if (e.code === 'KeyR' && (_noteEditorObj || _fugglerEditorObj)) { transformControls.setMode('rotate');    return; }

        if (e.code === 'KeyP' && _noteEditorObj) {
            const p = _noteEditorObj.position;
            const r = _noteEditorObj.rotation;
            console.log('%c📋 NOTA — COORDENADAS LISTAS:', 'color:#00ff88;font-weight:bold;font-size:14px;');
            console.log(`%c  pos: ${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}  rotY: ${r.y.toFixed(3)}`, 'color:#aaffaa;font-family:monospace;font-size:13px;');
            console.log(`%c  createCollectableNote('id', 'Título', 'Encontrado en...', \`texto\`,\n    ${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}, ${r.y.toFixed(3)});`, 'color:#88ffcc;font-family:monospace;');
            return;
        }

        if (e.code === 'KeyP' && _fugglerEditorObj) {
            const p = _fugglerEditorObj.position;
            const r = _fugglerEditorObj.rotation;
            console.log('%c🧸 FUGGLER — COORDENADAS LISTAS:', 'color:#ffcc44;font-weight:bold;font-size:14px;');
            console.log(
                `%c  { pos: new THREE.Vector3(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}), rotY: ${r.y.toFixed(3)}, scale: 0.4 }`,
                'color:#ffee88;font-family:monospace;font-size:13px;'
            );
            console.log(`%c  → Pega esto en FUGGLER_DEFS[${_fugglerEditorIdx}] en fugglers.js`, 'color:#ffaa44;font-family:monospace;');
            return;
        }

        if (e.code === 'KeyX') {
            debugSpawnNearestAmbient();
            return;
        }

        if (e.code === 'KeyZ') {
            if (doors.length === 0) {
                console.log('%c🚪 No hay puertas cargadas todavía.', 'color:#ff8888;');
                return;
            }
            console.log('%c🚪 PUERTAS DEL NIVEL:', 'color:#88ccff;font-weight:bold;font-size:14px;');
            doors.forEach((door, i) => {
                const worldPos = new THREE.Vector3();
                door.getWorldPosition(worldPos);
                const dist  = camera.position.distanceTo(worldPos);
                const isNear = dist < 3.0 ? '👈 CERCA' : '';
                console.log(
                    `%c  [${i}] "${door.name}"  pos(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})  dist: ${dist.toFixed(1)}m  ${isNear}`,
                    dist < 3.0 ? 'color:#ffff88;font-family:monospace;' : 'color:#888888;font-family:monospace;'
                );
            });
            return;
        }

        if (e.code === 'KeyO') {
            transformControls.detach();
            if (_noteEditorObj)    { scene.remove(_noteEditorObj);    _noteEditorObj    = null; }
            if (_fugglerEditorObj) { scene.remove(_fugglerEditorObj); _fugglerEditorObj = null; }
            controls.lock();
            console.log('📄🧸 Editor soltado.');
            return;
        }

        // Shift+B — spawna fuggler para posicionarlo
        if (e.shiftKey && e.code === 'KeyB') {
            _spawnFugglerEditor();
            return;
        }

        // Shift+N — SKIP directo al numpad
        if (e.shiftKey && e.code === 'KeyN') {
            _skipToNumpad();
            return;
        }

        // Shift+F — imprimir posición para colocar fugglers
        if (e.shiftKey && e.code === 'KeyF') {
            const p = camera.position;
            const r = camera.rotation;
            console.log('%c🧸 FUGGLER POSITION:', 'color:#ffcc44;font-weight:bold;font-size:13px;');
            console.log(
                `%c  pos: new THREE.Vector3(${p.x.toFixed(3)}, ${(p.y - 0.3).toFixed(3)}, ${p.z.toFixed(3)}),
  rotY: ${r.y.toFixed(3)}`,
                'color:#ffee88;font-family:monospace;font-size:12px;'
            );
            return;
        }
    });
}

const _fugglerLoader = new GLTFLoader();
const FUGGLER_MODELS = ['assets/models/fuggler.glb', 'assets/models/fuggler_2.glb', 'assets/models/fuggler_3.glb'];

function _spawnFugglerEditor() {
    // Solo en gameplay — los modelos necesitan que el nivel esté cargado
    import('../core/gameState.js').then(({ GS }) => {
        if (GS.state !== 'GAMEPLAY') {
            console.warn('🧸 Editor de fugglers solo disponible durante GAMEPLAY');
            return;
        }
    });

    // Rotar entre los 3 modelos con cada Shift+B
    const modelPath = FUGGLER_MODELS[_fugglerEditorIdx % 3];

    // Eliminar el anterior si existía
    if (_fugglerEditorObj) {
        transformControls.detach();
        scene.remove(_fugglerEditorObj);
        _fugglerEditorObj = null;
    }

    _fugglerLoader.load(modelPath, (gltf) => {
        const mesh = gltf.scene;
        mesh.scale.setScalar(0.4);

        // Spawnear frente a la cámara
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        mesh.position.copy(camera.position).addScaledVector(fwd, 1.5);
        mesh.position.y -= 0.2;
        mesh.rotation.y = camera.rotation.y;
        mesh.name = 'fuggler_editor_preview';

        scene.add(mesh);
        _fugglerEditorObj = mesh;
        controls.unlock();
        transformControls.attach(mesh);
        transformControls.setMode('translate');

        console.log(
            `%c🧸 FUGGLER ${_fugglerEditorIdx + 1}/3 spawneado — T=mover  R=rotar  P=copiar coords  O=soltar`,
            'color:#ffcc44;font-weight:bold;'
        );
        _fugglerEditorIdx = (_fugglerEditorIdx + 1) % 3;
    }, undefined, () => {
        console.warn('No se pudo cargar el modelo. ¿Está en assets/models/?');
    });
}

function _skipToNumpad() {
    // Limpiar cualquier cinemática activa de partidas previas
    scene.userData.endingUpdate = null;

    // Posicionar al jugador en el spawn del gameplay
    camera.position.copy(CONFIG.POSITIONS.SPAWN);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(CONFIG.ROTATIONS.SPAWN.x, CONFIG.ROTATIONS.SPAWN.y, 0);

    // Activar todos los flags de progreso hasta el final
    GS.state               = 'GAMEPLAY';
    GS.timer               = 99;
    GS.hasKey              = true;
    GS.batteriesCollected  = 3;
    GS.hasUVLamp           = true;
    GS.uvMode              = 'off';
    GS.tutorialShown       = true;
    GS.doorHintShown       = true;
    GS.powerOutageCall     = true;
    GS.powerOutageAnswered = true;
    GS.powerRestored       = false;
    GS.fuseboxUsed         = true;
    GS.finalCallTriggered  = true;
    GS.finalCallAnswered   = true;
    GS.isNumpadOpen        = false;
    GS.isLaptopOpen        = false;
    GS.isBookOpen          = false;
    GS.isStoneOpen         = false;
    GS.isFuseboxOpen       = false;

    // Luces — estado post-colapso (oscuro)
    ambientLight.intensity = 0;
    houseLights.forEach(item => {
        item.light.intensity = 0;
        if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
    });

    // Abrir el numpad
    GS.isNumpadOpen = true;
    controls.unlock();
    toggleNumpadUI(true);

    // Autorellenar el código correcto en el display del numpad para que
    // el jugador solo tenga que darle ENTER — más cómodo para testing.
    setTimeout(() => {
        const display = document.getElementById('numpadDisplay');
        if (display) {
            display.textContent = '7494';
            display.style.color = '#ffffff';
            console.log('%c⏭ SKIP → Numpad listo. Dale ENTER para continuar.', 'color:#ffee88;font-weight:bold;font-size:14px;');
        }
    }, 300); // esperar a que el numpad termine de mostrarse
}