import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { camera } from './world.js';
import { collidableObjects } from '../scenes/level.js';

const raycaster = new THREE.Raycaster();
let verticalVelocity = 0;

export function updatePlayer(delta, input) {
    const isFlying = input.keys.flyMode;
    const speed = input.keys.run ? CONFIG.PLAYER.SPEED.RUN : CONFIG.PLAYER.SPEED.WALK;

    // 1. Gravedad
    if (!isFlying) {
        if (!checkGround()) {
            verticalVelocity -= CONFIG.PLAYER.GRAVITY * delta;
        } else {
            verticalVelocity = 0;
        }
    } else {
        verticalVelocity = 0;
    }

    // 2. Dirección
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    if (!isFlying) forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

    const moveVec = new THREE.Vector3();
    if (input.keys.forward) moveVec.add(forward);
    if (input.keys.backward) moveVec.sub(forward);
    if (input.keys.right) moveVec.add(right);
    if (input.keys.left) moveVec.sub(right);
    
    if (moveVec.length() > 0) {
        moveVec.normalize().multiplyScalar(speed * delta);
    }

    // 3. Aplicar Movimiento con Colisiones
    if (isFlying) {
        camera.position.add(moveVec);
        if (input.keys.up) camera.position.y += speed * delta;
        if (input.keys.down) camera.position.y -= speed * delta;
    } else {
        // Movimiento X
        const oldX = camera.position.x;
        camera.position.x += moveVec.x;
        if (checkWallCollision()) camera.position.x = oldX;

        // Movimiento Z
        const oldZ = camera.position.z;
        camera.position.z += moveVec.z;
        if (checkWallCollision()) camera.position.z = oldZ;

        // Movimiento Y (Gravedad)
        camera.position.y += verticalVelocity * delta;
    }
}

function checkWallCollision() {
    const directions = [
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
    ];
    const origin = camera.position.clone();
    origin.y -= 0.5; // Checar a la altura de la cadera

    for (let dir of directions) {
        raycaster.set(origin, dir);
        raycaster.far = CONFIG.PLAYER.WIDTH;
        if (raycaster.intersectObjects(collidableObjects, true).length > 0) return true;
    }
    return false;
}

function checkGround() {
    raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
    raycaster.far = CONFIG.PLAYER.HEIGHT;
    const hits = raycaster.intersectObjects(collidableObjects, true);
    if (hits.length > 0) {
        camera.position.y = hits[0].point.y + CONFIG.PLAYER.HEIGHT;
        return true;
    }
    return false;
}