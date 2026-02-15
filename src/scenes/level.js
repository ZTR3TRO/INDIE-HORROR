import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// 👇 Rutas corregidas con '../'
import { scene, camera, transformControls } from '../core/world.js'; 
import { CONFIG } from '../config.js'; 

export let collidableObjects = [];
let doors = []; 

// Variables exportadas para usarlas en Main.js
export let phoneMesh, handPhoneMesh, fuseboxMesh, keyMesh;
export let batteries = []; 

const loader = new GLTFLoader();

export function initLevel() {
    loadHouse();
    loadPhone(); 
    loadFuseBox(); 
    loadBatteries(); 
    loadKey(); // 🔑 Nueva función para la llave
    loadHandPhone(); 
}

function loadHouse() {
    loader.load('assets/models/House interior.glb', (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) child.material.side = THREE.DoubleSide;
                
                // Detectar puertas
                if (child.name.includes("Door") && !child.name.toLowerCase().includes("frame")) {
                    child.userData = { isOpen: false, isDoor: true }; 
                    doors.push(child);
                }
                collidableObjects.push(child);
            }
        });
        console.log("🏠 Casa cargada");
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

function loadHandPhone() {
    loader.load('assets/models/mano_celular.glb', (gltf) => {
        handPhoneMesh = gltf.scene;
        camera.add(handPhoneMesh); 
        handPhoneMesh.position.set(0.4, -0.5, -0.8); 
        handPhoneMesh.scale.set(0.05, 0.05, 0.05); 
        handPhoneMesh.visible = false;
    });
}

function loadFuseBox() {
    loader.load('assets/models/caja_fusibles.glb', (gltf) => {
        fuseboxMesh = gltf.scene;
        fuseboxMesh.position.copy(CONFIG.POSITIONS.FUSEBOX);
        if (CONFIG.ROTATIONS.FUSEBOX) fuseboxMesh.rotation.copy(CONFIG.ROTATIONS.FUSEBOX);
        if (CONFIG.SCALES && CONFIG.SCALES.FUSEBOX) fuseboxMesh.scale.copy(CONFIG.SCALES.FUSEBOX);
        scene.add(fuseboxMesh);
        collidableObjects.push(fuseboxMesh);
    });
}

// 🔋 Carga de 3 Baterías
function loadBatteries() {
    const positions = CONFIG.POSITIONS.BATTERIES || [];
    positions.forEach((pos, index) => {
        const fileName = `assets/models/bateria_${index + 1}.glb`;
        loader.load(fileName, (gltf) => {
            const battery = gltf.scene;
            battery.position.copy(pos);
            if (CONFIG.ROTATIONS.BATTERIES && CONFIG.ROTATIONS.BATTERIES[index]) {
                battery.rotation.copy(CONFIG.ROTATIONS.BATTERIES[index]);
            }
            if (CONFIG.SCALES.BATTERIES && CONFIG.SCALES.BATTERIES[index]) {
                battery.scale.copy(CONFIG.SCALES.BATTERIES[index]);
            } else {
                battery.scale.set(0.2, 0.2, 0.2);
            }
            battery.userData = { id: index, type: 'battery', collected: false };
            scene.add(battery);
            batteries.push(battery);
            console.log(`🔋 Cargada: ${fileName}`);
        }, undefined, (err) => console.error(`❌ Error ${fileName}:`, err));
    });
}

// 🔑 Carga de Llave (Placeholder: Esfera Dorada)
// ... (Imports y variables igual)

// CAMBIA SOLO ESTA FUNCIÓN:
// ... (Imports y demás código igual)

// CAMBIA ESTA FUNCIÓN loadKey:
function loadKey() {
    loader.load('assets/models/llave.glb', (gltf) => {
        keyMesh = gltf.scene;
        
        // 👇 ESCALA Y POSICIÓN CORREGIDAS
        // Reducimos mucho la escala (ej: 0.05) porque se veía gigante
        keyMesh.scale.set(0.05, 0.05, 0.05); 
        
        // Tu posición encontrada:
        keyMesh.position.set(8.93, 1.42, -12.39);
        
        // Rotación opcional para que se vea bien en el suelo/mesa
        keyMesh.rotation.set(0, 0, 0); 

        scene.add(keyMesh);
        console.log("🔑 Llave cargada en:", keyMesh.position);
    }, undefined, (err) => {
        console.warn("⚠️ Error cargando llave.glb, usando esfera.");
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        keyMesh = new THREE.Mesh(geometry, material);
        keyMesh.position.set(8.93, 1.42, -12.39);
        scene.add(keyMesh);
    });
}

// ... (Resto del archivo igual)

// ... (Resto del archivo igual: loadBatteries, loadFuseBox, etc.)
// --- UTILIDADES DE INTERACCIÓN ---

// 1. Detectar qué puerta estamos mirando (NO la abre, solo detecta)
export function getHoveredDoor() {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = ray.intersectObjects(collidableObjects, true);
    
    if (hits.length > 0) {
        let target = hits[0].object;
        while (target.parent && !doors.includes(target)) target = target.parent;
        if (doors.includes(target)) {
            return target; // Devolvemos la puerta encontrada
        }
    }
    return null;
}

// 2. Acción física de abrir/cerrar puerta
export function toggleDoor(door) {
    if (!door) return;
    // Animación simple de rotación (90 grados)
    const direction = door.userData.isOpen ? -1 : 1;
    door.rotation.y += (Math.PI / 2) * direction;
    door.userData.isOpen = !door.userData.isOpen;
}

export function pickupPhone() {
    if (phoneMesh) phoneMesh.visible = false;
    if (handPhoneMesh) handPhoneMesh.visible = true;
}

// Maker Mode
export function spawnModelForEditing(path) {
    loader.load(path, (gltf) => {
        const model = gltf.scene;
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0,0), camera);
        const hits = ray.intersectObjects(collidableObjects, true);
        if (hits.length > 0) model.position.copy(hits[0].point);
        else model.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
        model.scale.set(0.3, 0.3, 0.3);
        model.traverse((child) => { if (child.isMesh) child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }); });
        scene.add(model);
        transformControls.attach(model);
        console.log(`🛠️ Editando: ${path}`);
    }, undefined, (err) => console.error("Error Maker:", err));
}