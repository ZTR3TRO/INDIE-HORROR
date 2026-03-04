import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ==========================================
// 1. CONFIGURACIÓN
// ==========================================

// A. COORDENADAS DE HISTORIA (Tus datos)
const BED_POS = new THREE.Vector3(3.87, 4.45, -1.01);     // Acostado
const SIT_POS = new THREE.Vector3(4.55, 5.08, -0.67);     // Sentado
const PHONE_POS = new THREE.Vector3(3.80, 4.66, -0.06);   // Ubicación del teléfono

// B. COORDENADAS DEL EVENTO (EXPLOSIÓN)
const VIEW_POS = new THREE.Vector3(-1.85, 11.35, 38.80);
const VIEW_ROT = new THREE.Euler(-2.87, 0.96, 2.92);
const EXPLOSION_POS = new THREE.Vector3(-14.21, 8.22, 50.96);

// C. GAMEPLAY (SPAWN)
const SPAWN_POS = new THREE.Vector3(6.16, 5.77, -1.17);
const SPAWN_ROT = new THREE.Euler(0, -1.57, 0); 

// D. CAJA ANTI-LLUVIA (INVISIBLE)
const NO_RAIN_MIN = new THREE.Vector3(-10, -5, -15); 
const NO_RAIN_MAX = new THREE.Vector3(20, 20, 15);   

// AJUSTES DE JUGADOR
const PLAYER_HEIGHT = 1.6; 
const PLAYER_WIDTH = 0.2; 
const WALK_SPEED = 2.5;    
const RUN_SPEED = 5.0;     
// AJUSTES DE VUELO
const FLY_SPEED_SLOW = 2.0;  // Modo Lento (Precisión)
const FLY_SPEED_FAST = 15.0; // Modo Turbo
const GRAVITY = 25.0;      

// VARIABLES GLOBALES
let scene, camera, renderer, controls;
let ambientLight, flashlight, explosionLight, phoneLight;
let rainSystem, explosionSystem; 
let phoneMesh; // El cubo teléfono
const clock = new THREE.Clock();
let velocity = new THREE.Vector3(); 
let collidableObjects = []; 
let doors = []; 

// ESTADOS
// START -> WAKING_UP -> PHONE_RINGING -> IN_CALL -> TIME_JUMP -> PRE_EXPLOSION -> EXPLODING -> TRAVELING -> GAMEPLAY
let gameState = 'START'; 
let stateTimer = 0;
const WAKE_DURATION = 4.0; 
const CALL_DURATION = 5.0;
const EXPLOSION_DELAY = 2.0; 
const TRAVEL_DURATION = 8.0; 

// INPUT
const interactRaycaster = new THREE.Raycaster();
const floorRaycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false; // Nuevos para volar
let isRunning = false;
let isFlying = false; 

// SONIDO
const soundExplosion = new Audio('explosion.mp3'); 

function init() {
    createUI(); 
    createDebugOverlay();
    
    const startBtn = document.getElementById('startBtn');
    const menu = document.getElementById('menu');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if(menu) menu.style.display = 'none';
            // ¡AQUÍ ESTABA EL ERROR ANTES! Ahora sí iniciamos despertar:
            startAwakeningSequence(); 
        });
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); 
    scene.fog = new THREE.Fog(0x000000, 0.5, 25); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // POSICIÓN INICIAL (EN LA CAMA)
    camera.position.copy(BED_POS);
    camera.rotation.set(-Math.PI/2, 0, 0); // Mirando al techo

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    createCrosshair();

    controls = new PointerLockControls(camera, renderer.domElement);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    // LUCES
    ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Muy oscuro
    scene.add(ambientLight);

    explosionLight = new THREE.PointLight(0x0088ff, 0, 100); 
    explosionLight.position.copy(EXPLOSION_POS);
    scene.add(explosionLight);

    // LUZ DE CELULAR (Tenue 0.55)
    flashlight = new THREE.SpotLight(0xffffff, 0, 60, Math.PI/3, 0.8); 
    flashlight.position.set(0, -0.3, 0.2); 
    camera.add(flashlight);
    flashlight.target.position.set(0, 0, -3);
    camera.add(flashlight.target);
    scene.add(camera);

    createPhonePlaceholder(); // Crear teléfono
    createRain(); 
    loadLevel(); 
    animate();
}

// ------------------------------------------
// 2. SISTEMAS DE CINE (Despertar y Teléfono)
// ------------------------------------------
function createPhonePlaceholder() {
    const geometry = new THREE.BoxGeometry(0.15, 0.02, 0.25);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        emissive: 0x0044ff, 
        emissiveIntensity: 0.0 
    });
    phoneMesh = new THREE.Mesh(geometry, material);
    phoneMesh.position.copy(PHONE_POS);
    phoneMesh.rotation.y = 0.5;
    scene.add(phoneMesh);

    phoneLight = new THREE.PointLight(0x0044ff, 0, 3);
    phoneLight.position.set(0, 0.2, 0);
    phoneMesh.add(phoneLight);
}

function startAwakeningSequence() {
    console.log("🛌 Despertando...");
    gameState = 'WAKING_UP';
    stateTimer = 0;
    // El teléfono empieza a sonar (luz parpadeante)
    if(phoneMesh) phoneMesh.material.emissiveIntensity = 0.8;
    if(phoneLight) phoneLight.intensity = 2.0;
}

function createUI() {
    // Texto de Interacción
    const interactMsg = document.createElement('div');
    interactMsg.id = 'interactMsg';
    interactMsg.style.position = 'absolute';
    interactMsg.style.top = '60%'; interactMsg.style.left = '50%';
    interactMsg.style.transform = 'translate(-50%, -50%)';
    interactMsg.style.color = 'white';
    interactMsg.style.fontFamily = 'monospace';
    interactMsg.style.fontSize = '20px';
    interactMsg.style.textShadow = '0 0 5px blue';
    interactMsg.style.display = 'none';
    interactMsg.innerText = "[ E ] CONTESTAR";
    document.body.appendChild(interactMsg);

    // Pantalla de Llamada
    const callScreen = document.createElement('div');
    callScreen.id = 'callScreen';
    callScreen.style.position = 'absolute';
    callScreen.style.top = '20px'; callScreen.style.right = '20px';
    callScreen.style.backgroundColor = 'rgba(0, 50, 0, 0.8)';
    callScreen.style.padding = '20px';
    callScreen.style.border = '2px solid #00ff00';
    callScreen.style.borderRadius = '10px';
    callScreen.style.display = 'none';
    callScreen.style.fontFamily = 'monospace';
    callScreen.style.color = '#00ff00';
    callScreen.innerHTML = `<strong>LLAMADA EN CURSO</strong><br><span style="font-size: 24px">AMOR ❤️</span>`;
    document.body.appendChild(callScreen);

    // Pantalla Negra Transición
    const blackScreen = document.createElement('div');
    blackScreen.id = 'blackScreen';
    blackScreen.style.position = 'absolute';
    blackScreen.style.top = '0'; blackScreen.style.left = '0';
    blackScreen.style.width = '100%'; blackScreen.style.height = '100%';
    blackScreen.style.backgroundColor = 'black';
    blackScreen.style.display = 'none';
    blackScreen.style.justifyContent = 'center';
    blackScreen.style.alignItems = 'center';
    blackScreen.style.zIndex = '10002';
    blackScreen.innerHTML = `<h1 style="color:white; font-family: Courier New">30 MINUTOS DESPUÉS...</h1>`;
    document.body.appendChild(blackScreen);
    
    // Pantalla Despertar final
    const wakeDiv = document.createElement('div');
    wakeDiv.id = 'wakeScreen';
    wakeDiv.style.position = 'absolute';
    wakeDiv.style.top = '0'; wakeDiv.style.left = '0';
    wakeDiv.style.width = '100%'; wakeDiv.style.height = '100%';
    wakeDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; 
    wakeDiv.style.display = 'none'; 
    wakeDiv.style.justifyContent = 'center';
    wakeDiv.style.alignItems = 'center';
    wakeDiv.style.zIndex = '10000';
    wakeDiv.style.cursor = 'pointer';
    wakeDiv.innerHTML = `<h2 style="color:white; font-family:monospace;">[ CLICK PARA DESPERTAR ]</h2>`;
    document.body.appendChild(wakeDiv);
    wakeDiv.addEventListener('click', () => {
        wakeDiv.style.display = 'none';
        startGameplay(); 
    });
}

// ------------------------------------------
// 3. LOOP PRINCIPAL
// ------------------------------------------
function animate() {
    requestAnimationFrame(animate);
    
    let delta = clock.getDelta();
    if (delta > 0.05) delta = 0.05; 

    animateRain();
    if(explosionSystem) animateExplosion(delta);

    // --- SECUENCIA DE CINE ---
    
    // 1. DESPERTAR
    if (gameState === 'WAKING_UP') {
        stateTimer += delta;
        const progress = Math.min(stateTimer / WAKE_DURATION, 1.0);
        const t = (1 - Math.cos(progress * Math.PI)) / 2; // Easing suave

        // Mover cámara de la cama a sentado
        camera.position.lerpVectors(BED_POS, SIT_POS, t);
        
        // Rotar para mirar al teléfono
        const startQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0)); 
        const dummy = new THREE.Object3D();
        dummy.position.copy(SIT_POS);
        dummy.lookAt(PHONE_POS); // <--- ESTO ASEGURA QUE MIRE AL TELÉFONO
        const targetQ = dummy.quaternion;
        
        camera.quaternion.slerpQuaternions(startQ, targetQ, t);

        // Vibración visual del teléfono
        if (phoneMesh) phoneMesh.rotation.z = Math.sin(stateTimer * 20) * 0.1;

        if (progress >= 1.0) {
            gameState = 'PHONE_RINGING';
            document.getElementById('interactMsg').style.display = 'block';
        }
        renderer.render(scene, camera);
        return;
    }

    // 2. SONANDO (Esperando input 'E')
    if (gameState === 'PHONE_RINGING') {
        if (phoneMesh) phoneMesh.rotation.z = Math.sin(Date.now() * 0.02) * 0.1;
        renderer.render(scene, camera);
        return;
    }

    // 3. EN LLAMADA
    if (gameState === 'IN_CALL') {
        stateTimer += delta;
        if (stateTimer > CALL_DURATION) {
            document.getElementById('callScreen').style.display = 'none';
            const bs = document.getElementById('blackScreen');
            bs.style.display = 'flex'; 
            
            // Apagar teléfono
            if(phoneLight) phoneLight.intensity = 0;
            if(phoneMesh) phoneMesh.material.emissiveIntensity = 0;
            
            gameState = 'TIME_JUMP';
            stateTimer = 0;
        }
        renderer.render(scene, camera);
        return;
    }

    // 4. SALTO DE TIEMPO
    if (gameState === 'TIME_JUMP') {
        stateTimer += delta;
        if (stateTimer > 4.0) {
            document.getElementById('blackScreen').style.display = 'none';
            camera.position.copy(VIEW_POS);
            camera.rotation.copy(VIEW_ROT);
            gameState = 'PRE_EXPLOSION';
            stateTimer = 0;
            ambientLight.intensity = 0.2; 
        }
        return; // Pantalla negra
    }

    // 5. SECUENCIA VENTANA (Explosión)
    if (gameState === 'PRE_EXPLOSION') {
        stateTimer += delta;
        if (stateTimer > EXPLOSION_DELAY) triggerExplosionLogic();
        renderer.render(scene, camera);
        return;
    }
    
    // 6. VIAJE DE REGRESO
    if (gameState === 'TRAVELING') {
        stateTimer += delta;
        const progress = Math.min(stateTimer / TRAVEL_DURATION, 1.0);
        const t = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

        camera.position.lerpVectors(VIEW_POS, SPAWN_POS, t);
        const startQ = new THREE.Quaternion().setFromEuler(VIEW_ROT);
        const endQ = new THREE.Quaternion().setFromEuler(SPAWN_ROT);
        camera.quaternion.slerpQuaternions(startQ, endQ, t);

        if (progress >= 1.0) showWakeUpScreen();
        renderer.render(scene, camera);
        return;
    }

    // 7. PANTALLA CLICK
    if (gameState === 'WAKE_UP_FINAL') { // (Nombre interno para la pantalla de click)
        renderer.render(scene, camera);
        return;
    }

    // 8. GAMEPLAY + VUELO
    if (gameState === 'GAMEPLAY' && controls.isLocked) {
        
        if (isFlying) {
            // --- NUEVA LÓGICA DE VUELO ---
            
            // 1. Determinar velocidad (Shift = Rápido, Sin Shift = Lento)
            const speed = isRunning ? FLY_SPEED_FAST : FLY_SPEED_SLOW;

            // 2. Fricción para suavidad
            velocity.x -= velocity.x * 5.0 * delta;
            velocity.z -= velocity.z * 5.0 * delta;
            velocity.y -= velocity.y * 5.0 * delta;

            // 3. Dirección Horizontal (WASD)
            const forward = new THREE.Vector3();
            const right = new THREE.Vector3();
            camera.getWorldDirection(forward);
            right.crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

            if (moveForward) velocity.add(forward.multiplyScalar(speed * delta * 10));
            if (moveBackward) velocity.sub(forward.multiplyScalar(speed * delta * 10));
            if (moveRight) velocity.add(right.multiplyScalar(speed * delta * 10));
            if (moveLeft) velocity.sub(right.multiplyScalar(speed * delta * 10));

            // 4. Dirección Vertical (Espacio/Ctrl)
            if (moveUp) velocity.y += speed * delta * 10;
            if (moveDown) velocity.y -= speed * delta * 10;

            // 5. Aplicar Movimiento
            camera.position.add(velocity.clone().multiplyScalar(delta));

        } else {
            // --- MODO CAMINAR (NORMAL) ---
            if (!checkGround()) velocity.y -= GRAVITY * delta;
            else velocity.y = Math.max(0, velocity.y);

            const speed = isRunning ? RUN_SPEED : WALK_SPEED;
            const forward = new THREE.Vector3();
            const right = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.y = 0; forward.normalize();
            right.crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

            const moveVec = new THREE.Vector3();
            if (moveForward) moveVec.add(forward);
            if (moveBackward) moveVec.sub(forward);
            if (moveRight) moveVec.add(right);
            if (moveLeft) moveVec.sub(right);
            moveVec.normalize().multiplyScalar(speed * delta);

            const oldX = camera.position.x;
            camera.position.x += moveVec.x;
            if (checkWallCollision()) camera.position.x = oldX;
            const oldZ = camera.position.z;
            camera.position.z += moveVec.z;
            if (checkWallCollision()) camera.position.z = oldZ;
            
            camera.position.y += velocity.y * delta;
        }

        if (camera.position.y < -20) {
            velocity.set(0,0,0);
            camera.position.copy(SPAWN_POS); 
        }
        renderer.render(scene, camera);
        return;
    }
    
    renderer.render(scene, camera);
}

// ------------------------------------------
// 4. INPUTS MEJORADOS
// ------------------------------------------
function onKeyDown(event) {
    // INTERACCIÓN CON EL TELÉFONO
    if (gameState === 'PHONE_RINGING' && event.code === 'KeyE') {
        document.getElementById('interactMsg').style.display = 'none';
        document.getElementById('callScreen').style.display = 'block';
        gameState = 'IN_CALL';
        stateTimer = 0;
        return;
    }

    if (gameState !== 'GAMEPLAY') return; 

    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        
        // VUELO VERTICAL
        case 'Space': moveUp = true; break;
        case 'ControlLeft': moveDown = true; break;
        case 'ShiftLeft': isRunning = true; break; // Turbo en vuelo
        
        case 'KeyV': 
            isFlying = !isFlying; velocity.set(0,0,0);
            console.log(isFlying ? "👻 Vuelo ON" : "🚶 Caminar ON");
            break;
        case 'KeyF': 
            if (flashlight.intensity > 0) flashlight.intensity = 0;
            else flashlight.intensity = 0.55; 
            break;
        case 'KeyE': interactWithDoor(); break;
    }
}

function onKeyUp(event) {
    if (gameState !== 'GAMEPLAY') return;
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'Space': moveUp = false; break;
        case 'ControlLeft': moveDown = false; break;
        case 'ShiftLeft': isRunning = false; break;
    }
}

// ------------------------------------------
// 5. HELPERS
// ------------------------------------------
function showWakeUpScreen() {
    gameState = 'WAKE_UP_FINAL';
    const wakeDiv = document.getElementById('wakeScreen');
    if(wakeDiv) wakeDiv.style.display = 'flex';
}

function startGameplay() {
    console.log("🎮 JUEGO INICIADO");
    gameState = 'GAMEPLAY';
    camera.position.copy(SPAWN_POS);
    velocity.set(0,0,0);
    ambientLight.intensity = 0.01; 
    scene.background = new THREE.Color(0x000000);
    scene.fog.density = 0.5; 
    flashlight.intensity = 0; 
    controls.lock();
    
    // Mensaje ayuda
    const help = document.createElement('div');
    help.innerText = "Presiona [F] para usar el celular";
    help.style.position = 'absolute';
    help.style.bottom = '20px';
    help.style.width = '100%';
    help.style.textAlign = 'center';
    help.style.color = 'white';
    help.style.fontFamily = 'monospace';
    document.body.appendChild(help);
    setTimeout(() => help.remove(), 4000);
}

function createDebugOverlay() {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '10px'; div.style.left = '10px';
    div.style.color = '#00ff00'; div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px'; div.style.backgroundColor = 'rgba(0,0,0,0.5)';
    div.style.padding = '5px'; div.style.pointerEvents = 'none'; div.style.zIndex = '10001';
    div.innerHTML = `[V] Volar | [Espacio] Subir | [Ctrl] Bajar | [Shift] Rápido | [F] Luz | [E] Usar`;
    document.body.appendChild(div);
}

// Funciones de lluvia, explosión, colisiones (Sin cambios, solo copiadas)
function createRain() {
    const rainCount = 5000; const geometry = new THREE.BufferGeometry(); const positions = [];
    for(let i=0; i<rainCount; i++) {
        const x = Math.random() * 100 - 50; const y = Math.random() * 50; const z = Math.random() * 100 - 50;
        positions.push(x, y, z); positions.push(x, y - 0.6, z);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.3 });
    rainSystem = new THREE.LineSegments(geometry, material);
    scene.add(rainSystem);
}
function animateRain() {
    if (!rainSystem) return;
    rainSystem.visible = true; 
    const positions = rainSystem.geometry.attributes.position.array;
    for(let i=1; i<positions.length; i+=3) { 
        positions[i] -= 0.9; 
        const x = positions[i-1], y = positions[i], z = positions[i+1];
        const insideBox = (x > NO_RAIN_MIN.x && x < NO_RAIN_MAX.x && y > NO_RAIN_MIN.y && y < NO_RAIN_MAX.y && z > NO_RAIN_MIN.z && z < NO_RAIN_MAX.z);
        if (y < -5 || insideBox) positions[i] = 40; 
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;
}
function triggerExplosionLogic() {
    gameState = 'EXPLODING';
    console.log("💥 BOOM!");
    soundExplosion.play().catch(()=>{});
    createExplosionEffect(); 
    let flashes = 0;
    const flashInterval = setInterval(() => {
        flashes++;
        if (flashes % 2 === 0) { explosionLight.intensity = 200; scene.background = new THREE.Color(0x001144); } 
        else { explosionLight.intensity = 0; scene.background = new THREE.Color(0x000000); }
        camera.position.x = VIEW_POS.x + (Math.random() - 0.5) * 0.5;
        camera.position.y = VIEW_POS.y + (Math.random() - 0.5) * 0.5;
        if (flashes > 10) { clearInterval(flashInterval); explosionLight.intensity = 0; scene.background = new THREE.Color(0x050505); ambientLight.intensity = 0.2; gameState = 'TRAVELING'; }
    }, 80);
}
function createExplosionEffect() {
    const particleCount = 200; const geometry = new THREE.BufferGeometry(); const positions = []; const velocities = []; const colors = [];
    const color1 = new THREE.Color(0xffaa00); const color2 = new THREE.Color(0x00aaff); 
    for (let i = 0; i < particleCount; i++) {
        positions.push(EXPLOSION_POS.x, EXPLOSION_POS.y, EXPLOSION_POS.z);
        const vX = (Math.random() - 0.5) * 15; const vY = (Math.random() - 0.5) * 15; const vZ = (Math.random() - 0.5) * 15;
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
function animateExplosion(delta) {
    if (!explosionSystem) return;
    const positions = explosionSystem.geometry.attributes.position.array; const velocities = explosionSystem.geometry.userData.velocities; const material = explosionSystem.material;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * delta; positions[i+1] += velocities[i+1] * delta; positions[i+2] += velocities[i+2] * delta; velocities[i+1] -= 9.8 * delta * 0.5; 
    }
    explosionSystem.geometry.attributes.position.needsUpdate = true; material.opacity -= delta * 0.5; 
    if (material.opacity <= 0) { scene.remove(explosionSystem); explosionSystem = null; }
}
function interactWithDoor() {
    interactRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    interactRaycaster.far = 2.5; 
    const intersects = interactRaycaster.intersectObjects(collidableObjects, true);
    if (intersects.length > 0) {
        let target = intersects[0].object;
        while (target.parent && !doors.includes(target)) { target = target.parent; } 
        if (doors.includes(target)) {
            if (!target.userData.isOpen) { target.rotation.y += Math.PI / 2; target.userData.isOpen = true; }
            else { target.rotation.y -= Math.PI / 2; target.userData.isOpen = false; }
        }
    }
}
function checkWallCollision() {
    if(collidableObjects.length === 0) return false;
    const directions = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
    const origin = camera.position.clone(); origin.y -= (PLAYER_HEIGHT / 2); 
    const wallRay = new THREE.Raycaster(); wallRay.far = PLAYER_WIDTH; 
    for (let dir of directions) {
        wallRay.set(origin, dir);
        if (wallRay.intersectObjects(collidableObjects, true).length > 0) return true;
    }
    return false;
}
function checkGround() {
    floorRaycaster.set(camera.position, new THREE.Vector3(0, -1, 0)); floorRaycaster.far = PLAYER_HEIGHT + 0.1; 
    const hits = floorRaycaster.intersectObjects(collidableObjects, true);
    if (hits.length > 0) { camera.position.y = hits[0].point.y + PLAYER_HEIGHT; return true; }
    return false;
}
function loadLevel() {
    const loader = new GLTFLoader();
    loader.load('House interior.glb', (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true; 
                child.receiveShadow = true;
                
                if(child.material) {
                    child.material.side = THREE.DoubleSide;
                    // --- CORRECCIÓN DE LA SOMBRA AQUÍ ---
                    child.material.alphaTest = 0.5; 
                }
                
                if (child.name.includes("Door") && !child.name.toLowerCase().includes("frame")) {
                    child.userData = { isOpen: false }; doors.push(child);
                }
                collidableObjects.push(child);
            }
        });
        scene.add(model);
    });
}
function createCrosshair() {
    const ch = document.createElement('div'); ch.id = 'crosshair'; 
    ch.style.position = 'absolute'; ch.style.top = '50%'; ch.style.left = '50%';
    ch.style.width = '4px'; ch.style.height = '4px';
    ch.style.backgroundColor = 'white'; ch.style.opacity = '0.3'; ch.style.borderRadius = '50%';
    ch.style.transform = 'translate(-50%, -50%)'; ch.style.zIndex = '1000'; ch.style.pointerEvents = 'none';
    document.body.appendChild(ch);
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();