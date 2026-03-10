import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera, transformControls } from '../core/world.js'; 
import { CONFIG } from '../config.js'; 
import { playSound } from '../core/audio.js';

export let keyWorldPosition    = new THREE.Vector3();
export let bookWorldPosition   = new THREE.Vector3();
export let collidableObjects   = [];
export let phoneMesh, fuseboxMesh, keyMesh, laptopMesh;
export let batteries           = [];
export let houseLights         = [];
export let laptopWorldPosition = new THREE.Vector3();

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
                const bulbLight = new THREE.PointLight(0xffaa00, 0, 10);
                child.add(bulbLight);
                if (child.material) {
                    child.material.emissive?.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
                houseLights.push({ light: bulbLight, mesh: child });
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

