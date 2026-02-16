import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { scene, camera } from '../core/world.js';

export let ambientLight;
export let explosionLight;
export let flashlight;

export function initLights() {
    // 1. Luz Ambiental
    ambientLight = new THREE.AmbientLight(0xaabbff, CONFIG.ENV.AMBIENT_MOON);
    scene.add(ambientLight);
    
    // 2. Luz de Explosión
    explosionLight = new THREE.PointLight(0xff6600, 0, 100);
    explosionLight.position.copy(CONFIG.POSITIONS.EXPLOSION);
    scene.add(explosionLight);
    
    // 3. Linterna (MEJORADA 👻)
    // angle: Math.PI/9 (más cerrado), penumbra: 0.5 (bordes suaves)
    flashlight = new THREE.SpotLight(0xffffff, 0, 40, Math.PI/9, 0.5);
    
    // Ajuste de posición relativo a la cámara
    flashlight.position.set(0.2, -0.2, 0); 
    flashlight.target.position.set(0, 0, -10);
    
    flashlight.castShadow = true; // Sombras activadas
    
    camera.add(flashlight);
    camera.add(flashlight.target);
    
    scene.add(camera);
}