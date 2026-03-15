import * as THREE from 'three';
import { CONFIG } from './data/config.js';
import { InputManager } from './core/input.js';
import { initWorld, scene, camera, renderer, controls, transformControls } from './core/world.js';
import { initLights, flashlight, explosionLight, ambientLight } from './scenes/lights.js';
import { initLevel, phoneMesh, pickupPhone, getHoveredDoor, toggleDoor, spawnModelForEditing, batteries, keyMesh, collidableObjects, fuseboxMesh, houseLights, streetLights, laptopMesh, laptopWorldPosition, bookWorldPosition, keyWorldPosition, ritualStoneMesh, uvLampMesh, uvBloodMark, loadUVLamp, loadUVBloodMark, animateUVLamp, setUVMarkVisible, loadUVNotes, setUVNotesVisible } from './scenes/level.js';
import { initInventoryUI, toggleInventory, inventoryCollect, inventorySetBatteries, inventorySetFlashlightMode, inventoryHasItem, showInventoryBriefly } from './ui/inventoryUI.js';
import { updatePlayer, debugInfo, moveWithCollision, getWall, getFloor, getGroundY } from './core/player.js'; 
import { initUI, ui } from './ui/ui.js';            
import { initLaptop, toggleLaptopUI } from './ui/laptopUI.js'; 
import { initNumpad, toggleNumpadUI } from './ui/numpadUI.js'; 
import { initBook, toggleBookUI } from './ui/bookUI.js'; 
import { initStoneUI, showStoneUI, hideStoneUI } from './ui/stoneUI.js';
import { createRain, animateRain, createExplosionEffect, animateExplosion } from './effects/particles.js';
import { initAudio, playSound, stopSound, updateRainVolume } from './core/audio.js';
import { DIALOGUES, playDialogueSequence } from './data/dialogues.js';
import { initShadow, updateShadow, triggerScreamer } from './effects/screamer.js';
import { initEnding } from './scenes/ending.js';

initWorld(); 
initLights(); 
initLevel(); 
initUI(); 
initLaptop(); 
initNumpad(); 
initBook(); 
initAudio(); 

// Posición de la cámara para el fondo del menú
camera.position.set(-11.195, 8.356, 19.804);
camera.rotation.set(-0.208, -0.654, -0.133);

// Encender luces para el fondo del menú — se apagarán al iniciar
setTimeout(() => {
    houseLights.forEach(item => {
        item.light.intensity = 3.0;
        if (item.mesh.material) {
            item.mesh.material.emissive.setHex(0xffaa00);
            item.mesh.material.emissiveIntensity = 1.5;
        }
    });
    streetLights.forEach(item => {
        item.light.intensity = 15.0;
        item.mesh.material.emissiveIntensity = 4.0;
    });
    ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM;
}, 600);
createRain(); 
initInventoryUI();
loadUVLamp();
loadUVBloodMark();
loadUVNotes();
initShadow();

initStoneUI(() => {
    ui.showSubtitle("Zare: '...¿Qué significa este número?'", 3000);
});

const input = new InputManager();
const clock = new THREE.Clock();

// Inicializar ending — escucha numpadSuccess y maneja toda la cinemática final
initEnding({
    getGameState: () => gameState,
    setGameState: (s) => { gameState = s; },
    getUVMode: () => uvMode,
    setUVMode: (m) => { uvMode = m; },
    input,
});

let gameState = 'START';
let stateTimer = 0;
let paranoiaTimer = 0; 

let hasKey = false;           
let batteriesCollected = 0;   
let tutorialShown = false;    
let powerOutageCall = false;      
let powerOutageAnswered = false;  
let powerRestored = false;
let fuseboxUsed   = false;  // true después del colapso — nunca vuelve a activarse
let isLaptopOpen = false;
let isNumpadOpen = false; 
let isBookOpen = false; 
let isStoneOpen = false;
let hasUVLamp   = false;        // tiene lámpara UV en inventario
let uvMode      = 'off';        // 'off' | 'normal' | 'uv'

let finalCallTriggered = false;
let finalCallAnswered = false;
let endingTriggered = false;

// Teclado directo para ENDING_WAKE / ENDING_OUTSIDE — independiente de PointerLock
const endingKeys = { forward: false, backward: false, left: false, right: false };
document.addEventListener('keydown', (e) => {
    if (gameState !== 'ENDING_WAKE' && gameState !== 'ENDING_OUTSIDE') return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp')    endingKeys.forward  = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown')  endingKeys.backward = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')  endingKeys.left     = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') endingKeys.right    = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp')    endingKeys.forward  = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown')  endingKeys.backward = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')  endingKeys.left     = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') endingKeys.right    = false;
});

const startBtn = document.getElementById('startBtn');
if(startBtn) {
    startBtn.addEventListener('click', () => { 
        document.getElementById('menu').style.display = 'none'; 
        controls.lock(); 
        ui.setWakeOpacity(1); 
        gameState = 'WAKING_UP'; 
        stateTimer = 0; 
        playSound('lluvia');
        // Encender focos de la casa al inicio — se apagarán tras la explosión
        setTimeout(() => {
            houseLights.forEach(item => { 
                item.light.intensity = 3.0;
                item.light.distance = 18;
                if (item.mesh.material) {
                    item.mesh.material.emissive.setHex(0xffaa00);
                    item.mesh.material.emissiveIntensity = 1.5;
                }
            });
            streetLights.forEach(item => { item.light.intensity = 15.0; item.mesh.material.emissiveIntensity = 4.0; });
            ambientLight.intensity = CONFIG.ENV.AMBIENT_DIM;
        }, 500);
    });
}

renderer.domElement.addEventListener('click', () => {
    if ((gameState === 'PHONE_RINGING' || gameState === 'GAMEPLAY') && !controls.isLocked && !isLaptopOpen && !isNumpadOpen && !isBookOpen && !isStoneOpen) controls.lock();
    if ((gameState === 'ENDING_OUTSIDE' || gameState === 'ENDING_WAKE') && !controls.isLocked) {
        // Solo intentar lockear — NO apagar flyMode porque es el fallback de movimiento
        try { controls.lock(); } catch(e) {}
    }
});

function checkLineOfSight(targetPosition) {
    if (!targetPosition) return false;
    const ray = new THREE.Raycaster();
    const direction = new THREE.Vector3().subVectors(targetPosition, camera.position).normalize();
    ray.set(camera.position, direction);
    const distanceToTarget = camera.position.distanceTo(targetPosition);
    const hits = ray.intersectObjects(collidableObjects, true);
    if (hits.length > 0) {
        if (hits[0].distance < distanceToTarget - 0.3) return false;
    }
    return true;
}

const interactRay = new THREE.Raycaster();
const INTERACT_DISTANCE = 1.8;

function getInteractTarget() {
    interactRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    interactRay.far = INTERACT_DISTANCE;
    const hits = interactRay.intersectObjects(collidableObjects, true);
    if (hits.length === 0) return null;
    return hits[0];
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    animateRain();
    animateExplosion(delta);
    updateShadow(delta);
    if (scene.userData.endingUpdate) scene.userData.endingUpdate(delta);

    updateRainVolume(camera.position.x > CONFIG.ENV.NO_RAIN_BOX.MIN.x && camera.position.x < CONFIG.ENV.NO_RAIN_BOX.MAX.x);

    // Fondo animado del menú — paneo lento y atmosférico
    if (gameState === 'START') {
        camera.rotation.y -= delta * 0.008; // giro muy lento
    }

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
        if (progress >= 1.0) { gameState = 'PHONE_RINGING'; ui.setWakeOpacity(0); ui.showInteract(true); playSound('telefono'); }
    }

    // Movimiento directo para ENDING_WAKE y ENDING_OUTSIDE
    // Evita por completo InputManager y PointerLock — pero sí respeta colisiones
    if (gameState === 'ENDING_WAKE' || gameState === 'ENDING_OUTSIDE') {
        const spd = 2.5 * delta;
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        fwd.y = 0; fwd.normalize();
        const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        rgt.y = 0; rgt.normalize();
        let dx = 0, dz = 0;
        if (endingKeys.forward)  { dx += fwd.x * spd; dz += fwd.z * spd; }
        if (endingKeys.backward) { dx -= fwd.x * spd; dz -= fwd.z * spd; }
        if (endingKeys.left)     { dx -= rgt.x * spd; dz -= rgt.z * spd; }
        if (endingKeys.right)    { dx += rgt.x * spd; dz += rgt.z * spd; }
        if (dx !== 0 || dz !== 0) moveWithCollision(dx, dz, getWall());

        // Gravedad — pegar al suelo
        const moveDir = new THREE.Vector3(dx, 0, dz);
        const groundY = getGroundY(getFloor(), moveDir.length() > 0 ? moveDir.normalize() : null);
        if (groundY !== null) {
            const targetY = groundY + 1.7;
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, Math.min(delta * 20, 1));
        }
    }

    if ((gameState === 'PHONE_RINGING' || gameState === 'IN_CALL' || gameState === 'GAMEPLAY') && !transformControls.dragging) {
        if ((controls.isLocked || input.keys.flyMode) && !isLaptopOpen && !isNumpadOpen && !isBookOpen && !isStoneOpen) updatePlayer(delta, input);
        if ((gameState === 'PHONE_RINGING' || (phoneMesh && phoneMesh.userData.isRingingAgain)) && phoneMesh && phoneMesh.visible) {
            phoneMesh.rotation.z = Math.sin(Date.now() * 0.02) * 0.1;
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
        if (stateTimer > CONFIG.TIMING.EXPLOSION_DELAY) { 
            gameState = 'EXPLODING'; 
            playSound('explosion'); 
            triggerExplosion(); 
        }
    }

    if (gameState === 'TRAVELING') {
        stateTimer += delta;
        const progress = Math.min(stateTimer / CONFIG.TIMING.TRAVEL_DURATION, 1.0);
        if (progress > 0.8) ui.setWakeOpacity((progress - 0.8) * 5); 
        const t = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        camera.position.lerpVectors(CONFIG.POSITIONS.VIEW, CONFIG.POSITIONS.SPAWN, t);
        camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(CONFIG.ROTATIONS.SPAWN), t);

        if (progress >= 1.0) {
            // Forzar orden YXZ y limpiar roll antes de que controls tome el control
            camera.rotation.order = 'YXZ';
            const s = CONFIG.ROTATIONS.SPAWN;
            camera.rotation.set(s.x, s.y, 0);
            controls.lock();
            gameState = 'GAMEPLAY';
            stateTimer = 0;
            ambientLight.intensity = 0.0;
            // Apagar focos — la casa quedó sin luz tras la explosión
            houseLights.forEach(item => { 
                item.light.intensity = 0;
                if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
            });
            ui.fadeOutWake(3000);
            playSound('respiracion'); 
            playSound('tinitus');     
            if (phoneMesh) phoneMesh.userData.isRingingAgain = false;
        }
    }


    if (gameState === 'GAMEPLAY') {
        stateTimer += delta;
        paranoiaTimer += delta;

        if (paranoiaTimer > 15) { 
            if (Math.random() < 0.3) { 
                const esTocando = Math.random() > 0.5;
                if (esTocando) playSound('tocando');
                else playSound('puerta_scream');
                const frases = esTocando ? DIALOGUES.PARANOIA_TOCANDO : DIALOGUES.PARANOIA_PUERTA;
                const fraseElegida = frases[Math.floor(Math.random() * frases.length)];
                setTimeout(() => { ui.showSubtitle(fraseElegida, 3000); }, 800);
            }
            paranoiaTimer = 0; 
        }

        if (!tutorialShown && stateTimer > 2.0) { ui.showSubtitle("Presiona [ F ] para el Teléfono", 4000); tutorialShown = true; }
        
        if (!powerOutageCall && !powerRestored && stateTimer > 6.0) { 
            playSound('telefono'); 
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
            ui.showInteract(false); 
            ui.showCall(true); 
            stopSound('telefono'); 
            stopSound('pasos'); 
            pickupPhone(); 
            gameState = 'IN_CALL'; 
            stateTimer = 0;
            playDialogueSequence(ui, DIALOGUES.CALL_1, () => {
                ui.showCall(false); 
                ui.showBlackScreen(true); 
                controls.unlock(); 
                gameState = 'TIME_JUMP'; 
                stateTimer = 0; 
                stopSound('pasos');
            });
        }
        return;
    }

    // ENDING_WAKE — puertas normales funcionan
    if (gameState === 'ENDING_WAKE') {
        const door = getHoveredDoor();
        if (door) {
            const dist = camera.position.distanceTo(door.position);
            if (dist < 2.5) toggleDoor(door);
        }
        return;
    }

    // ENDING: jugador abre la puerta → jumpscare
    if (gameState === 'ENDING_OUTSIDE') {
        const door = getHoveredDoor();
        if (door && door.name === 'Door') {
            const dist = camera.position.distanceTo(door.position);
            if (dist < 2.5 && !door.userData.isOpen) {
                toggleDoor(door);
                setTimeout(() => { triggerScreamer(); }, 800);
            }
        }
        return;
    }

    if (gameState === 'GAMEPLAY') {

        // 🔑 RECOGER LLAVE
        if (!hasKey && keyMesh && keyMesh.visible) {
            const distToKey = camera.position.distanceTo(keyWorldPosition);
            if (distToKey < 3.0) {
                const cameraDir = new THREE.Vector3();
                camera.getWorldDirection(cameraDir);
                const toKey = new THREE.Vector3().subVectors(keyWorldPosition, camera.position).normalize();
                if (cameraDir.dot(toKey) > 0.6) {
                    keyMesh.visible = false; 
                    hasKey = true;
                    inventoryCollect('key');
                    playSound('objeto'); 
                    ui.showSubtitle("Encontraste la llave del garaje", 4000); 
                    return;
                }
            }
        }

        // 🔋 BATERÍAS
        let batteryCollectedThisFrame = false;
        if (batteries.length > 0) {
            batteries.forEach((bat, index) => {
                if (!batteryCollectedThisFrame && bat.visible && !bat.userData.collected) {
                    const batWorldPos = new THREE.Vector3();
                    bat.getWorldPosition(batWorldPos);
                    const distToBat = camera.position.distanceTo(batWorldPos);
                    if (distToBat < 3.0) {
                        const cameraDir = new THREE.Vector3();
                        camera.getWorldDirection(cameraDir);
                        const toBat = new THREE.Vector3().subVectors(batWorldPos, camera.position).normalize();
                        const dotProduct = cameraDir.dot(toBat);
                        if (dotProduct > 0.6) { 
                            bat.visible = false; 
                            bat.userData.collected = true; 
                            batteriesCollected++;
                            batteryCollectedThisFrame = true;
                            inventorySetBatteries(batteriesCollected);
                            playSound('objeto'); 
                            ui.showSubtitle(`Fusible recogido (${batteriesCollected}/3)`, 2000);
                            if (batteriesCollected === 3) {
                                setTimeout(() => {
                                    ui.showSubtitle("Zare: 'Tengo los fusibles. Iré a la caja.'", 5000);
                                }, 2000);
                            }
                        }
                    }
                }
            });
        }
        if (batteryCollectedThisFrame) return;

        // 🔵 LÁMPARA UV — pickup
        if (!hasUVLamp && uvLampMesh && uvLampMesh.visible) {
            const lampPos = new THREE.Vector3();
            uvLampMesh.getWorldPosition(lampPos);
            if (camera.position.distanceTo(lampPos) < 2.0) {
                hasUVLamp = true;
                uvLampMesh.visible = false;
                inventoryCollect('uvlamp');
                playSound('objeto');
                ui.showSubtitle("Zare: '¿Una lámpara UV? ¿Qué hace esto aquí?'", 4000);
            }
        }

        const hit = getInteractTarget();
        const hitObject = hit ? hit.object : null;
        const hitDist = hit ? hit.distance : 999;

        let hitIsBook = false;
        let hitIsDoor = false;
        let hitNode = hitObject;
        while (hitNode) {
            if (hitNode.userData.isBook) hitIsBook = true;
            if (hitNode.userData.isDoor) hitIsDoor = true;
            hitNode = hitNode.parent;
        }

        // 🪨 PIEDRAS RITUALES — raycast propio con distancia mayor
        {
            const stoneRay = new THREE.Raycaster();
            stoneRay.setFromCamera(new THREE.Vector2(0, 0), camera);
            stoneRay.far = 3.5; // más generoso para objetos en el suelo
            const stoneHits = stoneRay.intersectObjects(collidableObjects, true);
            let hitStone = null;
            for (const h of stoneHits) {
                let node = h.object;
                while (node) {
                    if (node.userData.isRitualStone !== undefined) { hitStone = node; break; }
                    node = node.parent;
                }
                if (hitStone) break;
            }
            if (hitStone) {
                if (hitStone.userData.isRitualStone) {
                    isStoneOpen = true;
                    controls.unlock();
                    showStoneUI();
                } else {
                    ui.showSubtitle("Zare: 'Solo una piedra...'", 1500);
                }
                return;
            }
        }

        // 💻 LAPTOP
        if (laptopMesh && laptopWorldPosition.lengthSq() > 0) {
            const distToLaptop = camera.position.distanceTo(laptopWorldPosition);
            if (distToLaptop < 1.5 && hitDist < INTERACT_DISTANCE) {
                let node = hitObject;
                let esLaptop = false;
                while (node) {
                    if (node === laptopMesh) { esLaptop = true; break; }
                    node = node.parent;
                }
                if (esLaptop && !isLaptopOpen) {
                    isLaptopOpen = true;
                    controls.unlock();
                    toggleLaptopUI(true);
                    const exitBtn = document.getElementById('exitLaptopBtn');
                    if (exitBtn) {
                        exitBtn.onclick = () => {
                            toggleLaptopUI(false);
                            isLaptopOpen = false;
                            controls.lock();
                        };
                    }
                    return;
                }
            }
        }

        // 📖 LIBRO
        if (hitIsBook && !hitIsDoor) {
            const distToBook = bookWorldPosition && bookWorldPosition.lengthSq() > 0
                ? camera.position.distanceTo(bookWorldPosition)
                : 999;
            if (distToBook < 1.5 && !isBookOpen) {
                isBookOpen = true;
                toggleBookUI(true);
                playSound('objeto'); 
                controls.unlock(); 
            }
            return;
        }

        // 📞 SEGUNDA LLAMADA
        if (powerOutageCall && !powerOutageAnswered && phoneMesh && phoneMesh.userData.isRingingAgain && !finalCallTriggered) {
            stopSound('telefono');
            phoneMesh.userData.isRingingAgain = false; 
            powerOutageAnswered = true; 
            ui.showCall(true);
            playDialogueSequence(ui, DIALOGUES.CALL_2, () => {
                ui.showCall(false);
                ui.setMission("Ve a la caja de fusibles en el garaje");
            });
            return;
        }

        // 📞 TERCERA LLAMADA
        if (finalCallTriggered && !finalCallAnswered && phoneMesh && phoneMesh.userData.isRingingAgain) {
            stopSound('telefono');
            phoneMesh.userData.isRingingAgain = false; 
            finalCallAnswered = true; 
            ui.showCall(true);
            playDialogueSequence(ui, DIALOGUES.CALL_FINAL, () => {
                ui.showCall(false);
                ui.setMission("Escapa por la puerta principal");
            });
            return;
        }

        // ⚡ CAJA DE FUSIBLES
        if (fuseboxMesh && camera.position.distanceTo(CONFIG.POSITIONS.FUSEBOX) < 1.5 && checkLineOfSight(CONFIG.POSITIONS.FUSEBOX)) {
            if (fuseboxUsed) {
                ui.showSubtitle('La caja está quemada. Ya no funciona.', 3000);
                return;
            }
            if (batteriesCollected === 3) {
                if (!powerRestored) {
                    powerRestored = true;
                    ui.showSubtitle("SISTEMA REINICIADO", 3000);
                    playSound('zumbido_electrico'); 

                    houseLights.forEach(item => {
                        item.light.intensity = 1.5; 
                        if(item.mesh.material) {
                            item.mesh.material.emissive.setHex(0xffaa00);
                            item.mesh.material.emissiveIntensity = 1;
                        }
                    });
                    ambientLight.intensity = 0.05;

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
                        if (Math.random() > 0.7) playSound('chispazo'); 
                        if (Math.random() > 0.8) houseLights.forEach(item => { item.light.intensity = 0; });
                    }, 100); 

                    setTimeout(() => {
                        clearInterval(blackoutLoop); 
                        powerRestored = false;
                        fuseboxUsed   = true;  // sellada — no vuelve a activarse
                        houseLights.forEach(item => {
                            item.light.intensity = 0;
                            if(item.mesh.material) item.mesh.material.emissiveIntensity = 0;
                        });
                        ambientLight.intensity = 0;
                        stopSound('zumbido_electrico'); 
                        ui.showSubtitle("El sistema colapsó por completo...", 5000);
                        setTimeout(() => {
                            playSound('telefono');
                            finalCallTriggered = true;
                            if(phoneMesh) phoneMesh.userData.isRingingAgain = true;
                        }, 5000);
                    }, 15000); 
                }
            } else {
                ui.showSubtitle(`Faltan fusibles (${batteriesCollected}/3)`, 3000);
            }
            return;
        }

        // 🚪 PUERTAS Y CANDADOS
        const door = getHoveredDoor();
        if (door) {
            const dist = camera.position.distanceTo(door.position);
            if (dist > 2.5) return;
            
            const isGarageDoor = door.name.includes("Door_008") || door.name.includes("Door_08"); 
            const isMainDoor = door.name === "Door"; // puerta principal — nombre exacto
            console.log(`🚪 Puerta detectada: "${door.name}" | isMain: ${isMainDoor} | isGarage: ${isGarageDoor} | finalCallAnswered: ${finalCallAnswered}`);

            if (isMainDoor) {
                if (finalCallAnswered) { 
                    playSound('puerta_bloqueada'); 
                    ui.showSubtitle("Zare: '¡¿Un candado digital?! Daniel no instaló esto...'", 4000);
                    if (!isNumpadOpen) {
                        isNumpadOpen = true;
                        ui.clearMission();
                        controls.unlock();
                        toggleNumpadUI(true);
                        setTimeout(() => {
                            ui.setMission("Buscar el código para escapar");
                        }, 4000);
                    }
                    return;
                } else {
                    playSound('puerta_bloqueada'); 
                    ui.showSubtitle("Zare: 'Está lloviendo demasiado fuerte, no saldré ahora.'", 3000);
                    return;
                }
            }

            if (isGarageDoor && !door.userData.isOpen) {
                if (!hasKey) { 
                    playSound('puerta_bloqueada'); 
                    ui.showSubtitle("Zare: 'Maldición, tiene candado... necesito buscar la llave.'", 4000); 
                    setTimeout(() => {
                        ui.setMission("Buscar la llave del garaje");
                    }, 4000);
                    return; 
                } else { 
                    ui.showSubtitle("Abriendo con la llave...", 2000); 
                }
            }

            toggleDoor(door); 
            return;
        }
    }
};

input.actions.onMakerSpawn = () => {
    controls.unlock();
    const model = prompt("1: Fusibles, 2: Teléfono, 3: Batería, 4: Llave, 5: Laptop");
    if (model === "1") spawnModelForEditing('assets/models/caja_fusibles.glb');
    if (model === "2") spawnModelForEditing('assets/models/phone.glb');
    if (model === "3") spawnModelForEditing('assets/models/bateria_1.glb');
    if (model === "4") spawnModelForEditing('assets/models/llave.glb');
    if (model === "5") spawnModelForEditing('assets/models/laptop.glb'); 
};

// DEV: tecla B — toggle selección de uvBloodMark con TransformControls
let uvMarkEditing = false;
document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyB' || !uvBloodMark) return;
    if (!uvMarkEditing) {
        // Seleccionar
        uvMarkEditing = true;
        uvBloodMark.material.opacity = 0.8;
        uvBloodMark.scale.set(0.30, 0.30, 0.30); // restaurar scale correcto
        transformControls.attach(uvBloodMark);
        controls.unlock();
        console.log('🩸 uvBloodMark seleccionado. T=mover R=rotar. B para soltar.');
    } else {
        // Soltar
        uvMarkEditing = false;
        transformControls.detach();
        uvBloodMark.material.opacity = 0;
        console.log('🩸 uvBloodMark soltado.');
    }
});

input.actions.onInventory = () => { toggleInventory(); };
input.actions.onCamCapture = () => {
    console.log(`📷 POS: new THREE.Vector3(${camera.position.x.toFixed(3)}, ${camera.position.y.toFixed(3)}, ${camera.position.z.toFixed(3)})`);
    console.log(`📷 ROT: new THREE.Euler(${camera.rotation.x.toFixed(3)}, ${camera.rotation.y.toFixed(3)}, ${camera.rotation.z.toFixed(3)})`);
};

input.actions.onFlashlight = () => {
    if (gameState !== 'GAMEPLAY') return;

    // Ciclo: off → normal → UV (solo si tiene la lámpara) → off
    if (uvMode === 'off') {
        uvMode = 'normal';
        flashlight.color.setHex(0xffffff);
        flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY;
        setUVMarkVisible(false);
        inventorySetFlashlightMode('normal');
    } else if (uvMode === 'normal') {
        if (hasUVLamp) {
            uvMode = 'uv';
            flashlight.color.setHex(0x7B00FF);
            flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY * 0.8;
            setUVMarkVisible(true);
            setUVNotesVisible(true);
            inventorySetFlashlightMode('uv');
            // Primera vez que activa la UV — mostrar inventario brevemente
            showInventoryBriefly(2000);
        } else {
            // Sin lámpara UV — apagar directo
            uvMode = 'off';
            flashlight.intensity = 0;
            inventorySetFlashlightMode('off');
        }
    } else {
        uvMode = 'off';
        flashlight.color.setHex(0xffffff);
        flashlight.intensity = 0;
        setUVMarkVisible(false);
        setUVNotesVisible(false);
        inventorySetFlashlightMode('off');
    }
};
input.actions.onLightUp = () => { ambientLight.intensity += 0.05; };
input.actions.onLightDown = () => { ambientLight.intensity = Math.max(0, ambientLight.intensity - 0.05); };
input.actions.onFogUp = () => { scene.fog.density += 0.002; };
input.actions.onFogDown = () => { scene.fog.density = Math.max(0, scene.fog.density - 0.002); };

function triggerExplosion() { 
    createExplosionEffect(); let f=0; 
    const i = setInterval(() => { f++; explosionLight.intensity = f%2==0?200:0; if(f>10) { clearInterval(i); explosionLight.intensity=0; gameState='TRAVELING'; stateTimer=0; } }, 80); 
    // Apagar postes al explotar
    streetLights.forEach(item => { item.light.intensity = 0; item.mesh.material.emissiveIntensity = 0; });
}

// --- CERRAR INTERFACES CON Q o ESC ---
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // DEV: C — capturar posición y rotación de la cámara
    if (e.code === 'KeyC') {
        console.log(`📷 POS: new THREE.Vector3(${camera.position.x.toFixed(3)}, ${camera.position.y.toFixed(3)}, ${camera.position.z.toFixed(3)})`);
        console.log(`📷 ROT: new THREE.Euler(${camera.rotation.x.toFixed(3)}, ${camera.rotation.y.toFixed(3)}, ${camera.rotation.z.toFixed(3)})`);
    }

    // DEV: Skip animaciones con Shift+S
    if (e.shiftKey && key === 's') {
        camera.position.copy(CONFIG.POSITIONS.SPAWN);
        if (CONFIG.ROTATIONS.SPAWN) camera.rotation.copy(CONFIG.ROTATIONS.SPAWN);
        ambientLight.intensity = 0.0;
        flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY;
        gameState = 'GAMEPLAY';
        stateTimer = 0;
        ui.setWakeOpacity(0);
        ui.showCall(false);
        ui.showBlackScreen(false);
        controls.lock();
        playSound('respiracion');
        console.log('⚡ DEV: Skip a GAMEPLAY');
        return;
    }

    // DEV: Shift+E — skip a GAMEPLAY con todo listo para poner el código
    if (e.shiftKey && key === 'e') {
        camera.position.copy(CONFIG.POSITIONS.SPAWN);
        if (CONFIG.ROTATIONS.SPAWN) camera.rotation.copy(CONFIG.ROTATIONS.SPAWN);
        ambientLight.intensity = 0.0;
        flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY;
        gameState = 'GAMEPLAY';
        stateTimer = 0;
        hasKey = true;
        batteriesCollected = 3;
        powerOutageCall = true;
        powerOutageAnswered = true;
        finalCallTriggered = true;
        finalCallAnswered = true;  // puerta principal desbloqueada
        ui.setWakeOpacity(0);
        ui.showCall(false);
        ui.showBlackScreen(false);
        controls.lock();
        playSound('respiracion');
        console.log('⚡ DEV: Skip — ve a la puerta y pon el código');
        return;
    }

    // DEV: Shift+R — skip directo al ending (simula numpadSuccess)
    if (e.shiftKey && key === 'r') {
        hasKey = true;
        batteriesCollected = 3;
        finalCallTriggered = true;
        finalCallAnswered = true;
        flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY;
        playSound('respiracion');
        document.dispatchEvent(new Event('numpadSuccess'));
        console.log('⚡ DEV: Skip a ENDING');
        return;
    }

    if (key === 'q' || e.key === 'Escape') {
        if (isLaptopOpen) {
            toggleLaptopUI(false);
            isLaptopOpen = false;
            setTimeout(() => { controls.lock(); }, 10); 
        }
        if (isNumpadOpen) {
            toggleNumpadUI(false);
            isNumpadOpen = false;
            setTimeout(() => { controls.lock(); }, 10);
        }
        if (isBookOpen) { 
            toggleBookUI(false);
            isBookOpen = false;
            setTimeout(() => { 
                ui.showSubtitle("Zare: 'Tenía razón... esta casa está mal. Tengo que avisarle a Daniel.'", 5000);
            }, 500); 
            setTimeout(() => { controls.lock(); }, 10);
        }
        if (isStoneOpen) {
            hideStoneUI();
            isStoneOpen = false;
            setTimeout(() => { controls.lock(); }, 10);
        }
    }
});

animate();