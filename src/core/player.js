import * as THREE from 'three';
import { controls, camera } from './world.js';
import { CONFIG } from '../config.js';
import { collidableObjects } from '../scenes/level.js';
import { playSound, stopSound } from './audio.js';

export let debugInfo = { speed: 0, grounded: false, velocityY: 0 };

let verticalVelocity = 0;
let smoothY = null;

const rc = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);

// ── SUELO: todo lo que el jugador puede pisar ─────────────────────────────────
// Incluye escaleras para que el jugador pueda subir
const FLOOR_WHITELIST = [
    'floor',
    'house', 'home',
    'sidewalk', 'asphalt',
    'ladders',
    'ladder',
    'brick', 'concrete', 'plaster', 'plasterwhite',
    'grass_soil', 'rocks', 'background',
    'garage_door',
];

// Objetos que NUNCA son suelo aunque el raycast los toque
const FLOOR_BLACKLIST = [
    'kitchen', 'stove', 'table', 'shelf', 'wardrobe',
    'bed', 'armchair', 'sofa', 'couch', 'fridge',
    'washer', 'bathtub', 'sink', 'toilet',
];

// ── SIN COLISIÓN HORIZONTAL: decoración pequeña, geometría hueca, Y ESCALERAS ──
const NOCLIP_H = [
    'tree', 'bush', 'hedge', 'plant', 'flower', 'nature',
    'lamppost', 'focus', 'glass', 'window', 'water',
    'railing',       // railings de escaleras — huecas
    'shelving',      // rejilla hueca
    'ladders',       // Ladders — son pisables, no paredes ✅
    'ladder',        // Ladder
    'dish', 'plate', 'cup', 'mug', 'vaso', 'bottle', 'can',
    'book', 'magazine', 'soap', 'shampoo', 'toothbrush', 'toothpaste',
    'toilet_paper', 'alarm_clock', 'radio', 'gadget', 'control', 'chemical',
    'cake', 'flan', 'pizza', 'chicken', 'meat', 'cereal', 'ice_cream', 'fried', 'milk',
    'paint_pot', 'palette', 'petrol_can', 'basket', 'carrier',
    'watering_can', 'hose', 'mop', 'broom', 'rake', 'shovel', 'tumbler',
    'blender', 'toaster', 'coffee_maker', 'cooking_pot', 'pot_lid', 'sarten', 'cutlery',
    'desk_lamp', 'ceiling_fan', 'frame', 'flowers', 'garbage', 'trash_can',
    'plastic_boat', 'mower', 'light_switch', 'softener', 'paper_roll',
    'hand_soap', 'deodorant', 'lamp_01',
];

function matchesAny(name, list) {
    const n = (name || '').toLowerCase();
    return list.some(kw => n.includes(kw));
}

let _wall = null, _floor = null, _lastLen = 0;

function rebuildCache() {
    _lastLen = collidableObjects.length;
    _wall  = collidableObjects.filter(o =>
        (o.name || '').startsWith('col_') || !matchesAny(o.name, NOCLIP_H)
    );
    _floor = collidableObjects.filter(o =>
        !(o.name || '').startsWith('col_') &&
        matchesAny(o.name, FLOOR_WHITELIST) &&
        !matchesAny(o.name, FLOOR_BLACKLIST)
    );
}

function getWall()  { if (!_wall  || collidableObjects.length !== _lastLen) rebuildCache(); return _wall;  }
function getFloor() { if (!_floor || collidableObjects.length !== _lastLen) rebuildCache(); return _floor; }

// ─────────────────────────────────────────────────────────────────────────────
// COLISIÓN HORIZONTAL — separación por eje (estilo Quake/Source)
//
// Mueve X → revierte si choca
// Mueve Z → revierte si choca
// → El jugador se desliza a lo largo de paredes en lugar de quedarse pegado
// ─────────────────────────────────────────────────────────────────────────────
const BODY_R = 0.30;

// 3 alturas: pecho, cadera, rodillas
const BODY_H_RATIOS = [0.12, 0.42, 0.70];

const DIR = {
    XP: new THREE.Vector3( 1, 0, 0),
    XN: new THREE.Vector3(-1, 0, 0),
    ZP: new THREE.Vector3( 0, 0, 1),
    ZN: new THREE.Vector3( 0, 0,-1),
};

// Diagonales para atrapar esquinas de camas/mesas
const DIAGS = [
    new THREE.Vector3( 1, 0,  1).normalize(),
    new THREE.Vector3(-1, 0,  1).normalize(),
    new THREE.Vector3( 1, 0, -1).normalize(),
    new THREE.Vector3(-1, 0, -1).normalize(),
];

function blocked(dir, wall) {
    const fy = camera.position.y - CONFIG.PLAYER.HEIGHT;
    for (const r of BODY_H_RATIOS) {
        const o = new THREE.Vector3(
            camera.position.x,
            fy + CONFIG.PLAYER.HEIGHT * r,
            camera.position.z
        );
        rc.set(o, dir);
        rc.far = BODY_R;
        if (rc.intersectObjects(wall, true).length > 0) return true;
    }
    return false;
}

function moveWithCollision(dx, dz, wall) {
    // Eje X
    if (Math.abs(dx) > 0.00005) {
        camera.position.x += dx;
        if (blocked(dx > 0 ? DIR.XP : DIR.XN, wall))
            camera.position.x -= dx;
    }
    // Eje Z
    if (Math.abs(dz) > 0.00005) {
        camera.position.z += dz;
        if (blocked(dz > 0 ? DIR.ZP : DIR.ZN, wall))
            camera.position.z -= dz;
    }
    // Diagonales: empuje suave para esquinas de mesas y camas
    const fy = camera.position.y - CONFIG.PLAYER.HEIGHT;
    for (const d of DIAGS) {
        for (const r of BODY_H_RATIOS) {
            const o = new THREE.Vector3(
                camera.position.x,
                fy + CONFIG.PLAYER.HEIGHT * r,
                camera.position.z
            );
            rc.set(o, d);
            rc.far = BODY_R;
            const hits = rc.intersectObjects(wall, true);
            if (hits.length > 0) {
                const pen = BODY_R - hits[0].distance;
                if (pen > 0.002) {
                    camera.position.x -= d.x * pen * 0.6;
                    camera.position.z -= d.z * pen * 0.6;
                }
                break;
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE SUELO — cuadrícula 3×3 de raycasts
// ─────────────────────────────────────────────────────────────────────────────
const S = 0.14;
const GOFFSETS = [
    new THREE.Vector3(0,0,0),
    new THREE.Vector3( S,0, 0), new THREE.Vector3(-S,0, 0),
    new THREE.Vector3( 0,0, S), new THREE.Vector3( 0,0,-S),
    new THREE.Vector3( S,0, S), new THREE.Vector3(-S,0, S),
    new THREE.Vector3( S,0,-S), new THREE.Vector3(-S,0,-S),
];

// MAX_STEP controla la altura máxima de escalón que el jugador puede subir
// Ladders tiene peldaños de ~0.2m, ponemos 0.42 para subir con margen
const MAX_STEP   = 0.50;  // escalón garaje = 0.41 + margen
const GROUND_FAR = CONFIG.PLAYER.HEIGHT + 1.2;

function getGroundY(floor, moveDir) {
    let best = null;

    // Cuadrícula base 3×3
    for (const off of GOFFSETS) {
        const o = camera.position.clone().add(off);
        rc.set(o, DOWN);
        rc.far = GROUND_FAR;
        const hits = rc.intersectObjects(floor, true);
        if (hits.length > 0) {
            const y = hits[0].point.y;
            if (best === null || y > best) best = y;
        }
    }

    // Raycasts hacia adelante a distintas distancias
    if (moveDir && moveDir.lengthSq() > 0.001) {
        for (const dist of [0.15, 0.30, 0.45]) {
            const o = camera.position.clone().addScaledVector(moveDir, dist);
            rc.set(o, DOWN);
            rc.far = GROUND_FAR;
            const hits = rc.intersectObjects(floor, true);
            if (hits.length > 0) {
                const y = hits[0].point.y;
                if (best === null || y > best) best = y;
            }
        }

        // Raycast diagonal hacia adelante-abajo: detecta el borde del escalón
        // cuando el jugador está justo enfrente pero aún no encima
        const feetY = camera.position.y - CONFIG.PLAYER.HEIGHT;
        for (const dist of [0.20, 0.40]) {
            const origin = camera.position.clone().addScaledVector(moveDir, dist);
            origin.y = feetY + 0.55; // desde la altura de las rodillas
            rc.set(origin, DOWN);
            rc.far = 0.65; // solo busca hasta 65cm abajo
            const hits = rc.intersectObjects(floor, true);
            if (hits.length > 0) {
                const y = hits[0].point.y;
                if (best === null || y > best) best = y;
            }
        }
    }

    return best;
}

// ── updatePlayer ──────────────────────────────────────────────────────────────
export function updatePlayer(delta, input) {
    if (!controls.isLocked && !input.keys.flyMode) {
        stopSound('pasos'); return;
    }

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0; fwd.normalize();
    const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    rgt.y = 0; rgt.normalize();

    const spd  = input.keys.run ? CONFIG.PLAYER.SPEED.RUN : CONFIG.PLAYER.SPEED.WALK;
    const spd2 = input.keys.flyMode ? CONFIG.PLAYER.SPEED.FLY : spd;

    const move = new THREE.Vector3();
    if (input.keys.forward)  move.add(fwd);
    if (input.keys.backward) move.sub(fwd);
    if (input.keys.right)    move.add(rgt);
    if (input.keys.left)     move.sub(rgt);
    if (move.length() > 0) move.normalize();

    debugInfo.speed = move.length() > 0 ? spd2 : 0;

    // ── Fly ──────────────────────────────────────────────────────────────────
    if (input.keys.flyMode) {
        camera.position.addScaledVector(move, spd2 * delta);
        if (input.keys.up)   camera.position.y += spd2 * delta;
        if (input.keys.down) camera.position.y -= spd2 * delta;
        verticalVelocity = 0; smoothY = null;
        debugInfo.grounded = false; debugInfo.velocityY = 0;
        playSound('pasos'); return;
    }

    // ── Movimiento horizontal con colisión ────────────────────────────────────
    moveWithCollision(move.x * spd2 * delta, move.z * spd2 * delta, getWall());

    // ── Gravedad y suelo ──────────────────────────────────────────────────────
    const groundY = getGroundY(getFloor(), move);

    if (groundY !== null) {
        const feetY   = camera.position.y - CONFIG.PLAYER.HEIGHT;
        const diff    = groundY - feetY;   // positivo = suelo más alto que pies
        const targetY = groundY + CONFIG.PLAYER.HEIGHT;

        if (diff <= MAX_STEP && diff >= -0.15) {
            // Suelo alcanzable (plano o escalón)
            if (smoothY === null) smoothY = camera.position.y;

            // Subir escalón: lerp lento. Suelo plano: lerp rápido (sin pop)
            const lerpSpeed = diff > 0.04 ? 12 : 25;
            smoothY = THREE.MathUtils.lerp(smoothY, targetY, Math.min(delta * lerpSpeed, 1));
            camera.position.y = smoothY;
            verticalVelocity  = 0;
            debugInfo.grounded = true;

        } else {
            // Caída o salto de obstáculo alto
            smoothY = null;
            verticalVelocity -= CONFIG.PLAYER.GRAVITY * delta;
            camera.position.y += verticalVelocity * delta;

            if (camera.position.y - CONFIG.PLAYER.HEIGHT <= groundY) {
                camera.position.y = targetY;
                smoothY = targetY;
                verticalVelocity = 0;
                debugInfo.grounded = true;
            } else {
                debugInfo.grounded = false;
            }
        }
    } else {
        // Sin suelo detectado: caída libre
        smoothY = null;
        if (camera.position.y > -10) {
            verticalVelocity -= CONFIG.PLAYER.GRAVITY * delta;
            camera.position.y += verticalVelocity * delta;
        }
        debugInfo.grounded = false;
    }

    debugInfo.velocityY = verticalVelocity;

    if (debugInfo.speed > 0 && debugInfo.grounded) playSound('pasos');
    else stopSound('pasos');
}