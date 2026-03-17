import * as THREE from 'three';
import { CONFIG } from './data/config.js';
import { InputManager } from './core/input.js';
import { initWorld, scene, camera, renderer, controls, transformControls } from './core/world.js';
import { initLights, flashlight, explosionLight, ambientLight } from './scenes/lights.js';
import { initLevel, phoneMesh, pickupPhone, getHoveredDoor, toggleDoor, batteries, keyMesh, collidableObjects, fuseboxMesh, houseLights, streetLights, laptopMesh, laptopWorldPosition, bookWorldPosition, keyWorldPosition, uvLampMesh, loadUVLamp, loadUVBloodMark, setUVMarkVisible, collectableNotes, loadCollectableNotes, setCollectableNotesVisible, doors } from './scenes/level.js';
import { initInventoryUI, toggleInventory, inventoryCollect, inventorySetBatteries, inventorySetFlashlightMode, inventoryHasItem, showInventoryBriefly, collectNote, isInventoryOpen, closeInventory } from './ui/inventoryUI.js';
import { updatePlayer, debugInfo, moveWithCollision, getWall, getFloor, getGroundY } from './core/player.js'; 
import { initUI, ui, updateSubtitle } from './ui/ui.js';            
import { initLaptop, toggleLaptopUI } from './ui/laptopUI.js'; 
import { initNumpad, toggleNumpadUI } from './ui/numpadUI.js'; 
import { initBook, toggleBookUI } from './ui/bookUI.js'; 
import { initStoneUI, showStoneUI, hideStoneUI } from './ui/stoneUI.js';
import { createRain, animateRain, createExplosionEffect, animateExplosion } from './effects/particles.js';
import { initAudio, playSound, stopSound, updateRainVolume, sounds } from './core/audio.js';
import { DIALOGUES, playDialogueSequence, updateDialogues, stopDialogues } from './data/dialogues.js';
import { initShadow, updateShadow, triggerScreamer, initDistantShadows, updateDistantShadows, dismissShadow, showShadow, startGarageApproach, stopGarageApproach, startAmbientShadows, updateAmbientShadows, debugSpawnNearestAmbient } from './effects/screamer.js';
import { showCredits } from './effects/credits.js';
import { showSplash } from './effects/splash.js';
import { initFuseboxUI, toggleFuseboxUI, insertFuseInSlot } from './ui/fuseboxui.js';
import { initPauseUI, showPause, hidePause, isPaused } from './ui/pauseUI.js';
import { initEnding } from './scenes/ending.js';

initWorld(); 
initLights();
// Flag global para que Electron sepa cuándo re-capturar el pointer lock
window._gameNeedsPointerLock = false;
document.addEventListener('pointerlockchange', () => {
    window._gameNeedsPointerLock = !!document.pointerLockElement;
}); 
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
loadCollectableNotes();
initShadow();
initDistantShadows();
initFuseboxUI();
initPauseUI({
    onContinue: () => {
        // pauseUI.js ya reanudó los sonidos correctos en resumeAllSounds()
        // NO tocar aquí — de lo contrario jumpscare, telefono y one-shots se
        // dispararían al despausar aunque no corresponda.
        clock.getDelta(); // descartar delta acumulado durante la pausa
        setTimeout(() => controls.lock(), 10);
    },
    onRestart:  () => location.reload(),
    onMainMenu: () => location.reload(),
});

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
let doorHintShown = false;    // hint [E] INTERACTUAR en primera puerta
let tutorialShown = false;    
let powerOutageCall = false;      
let powerOutageAnswered = false;  
let powerRestored = false;
let fuseboxUsed   = false;  // true después del colapso — nunca vuelve a activarse
let isLaptopOpen = false;
let isNumpadOpen = false;
let numpadDialogShown = false; // diálogo de Zare al cerrar el numpad — solo una vez
let isBookOpen = false; 
let isStoneOpen = false;
let isFuseboxOpen = false;
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
        gameState = 'INTRO';
        stateTimer = 0;
        showSplash(() => {
            ui.setWakeOpacity(1);
            gameState = 'WAKING_UP';
            stateTimer = 0;
            playSound('lluvia');
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
    });
}

renderer.domElement.addEventListener('click', () => {
    if ((gameState === 'PHONE_RINGING' || gameState === 'GAMEPLAY') && !controls.isLocked && !isLaptopOpen && !isNumpadOpen && !isBookOpen && !isStoneOpen && !isFuseboxOpen) controls.lock();
    if ((gameState === 'ENDING_OUTSIDE' || gameState === 'ENDING_WAKE') && !controls.isLocked) {
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

    // Congelar lógica del juego mientras está pausado
    if (isPaused()) {
        renderer.render(scene, camera);
        return;
    }

    animateRain();
    animateExplosion(delta);
    updateShadow(delta);
    updateDistantShadows(delta);
    updateAmbientShadows(delta);
    if (scene.userData.endingUpdate) scene.userData.endingUpdate(delta);

    updateRainVolume(camera.position.x > CONFIG.ENV.NO_RAIN_BOX.MIN.x && camera.position.x < CONFIG.ENV.NO_RAIN_BOX.MAX.x);
    updateDialogues(delta);  // avanza SOLO cuando el loop está activo (no pausado)
    updateSubtitle(delta);   // oculta el subtítulo usando delta — se congela al pausar

    // Fondo animado del menú — paneo lento y atmosférico
    if (gameState === 'START') {
        camera.rotation.y -= delta * 0.008; // giro muy lento
    }

    // Intro cinemática — cámara orbita alrededor de la casa
    if (gameState === 'INTRO') {
        stateTimer += delta;
        const angle = -0.654 + stateTimer * 0.06; // muy lento
        const radius = 22;
        camera.position.x = Math.sin(angle) * radius;
        camera.position.z = Math.cos(angle) * radius;
        camera.position.y = 8;
        camera.lookAt(0, 2, 0);
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
        if (progress >= 1.0) { gameState = 'PHONE_RINGING'; ui.setWakeOpacity(0); ui.showInteract(true, 'CONTESTAR'); playSound('telefono'); }
    }

    // Movimiento directo para ENDING_WAKE y ENDING_OUTSIDE
    // Evita por completo InputManager y PointerLock — pero sí respeta colisiones
    if (gameState === 'ENDING_WAKE' || gameState === 'ENDING_OUTSIDE') {
        const spd = 1.4 * delta;
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

    if ((gameState === 'PHONE_RINGING' || gameState === 'IN_CALL' || gameState === 'GAMEPLAY')) {
        if ((controls.isLocked || input.keys.flyMode) && !isLaptopOpen && !isNumpadOpen && !isBookOpen && !isStoneOpen && !isFuseboxOpen && !isPaused() && !transformControls.dragging) updatePlayer(delta, input);
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

        // Hint [E] INTERACTUAR al acercarse a la primera puerta
        if (!doorHintShown) {
            const nearDoor = getHoveredDoor();
            if (nearDoor && camera.position.distanceTo(nearDoor.position) < 2.5) {
                ui.showInteract(true, 'INTERACTUAR');
                doorHintShown = true;
                setTimeout(() => { ui.showInteract(false); }, 3000);
            }
        }

        // Hint [E] RECOGER al acercarse a una nota — solo con UV activa
        {
            let nearNote = null;
            if (uvMode === 'uv' && collectableNotes) {
                for (const note of collectableNotes) {
                    if (note.userData.collected || !note.visible) continue;
                    const np = new THREE.Vector3();
                    note.getWorldPosition(np);
                    if (camera.position.distanceTo(np) < 2.2) {
                        const camDir = new THREE.Vector3();
                        camera.getWorldDirection(camDir);
                        const toNote = new THREE.Vector3().subVectors(np, camera.position).normalize();
                        if (camDir.dot(toNote) > 0.4) { nearNote = note; break; }
                    }
                }
            }
            if (nearNote) {
                ui.showInteract(true, 'RECOGER');
            } else {
                const el = document.getElementById('interact-msg');
                if (el && el.classList.contains('visible')) {
                    const keyEl = document.getElementById('interact-key');
                    if (keyEl && keyEl.textContent.includes('RECOGER')) {
                        ui.showInteract(false);
                    }
                }
            }
        }
        
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
                                ui.setMission("Ve a la caja de fusibles en el garaje");
                                setTimeout(() => {
                                    ui.showSubtitle("Zare: 'Tengo los fusibles. Iré a la caja.'", 5000);
                                }, 2000);
                            } else {
                                ui.setMission(`Buscar los fusibles (${batteriesCollected}/3)`);
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

        // 📞 SEGUNDA LLAMADA — tiene prioridad sobre pickups cercanos
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

        // 📄 NOTAS FÍSICAS — solo visibles y recogibles con UV activa
        if (uvMode === 'uv' && collectableNotes && collectableNotes.length > 0) {
            for (const note of collectableNotes) {
                if (note.userData.collected) continue;
                const notePos = new THREE.Vector3();
                note.getWorldPosition(notePos);
                const dist = camera.position.distanceTo(notePos);
                if (dist < 2.2) {
                    const camDir = new THREE.Vector3();
                    camera.getWorldDirection(camDir);
                    const toNote = new THREE.Vector3().subVectors(notePos, camera.position).normalize();
                    if (camDir.dot(toNote) > 0.45) {
                        note.userData.collected = true;
                        note.visible = false;
                        playSound('objeto');
                        collectNote(
                            note.userData.noteId,
                            note.userData.noteTitle,
                            note.userData.noteFoundAt,
                            note.userData.noteBody
                        );
                        return;
                    }
                }
            }
        }


        let hitIsBook = false;
        let hitIsDoor = false;
        let hitNode = hitObject;
        while (hitNode) {
            if (hitNode.userData.isBook) hitIsBook = true;
            if (hitNode.userData.isDoor) hitIsDoor = true;
            hitNode = hitNode.parent;
        }

        // 🪨 PIEDRAS RITUALES — detección por proximidad + raycast
        {
            // Primero buscar por proximidad directa a cada piedra
            // Esto resuelve el problema de apuntar exactamente a geometría pequeña
            let hitStone = null;
            let closestDist = 2.8; // distancia máxima de interacción

            // Buscar en collidableObjects las piedras rituales
            for (const obj of collidableObjects) {
                if (obj.userData.isRitualStone === undefined) continue;
                const stonePos = new THREE.Vector3();
                obj.getWorldPosition(stonePos);
                const dist = camera.position.distanceTo(stonePos);
                if (dist < closestDist) {
                    // Verificar que la cámara mire aproximadamente hacia la piedra
                    const camDir = new THREE.Vector3();
                    camera.getWorldDirection(camDir);
                    const toStone = new THREE.Vector3().subVectors(stonePos, camera.position).normalize();
                    if (camDir.dot(toStone) > 0.4) { // ángulo generoso ~66°
                        closestDist = dist;
                        hitStone = obj;
                    }
                }
            }

            // Fallback: raycast con distancia generosa
            if (!hitStone) {
                const stoneRay = new THREE.Raycaster();
                stoneRay.setFromCamera(new THREE.Vector2(0, 0), camera);
                stoneRay.far = 3.0;
                const stoneHits = stoneRay.intersectObjects(collidableObjects, true);
                for (const h of stoneHits) {
                    let node = h.object;
                    while (node) {
                        if (node.userData.isRitualStone !== undefined) { hitStone = node; break; }
                        node = node.parent;
                    }
                    if (hitStone) break;
                }
            }

            if (hitStone) {
                if (hitStone.userData.isRitualStone) {
                    isStoneOpen = true;
                    controls.unlock();
                    showStoneUI();
                } else {
                    // Mensajes variados para las piedras falsas
                    const fakeMsgs = [
                        "Zare: 'Solo una piedra...'",
                        "Zare: 'Esta no es...'",
                        "Zare: 'No, esta no tiene nada.'"
                    ];
                    const msg = fakeMsgs[Math.floor(Math.random() * fakeMsgs.length)];
                    ui.showSubtitle(msg, 2000);
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

        // ⚡ CAJA DE FUSIBLES
        if (fuseboxMesh && camera.position.distanceTo(CONFIG.POSITIONS.FUSEBOX) < 1.5 && checkLineOfSight(CONFIG.POSITIONS.FUSEBOX)) {
            if (fuseboxUsed) {
                ui.showSubtitle('La caja está quemada. Ya no funciona.', 3000);
                return;
            }
            // Abrir modal de la caja
            if (!isFuseboxOpen) {
                isFuseboxOpen = true;
                controls.unlock();
                toggleFuseboxUI(true, batteriesCollected);
            }
            return;
        }

        // 🚪 PUERTAS Y CANDADOS
        const door = getHoveredDoor();
        if (door) {
            const dist = camera.position.distanceTo(door.position);
            if (dist > 2.5) return;
            
            // Usar flags semánticos seteados en level.js — inmunes a variaciones del nombre GLB
            const isGarageDoor  = !!door.userData.isGarageDoor;
            const isGarage2Door = !!door.userData.isGarage2Door;
            const isMainDoor    = !!door.userData.isMainDoor;
            const isClosetDoor  = !!door.userData.isClosetDoor;
            const isHallwayDoor = !!door.userData.isHallwayDoor;


            if (isMainDoor) {
                if (finalCallAnswered) { 
                    playSound('puerta_bloqueada'); 
                    if (!isNumpadOpen) {
                        isNumpadOpen = true;
                        ui.clearMission();
                        controls.unlock();
                        toggleNumpadUI(true);
                    }
                    return;
                } else {
                    playSound('puerta_bloqueada'); 
                    ui.showSubtitle("Zare: 'Está lloviendo demasiado fuerte, no saldré ahora.'", 3000);
                    return;
                }
            }

            // Door_008 = puerta del garaje interior — requiere llave
            // Garage_Door = puerta de los carros — se abre libre
            if (isGarage2Door && !door.userData.isOpen) {
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
            if (isClosetDoor)  setTimeout(() => dismissShadow('closet'),  350);
            if (isHallwayDoor) setTimeout(() => dismissShadow('hallway'), 500);
            if (isGarage2Door) setTimeout(() => dismissShadow('patio'),   5000); // Door_008 — patio
            return;
        }
    }
};





input.actions.onInventory = () => {
    toggleInventory();
    if (isInventoryOpen()) controls.unlock();
    else setTimeout(() => { controls.lock(); }, 10);
};


input.actions.onFlashlight = () => {
    if (gameState !== 'GAMEPLAY') return;

    // Ciclo: off → normal → UV (solo si tiene la lámpara) → off
    if (uvMode === 'off') {
        uvMode = 'normal';
        flashlight.color.setHex(0xffffff);
        flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY;
        setUVMarkVisible(false);
        setCollectableNotesVisible(false);
        inventorySetFlashlightMode('normal');
    } else if (uvMode === 'normal') {
        if (hasUVLamp) {
            uvMode = 'uv';
            flashlight.color.setHex(0x7B00FF);
            flashlight.intensity = CONFIG.ENV.FLASHLIGHT_INTENSITY * 0.8;
            setUVMarkVisible(true);
            setCollectableNotesVisible(true);
            inventorySetFlashlightMode('uv');
            showInventoryBriefly(2000);
        } else {
            uvMode = 'off';
            flashlight.intensity = 0;
            setCollectableNotesVisible(false);
            inventorySetFlashlightMode('off');
        }
    } else {
        uvMode = 'off';
        flashlight.color.setHex(0xffffff);
        flashlight.intensity = 0;
        setUVMarkVisible(false);
        setCollectableNotesVisible(false);
        inventorySetFlashlightMode('off');
    }
};


function triggerExplosion() { 
    createExplosionEffect(); let f=0; 
    const i = setInterval(() => { f++; explosionLight.intensity = f%2==0?200:0; if(f>10) { clearInterval(i); explosionLight.intensity=0; gameState='TRAVELING'; stateTimer=0; } }, 80); 
    // Apagar postes al explotar
    streetLights.forEach(item => { item.light.intensity = 0; item.mesh.material.emissiveIntensity = 0; });
}

// --- CERRAR INTERFACES CON Q o ESC ---
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Tecla P — toggle pausa durante GAMEPLAY
    const pauseableStates = ['GAMEPLAY', 'IN_CALL', 'ENDING_CINEMATIC', 'ENDING_WAKE', 'ENDING_OUTSIDE'];
    if (e.code === 'KeyP' && pauseableStates.includes(gameState) && !isLaptopOpen && !isNumpadOpen && !isBookOpen && !isStoneOpen && !isFuseboxOpen) {
        if (isPaused()) {
            hidePause();
        } else {
            controls.unlock();
            showPause();
        }
        return;
    }

    if (key === 'q' || e.key === 'Escape') {
        // ESC cierra la pausa si está abierta
        if (isPaused()) {
            hidePause();
            return;
        }
        if (isInventoryOpen()) {
            closeInventory();
            setTimeout(() => { controls.lock(); }, 10);
        }
        if (isLaptopOpen) {
            toggleLaptopUI(false);
            isLaptopOpen = false;
            setTimeout(() => { controls.lock(); }, 10); 
        }
        if (isNumpadOpen) {
            toggleNumpadUI(false);
            isNumpadOpen = false;
            setTimeout(() => { controls.lock(); }, 10);
            // Solo la primera vez que cierra el numpad — Zare reacciona
            if (!numpadDialogShown) {
                numpadDialogShown = true;
                setTimeout(() => {
                    ui.showSubtitle("Zare: '¡¿Un candado digital?! Daniel no instaló esto...'", 4000);
                    setTimeout(() => { ui.setMission("Buscar el código para escapar"); }, 4000);
                }, 300);
            }
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
        if (isFuseboxOpen) {
            toggleFuseboxUI(false);
            isFuseboxOpen = false;
            setTimeout(() => { controls.lock(); }, 10);
        }
    }
});

// ⚡ Activar fusebox desde el modal
document.addEventListener('fuseboxActivate', () => {
    isFuseboxOpen = false;
    if (batteriesCollected < 3) {
        ui.showSubtitle(`Faltan fusibles (${batteriesCollected}/3)`, 3000);
        setTimeout(() => controls.lock(), 10);
        return;
    }
    if (powerRestored || fuseboxUsed) return;

    setTimeout(() => controls.lock(), 10);
    powerRestored = true;
    ui.showSubtitle("SISTEMA REINICIADO", 3000);
    playSound('zumbido_electrico');

    houseLights.forEach(item => {
        item.light.intensity = 1.5;
        if (item.mesh.material) {
            item.mesh.material.emissive.setHex(0xffaa00);
            item.mesh.material.emissiveIntensity = 1;
        }
    });
    ambientLight.intensity = 0.05;

    showShadow('garage');
    setTimeout(() => startGarageApproach(), 2000);
    setTimeout(() => ui.showSubtitle("Entidad: '...Zare...'", 3000), 4000);

    const blackoutLoop = setInterval(() => {
        houseLights.forEach(item => {
            if (Math.random() > 0.5) {
                item.light.intensity = Math.random() * 2;
                if (item.mesh.material) item.mesh.material.emissiveIntensity = 1;
            } else {
                item.light.intensity = 0;
                if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
            }
        });
        if (Math.random() > 0.7) playSound('chispazo');
        if (Math.random() > 0.8) houseLights.forEach(item => { item.light.intensity = 0; });
    }, 100);

    setTimeout(() => {
        clearInterval(blackoutLoop);
        powerRestored = false;
        fuseboxUsed = true;
        houseLights.forEach(item => {
            item.light.intensity = 0;
            if (item.mesh.material) item.mesh.material.emissiveIntensity = 0;
        });
        ambientLight.intensity = 0;
        stopSound('zumbido_electrico');
        ui.showSubtitle("El sistema colapsó por completo...", 5000);
        stopGarageApproach();
        dismissShadow('garage');
        dismissShadow('closet');
        startAmbientShadows();
        setTimeout(() => {
            playSound('telefono');
            finalCallTriggered = true;
            if (phoneMesh) phoneMesh.userData.isRingingAgain = true;
        }, 5000);
    }, 15000);
});

// Pausa — detectar cuando el pointer lock se suelta durante GAMEPLAY
document.addEventListener('fuseSlotFilled', () => {
    // No hace falta cambiar batteriesCollected — ya los tiene recolectados
    // Solo actualizamos el dataset para que los clicks siguientes sepan cuántos quedan
    const el = document.getElementById('fuseboxUI');
    if (el) el.dataset.available = batteriesCollected;
});

// Intro — cuando el negro desaparece, encender luces para ver la casa
document.addEventListener('splashRevealScene', () => {
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
    playSound('lluvia');
});

animate();
// ─────────────────────────────────────────────────────────────────────────────
//  EDITOR DE NOTAS — solo para posicionar, quitar antes de producción
//  KeyC  → captura posición de cámara
//  KeyN  → spawna plano de nota frente a la cámara y lo selecciona
//  T     → modo mover   (TransformControls)
//  R     → modo rotar
//  KeyP  → imprime coords exactas listas para copiar
//  KeyO  → deselecciona / elimina el preview
// ─────────────────────────────────────────────────────────────────────────────
let _noteEditorObj = null;

document.addEventListener('keydown', (editorEvt) => {
    // Shift+C — saltar directo a los créditos (DEV)
    if (editorEvt.shiftKey && editorEvt.code === 'KeyC') {
        showCredits();
        return;
    }

    if (editorEvt.code === 'KeyC') {
        const p = camera.position;
        const r = camera.rotation;
        console.log(`📷 CAM  pos(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})  rotY(${r.y.toFixed(3)})`);
        return;
    }

    if (editorEvt.code === 'KeyN') {
        const geo = new THREE.PlaneGeometry(0.18, 0.22);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffee88, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        mesh.position.copy(camera.position).addScaledVector(fwd, 1.2);
        mesh.position.y -= 0.1;
        mesh.rotation.y = camera.rotation.y;
        mesh.name = 'note_editor_preview';
        scene.add(mesh);
        _noteEditorObj = mesh;
        controls.unlock();
        transformControls.attach(mesh);
        transformControls.setMode('translate');
        console.log('%c📄 NOTA spawneada — T=mover  R=rotar  P=copiar coords  O=soltar', 'color:#ffee88;font-weight:bold;');
        return;
    }

    if (editorEvt.code === 'KeyT' && _noteEditorObj) { transformControls.setMode('translate'); return; }
    if (editorEvt.code === 'KeyR' && _noteEditorObj) { transformControls.setMode('rotate');    return; }

    if (editorEvt.code === 'KeyP' && _noteEditorObj) {
        const p = _noteEditorObj.position;
        const r = _noteEditorObj.rotation;
        console.log('%c📋 COORDENADAS LISTAS:', 'color:#00ff88;font-weight:bold;font-size:14px;');
        console.log(`%c  pos: ${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}  rotY: ${r.y.toFixed(3)}`, 'color:#aaffaa;font-family:monospace;font-size:13px;');
        console.log(`%c  createCollectableNote('id', 'Título', 'Encontrado en...', \`texto\`,\n    ${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}, ${r.y.toFixed(3)});`, 'color:#88ffcc;font-family:monospace;');
        return;
    }

    // KeyX — forzar spawn de sombra ambient en el spot más cercano (testing)
    if (editorEvt.code === 'KeyX') {
        debugSpawnNearestAmbient();
        return;
    }

    // KeyZ — listar todas las puertas con nombre y posición (editor)
    if (editorEvt.code === 'KeyZ') {
        if (doors.length === 0) {
            console.log('%c🚪 No hay puertas cargadas todavía.', 'color:#ff8888;');
            return;
        }
        console.log('%c🚪 PUERTAS DEL NIVEL:', 'color:#88ccff;font-weight:bold;font-size:14px;');
        doors.forEach((door, i) => {
            const p = door.position;
            const worldPos = new THREE.Vector3();
            door.getWorldPosition(worldPos);
            const dist = camera.position.distanceTo(worldPos);
            const isNear = dist < 3.0 ? '👈 CERCA' : '';
            console.log(
                `%c  [${i}] "${door.name}"  pos(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})  dist: ${dist.toFixed(1)}m  ${isNear}`,
                dist < 3.0 ? 'color:#ffff88;font-family:monospace;' : 'color:#888888;font-family:monospace;'
            );
        });
        return;
    }

    if (editorEvt.code === 'KeyO') {
        transformControls.detach();
        if (_noteEditorObj) { scene.remove(_noteEditorObj); _noteEditorObj = null; }
        controls.lock();
        console.log('📄 Editor soltado.');
        return;
    }
});