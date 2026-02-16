import * as THREE from 'three';
import { CONFIG } from './config.js';
import { InputManager } from './core/input.js';
import { initWorld, scene, camera, renderer, controls, transformControls } from './core/world.js';
import { initLights, flashlight, explosionLight, ambientLight } from './scenes/lights.js';
import { initLevel, phoneMesh, pickupPhone, getHoveredDoor, toggleDoor, spawnModelForEditing, batteries, keyMesh, collidableObjects, fuseboxMesh, houseLights } from './scenes/level.js';
import { updatePlayer, debugInfo } from './core/player.js'; 
import { initUI, ui } from './ui.js';            
import { createRain, animateRain, createExplosionEffect, animateExplosion } from './effects/particles.js';
import { initAudio, playSound, stopSound, updateRainVolume } from './core/audio.js';

initWorld(); 
initLights(); 
initLevel(); 
initUI(); 
initAudio(); 
createRain(); 

const input = new InputManager();
const clock = new THREE.Clock();

let gameState = 'START';
let stateTimer = 0;

let hasKey = false;           
let batteriesCollected = 0;   
let tutorialShown = false;    
let powerOutageCall = false;      
let powerOutageAnswered = false;  
let powerRestored = false;

const debugDiv = document.createElement('div');
debugDiv.style.cssText = "position:fixed; top:10px; left:10px; color:lime; font-family:monospace; z-index:10000; background:rgba(0,0,0,0.7); padding:10px; pointer-events:none; font-size:12px;";
document.body.appendChild(debugDiv);

const startBtn = document.getElementById('startBtn');
if(startBtn) {
    startBtn.addEventListener('click', () => { 
        document.getElementById('menu').style.display = 'none'; 
        controls.lock(); 
        ui.setWakeOpacity(1); 
        gameState = 'WAKING_UP'; 
        stateTimer = 0; 
        playSound('rain');
    });
}

renderer.domElement.addEventListener('click', () => {
    if ((gameState === 'PHONE_RINGING' || gameState === 'GAMEPLAY') && !controls.isLocked) controls.lock();
});

// Función Anti-Paredes
function checkLineOfSight(targetObject) {
    if (!targetObject) return false;
    const ray = new THREE.Raycaster();
    const direction = new THREE.Vector3().subVectors(targetObject.position, camera.position).normalize();
    ray.set(camera.position, direction);
    const distanceToObject = camera.position.distanceTo(targetObject.position);
    const hits = ray.intersectObjects(collidableObjects, true);
    if (hits.length > 0) {
        if (hits[0].distance < distanceToObject && hits[0].object !== targetObject) {
            return false;
        }
    }
    return true;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    animateRain();
    animateExplosion(delta);

    // Debug
    const debugRay = new THREE.Raycaster();
    debugRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    const debugHits = debugRay.intersectObject(scene, true);
    let objectName = "---";
    if (debugHits.length > 0) objectName = debugHits[0].object.name;

    debugDiv.innerHTML = `OBJETO: ${objectName}<br>LLAVE: ${hasKey} | BATERÍAS: ${batteriesCollected}/3<br>FOCOS: ${houseLights.length}<br>Estado: ${gameState}`;

    updateRainVolume(camera.position.x > CONFIG.ENV.NO_RAIN_BOX.MIN.x && camera.position.x < CONFIG.ENV.NO_RAIN_BOX.MAX.x);

    if (gameState === 'WAKING_UP') {
        stateTimer += delta;
        const progress = Math.min(stateTimer / CONFIG.TIMING.WAKE_DURATION, 1.0);
        const t = (1 - Math.cos(progress * Math.PI)) / 2; 
        camera.position.lerpVectors(CONFIG.POSITIONS.BED, CONFIG.POSITIONS.SIT, t);
        camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SIT), t);

        let eyeOpacity = 1.0;
        if (progress < 0.2) eyeOpacity = 1.0;        
        else if (progress < 0.3) eyeOpacity = 0.2;   
        else if (progress < 0.4) eyeOpacity = 0.8;   
        else if (progress < 0.6) eyeOpacity = 0.1;   
        else if (progress < 0.7) eyeOpacity = 0.4;   
        else eyeOpacity = 1.0 - progress;            

        if (progress >= 0.95) eyeOpacity = 0;
        ui.setWakeOpacity(eyeOpacity);
        if (progress >= 1.0) { gameState = 'PHONE_RINGING'; ui.setWakeOpacity(0); ui.showInteract(true); playSound('phone'); }
    }

    if ((gameState === 'PHONE_RINGING' || gameState === 'IN_CALL' || gameState === 'GAMEPLAY') && !transformControls.dragging) {
        if (controls.isLocked || input.keys.flyMode) updatePlayer(delta, input);
        if ((gameState === 'PHONE_RINGING' || (phoneMesh && phoneMesh.userData.isRingingAgain)) && phoneMesh && phoneMesh.visible) {
            phoneMesh.rotation.z = Math.sin(Date.now() * 0.02) * 0.1;
        }
    }

    if (gameState === 'IN_CALL') {
        stateTimer += delta;
        if (stateTimer > CONFIG.TIMING.CALL_DURATION) { ui.showCall(false); ui.showBlackScreen(true); controls.unlock(); gameState = 'TIME_JUMP'; stateTimer = 0; }
    }

    if (gameState === 'TIME_JUMP') {
        stateTimer += delta;
        if (stateTimer > 4.0) { ui.showBlackScreen(false); camera.position.copy(CONFIG.POSITIONS.VIEW); if(CONFIG.ROTATIONS.VIEW) camera.rotation.copy(CONFIG.ROTATIONS.VIEW); gameState = 'PRE_EXPLOSION'; stateTimer = 0; ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM; }
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
            ambientLight.intensity = 0.0; 
            ui.fadeOutWake(3000);
            if (phoneMesh) phoneMesh.userData.isRingingAgain = false;
        }
    }

    if (gameState === 'GAMEPLAY') {
        stateTimer += delta;
        if (!tutorialShown && stateTimer > 2.0) { ui.showSubtitle("Presiona [ F ] para la Linterna", 4000); tutorialShown = true; }
        if (!powerOutageCall && !powerRestored && stateTimer > 6.0) { 
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
    
    if (gameState === 'PHONE_RINGING') {
        if (camera.position.distanceTo(CONFIG.POSITIONS.PHONE) < 2.5) {
            ui.showInteract(false); ui.showCall(true); stopSound('phone'); pickupPhone(); gameState = 'IN_CALL'; stateTimer = 0;
        }
        return;
    }

    if (gameState === 'GAMEPLAY') {
        
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

        if (!hasKey && keyMesh && keyMesh.visible) {
             if (camera.position.distanceTo(keyMesh.position) < 2.5) {
                 if (checkLineOfSight(keyMesh)) {
                     keyMesh.visible = false; hasKey = true; ui.showSubtitle("🔑 ENCONTRASTE LA LLAVE DEL GARAJE", 4000); return;
                 }
             }
        }

        if (fuseboxMesh && camera.position.distanceTo(CONFIG.POSITIONS.FUSEBOX) < 2.5) {
            if (checkLineOfSight(fuseboxMesh)) {
                if (batteriesCollected === 3) {
                    if (!powerRestored) {
                        powerRestored = true;
                        ui.showSubtitle("⚡ SISTEMA REINICIADO", 3000);
                        
                        // Encender las luces (SIN SOMBRAS, SUPER RÁPIDO)
                        houseLights.forEach(item => {
                            item.light.intensity = 1.5; 
                            if(item.mesh.material) {
                                item.mesh.material.emissive.setHex(0xffaa00);
                                item.mesh.material.emissiveIntensity = 1;
                            }
                        });
                        ambientLight.intensity = 0.05;

                        // Ciclo de parpadeo (Ahora no mata el PC)
                        const blackoutLoop = setInterval(() => {
                            houseLights.forEach(item => {
                                if (Math.random() > 0.5) {
                                    item.light.intensity = Math.random() * 2; 
                                    if(item.mesh.material) item.mesh.material.emissiveIntensity = 1;
                                } else {
                                    item.light.intensity = 0;
                                    if(item.mesh.material) item.mesh.material.emissiveIntensity = 0;
                                }
                            });
                            
                            if (Math.random() > 0.8) {
                                houseLights.forEach(item => { item.light.intensity = 0; });
                            }
                        }, 100); 

                        // Colapso final
                        setTimeout(() => {
                            clearInterval(blackoutLoop); 
                            powerRestored = false; 
                            
                            houseLights.forEach(item => {
                                item.light.intensity = 0;
                                if(item.mesh.material) item.mesh.material.emissiveIntensity = 0;
                            });
                            ambientLight.intensity = 0;
                            flashlight.intensity = 0;
                            
                            ui.showSubtitle("💀 El sistema colapsó por completo...", 6000);
                        }, 15000); 
                    }
                } else {
                    ui.showSubtitle(`⚠️ FALTAN FUSIBLES (${batteriesCollected}/3)`, 3000);
                }
            }
            return;
        }

        const door = getHoveredDoor();
        if (door) {
            const dist = camera.position.distanceTo(door.position);
            if (dist > 2.5) return;
            const isLockedDoor = door.name.includes("Door_008") || door.name.includes("Door_08"); 
            if (isLockedDoor && !door.userData.isOpen) {
                if (!hasKey) { ui.showSubtitle("🔒 CERRADA. (Necesito llave)", 3000); return; }
                else { ui.triggerScreamerEffect(); ui.showSubtitle("🔓 Abriendo...", 2000); }
            }
            toggleDoor(door); return;
        }

        if (batteries.length > 0) {
            batteries.forEach((bat) => {
                if (bat.visible && !bat.userData.collected) {
                    if (camera.position.distanceTo(bat.position) < 2.5) {
                        if (checkLineOfSight(bat)) {
                            bat.visible = false; bat.userData.collected = true; batteriesCollected++;
                            ui.showSubtitle(`🔋 Batería recogida (${batteriesCollected}/3)`, 2000);
                            if (batteriesCollected === 3) ui.showSubtitle("⚡ Tengo los fusibles. Iré a la caja.", 5000);
                        }
                    }
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