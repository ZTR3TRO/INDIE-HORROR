import * as THREE from 'three';
import { controls, camera } from './world.js';
import { CONFIG } from '../config.js';
import { collidableObjects } from '../scenes/level.js';

// 👇 NUEVO: Importamos el sistema de audio
import { playSound, stopSound } from './audio.js';

export let debugInfo = { speed: 0, grounded: false, velocityY: 0 };

let verticalVelocity = 0;

// Configuración de colisiones
const raycaster = new THREE.Raycaster();
const collisionDistance = 0.5; // Distancia para chocar con paredes

export function updatePlayer(delta, input) {
    // Si no tenemos el control, no hacemos nada
    if (!controls.isLocked && !input.keys.flyMode) {
        stopSound('pasos'); // Asegurarnos de que no suene si abrimos un menú o perdemos el control
        return;
    }

    // --- 1. CALCULAR DIRECCIÓN ---
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; // Anular altura para no volar mirando arriba
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    // --- 2. INPUT DE TECLAS ---
    const speed = input.keys.run ? CONFIG.PLAYER.SPEED.RUN : CONFIG.PLAYER.SPEED.WALK;
    const currentSpeed = input.keys.flyMode ? CONFIG.PLAYER.SPEED.FLY : speed;

    const move = new THREE.Vector3(0, 0, 0);
    if (input.keys.forward) move.add(forward);
    if (input.keys.backward) move.sub(forward);
    if (input.keys.right) move.add(right);
    if (input.keys.left) move.sub(right);

    // --- 3. MOVER CON COLISIONES ---
    if (move.length() > 0) {
        move.normalize();
        
        // Calculamos cuánto nos queremos mover
        const displacement = move.clone().multiplyScalar(currentSpeed * delta);
        
        // Si no volamos, verificamos paredes
        if (!input.keys.flyMode && collidableObjects.length > 0) {
            const newPosition = camera.position.clone().add(displacement);
            
            // --- COLISIÓN EJE X ---
            raycaster.set(camera.position, new THREE.Vector3(Math.sign(displacement.x), 0, 0));
            raycaster.far = Math.abs(displacement.x) + collisionDistance;
            const hitsX = raycaster.intersectObjects(collidableObjects, true);
            
            // Si NO hay pared en X, nos movemos
            if (hitsX.length === 0) {
                camera.position.x = newPosition.x;
            }
            
            // --- COLISIÓN EJE Z ---
            raycaster.set(camera.position, new THREE.Vector3(0, 0, Math.sign(displacement.z)));
            raycaster.far = Math.abs(displacement.z) + collisionDistance;
            const hitsZ = raycaster.intersectObjects(collidableObjects, true);
            
            // Si NO hay pared en Z, nos movemos
            if (hitsZ.length === 0) {
                camera.position.z = newPosition.z;
            }
        } else {
            // Si estamos volando, mover libremente
            camera.position.add(displacement);
        }
        
        debugInfo.speed = currentSpeed;
    } else {
        debugInfo.speed = 0;
    }

    // --- 4. GRAVEDAD Y SUELO ---
    if (input.keys.flyMode) {
        verticalVelocity = 0;
        if (input.keys.up) camera.position.y += currentSpeed * delta;
        if (input.keys.down) camera.position.y -= currentSpeed * delta;
        debugInfo.grounded = false;
    } else {
        // Raycast hacia abajo para encontrar el piso
        raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
        raycaster.far = 2.0; // Buscar suelo cerca
        
        const groundHits = raycaster.intersectObjects(collidableObjects, true);
        
        if (groundHits.length > 0) {
            const groundY = groundHits[0].point.y + CONFIG.PLAYER.HEIGHT;
            
            // Si estamos cayendo o cerca del suelo
            if (camera.position.y > groundY) {
                verticalVelocity -= CONFIG.PLAYER.GRAVITY * delta;
                camera.position.y += verticalVelocity * delta;
                
                // Si nos pasamos y atravesamos el suelo, corregir
                if (camera.position.y < groundY) {
                    camera.position.y = groundY;
                    verticalVelocity = 0;
                    debugInfo.grounded = true;
                } else {
                    debugInfo.grounded = false;
                }
            } else {
                // Estamos en el suelo
                camera.position.y = groundY;
                verticalVelocity = 0;
                debugInfo.grounded = true;
            }
        } else {
            // Si no detecta suelo (ej. saltando hueco o bug), aplicar gravedad simple
            if (camera.position.y > -10) { 
                verticalVelocity -= CONFIG.PLAYER.GRAVITY * delta;
                camera.position.y += verticalVelocity * delta;
            }
            debugInfo.grounded = false;
        }
    }

    debugInfo.velocityY = verticalVelocity;

    // --- 5. LÓGICA DE SONIDO DE PASOS (NUEVO) ---
    // Si nos estamos moviendo (speed > 0), estamos tocando el piso, y no estamos volando
    if (debugInfo.speed > 0 && debugInfo.grounded && !input.keys.flyMode) {
        playSound('pasos');
    } else {
        // Si nos detenemos, saltamos, o volamos, cortamos el sonido
        stopSound('pasos');
    }
}