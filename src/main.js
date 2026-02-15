import * as THREE from 'three';
import { CONFIG } from './config.js';
import { InputManager } from './core/input.js';
import { initWorld, scene, camera, renderer, controls, transformControls } from './core/world.js';
import { initLights, flashlight, explosionLight, ambientLight } from './scenes/lights.js';
import { initLevel, phoneMesh, handPhoneMesh, pickupPhone, getHoveredDoor, toggleDoor, spawnModelForEditing, batteries, keyMesh } from './scenes/level.js';
import { updatePlayer } from './core/player.js'; 
import { initUI, ui } from './ui.js';            
import { createRain, animateRain, createExplosionEffect, animateExplosion } from './effects/particles.js';
import { initAudio, playSound, stopSound, updateRainVolume } from './core/audio.js';

// 1. Inicialización
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
let powerOutageCall = false;      // ¿Sonó el teléfono por 2da vez?
let powerOutageAnswered = false;  // ¿Contestamos ya?

// --- DEBUG VISUAL ---
const debugDiv = document.createElement('div');
debugDiv.style.cssText = "position:fixed; top:10px; left:10px; color:lime; font-family:monospace; z-index:10000; background:rgba(0,0,0,0.5); padding:10px; pointer-events:none; font-size:12px;";
document.body.appendChild(debugDiv);

// Configuración del Botón Start
const startBtn = document.getElementById('startBtn');
if(startBtn) {
    startBtn.addEventListener('click', () => { 
        document.getElementById('menu').style.display = 'none'; 
        controls.lock(); 
        
        // 1. Ojos cerrados al inicio (Pantalla Negra)
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

    // --- DEBUG INFO ---
    const doorLook = getHoveredDoor();
    const doorName = doorLook ? doorLook.name : "Ninguna";
    // Muestra distancia a la puerta si estás mirando una
    const distDoor = doorLook ? camera.position.distanceTo(doorLook.position).toFixed(2) + "m" : "-";
    
    debugDiv.innerText = `Luz: ${ambientLight.intensity.toFixed(2)} | BATERÍAS: ${batteriesCollected}/3 | LLAVE: ${hasKey ? "SÍ" : "NO"}
    ESTADO: ${gameState}
    PUERTA: ${doorName} (Dist: ${distDoor})`;

    updateRainVolume(camera.position.x > CONFIG.ENV.NO_RAIN_BOX.MIN.x && camera.position.x < CONFIG.ENV.NO_RAIN_BOX.MAX.x);

    // --- MÁQUINA DE ESTADOS ---

    if (gameState === 'WAKING_UP') {
        stateTimer += delta;
        const progress = Math.min(stateTimer / CONFIG.TIMING.WAKE_DURATION, 1.0);
        
        // Animación de levantarse
        const t = (1 - Math.cos(progress * Math.PI)) / 2; 
        camera.position.lerpVectors(CONFIG.POSITIONS.BED, CONFIG.POSITIONS.SIT, t);
        camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SIT), t);

        // Animación de Parpadeo (Ojos abriéndose)
        let eyeOpacity = 1.0;
        if (progress < 0.2) eyeOpacity = 1.0;        // Cerrados
        else if (progress < 0.3) eyeOpacity = 0.2;   // Abre
        else if (progress < 0.4) eyeOpacity = 0.8;   // Cierra
        else if (progress < 0.6) eyeOpacity = 0.1;   // Abre más
        else if (progress < 0.7) eyeOpacity = 0.4;   // Cierra un poco
        else eyeOpacity = 1.0 - progress;            // Abre del todo

        if (progress >= 0.95) eyeOpacity = 0;
        ui.setWakeOpacity(eyeOpacity);

        if (progress >= 1.0) { 
            gameState = 'PHONE_RINGING'; 
            ui.setWakeOpacity(0); // Asegurar ojos abiertos
            ui.showInteract(true); 
            playSound('phone'); 
        }
    }

    if ((gameState === 'PHONE_RINGING' || gameState === 'IN_CALL' || gameState === 'GAMEPLAY') && !transformControls.dragging) {
        if (controls.isLocked || input.keys.flyMode) updatePlayer(delta, input);
        
        // Efecto de vibración/luz si el teléfono suena
        if ((gameState === 'PHONE_RINGING' || (phoneMesh && phoneMesh.userData.isRingingAgain)) && phoneMesh) {
            phoneMesh.rotation.z = Math.sin(Date.now() * 0.02) * 0.1;
            setPhoneGlowing((Math.sin(Date.now() * 0.01) + 1) * 0.4);
        }
    }

    if (gameState === 'IN_CALL') {
        stateTimer += delta;
        if (stateTimer > CONFIG.TIMING.CALL_DURATION) { 
            ui.showCall(false); 
            ui.showBlackScreen(true); // Fundido a negro
            if(handPhoneMesh) handPhoneMesh.visible = false; 
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
        
        // Fade to Black al final del viaje
        if (progress > 0.8) ui.setWakeOpacity((progress - 0.8) * 5); 

        const t = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        camera.position.lerpVectors(CONFIG.POSITIONS.VIEW, CONFIG.POSITIONS.SPAWN, t);
        camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SPAWN), t);

        if (progress >= 1.0) {
            // LLEGADA A CASA (APAGÓN)
            controls.lock(); 
            gameState = 'GAMEPLAY'; 
            stateTimer = 0;
            
            // Configurar ambiente oscuro
            ambientLight.intensity = 0.02; 
            ui.fadeOutWake(3000); // Abrir ojos lentamente
            
            // Asegurar que el teléfono físico sea visible
            if (phoneMesh) {
                phoneMesh.visible = true; 
                phoneMesh.userData.isRingingAgain = false;
            }
        }
    }

    if (gameState === 'GAMEPLAY') {
        stateTimer += delta;
        
        // Tutorial
        if (!tutorialShown && stateTimer > 2.0) {
            ui.showSubtitle("Presiona [ F ] para la Linterna", 4000);
            tutorialShown = true;
        }

        // Trigger Segunda Llamada (A los 6 segundos)
        if (!powerOutageCall && stateTimer > 6.0) {
            playSound('phone'); 
            ui.showSubtitle("📞 El teléfono está sonando de nuevo...", 4000);
            powerOutageCall = true; 
            if(phoneMesh) phoneMesh.userData.isRingingAgain = true; // Activar flag visual
        }
    }

    renderer.render(scene, camera);
}

// --- SISTEMA DE INTERACCIÓN UNIFICADO ---
input.actions.onInteract = () => {
    
    // CASO 1: PRIMERA LLAMADA (Inicio)
    if (gameState === 'PHONE_RINGING') {
        if (camera.position.distanceTo(CONFIG.POSITIONS.PHONE) < 2.5) {
            ui.showInteract(false); ui.showCall(true); stopSound('phone'); pickupPhone(); 
            gameState = 'IN_CALL'; stateTimer = 0;
        }
        return;
    }

    if (gameState === 'GAMEPLAY') {
        
        // CASO 2: SEGUNDA LLAMADA (Apagón)
        // Verificamos si está sonando Y si estamos cerca
        if (powerOutageCall && !powerOutageAnswered && phoneMesh && phoneMesh.userData.isRingingAgain) {
            if (camera.position.distanceTo(CONFIG.POSITIONS.PHONE) < 2.5) {
                stopSound('phone');
                phoneMesh.userData.isRingingAgain = false; // Deja de vibrar
                powerOutageAnswered = true; // Marcamos como contestada
                
                ui.showCall(true);
                ui.showSubtitle("Novia: '¿Se fue la luz? Revisa los fusibles en el garaje...'", 5000);
                
                // Colgar automáticamente
                setTimeout(() => {
                    ui.showCall(false);
                    ui.showSubtitle("Misión: Buscar LLAVE para abrir el GARAJE", 5000);
                }, 5000);
                return;
            }
        }

        // CASO 3: RECOGER LLAVE 🔑
        if (!hasKey && keyMesh && keyMesh.visible && camera.position.distanceTo(keyMesh.position) < 2.5) {
            keyMesh.visible = false; 
            hasKey = true;
            ui.showSubtitle("🔑 ENCONTRASTE LA LLAVE DEL GARAJE", 4000);
            return;
        }

        // CASO 4: INTERACTUAR CON PUERTAS 🚪
        const door = getHoveredDoor();
        if (door) {
            const dist = camera.position.distanceTo(door.position);
            
            // 🚫 Bloquear interacción si está lejos (> 2.5m)
            if (dist > 2.5) return;

            // 🔒 Lógica de Bloqueo
            // "Door_08" es la puerta del garaje (según tu indicación anterior)
            const isLockedDoor = door.name === "Door_08"; 
            
            if (isLockedDoor && !door.userData.isOpen && !hasKey) {
                ui.showSubtitle("🔒 CERRADA. (Necesito llave)", 3000);
                // playSound('locked');
                return; 
            }
            
            // Abrir/Cerrar
            toggleDoor(door);
            
            if (hasKey && isLockedDoor && !door.userData.isOpen) {
                ui.showSubtitle("🔓 Puerta abierta", 2000);
            }
            return;
        }

        // CASO 5: RECOGER BATERÍAS 🔋
        if (batteries.length > 0) {
            batteries.forEach((bat) => {
                // Verificar visibilidad y distancia (< 2.5m)
                if (bat.visible && !bat.userData.collected && camera.position.distanceTo(bat.position) < 2.5) {
                    bat.visible = false;
                    bat.userData.collected = true;
                    batteriesCollected++;
                    ui.showSubtitle(`🔋 Batería recogida (${batteriesCollected}/3)`, 2000);
                    
                    if (batteriesCollected === 3) {
                        ui.showSubtitle("⚡ Tengo los fusibles. Iré a la caja.", 5000);
                    }
                }
            });
        }
    }
};

// --- HERRAMIENTAS DE DESARROLLO ---
input.actions.onMakerSpawn = () => {
    controls.unlock();
    const model = prompt("1: Fusibles, 2: Teléfono, 3: Batería, 4: Llave");
    if (model === "1") spawnModelForEditing('assets/models/caja_fusibles.glb');
    if (model === "2") spawnModelForEditing('assets/models/phone.glb');
    if (model === "3") spawnModelForEditing('assets/models/bateria_1.glb');
    if (model === "4") spawnModelForEditing('assets/models/llave.glb');
};

// Controles de Ambiente (Teclas 8, 9, etc)
input.actions.onFlashlight = () => { if(gameState === 'GAMEPLAY') flashlight.intensity = flashlight.intensity > 0 ? 0 : CONFIG.ENV.FLASHLIGHT_INTENSITY; };

input.actions.onLightUp = () => { 
    ambientLight.intensity += 0.05; 
    console.log("💡 Luz:", ambientLight.intensity.toFixed(2)); 
};
input.actions.onLightDown = () => { 
    ambientLight.intensity = Math.max(0, ambientLight.intensity - 0.05); 
    console.log("💡 Luz:", ambientLight.intensity.toFixed(2)); 
};

input.actions.onFogUp = () => { scene.fog.density += 0.002; };
input.actions.onFogDown = () => { scene.fog.density = Math.max(0, scene.fog.density - 0.002); };

function setPhoneGlowing(i) { if(phoneMesh) phoneMesh.children.forEach(c => { if(c.isPointLight) c.intensity = i*2; }); }
function triggerExplosion() { 
    createExplosionEffect(); let f=0; 
    const i = setInterval(() => { f++; explosionLight.intensity = f%2==0?200:0; if(f>10) { clearInterval(i); explosionLight.intensity=0; gameState='TRAVELING'; stateTimer=0; } }, 80); 
}

animate();