import * as THREE from 'three';
import { CONFIG } from './config.js';
import { InputManager } from './core/input.js';
import { initWorld, scene, camera, renderer, controls, transformControls } from './core/world.js';
import { initLights, flashlight, explosionLight, ambientLight } from './scenes/lights.js';

// 👇 CORRECCIÓN: Eliminado 'handPhoneMesh' de los imports
import { initLevel, phoneMesh, pickupPhone, getHoveredDoor, toggleDoor, spawnModelForEditing, batteries, keyMesh } from './scenes/level.js';

import { updatePlayer, debugInfo } from './core/player.js'; 
import { initUI, ui } from './ui.js';            
import { createRain, animateRain, createExplosionEffect, animateExplosion } from './effects/particles.js';
import { initAudio, playSound, stopSound, updateRainVolume } from './core/audio.js';

// 1. Inicialización del Mundo
initWorld(); 
initLights(); 
initLevel(); 
initUI(); 
initAudio(); 
createRain(); 

const input = new InputManager();
const clock = new THREE.Clock();

// Variables de Estado
let gameState = 'START';
let stateTimer = 0;

// Variables de Misión
let hasKey = false;           
let batteriesCollected = 0;   
let tutorialShown = false;    
let powerOutageCall = false;      
let powerOutageAnswered = false;  

// --- DEBUG HUD (Modo Detective) ---
const debugDiv = document.createElement('div');
debugDiv.style.cssText = "position:fixed; top:10px; left:10px; color:lime; font-family:monospace; z-index:10000; background:rgba(0,0,0,0.7); padding:10px; pointer-events:none; font-size:12px;";
document.body.appendChild(debugDiv);

// Botón Start
const startBtn = document.getElementById('startBtn');
if(startBtn) {
    startBtn.addEventListener('click', () => { 
        document.getElementById('menu').style.display = 'none'; 
        controls.lock(); 
        
        // 1. Ojos cerrados al inicio
        ui.setWakeOpacity(1); 
        
        gameState = 'WAKING_UP'; 
        stateTimer = 0; 
        playSound('rain');
    });
}

// Recuperar control si se pierde el foco
renderer.domElement.addEventListener('click', () => {
    if ((gameState === 'PHONE_RINGING' || gameState === 'GAMEPLAY') && !controls.isLocked) controls.lock();
});

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    animateRain();
    animateExplosion(delta);

    // --- MODO DETECTIVE: IDENTIFICAR OBJETOS ---
    const debugRay = new THREE.Raycaster();
    debugRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    const debugHits = debugRay.intersectObject(scene, true);
    
    let objectName = "---";
    let parentName = "---";
    
    if (debugHits.length > 0) {
        const obj = debugHits[0].object;
        objectName = obj.name;
        if (obj.parent) parentName = obj.parent.name;
    }

    // Actualizar Debug en pantalla
    debugDiv.innerHTML = `
        <span style="color:yellow">OBJETO: ${objectName}</span><br>
        <span style="color:orange">PADRE: ${parentName}</span><br>
        <br>
        Luz: ${ambientLight.intensity.toFixed(2)} | LLAVE: ${hasKey}<br>
        Estado: ${gameState}<br>
        Velocidad: ${debugInfo ? debugInfo.speed.toFixed(1) : 0} m/s
    `;

    updateRainVolume(camera.position.x > CONFIG.ENV.NO_RAIN_BOX.MIN.x && camera.position.x < CONFIG.ENV.NO_RAIN_BOX.MAX.x);

    // --- MÁQUINA DE ESTADOS ---

    if (gameState === 'WAKING_UP') {
        stateTimer += delta;
        const progress = Math.min(stateTimer / CONFIG.TIMING.WAKE_DURATION, 1.0);
        
        const t = (1 - Math.cos(progress * Math.PI)) / 2; 
        camera.position.lerpVectors(CONFIG.POSITIONS.BED, CONFIG.POSITIONS.SIT, t);
        camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SIT), t);

        // Parpadeo
        let eyeOpacity = 1.0;
        if (progress < 0.2) eyeOpacity = 1.0;        
        else if (progress < 0.3) eyeOpacity = 0.2;   
        else if (progress < 0.4) eyeOpacity = 0.8;   
        else if (progress < 0.6) eyeOpacity = 0.1;   
        else if (progress < 0.7) eyeOpacity = 0.4;   
        else eyeOpacity = 1.0 - progress;            

        if (progress >= 0.95) eyeOpacity = 0;
        ui.setWakeOpacity(eyeOpacity);

        if (progress >= 1.0) { 
            gameState = 'PHONE_RINGING'; 
            ui.setWakeOpacity(0); 
            ui.showInteract(true); 
            playSound('phone'); 
        }
    }

    if ((gameState === 'PHONE_RINGING' || gameState === 'IN_CALL' || gameState === 'GAMEPLAY') && !transformControls.dragging) {
        if (controls.isLocked || input.keys.flyMode) updatePlayer(delta, input);
        
        if ((gameState === 'PHONE_RINGING' || (phoneMesh && phoneMesh.userData.isRingingAgain)) && phoneMesh) {
            phoneMesh.rotation.z = Math.sin(Date.now() * 0.02) * 0.1;
        }
    }

    if (gameState === 'IN_CALL') {
        stateTimer += delta;
        if (stateTimer > CONFIG.TIMING.CALL_DURATION) { 
            ui.showCall(false); 
            ui.showBlackScreen(true); 
            // Sin handPhoneMesh
            controls.unlock(); 
            gameState = 'TIME_JUMP'; 
            stateTimer = 0;
        }
    }

    if (gameState === 'TIME_JUMP') {
        stateTimer += delta;
        if (stateTimer > 4.0) { 
            ui.showBlackScreen(false); 
            camera.position.copy(CONFIG.POSITIONS.VIEW); 
            if(CONFIG.ROTATIONS.VIEW) camera.rotation.copy(CONFIG.ROTATIONS.VIEW); 
            gameState = 'PRE_EXPLOSION'; 
            stateTimer = 0; 
            ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM;
        }
    }

    if (gameState === 'PRE_EXPLOSION') {
        stateTimer += delta;
        if (stateTimer > CONFIG.TIMING.EXPLOSION_DELAY) { gameState = 'EXPLODING'; triggerExplosion(); }
    }

    if (gameState === 'TRAVELING') {
        stateTimer += delta;
        const progress = Math.min(stateTimer / CONFIG.TIMING.TRAVEL_DURATION, 1.0);
        
        if (progress > 0.8) ui.setWakeOpacity((progress - 0.8) * 5); 

        const t = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        camera.position.lerpVectors(CONFIG.POSITIONS.VIEW, CONFIG.POSITIONS.SPAWN, t);
        camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SPAWN), t);

        if (progress >= 1.0) {
            controls.lock(); 
            gameState = 'GAMEPLAY'; 
            stateTimer = 0;
            
            ambientLight.intensity = 0.02; 
            ui.fadeOutWake(3000); 
            
            // Reactivar teléfono de mesa si es necesario
            if (phoneMesh) {
                phoneMesh.visible = true; 
                phoneMesh.userData.isRingingAgain = false;
            }
        }
    }

    if (gameState === 'GAMEPLAY') {
        stateTimer += delta;
        if (!tutorialShown && stateTimer > 2.0) {
            ui.showSubtitle("Presiona [ F ] para la Linterna", 4000);
            tutorialShown = true;
        }
        if (!powerOutageCall && stateTimer > 6.0) {
            playSound('phone'); 
            ui.showSubtitle("📞 El teléfono está sonando de nuevo...", 4000);
            powerOutageCall = true; 
            if(phoneMesh) phoneMesh.userData.isRingingAgain = true; 
        }
    }

    renderer.render(scene, camera);
}

// --- INTERACCIÓN ---
input.actions.onInteract = () => {
    
    // CASO 1: PRIMERA LLAMADA
    if (gameState === 'PHONE_RINGING') {
        if (camera.position.distanceTo(CONFIG.POSITIONS.PHONE) < 2.5) {
            ui.showInteract(false); ui.showCall(true); stopSound('phone'); pickupPhone(); 
            gameState = 'IN_CALL'; stateTimer = 0;
        }
        return;
    }

    if (gameState === 'GAMEPLAY') {
        
        // CASO 2: SEGUNDA LLAMADA
        if (powerOutageCall && !powerOutageAnswered && phoneMesh && phoneMesh.userData.isRingingAgain) {
            if (camera.position.distanceTo(CONFIG.POSITIONS.PHONE) < 2.5) {
                stopSound('phone');
                phoneMesh.userData.isRingingAgain = false; 
                powerOutageAnswered = true; 
                ui.showCall(true);
                ui.showSubtitle("Novia: '¿Se fue la luz? Revisa los fusibles en el garaje...'", 5000);
                setTimeout(() => {
                    ui.showCall(false);
                    ui.showSubtitle("Misión: Buscar LLAVE para abrir el GARAJE", 5000);
                }, 5000);
                return;
            }
        }

        // CASO 3: RECOGER LLAVE
        if (!hasKey && keyMesh && keyMesh.visible && camera.position.distanceTo(keyMesh.position) < 2.5) {
            keyMesh.visible = false; 
            hasKey = true;
            ui.showSubtitle("🔑 ENCONTRASTE LA LLAVE DEL GARAJE", 4000);
            return;
        }

        // CASO 4: INTERACTUAR CON PUERTAS
        const door = getHoveredDoor();
        if (door) {
            const dist = camera.position.distanceTo(door.position);
            if (dist > 2.5) return;

            console.log("Intentando abrir:", door.name); // 🔍 DEBUG EN CONSOLA

            // 🛑 BLOQUEO BLINDADO
            // Si el nombre contiene "Door_008" (o variantes), activamos el bloqueo
            if (door.name.includes("Door_008") || door.name.includes("Door_08")) {
                
                // Si NO tenemos la llave...
                if (!hasKey) {
                    // Si la puerta está cerrada (isOpen = false), NO LA ABRAS.
                    // Si ya estaba abierta (por error antes), permite cerrarla pero no volver a abrirla.
                    if (!door.userData.isOpen) {
                        ui.showSubtitle("🔒 CERRADA CON LLAVE", 3000);
                        // playSound('locked'); 
                        return; // 🛑 AQUÍ SE DETIENE TODO, NO EJECUTA toggleDoor
                    }
                } else {
                    // Si SI tenemos llave, mostramos mensaje de éxito una vez
                    if (!door.userData.isOpen) ui.showSubtitle("🔓 Abriendo Garaje...", 2000);
                }
            }
            
            // Si no retornamos arriba, abrimos la puerta
            toggleDoor(door);
            return;
        }

        // CASO 5: BATERÍAS
        if (batteries.length > 0) {
            batteries.forEach((bat) => {
                if (bat.visible && !bat.userData.collected && camera.position.distanceTo(bat.position) < 2.5) {
                    bat.visible = false;
                    bat.userData.collected = true;
                    batteriesCollected++;
                    ui.showSubtitle(`🔋 Batería recogida (${batteriesCollected}/3)`, 2000);
                    if (batteriesCollected === 3) ui.showSubtitle("⚡ Tengo los fusibles. Iré a la caja.", 5000);
                }
            });
        }
    }
};

input.actions.onMakerSpawn = () => {
    controls.unlock();
    const model = prompt("1: Fusibles, 2: Teléfono, 3: Batería, 4: Llave");
    if (model === "1") spawnModelForEditing('assets/models/caja_fusibles.glb');
    if (model === "2") spawnModelForEditing('assets/models/phone.glb');
    if (model === "3") spawnModelForEditing('assets/models/bateria_1.glb');
    if (model === "4") spawnModelForEditing('assets/models/llave.glb');
};

input.actions.onFlashlight = () => { if(gameState === 'GAMEPLAY') flashlight.intensity = flashlight.intensity > 0 ? 0 : CONFIG.ENV.FLASHLIGHT_INTENSITY; };
input.actions.onLightUp = () => { ambientLight.intensity += 0.05; };
input.actions.onLightDown = () => { ambientLight.intensity = Math.max(0, ambientLight.intensity - 0.05); };
input.actions.onFogUp = () => { scene.fog.density += 0.002; };
input.actions.onFogDown = () => { scene.fog.density = Math.max(0, scene.fog.density - 0.002); };

function triggerExplosion() { 
    createExplosionEffect(); let f=0; 
    const i = setInterval(() => { f++; explosionLight.intensity = f%2==0?200:0; if(f>10) { clearInterval(i); explosionLight.intensity=0; gameState='TRAVELING'; stateTimer=0; } }, 80); 
}

animate();