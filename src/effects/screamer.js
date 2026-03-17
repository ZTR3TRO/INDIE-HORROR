import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera } from '../core/world.js';
import { playSound } from '../core/audio.js';
import { showCredits } from './credits.js';

export let shadowEntity = null;
export let shadowApproaching = false;

// ── Construcción procedural de la criatura ──────────────────────────────────
function buildShadowCreature() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const M = (geo) => new THREE.Mesh(geo, mat);

    // Cabeza pequeña y alargada, inclinada
    const head = M(new THREE.SphereGeometry(0.14, 6, 5));
    head.scale.set(0.8, 1.6, 0.8);
    head.position.set(0.05, 2.55, 0);
    head.rotation.z = -0.3;
    group.add(head);

    // Cuello fino
    const neck = M(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 5));
    neck.position.set(0, 2.28, 0);
    group.add(neck);

    // Torso delgado, ligeramente inclinado
    const torso = M(new THREE.CylinderGeometry(0.13, 0.16, 0.75, 6));
    torso.position.set(0, 1.78, 0);
    torso.rotation.z = 0.08;
    group.add(torso);

    // Cadera pequeña
    const hip = M(new THREE.SphereGeometry(0.17, 6, 4));
    hip.scale.set(1, 0.6, 0.8);
    hip.position.set(0, 1.38, 0);
    group.add(hip);

    // Brazos largos con garras
    function addArm(side) {
        const s = side === 'L' ? -1 : 1;
        const shoulder = M(new THREE.CylinderGeometry(0.055, 0.045, 0.85, 5));
        shoulder.position.set(s * 0.22, 1.95, 0);
        shoulder.rotation.z = s * 0.55;
        group.add(shoulder);

        const forearm = M(new THREE.CylinderGeometry(0.04, 0.03, 1.1, 5));
        forearm.position.set(s * 0.68, 1.28, 0);
        forearm.rotation.z = s * 1.05;
        group.add(forearm);

        const wrist = M(new THREE.SphereGeometry(0.055, 5, 4));
        wrist.position.set(s * 1.05, 0.62, 0);
        group.add(wrist);

        for (let f = 0; f < 4; f++) {
            const claw = M(new THREE.CylinderGeometry(0.018, 0.006, 0.38, 4));
            const angle = (f - 1.5) * 0.18;
            claw.position.set(s * (1.08 + Math.sin(angle) * 0.08), 0.28 - f * 0.04, Math.cos(angle) * 0.1);
            claw.rotation.z = s * 0.2 + angle * 0.3;
            group.add(claw);
        }
    }
    addArm('L');
    addArm('R');

    // Piernas dobladas en postura de acecho
    function addLeg(side) {
        const s = side === 'L' ? -1 : 1;
        const thigh = M(new THREE.CylinderGeometry(0.08, 0.065, 0.7, 5));
        thigh.position.set(s * 0.14, 0.98, 0);
        thigh.rotation.z = s * 0.25;
        group.add(thigh);

        const knee = M(new THREE.SphereGeometry(0.07, 5, 4));
        knee.position.set(s * 0.24, 0.60, 0.08);
        group.add(knee);

        const shin = M(new THREE.CylinderGeometry(0.055, 0.04, 0.65, 5));
        shin.position.set(s * 0.20, 0.28, 0.18);
        shin.rotation.x = -0.45;
        shin.rotation.z = s * 0.1;
        group.add(shin);

        for (let f = 0; f < 3; f++) {
            const toe = M(new THREE.CylinderGeometry(0.014, 0.005, 0.22, 4));
            toe.position.set(s * 0.18 + (f - 1) * 0.06, 0.0, 0.32 + f * 0.02);
            toe.rotation.x = -0.3;
            group.add(toe);
        }
    }
    addLeg('L');
    addLeg('R');

    return group;
}

// ── Init — llamar una vez al arrancar el juego ──────────────────────────────
export function initShadow() {
    shadowEntity = buildShadowCreature();
    shadowEntity.scale.set(1.6, 1.6, 1.6); // más grande y grueso
    shadowEntity.visible = false;
    scene.add(shadowEntity);

    // Luz negra/morada que irradia la entidad
    const darkLight = new THREE.PointLight(0x2a004a, 3.0, 8);
    darkLight.position.set(0, 1.5, 0);
    shadowEntity.add(darkLight);

}

// ── Update — llamar cada frame desde el animate loop ───────────────────────
export function updateShadow(delta) {
    if (!shadowApproaching || !shadowEntity) return;

    const SPEED = 35.0;
    const dir = new THREE.Vector3().subVectors(camera.position, shadowEntity.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 1.8) {
        dir.normalize();
        shadowEntity.position.x += dir.x * SPEED * delta;
        shadowEntity.position.z += dir.z * SPEED * delta;
        shadowEntity.position.y = 0.0;
        shadowEntity.lookAt(new THREE.Vector3(camera.position.x, shadowEntity.position.y, camera.position.z));
        // Crece levemente al acercarse
        const growT = Math.max(0, 1 - dist / 20);
        shadowEntity.scale.setScalar(0.9 + growT * 1.8);
    } else {
        shadowApproaching = false;
        triggerScreamerFlash();
    }
}

// ── Aparece parada, sin moverse aún ────────────────────────────────────────
export function spawnShadowStill() {
    if (!shadowEntity) return;
    // Posición exterior frente a la puerta principal
    shadowEntity.position.set(-5.429, 0.0, 5.660);
    shadowEntity.lookAt(new THREE.Vector3(camera.position.x, 0, camera.position.z));
    shadowEntity.scale.setScalar(0.9);
    shadowEntity.visible = true;
}

// ── Trigger — inicia la secuencia del jumpscare ─────────────────────────────
export function triggerScreamer() {
    if (!shadowEntity) {
        playSound('jumpscare');
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;opacity:1;';
        document.body.appendChild(f);
        setTimeout(() => { f.style.background = 'black'; }, 300);
        // No remover el div — pasarlo a showCredits para que no haya gap
        setTimeout(() => { showCredits(f); }, 2800);
        return;
    }
    if (!shadowEntity.visible) {
        shadowEntity.position.set(-5.429, 0.0, 5.660);
        shadowEntity.lookAt(new THREE.Vector3(camera.position.x, 0, camera.position.z));
        shadowEntity.visible = true;
    }
    shadowApproaching = true;
}

function triggerScreamerFlash() {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;opacity:1;';
    document.body.appendChild(flash);

    playSound('jumpscare');

    const img = document.createElement('div');
    img.style.cssText = 'position:fixed;inset:0;z-index:100000;background:black;';
    img.innerHTML = `<img src="assets/images/screamer.png" style="width:100vw;height:100vh;object-fit:cover;display:block;user-select:none;">`;
    document.body.appendChild(img);

    setTimeout(() => { flash.remove(); }, 150);
    // Fade-out de la imagen pero dejando el fondo negro del div — no se ve el juego
    setTimeout(() => {
        img.querySelector('img').style.cssText += 'transition:opacity 1.5s;opacity:0;';
    }, 800);
    setTimeout(() => {
        if (shadowEntity) { scene.remove(shadowEntity); shadowEntity = null; }
        // Pasar el div negro a showCredits para que no haya gap
        showCredits(img);
    }, 2800);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SISTEMA DE SOMBRAS DISTANTES — nuevo concepto
//
//  Las sombras SIEMPRE están en su posición desde el inicio.
//  Los triggers las hacen DESAPARECER, no aparecer.
//
//  API:
//    initDistantShadows()        — carga GLB y coloca todas las sombras en escena
//    updateDistantShadows(delta) — gestiona fadeouts activos
//    dismissShadow(id)           — trigger para hacer desaparecer una sombra (1.5s fade)
//    startAmbientShadows()       — activa apariciones aleatorias (arranca post-colapso)
//    updateAmbientShadows(delta) — loop de ambientales
// ─────────────────────────────────────────────────────────────────────────────

const SHADOW_MODEL_PATH = 'assets/models/entidad.glb';
let _shadowTemplate = null;
export let shadowModelReady = false;

// ── Definición de sombras scripted ───────────────────────────────────────────
// Cada sombra tiene posición fija y está visible desde que inicia el GAMEPLAY.
// Y_OFFSET sube el modelo para que quede sobre el suelo.
const Y_OFFSET = 0.9; // ajustar según el modelo — sube la entidad

const SCRIPTED_DEFS = {
    hallway: {
        pos: new THREE.Vector3(3.785, 5.0, -7.974),
        rotY: -2.523 + Math.PI,
    },
    closet: {
        pos: new THREE.Vector3(-2.805, 5.2, -9.441),
        rotY: 3.141 + Math.PI,
    },
    garage: {
        pos: new THREE.Vector3(-1.634, 1.9, -7.022),
        rotY: -0.263 + Math.PI,
        startHidden: true,
    },
    patio: {
        pos: new THREE.Vector3(0.834, 1.0, -25.535),
        rotY: 2.955 + Math.PI,
    },
};

// Sombras instanciadas: { id, mesh, fadingOut, fadeTimer }
const _scripted = {};

// ── Construcción del modelo ───────────────────────────────────────────────────

function _applyBlackMaterial(group) {
    group.traverse(c => {
        if (!c.isMesh) return;
        c.material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
    });
}

function _setOpacity(group, op) {
    group.traverse(c => {
        if (c.isMesh && c.material) c.material.opacity = op;
    });
}

function _buildProcedural() {
    const g = buildShadowCreature();
    g.traverse(c => {
        if (!c.isMesh) return;
        c.material = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true,
            opacity: 0.92, side: THREE.DoubleSide, depthWrite: false,
        });
    });
    return g;
}

function _placeAllScripted() {
    Object.entries(SCRIPTED_DEFS).forEach(([id, def]) => {
        const mesh = _shadowTemplate
            ? (() => { const c = _shadowTemplate.clone(true); _applyBlackMaterial(c); return c; })()
            : _buildProcedural();

        const visible = !def.startHidden;
        mesh.position.copy(def.pos);
        mesh.rotation.set(0, def.rotY, 0);
        mesh.visible = visible;
        _setOpacity(mesh, visible ? 0.92 : 0);
        scene.add(mesh);

        _scripted[id] = { mesh, fadingOut: false, fadeTimer: 0 };
    });
    shadowModelReady = true;
}

export function initDistantShadows() {
    const loader = new GLTFLoader();
    loader.load(
        SHADOW_MODEL_PATH,
        (gltf) => {
            _shadowTemplate = gltf.scene;
            const box = new THREE.Box3().setFromObject(_shadowTemplate);
            const h = box.max.y - box.min.y;
            const scale = h > 0 ? 1.8 / h : 1.0;
            _shadowTemplate.scale.setScalar(scale);
            console.log(`✅ entidad.glb cargada. Escala auto: ${scale.toFixed(3)}`);
            _placeAllScripted();
        },
        undefined,
        (err) => {
            console.warn('⚠️ entidad.glb no encontrada, usando procedural:', err.message || err);
            _placeAllScripted();
        }
    );
}

// ── Hacer desaparecer una sombra scripted ─────────────────────────────────────
export function dismissShadow(id) {
    const s = _scripted[id];
    if (!s || !s.mesh.visible) return;
    s.mesh.visible = false;
    _setOpacity(s.mesh, 0);
}

export function showShadow(id) {
    const s = _scripted[id];
    if (!s) return;
    _setOpacity(s.mesh, 0.92);
    s.mesh.visible = true;
}

// Sombra del garage — se acerca al jugador durante el blackout
let _garageApproaching = false;
const _GARAGE_SPEED = 0.6; // unidades por segundo — llega a ~3m en ~7s

export function startGarageApproach() { _garageApproaching = true; }
export function stopGarageApproach()  { _garageApproaching = false; }

export function updateDistantShadows(delta) {
    if (!_garageApproaching) return;
    const s = _scripted['garage'];
    if (!s || !s.mesh.visible) return;

    // Mover hacia la posición del jugador en XZ, manteniendo Y fija
    const target = new THREE.Vector3(camera.position.x, s.mesh.position.y, camera.position.z);
    const dist = s.mesh.position.distanceTo(target);

    // Parar a 2.5m del jugador — no llega a tocarlo
    if (dist > 2.5) {
        const dir = target.clone().sub(s.mesh.position).normalize();
        s.mesh.position.addScaledVector(dir, _GARAGE_SPEED * delta);
        // Rotar para mirar al jugador
        s.mesh.rotation.y = Math.atan2(
            camera.position.x - s.mesh.position.x,
            camera.position.z - s.mesh.position.z
        );
    }
}

// ── Sistema ambient (post-colapso eléctrico) ──────────────────────────────────
// Las sombras ambientales sí aparecen/desaparecen normalmente.
const AMBIENT_DEFS = [
    { pos: new THREE.Vector3(3.005,  2.1, -12.251), rotY: -3.076 + Math.PI },
    { pos: new THREE.Vector3(8.230,  2.1, -12.243), rotY:  2.506 + Math.PI },
    { pos: new THREE.Vector3(8.493,  2.1,  -1.348), rotY:  0.499 + Math.PI },
    { pos: new THREE.Vector3(4.186,  2.1, -10.653), rotY: -1.122 + Math.PI },
    { pos: new THREE.Vector3(5.504,  2.1, -15.006), rotY: -0.077 + Math.PI },
    { pos: new THREE.Vector3(9.015,  5.7,  -5.332), rotY:  1.355 + Math.PI },
    { pos: new THREE.Vector3(-5.535, 1.6, -26.577), rotY: -2.078 + Math.PI },
];

const _ambientActive = []; // { mesh, timer, fadingOut, fadeTimer }
let _ambientRunning  = false;
let _ambientTimer    = 0;
let _ambientInterval = 30;
let _lastAmbientIdx  = -1;

export function startAmbientShadows() { _ambientRunning = true; }
export function stopAmbientShadows()  { _ambientRunning = false; }

// Fuerza spawn del spot ambient más cercano al jugador — solo para testing
export function debugSpawnNearestAmbient() {
    if (!shadowModelReady) return;
    // Eliminar cualquier ambient activa inmediatamente
    _ambientActive.forEach(e => { scene.remove(e.mesh); });
    _ambientActive.length = 0;

    let nearest = AMBIENT_DEFS[0];
    let minDist = Infinity;
    AMBIENT_DEFS.forEach(def => {
        const d = camera.position.distanceTo(def.pos);
        if (d < minDist) { minDist = d; nearest = def; }
    });
    const mesh = _buildAmbientMesh();
    mesh.position.copy(nearest.pos);
    mesh.rotation.set(0, nearest.rotY, 0);
    _setOpacity(mesh, 0.92);
    mesh.visible = true;
    _ambientActive.push({ mesh, timer: 0, fadingOut: false, fadeTimer: 0, duration: 3.0 });
    console.log(`🧪 Ambient en (${nearest.pos.x.toFixed(1)}, ${nearest.pos.y.toFixed(1)}, ${nearest.pos.z.toFixed(1)}) — dist: ${minDist.toFixed(1)}m`);
}

function _buildAmbientMesh() {
    const mesh = _shadowTemplate
        ? (() => { const c = _shadowTemplate.clone(true); _applyBlackMaterial(c); return c; })()
        : _buildProcedural();
    scene.add(mesh);
    return mesh;
}

export function updateAmbientShadows(delta) {
    // Update ambientales activas
    for (let i = _ambientActive.length - 1; i >= 0; i--) {
        const e = _ambientActive[i];
        e.timer += delta;
        if (!e.fadingOut) {
            if (e.timer > e.duration) { e.fadingOut = true; e.fadeTimer = 0; }
        } else {
            e.fadeTimer += delta;
            const t = Math.min(e.fadeTimer / 1.0, 1.0);
            _setOpacity(e.mesh, (1 - t) * 0.92);
            if (t >= 1.0) {
                scene.remove(e.mesh);
                _ambientActive.splice(i, 1);
            }
        }
    }

    if (!_ambientRunning || !shadowModelReady) return;
    _ambientTimer += delta;
    if (_ambientTimer < _ambientInterval) return;
    _ambientTimer    = 0;
    _ambientInterval = 30 + Math.random() * 30; // 30–60s

    let idx;
    let tries = 0;
    do { idx = Math.floor(Math.random() * AMBIENT_DEFS.length); tries++; }
    while (idx === _lastAmbientIdx && tries < 10);
    _lastAmbientIdx = idx;

    const def  = AMBIENT_DEFS[idx];
    const mesh = _buildAmbientMesh();
    mesh.position.copy(def.pos);
    mesh.rotation.set(0, def.rotY, 0);
    _setOpacity(mesh, 0.92);
    mesh.visible = true;
    _ambientActive.push({ mesh, timer: 0, fadingOut: false, fadeTimer: 0, duration: 8.0 });
    console.log(`👁 Sombra ambient en (${def.pos.x.toFixed(1)}, ${def.pos.y.toFixed(1)}, ${def.pos.z.toFixed(1)})`);
}