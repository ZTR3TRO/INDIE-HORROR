// ─────────────────────────────────────────────────────────────────────────────
//  fugglers.js — Sistema de coleccionables Fuggler
//
//  3 fugglers escondidos por la casa. Recoger los 3 desbloquea el logro.
//  Visibles siempre (no requieren UV). Se recogen con [E].
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera } from '../core/world.js';
import { collidableObjects } from './level.js';
import { playSound } from '../core/audio.js';
import { GS } from '../core/gameState.js';
import { inventoryCollect } from '../ui/inventoryUI.js';

const loader = new GLTFLoader();

// Definición de cada fuggler: modelo, posición, rotación y escala
// ⚠️  POSICIONES PLACEHOLDER — usar KeyZ/editor para ajustarlas in-game
const FUGGLER_DEFS = [
    {
        id:      'fuggler_1',
        model:   'assets/models/fuggler.glb',
        pos:     new THREE.Vector3(2.259, 0.980, -14.911),
        rotY:    0.633,
        scale:   0.4,
        noFloat: true,
    },
    {
        id:      'fuggler_2',
        model:   'assets/models/fuggler_2.glb',
        pos:     new THREE.Vector3(3.191, 3.939, -12.603),
        rotY:    0.761,
        rotX:    Math.PI / 2,  // acostado en el estante del refri
        scale:   0.4,
        noFloat: true,
    },
    {
        id:    'fuggler_3',
        model: 'assets/models/fuggler_3.glb',
        pos:   new THREE.Vector3(9.033, 0.656, -9.234),
        rotY:  -1.408,
        scale: 0.4,
    },
];

// Meshes cargados: [{ id, mesh, collected }]
export const fugglers = [];

// Callback que main.js inyecta para notificar logro
let _onAllCollected = null;
export function setOnAllFugglersCollected(fn) { _onAllCollected = fn; }

// ── Cargar todos los fugglers ─────────────────────────────────────────────────
export function loadFugglers() {
    FUGGLER_DEFS.forEach(def => {
        loader.load(def.model, (gltf) => {
            const mesh = gltf.scene;
            mesh.position.copy(def.pos);
            mesh.rotation.y = def.rotY;
            if (def.rotX !== undefined) mesh.rotation.x = def.rotX;
            mesh.scale.setScalar(def.scale);
            mesh.name = def.id;

            // Marcar para interacción
            mesh.userData.isFuggler = true;
            mesh.userData.fugglerId = def.id;

            // Sombras
            mesh.traverse(c => {
                if (c.isMesh) {
                    c.castShadow    = true;
                    c.receiveShadow = false;
                }
            });

            scene.add(mesh);
            collidableObjects.push(mesh);

            const entry = { id: def.id, mesh, collected: false };
            fugglers.push(entry);

            // Si ya fue recogido en una partida guardada, ocultarlo
            if (GS.fugglers?.includes(def.id)) {
                mesh.visible = false;
                entry.collected = true;
            }
        }, undefined, () => console.warn(`Fuggler no encontrado: ${def.model}`));
    });
}

// ── Efecto de float suave ─────────────────────────────────────────────────────
export function updateFugglers(delta) {
    const t = performance.now() * 0.001;
    fugglers.forEach((f, i) => {
        if (!f.mesh.visible || f.collected) return;
        // Buscar def por id — los GLBs cargan async y el orden puede variar
        const def = FUGGLER_DEFS.find(d => d.id === f.id);
        if (!def || def.noFloat) return;
        f.mesh.position.y = def.pos.y + Math.sin(t * 1.2 + i * 2.1) * 0.04;
    });
}

// ── Intentar recoger un fuggler cercano ───────────────────────────────────────
export function tryCollectFuggler(ui) {
    for (const f of fugglers) {
        if (f.collected || !f.mesh.visible) continue;

        const fPos = new THREE.Vector3();
        f.mesh.getWorldPosition(fPos);
        const dist = camera.position.distanceTo(fPos);

        if (dist < 2.5) {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const toFuggler = new THREE.Vector3().subVectors(fPos, camera.position).normalize();

            if (camDir.dot(toFuggler) > 0.5) {
                _collect(f, ui);
                return true;
            }
        }
    }
    return false;
}

function _collect(f, ui) {
    f.collected   = true;
    f.mesh.visible = false;

    // Actualizar GS
    if (!GS.fugglers) GS.fugglers = [];
    GS.fugglers.push(f.id);

    playSound('objeto');
    inventoryCollect(f.id); // mostrar en inventario

    const collected = fugglers.filter(x => x.collected).length;
    const total     = fugglers.length;

    // Comentarios aleatorios de Zare — reconoce los fugglers de Daniel
    const COMMENTS = [
        "Zare: '¿Qué hace el fuggler de Daniel aquí...?'",
        "Zare: 'Este es el fuggler de Daniel... ¿cómo llegó hasta acá?'",
        "Zare: 'Daniel y sus fugglers... ojalá estuviera aquí.'",
        "Zare: 'Me da tranquilidad ver esto. Aunque qué raro lugar para dejarlo.'",
        "Zare: '¿Daniel estuvo aquí antes que yo? Esto es suyo...'",
        "Zare: 'Otro fuggler de Daniel. Se los deja en todos lados ese hombre.'",
        "Zare: 'Este es nuevo... o quizás siempre estuvo aquí y no lo vi.'",
        "Zare: 'Lo voy a guardar. Daniel se va a alegrar cuando lo encuentre.'",
    ];
    const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
    ui.showSubtitle(comment, 4000);

    if (collected >= total) {
        setTimeout(() => {
            ui.showSubtitle("Zare: 'Los tengo todos... Daniel los va a querer de vuelta.'", 4500);
            _onAllCollected?.();
        }, 1500);
    }
}

// ── Hint de proximidad ────────────────────────────────────────────────────────
export function getNearFuggler() {
    for (const f of fugglers) {
        if (f.collected || !f.mesh.visible) continue;
        const fPos = new THREE.Vector3();
        f.mesh.getWorldPosition(fPos);
        if (camera.position.distanceTo(fPos) < 2.5) {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const toF = new THREE.Vector3().subVectors(fPos, camera.position).normalize();
            if (camDir.dot(toF) > 0.5) return f;
        }
    }
    return null;
}