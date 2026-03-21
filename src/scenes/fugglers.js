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

// Línea de visión — evita recoger a través de paredes/muebles
const _losRay = new THREE.Raycaster();
function _checkLineOfSight(targetPos) {
    const dir = new THREE.Vector3().subVectors(targetPos, camera.position).normalize();
    _losRay.set(camera.position, dir);
    const hits = _losRay.intersectObjects(collidableObjects, true);
    if (!hits.length) return true;
    return hits[0].distance >= camera.position.distanceTo(targetPos) - 0.3;
}
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
        id:    'fuggler_2',
        model: 'assets/models/fuggler_2.glb',
        pos:   new THREE.Vector3(3.191, 3.939, -12.603),
        rotY:  0.761,
        scale: 0.4,
    },
    {
        id:      'fuggler_3',
        model:   'assets/models/fuggler_3.glb',
        pos:     new THREE.Vector3(9.033, 0.656, -9.234),
        rotY:    -0.620,
        rotX:     Math.PI / 2,  // acostado en el estante del refri
        scale:   0.4,
        noFloat: true,
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
            // Wrap en un grupo para aplicar rotaciones encima de las del GLB
            const group = new THREE.Group();
            group.add(gltf.scene);

            group.position.copy(def.pos);
            group.rotation.order = 'YXZ';
            group.rotation.set(
                def.rotX !== undefined ? def.rotX : 0,
                def.rotY,
                def.rotZ !== undefined ? def.rotZ : 0
            );
            group.scale.setScalar(def.scale);
            group.name = def.id;

            // Marcar para interacción
            group.userData.isFuggler  = true;
            group.userData.fugglerId  = def.id;

            // Optimización — sin sombras y frustum culling agresivo
            // Los modelos son de alta densidad, reducir carga de GPU al mínimo
            gltf.scene.traverse(c => {
                if (c.isMesh) {
                    c.castShadow    = false; // sombras desactivadas — muy costoso con 500k tris
                    c.receiveShadow = false;
                    c.frustumCulled = true;
                    // Bajar calidad de material para reducir overdraw
                    if (c.material) {
                        c.material.precision = 'lowp';
                    }
                }
            });

            scene.add(group);
            collidableObjects.push(group);

            const entry = { id: def.id, mesh: group, collected: false };
            fugglers.push(entry);

            // Si ya fue recogido en una partida guardada, ocultarlo
            if (GS.fugglers?.includes(def.id)) {
                group.visible = false;
                entry.collected = true;
            }
        }, undefined, () => console.warn(`Fuggler no encontrado: ${def.model}`));
    });
}

// ── Efecto de float suave ─────────────────────────────────────────────────────
// IDs que nunca deben flotar — hardcoded para evitar problemas de búsqueda async
const NO_FLOAT_IDS = new Set(['fuggler_1', 'fuggler_2', 'fuggler_3']);

export function updateFugglers(delta) {
    const t = performance.now() * 0.001;
    fugglers.forEach((f, i) => {
        if (!f.mesh.visible || f.collected) return;
        if (NO_FLOAT_IDS.has(f.id)) return; // sin float
        const def = FUGGLER_DEFS.find(d => d.id === f.id);
        if (!def) return;
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

        if (dist < 2.5 && _checkLineOfSight(fPos)) {
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
    inventoryCollect(f.id);
    // Logro secreto — solo para el fuggler del refri
    if (f.id === 'fuggler_3') {
        import('../core/achievements.js').then(({unlock}) => unlock('FRIDGE'));
    }

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
        if (camera.position.distanceTo(fPos) < 2.5 && _checkLineOfSight(fPos)) {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const toF = new THREE.Vector3().subVectors(fPos, camera.position).normalize();
            if (camDir.dot(toF) > 0.5) return f;
        }
    }
    return null;
}