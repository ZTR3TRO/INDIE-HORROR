import * as THREE from 'three';
import { CONFIG } from '../data/config.js';
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
    
    // 3. Linterna ESTILO PS1/PS2 🔦
    // Aumentamos la distancia de la luz a 50 para que ilumine el patio profundo.
    // penumbra: 0.15 -> Suaviza microscópicamente el borde para evitar bugs de renderizado, 
    // pero sigue manteniendo un aspecto de linterna dura y retro.
    flashlight = new THREE.SpotLight(0xffffff, 0, 50, Math.PI/7, 0.15);
    
    // Ajuste de posición relativo a la cámara
    flashlight.position.set(0.3, -0.3, 0); 
    flashlight.target.position.set(0, 0, -10);
    
    // Activamos las sombras
    flashlight.castShadow = true; 
    
    // --- 🛑 OPTIMIZACIÓN DE SOMBRAS (Magia para los FPS) ---
    // Mantenemos la resolución baja (256x256) para el toque PS1 y buen rendimiento.
    flashlight.shadow.mapSize.width = 256; 
    flashlight.shadow.mapSize.height = 256; 
    
    // Limitamos hasta dónde calcula las sombras
    flashlight.shadow.camera.near = 0.5;
    
    // 🛑 AQUÍ ESTABA EL BUG: 
    // Subimos el "far" a 50 para que empate con la distancia de la luz.
    // Antes la sombra se cortaba en 25 y creaba esa "pared negra".
    flashlight.shadow.camera.far = 50;
    
    // Evita rayas raras en superficies planas
    flashlight.shadow.bias = -0.001; 
    
    camera.add(flashlight);
    camera.add(flashlight.target);
    
    scene.add(camera);
}