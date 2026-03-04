import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera, transformControls } from '../core/world.js'; 
import { CONFIG } from '../config.js'; 
import { playSound } from '../core/audio.js';

export let collidableObjects = [];
let doors = []; 

export let phoneMesh, fuseboxMesh, keyMesh, laptopMesh;
export let batteries = []; 

export let houseLights = []; 

// 💻 Posición "lógica" de la laptop para cálculos de distancia e interacción
// Se asigna cuando la laptop carga, separada del mesh group para evitar bugs con GLTF
export let laptopWorldPosition = new THREE.Vector3();

const loader = new GLTFLoader();

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
            if (child.isMesh) {
                // 1. ELIMINAR EL LIBRO QUE ESTORBA
                if (child.name === "Book_02") {
                    child.visible = false;
                    child.position.set(0, -100, 0);
                    return;
                }

                // 2. APAGAR TELEVISORES
                const name = child.name.toLowerCase();
                if (name.includes("tv") || name.includes("television") || name.includes("pantalla")) {
                    if (child.material) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                        child.material.color.setHex(0x050505);
                    }
                }

                child.castShadow = true;
                const meshName = child.name.toLowerCase();
                const isFoliage = meshName.includes("tree") || 
                                  meshName.includes("plant") || 
                                  meshName.includes("flower") || 
                                  meshName.includes("nature") ||
                                  meshName.includes("bush") ||
                                  meshName.includes("grass") ||
                                  meshName.includes("canopy");

                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    if (isFoliage) {
                        child.material.alphaTest = 0.2; 
                        child.material.transparent = false;
                        child.receiveShadow = false;
                        child.material.depthWrite = true;
                        child.material.needsUpdate = true;
                    } else {
                        child.receiveShadow = true;
                    }

                    if (child.material.emissive && !child.name.includes("Focus")) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }

                    if (child.material.map) {
                        child.material.map.minFilter = THREE.NearestFilter;
                        child.material.map.magFilter = THREE.NearestFilter;
                    }
                }

                if (child.name.includes("Focus")) {
                    const bulbLight = new THREE.PointLight(0xffaa00, 0, 10); 
                    child.add(bulbLight);
                    
                    // 👇 NUEVO: Forzamos que el material del foco empiece totalmente apagado
                    if (child.material) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }

                    houseLights.push({ light: bulbLight, mesh: child });
                }


                
                if (child.name.includes("Door") && !child.name.toLowerCase().includes("frame")) {
                    child.userData = { isOpen: false, isDoor: true }; 
                    doors.push(child);
                }
                
                collidableObjects.push(child);
            }
        });
        console.log("🏠 Casa lista y teles apagadas.");
    });
}

function loadLaptop() {
    loader.load('assets/models/laptop.glb', (gltf) => {
        laptopMesh = gltf.scene;
        
        laptopMesh.position.copy(CONFIG.POSITIONS.LAPTOP);
        laptopMesh.rotation.copy(CONFIG.ROTATIONS.LAPTOP);
        laptopMesh.scale.copy(CONFIG.SCALES.LAPTOP);
        
        // ✅ FIX 1: Guardamos la posición mundial real en una variable separada.
        // laptopMesh.position en un Group GLTF a veces no refleja la posición real
        // de los meshes hijos. Esto garantiza cálculos de distancia correctos.
        laptopWorldPosition.copy(CONFIG.POSITIONS.LAPTOP);

        // ✅ FIX 2: La laptop tiene su propia luz tenue (pantalla azul).
        // Así es visible incluso con ambientLight = 0 (apagón).
        const screenGlow = new THREE.PointLight(0x0044ff, 0.8, 3);
        screenGlow.position.set(0, 0, 0);
        laptopMesh.add(screenGlow);

        scene.add(laptopMesh);
        collidableObjects.push(laptopMesh);

        console.log("💻 Laptop cargada en:", laptopWorldPosition);
    }, undefined, (err) => {
        console.error("❌ Error al cargar laptop.glb:", err);
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
        });
    });
}

function loadKey() {
    loader.load('assets/models/llave.glb', (gltf) => {
        keyMesh = gltf.scene;
        keyMesh.scale.copy(CONFIG.SCALES.KEY); 
        keyMesh.position.copy(CONFIG.POSITIONS.KEY);
        keyMesh.rotation.set(Math.PI/2, 0, 0); 
        scene.add(keyMesh);
    }, undefined, () => {
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
    if (door.userData.isOpen) playSound('puerta_abierta');
    else playSound('puerta_cerrada');
}

export function pickupPhone() {
    if (phoneMesh) phoneMesh.visible = false;
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