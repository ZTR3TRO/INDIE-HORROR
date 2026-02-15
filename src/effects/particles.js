import * as THREE from 'three';
import { scene } from '../core/world.js';
import { CONFIG } from '../config.js';

let rainSystem, explosionSystem;

// --- LLUVIA ---
export function createRain() {
    const rainCount = 5000; 
    const geometry = new THREE.BufferGeometry(); 
    const positions = [];
    for(let i=0; i<rainCount; i++) {
        const x = Math.random() * 100 - 50; 
        const y = Math.random() * 50; 
        const z = Math.random() * 100 - 50;
        positions.push(x, y, z); positions.push(x, y - 0.6, z);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.3 });
    rainSystem = new THREE.LineSegments(geometry, material);
    scene.add(rainSystem);
}

export function animateRain() {
    if (!rainSystem) return;
    rainSystem.visible = true; 
    const positions = rainSystem.geometry.attributes.position.array;
    const { MIN, MAX } = CONFIG.ENV.NO_RAIN_BOX; // Usar config

    for(let i=1; i<positions.length; i+=3) { 
        positions[i] -= 0.9; 
        const x = positions[i-1], y = positions[i], z = positions[i+1];
        
        // Caja invisible anti-lluvia
        const insideBox = (x > MIN.x && x < MAX.x && y > MIN.y && y < MAX.y && z > MIN.z && z < MAX.z);
        
        if (y < -5 || insideBox) positions[i] = 40; 
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;
}

// --- EXPLOSIÓN ---
export function createExplosionEffect() {
    const particleCount = 200; 
    const geometry = new THREE.BufferGeometry(); 
    const positions = []; const velocities = []; const colors = [];
    const color1 = new THREE.Color(0xffaa00); const color2 = new THREE.Color(0x00aaff); 
    
    for (let i = 0; i < particleCount; i++) {
        const { x, y, z } = CONFIG.POSITIONS.EXPLOSION;
        positions.push(x, y, z);
        const vX = (Math.random() - 0.5) * 15; 
        const vY = (Math.random() - 0.5) * 15; 
        const vZ = (Math.random() - 0.5) * 15;
        velocities.push(vX, vY, vZ);
        const c = Math.random() > 0.5 ? color1 : color2; colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.userData = { velocities: velocities };
    
    const material = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 1 });
    explosionSystem = new THREE.Points(geometry, material);
    scene.add(explosionSystem);
}

export function animateExplosion(delta) {
    if (!explosionSystem) return;
    const positions = explosionSystem.geometry.attributes.position.array; 
    const velocities = explosionSystem.geometry.userData.velocities; 
    const material = explosionSystem.material;
    
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * delta; 
        positions[i+1] += velocities[i+1] * delta; 
        positions[i+2] += velocities[i+2] * delta; 
        velocities[i+1] -= 9.8 * delta * 0.5; 
    }
    explosionSystem.geometry.attributes.position.needsUpdate = true; 
    material.opacity -= delta * 0.5; 
    
    if (material.opacity <= 0) { 
        scene.remove(explosionSystem); 
        explosionSystem = null; 
    }
}