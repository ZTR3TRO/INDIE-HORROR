import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { scene, camera } from '../core/world.js';

// Exportamos las luces para poder modificarlas desde el Main
export let ambientLight;
export let explosionLight;
export let flashlight;
export let phoneLight;

export function initLights() {
    // 1. Luz Ambiental (EMPIEZA CON LUZ DE LUNA)
    ambientLight = new THREE.AmbientLight(0xaabbff, CONFIG.ENV.AMBIENT_MOON); // 👈 Color azulado y brillo de luna
    scene.add(ambientLight);
    
    // 2. Luz de Explosión (Empieza apagada)
    explosionLight = new THREE.PointLight(0xff6600, 0, 100); // 👈 Color naranja para explosión
    explosionLight.position.copy(CONFIG.POSITIONS.EXPLOSION);
    scene.add(explosionLight);
    
    // 3. Linterna (Pegada a la cámara)
    flashlight = new THREE.SpotLight(0xffffff, 0, 60, Math.PI/3, 0.8);
    flashlight.position.set(0, -0.3, 0.2);
    flashlight.target.position.set(0, 0, -3);
    camera.add(flashlight);
    camera.add(flashlight.target);
    
    // Importante: Añadir la cámara a la escena para que las luces hijas funcionen
    scene.add(camera);
}