import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera, transformControls } from '../core/world.js'; 
import { CONFIG } from '../config.js'; 

export let collidableObjects = [];
let doors = []; 

// 👇 ELIMINADO: handPhoneMesh de los exports
export let phoneMesh, fuseboxMesh, keyMesh;
export let batteries = []; 

const loader = new GLTFLoader();

export function initLevel() {
    loadHouse();
    loadPhone(); 
    loadFuseBox(); 
    loadBatteries(); 
    loadKey(); 
    // 👇 ELIMINADO: loadHandPhone();
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
        }, undefined, (err) => console.error(`❌ Error ${fileName}:`, err));
    });
}

// 🔑 CORREGIDO: Llave pequeña y en su sitio
function loadKey() {
    loader.load('assets/models/llave.glb', (gltf) => {
        keyMesh = gltf.scene;
        keyMesh.scale.copy(CONFIG.SCALES.KEY); // 0.0005
        keyMesh.position.copy(CONFIG.POSITIONS.KEY);
        keyMesh.rotation.set(Math.PI/2, 0, 0); 
        scene.add(keyMesh);
        console.log("🔑 Llave cargada");
    }, undefined, (err) => {
        console.warn("⚠️ Error llave:", err);
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        keyMesh = new THREE.Mesh(geometry, material);
        keyMesh.position.copy(CONFIG.POSITIONS.KEY);
        scene.add(keyMesh);
    });
}

export function getHoveredDoor() {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = ray.intersectObjects(collidableObjects, true);
    if (hits.length > 0) {
        let target = hits[0].object;
        while (target.parent && !doors.includes(target)) target = target.parent;
        if (doors.includes(target)) return target;
    }
    return null;
}

export function toggleDoor(door) {
    if (!door) return;
    const direction = door.userData.isOpen ? -1 : 1;
    door.rotation.y += (Math.PI / 2) * direction;
    door.userData.isOpen = !door.userData.isOpen;
}

export function pickupPhone() {
    if (phoneMesh) phoneMesh.visible = false;
    // 👇 ELIMINADO: handPhoneMesh
}

export function spawnModelForEditing(path) {
    loader.load(path, (gltf) => {
        const model = gltf.scene;
        model.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
        model.scale.set(0.3, 0.3, 0.3);
        scene.add(model);
        transformControls.attach(model);
    });
}