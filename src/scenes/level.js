import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera, transformControls } from '../core/world.js'; 
import { CONFIG } from '../data/config.js'; 
import { playSound } from '../core/audio.js';

export let keyWorldPosition    = new THREE.Vector3();
export let bookWorldPosition   = new THREE.Vector3();
export let collidableObjects   = [];
export let phoneMesh, fuseboxMesh, keyMesh, laptopMesh;
export let batteries           = [];
export let houseLights         = [];
export let streetLights        = [];
export let laptopWorldPosition = new THREE.Vector3();
export let uvLampMesh          = null;   // pickup lámpara UV
export let uvBloodMark         = null;   // marca "4" en el baño (solo visible con UV)

let doors = [];
const loader = new GLTFLoader();

// ─────────────────────────────────────────────────────────────────────────────
// COLLIDERS AUTOMÁTICOS
//
// En vez de adivinar coordenadas desde el archivo GLB (que falla porque
// Three.js aplica rotaciones/escalas negativas de forma diferente),
// esperamos a que el modelo esté cargado en escena y le pedimos a Three.js
// que calcule el bounding box REAL de cada mueble problemático.
//
// Así la caja siempre queda perfecta sin importar rotación ni escala.
// ─────────────────────────────────────────────────────────────────────────────

// Nombres de nodos del GLB que necesitan collider invisible
// (objetos sólidos que el raycast de player.js no detecta bien)
const NEEDS_COLLIDER = [
    'Kitchen', 'Kitchen_01', 'Stove',
    'bed_01', 'bed_02', 'bed_03',
    'Armchair_15.001', 'Armchair_17.001', 'Armchair_19.002',
    'Wardrobe', 'Wardrobe_01',
    'Refrigerator.001',
    'Washing_machine',
    'Table', 'Table_18', 'Table_35', 'Table_41',
    'bathtub',
];

// DEBUG: pon en true para ver las cajas en wireframe rojo
const DEBUG_COLLIDERS = false;

function buildColliderForNode(node) {
    node.updateWorldMatrix(true, true);

    // Usar solo la geometría del mesh directo del nodo, NO sus hijos
    // (los hijos pueden ser objetos decorativos que inflan el bounding box)
    let targetMesh = null;
    if (node.isMesh) {
        targetMesh = node;
    } else {
        // Buscar el primer mesh hijo directo
        node.traverse((child) => {
            if (!targetMesh && child.isMesh) targetMesh = child;
        });
    }
    if (!targetMesh || !targetMesh.geometry) return;

    // Calcular bounding box en espacio LOCAL y transformar al mundo manualmente
    targetMesh.geometry.computeBoundingBox();
    const localBox = targetMesh.geometry.boundingBox.clone();

    // Transformar los 8 vértices de la caja al espacio mundo
    const mat = targetMesh.matrixWorld;
    const corners = [
        new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.min.z),
        new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.min.z),
        new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.min.z),
        new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.min.z),
        new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.max.z),
        new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.max.z),
        new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.max.z),
        new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.max.z),
    ];
    const worldBox = new THREE.Box3();
    for (const c of corners) worldBox.expandByPoint(c.applyMatrix4(mat));

    if (worldBox.isEmpty()) return;
    const size   = new THREE.Vector3();
    const center = new THREE.Vector3();
    worldBox.getSize(size);
    worldBox.getCenter(center);
    if (size.x < 0.05 || size.z < 0.05) return;

    const vizMat = DEBUG_COLLIDERS
        ? new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        : new THREE.MeshBasicMaterial({ visible: false });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), vizMat);
    mesh.name = 'col_' + node.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    mesh.position.copy(center);
    scene.add(mesh);
    collidableObjects.push(mesh);

    if (DEBUG_COLLIDERS) {
        console.log(`📦 ${mesh.name} center=(${center.x.toFixed(2)},${center.y.toFixed(2)},${center.z.toFixed(2)}) size=(${size.x.toFixed(2)},${size.y.toFixed(2)},${size.z.toFixed(2)})`);
    }
}

export function initLevel() {
    loadHouse();
    loadPhone();
    loadFuseBox();
    loadBatteries();
    loadKey();
    loadLaptop();
    loadRitualStone();
}

// ─── Piedras rituales cerca del lago ─────────────────────────────────────────
// Una tiene el número 9 grabado en la parte inferior (stoneUI.js)
// Las otras dos son decorativas (falsas)
export let ritualStoneMesh = null; // la piedra correcta — main.js la usa para interacción

// Material de roca compartido — se roba del GLB de la casa en loadHouse()
export let houseRockMaterial = null;

// Meshes de las piedras — se guardan para aplicarles el material
// cuando loadHouse() ya tenga el material de roca disponible
const ritualStoneMeshes = [];

function applyRockMaterial(root) {
    root.traverse((child) => {
        if (!child.isMesh) return;
        if (houseRockMaterial) {
            child.material = houseRockMaterial.clone();
            // NearestFilter = mismo efecto retro/pixelado que las rocas de la casa
            if (child.material.map) {
                child.material.map.minFilter = THREE.NearestFilter;
                child.material.map.magFilter = THREE.NearestFilter;
                child.material.map.needsUpdate = true;
            }
        } else {
            // Fallback si algo falla
            child.material = new THREE.MeshStandardMaterial({
                color: 0x6a6560, roughness: 0.92, metalness: 0.04,
            });
        }
    });
}

// Llamada desde loadHouse() una vez que ya tiene el material
export function applyRockMaterialToStones() {
    ritualStoneMeshes.forEach(root => applyRockMaterial(root));
}

function loadRitualStone() {
    const models  = ['roca_3.glb', 'roca.glb', 'roca_2.glb'];
    const isReals = [true, false, false];

    const stoneDefs = models.map((model, i) => ({
        model,
        pos:    CONFIG.POSITIONS.RITUAL_STONES[i].toArray(),
        scale:  CONFIG.SCALES.RITUAL_STONES[i].toArray(),
        rotY:   CONFIG.ROTATIONS.RITUAL_STONES[i],
        isReal: isReals[i],
    }));

    stoneDefs.forEach(def => {
        loader.load(`assets/models/${def.model}`, (gltf) => {
            const root = gltf.scene;
            root.scale.set(...def.scale);
            root.position.set(...def.pos);
            root.rotation.y = def.rotY;
            root.name = def.isReal ? 'ritual_stone_real' : 'ritual_stone_fake';
            root.userData.isRitualStone = def.isReal;

            root.traverse((child) => {
                if (!child.isMesh) return;
                child.castShadow    = true;
                child.receiveShadow = true;
                child.name          = root.name;
                child.userData.isRitualStone = def.isReal;
            });

            // Guardar referencia para aplicar material después
            ritualStoneMeshes.push(root);

            scene.add(root);
            collidableObjects.push(root);
            if (def.isReal) ritualStoneMesh = root;
        });
    });
}

function loadHouse() {
    loader.load('assets/models/House interior.glb', (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        model.traverse((child) => {
            if (!child.isMesh) return;
            const n = child.name.toLowerCase();

            if (child.name === 'Book_02') {
                child.visible = false;
                child.position.set(0, -100, 0);
                return;
            }

            if (n.includes('books_005')) {
                child.userData.isBook = true;
                if (child.parent) child.parent.userData.isBook = true;
                child.getWorldPosition(bookWorldPosition);
            }

            // Capturar material de roca — solo del mesh "Rocks" del GLB de la casa
            // Evitar agua, background y otros falsos positivos
            if (!houseRockMaterial && n === 'rocks' && child.material && !child.material.transparent) {
                houseRockMaterial = child.material.clone();
                applyRockMaterialToStones();
            }

            if (n.includes('tv') || n.includes('television') || n.includes('pantalla')) {
                if (child.material) {
                    child.material.emissive?.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.color.setHex(0x050505);
                }
            }

            child.castShadow = true;
            const isFoliage = n.includes('tree') || n.includes('plant') ||
                              n.includes('nature') || n.includes('bush');

            // AGUA — material semitransparente azul oscuro
            if (n.includes('water')) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x1a3a4a,
                    transparent: true,
                    opacity: 0.75,
                    roughness: 0.0,
                    metalness: 0.3,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                });
                child.receiveShadow = false;
                child.castShadow   = false;
                return;
            }

            if (n.includes('glass') || n.includes('window') || n.includes('cristal')) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x000000, transparent: true, opacity: 0.25,
                    roughness: 0.1, metalness: 0.6, depthWrite: false, side: THREE.DoubleSide,
                });
                child.receiveShadow = child.castShadow = false;
            } else if (child.material) {
                child.material.side = THREE.DoubleSide;
                if (isFoliage) {
                    child.material.alphaTest   = 0.2;
                    child.material.transparent = false;
                    child.receiveShadow        = false;
                    child.material.depthWrite  = true;
                    child.material.needsUpdate = true;
                } else {
                    child.receiveShadow        = true;
                    child.material.transparent = false;
                    child.material.depthWrite  = true;
                    child.material.opacity     = 1.0;
                }
                if (child.material.emissive &&
                    !child.name.includes('Focus') &&
                    child.material.name !== 'mat15') {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
                if (child.material.map) {
                    child.material.map.minFilter = THREE.NearestFilter;
                    child.material.map.magFilter = THREE.NearestFilter;
                }
            }

            if (child.name.includes('Focus')) {
                // Obtener posición mundo del foco DESPUÉS de que el modelo esté en escena
                child.updateWorldMatrix(true, false);
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);

                // Bajar la luz ~0.6u para que salga del cristal, no del socket del techo
                worldPos.y -= 0.6;

                const bulbLight = new THREE.PointLight(0xffaa00, 0, 10);
                bulbLight.position.copy(worldPos);
                scene.add(bulbLight); // a la escena directamente, NO como hijo del mesh

                if (child.material) {
                    child.material = child.material.clone();
                    child.material.emissive?.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
                houseLights.push({ light: bulbLight, mesh: child });
            }

            // Focos de los postes de calle — SOLO los 4 visibles para no bajar FPS
            // El origen de estos meshes está en el suelo (y≈-0.16), así que
            // usamos la X/Z del mesh pero forzamos Y=6.5 donde está el cristal real
            const STREET_LAMP_NAMES = ['Lamppost_3', 'Lamppost009_3', 'Lamppost001_3', 'Lamppost010_3'];
            if (STREET_LAMP_NAMES.includes(child.name)) {
                child.updateWorldMatrix(true, false);
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);

                const poleLight = new THREE.PointLight(0xffcc44, 0, 60);
                poleLight.castShadow = false;
                // X y Z del mesh, Y fijo a 6.5 (altura real del cristal del poste)
                poleLight.position.set(worldPos.x, 6.5, worldPos.z);
                scene.add(poleLight);

                if (child.material) {
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color(0xffcc44);
                    child.material.emissiveIntensity = 0; // apagado al inicio
                }
                streetLights.push({ light: poleLight, mesh: child });
            }

            if (child.name.includes('Door') && !n.includes('frame')) {
                child.userData.isOpen = false;
                child.userData.isDoor = true;
                doors.push(child);
            }

            collidableObjects.push(child);
        });

        // ── Construir colliders DESPUÉS de que el modelo está en escena ──────
        // Ahora Three.js ya tiene las matrices mundo calculadas correctamente
        model.traverse((node) => {
            if (NEEDS_COLLIDER.includes(node.name)) {
                buildColliderForNode(node);
            }
        });

        // Debug: si no encontró el material de roca, loguearlo
        if (!houseRockMaterial) {
            console.warn('⚠️ No se encontró material "Rocks" — buscando alternativa...');
            model.traverse((child) => {
                if (houseRockMaterial) return;
                if (!child.isMesh || !child.material || child.material.transparent) return;
                const n = child.name.toLowerCase();
                if (n.includes('rock')) {
                    houseRockMaterial = child.material.clone();
                    console.log('✅ Material roca encontrado en:', child.name);
                    applyRockMaterialToStones();
                }
            });
        }
        console.log('🏠 Casa lista.');
    });
}

function loadLaptop() {
    loader.load('assets/models/laptop.glb', (gltf) => {
        laptopMesh = gltf.scene;
        laptopMesh.position.copy(CONFIG.POSITIONS.LAPTOP);
        laptopMesh.rotation.copy(CONFIG.ROTATIONS.LAPTOP);
        laptopMesh.scale.copy(CONFIG.SCALES.LAPTOP);
        laptopWorldPosition.copy(CONFIG.POSITIONS.LAPTOP);
        laptopMesh.traverse((child) => {
            if (child.isMesh && child.material?.name === 'mat15') {
                child.material = child.material.clone();
                child.material.emissive.setHex(0x002288);
                child.material.emissiveIntensity = 0.5;
            }
        });
        scene.add(laptopMesh);
        collidableObjects.push(laptopMesh);
    }, undefined, (err) => {
        console.error('❌ Error al cargar laptop.glb:', err);
    });
}

function loadPhone() {
    loader.load('assets/models/phone.glb', (gltf) => {
        phoneMesh = gltf.scene;
        phoneMesh.position.copy(CONFIG.POSITIONS.PHONE);
        phoneMesh.rotation.copy(CONFIG.ROTATIONS.PHONE);
        phoneMesh.scale.set(0.15, 0.15, 0.15);
        scene.add(phoneMesh);
        const pLight = new THREE.PointLight(0x0088ff, 2, 3);
        pLight.position.set(0, 0.2, 0);
        phoneMesh.add(pLight);
    });
}

function loadFuseBox() {
    loader.load('assets/models/caja_fusibles.glb', (gltf) => {
        fuseboxMesh = gltf.scene;
        fuseboxMesh.position.copy(CONFIG.POSITIONS.FUSEBOX);
        if (CONFIG.ROTATIONS.FUSEBOX) fuseboxMesh.rotation.copy(CONFIG.ROTATIONS.FUSEBOX);
        if (CONFIG.SCALES?.FUSEBOX)   fuseboxMesh.scale.copy(CONFIG.SCALES.FUSEBOX);
        scene.add(fuseboxMesh);
        collidableObjects.push(fuseboxMesh);
    });
}

function loadBatteries() {
    (CONFIG.POSITIONS.BATTERIES || []).forEach((pos, i) => {
        loader.load(`assets/models/bateria_${i + 1}.glb`, (gltf) => {
            const b = gltf.scene;
            b.position.copy(pos);
            if (CONFIG.ROTATIONS.BATTERIES?.[i]) b.rotation.copy(CONFIG.ROTATIONS.BATTERIES[i]);
            b.scale.copy(CONFIG.SCALES.BATTERIES?.[i] ?? new THREE.Vector3(0.2, 0.2, 0.2));
            b.userData = { id: i, type: 'battery', collected: false };
            scene.add(b);
            batteries.push(b);
        });
    });
}

function loadKey() {
    loader.load('assets/models/llave.glb', (gltf) => {
        keyMesh = gltf.scene;
        keyMesh.scale.copy(CONFIG.SCALES.KEY);
        keyMesh.position.copy(CONFIG.POSITIONS.KEY);
        keyMesh.rotation.set(Math.PI / 2, 0, 0);
        keyWorldPosition.copy(CONFIG.POSITIONS.KEY);
        keyMesh.userData = { isKey: true };
        collidableObjects.push(keyMesh);
        scene.add(keyMesh);
    }, undefined, () => {
        keyMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        keyMesh.position.copy(CONFIG.POSITIONS.KEY);
        keyWorldPosition.copy(CONFIG.POSITIONS.KEY);
        keyMesh.userData = { isKey: true };
        collidableObjects.push(keyMesh);
        scene.add(keyMesh);
    });
}

export function getHoveredDoor() {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = ray.intersectObjects(collidableObjects, true);
    if (hits.length > 0) {
        let t = hits[0].object;
        while (t.parent && !doors.includes(t)) t = t.parent;
        if (doors.includes(t)) return t;
    }
    return null;
}

export function toggleDoor(door) {
    if (!door) return;
    door.rotation.y += (Math.PI / 2) * (door.userData.isOpen ? -1 : 1);
    door.userData.isOpen = !door.userData.isOpen;
    playSound(door.userData.isOpen ? 'puerta_abierta' : 'puerta_cerrada');
}

export function pickupPhone() {
    if (phoneMesh) phoneMesh.visible = false;
}

export function spawnModelForEditing(path) {
    loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.position.copy(camera.position)
             .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
        model.scale.set(0.3, 0.3, 0.3);
        scene.add(model);
        transformControls.attach(model);
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// LÁMPARA UV — objeto procedural en el cuarto de Zare
// ─────────────────────────────────────────────────────────────────────────────
export function loadUVLamp() {
    const group = new THREE.Group();

    // Cuerpo negro alargado — tamaño realista de linterna pequeña
    const bodyGeo  = new THREE.CylinderGeometry(0.055, 0.048, 0.38, 10);
    const bodyMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.5 });
    const body     = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Cabeza morada UV
    const headGeo  = new THREE.CylinderGeometry(0.072, 0.055, 0.07, 10);
    const headMat  = new THREE.MeshStandardMaterial({
        color: 0x3a0066,
        emissive: 0x220044,
        emissiveIntensity: 0.25, // sutil, no grita "recógeme"
        roughness: 0.4,
        metalness: 0.7,
    });
    const head     = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.22;
    group.add(head);

    // Cristal lente
    const lensGeo  = new THREE.CylinderGeometry(0.060, 0.060, 0.012, 10);
    const lensMat  = new THREE.MeshStandardMaterial({
        color: 0x5500aa, roughness: 0.1, metalness: 0.2,
        transparent: true, opacity: 0.80,
    });
    const lens     = new THREE.Mesh(lensGeo, lensMat);
    lens.position.y = 0.258;
    group.add(lens);

    // Anillo de agarre plateado
    const ringGeo  = new THREE.TorusGeometry(0.058, 0.010, 6, 14);
    const ringMat  = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.85, roughness: 0.25 });
    const ring     = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.08;
    group.add(ring);

    // Tapa trasera
    const capGeo   = new THREE.SphereGeometry(0.048, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap      = new THREE.Mesh(capGeo, bodyMat);
    cap.rotation.x = Math.PI;
    cap.position.y = -0.19;
    group.add(cap);

    // Sin luz propia — que no llame la atención

    group.position.copy(CONFIG.POSITIONS.UV_LAMP);
    group.rotation.copy(CONFIG.ROTATIONS.UV_LAMP);
    group.scale.copy(CONFIG.SCALES.UV_LAMP);
    group.name = 'uv_lamp_pickup';
    group.userData.isUVLamp = true;

    // Animación sutil de flotación — se actualiza en el loop
    group.userData.floatOffset = 0;
    group.userData.baseY = CONFIG.POSITIONS.UV_LAMP.y;

    scene.add(group);
    uvLampMesh = group;

    // Exportar referencia mutable
    return group;
}

// Animación de flotación — llamar desde el game loop
export function animateUVLamp(delta) {
    // Sin animación — objeto estático, discreto
}

// ─────────────────────────────────────────────────────────────────────────────
// MARCA UV — "4" en sangre en la pared del baño
// Solo visible cuando la UV está activa (se controla desde main.js)
// ─────────────────────────────────────────────────────────────────────────────
export function loadUVBloodMark() {
    // Textura canvas: "4" en rojo sangre seco
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');

    // Fondo transparente
    ctx.clearRect(0, 0, 512, 512);

    // "4" en sangre seca — capas para simular pincel irregular
    // Rotar canvas 90° para que el "4" quede vertical en la pared
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-256, -256);
    ctx.font = 'bold 320px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Capa base oscura
    ctx.fillStyle = 'rgba(80, 0, 0, 0.92)';
    ctx.fillText('4', 258, 262);

    // Capa media rojo oscuro
    ctx.fillStyle = 'rgba(130, 15, 10, 0.75)';
    ctx.fillText('4', 255, 258);
    ctx.restore();

    // Gotas / manchas irregulares
    for (let i = 0; i < 12; i++) {
        const x = 200 + Math.random() * 120;
        const y = 150 + Math.random() * 220;
        const r = 4 + Math.random() * 14;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${100 + Math.random()*40}, ${Math.random()*10}, 0, ${0.4 + Math.random()*0.4})`;
        ctx.fill();
    }

    // Reguero sutil hacia abajo
    ctx.strokeStyle = 'rgba(100, 5, 0, 0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
        const x = 220 + Math.random() * 80;
        ctx.beginPath();
        ctx.moveTo(x, 340 + Math.random() * 30);
        ctx.lineTo(x + (Math.random()-0.5)*20, 420 + Math.random() * 40);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;

    const geo = new THREE.PlaneGeometry(0.55, 0.55);
    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,          // invisible hasta UV activa
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    const mark = new THREE.Mesh(geo, mat);

    // Pared derecha del baño — posición final ajustada con editor
    mark.position.set(8.10, 5.77, -7.87);
    mark.rotation.set(-Math.PI, 0.04, 0.04);
    mark.scale.set(3.65, 5.17, 5.85);
    mark.name = 'uv_blood_mark';
    mark.userData.isUVMark = true;

    scene.add(mark);
    uvBloodMark = mark;
    return mark;
}

// Activar/desactivar visibilidad de la marca UV
export function setUVMarkVisible(visible) {
    if (!uvBloodMark) return;
    const target = visible ? 0.92 : 0;
    // Fade suave
    const start  = uvBloodMark.material.opacity;
    const steps  = 20;
    let   i      = 0;
    const iv = setInterval(() => {
        i++;
        uvBloodMark.material.opacity = start + (target - start) * (i / steps);
        if (i >= steps) clearInterval(iv);
    }, 16);
}