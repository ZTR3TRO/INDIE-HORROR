import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera, transformControls } from '../core/world.js'; 
import { CONFIG } from '../config.js'; 
import { playSound } from '../core/audio.js';

export let keyWorldPosition = new THREE.Vector3();
export let bookWorldPosition = new THREE.Vector3();

export let collidableObjects = [];
let doors = []; 

export let phoneMesh, fuseboxMesh, keyMesh, laptopMesh;
export let batteries = []; 

export let houseLights = []; 

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
                const meshName = child.name.toLowerCase();

                // 1. ELIMINAR EL LIBRO QUE ESTORBA A LA LAPTOP
                if (child.name === "Book_02") {
                    child.visible = false;
                    child.position.set(0, -100, 0);
                    return;
                }

                // 2. PREPARAR EL LIBRO DE LORE
                if (meshName.includes("books_005")) {
                    child.userData.isBook = true;
                    if (child.parent) child.parent.userData.isBook = true;
                    child.getWorldPosition(bookWorldPosition); 
                }

                // 3. APAGAR TELEVISORES
                if (meshName.includes("tv") || meshName.includes("television") || meshName.includes("pantalla")) {
                    if (child.material) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                        child.material.color.setHex(0x050505);
                    }
                }

                child.castShadow = true;
                const isFoliage = meshName.includes("tree") || meshName.includes("plant") || meshName.includes("nature") || meshName.includes("bush");

                // 4. CREAR MATERIAL DE CRISTAL REAL DESDE CERO
                if (meshName.includes("glass") || meshName.includes("window") || meshName.includes("cristal")) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x000000, 
                        transparent: true,
                        opacity: 0.25, 
                        roughness: 0.1, 
                        metalness: 0.6, 
                        depthWrite: false, 
                        side: THREE.DoubleSide
                    });
                    child.receiveShadow = false;
                    child.castShadow = false;
                } 
                else if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    
                    if (isFoliage) {
                        child.material.alphaTest = 0.2; 
                        child.material.transparent = false;
                        child.receiveShadow = false;
                        child.material.depthWrite = true;
                        child.material.needsUpdate = true;
                    } else {
                        child.receiveShadow = true;
                        child.material.transparent = false; 
                        child.material.depthWrite = true;
                        child.material.opacity = 1.0;
                    }

                    if (child.material.emissive && !child.name.includes("Focus") && child.material.name !== 'mat15') {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }

                    if (child.material.map) {
                        child.material.map.minFilter = THREE.NearestFilter;
                        child.material.map.magFilter = THREE.NearestFilter;
                    }
                }

                // FOCOS APAGADOS AL INICIO
                if (child.name.includes("Focus")) {
                    const bulbLight = new THREE.PointLight(0xffaa00, 0, 10); 
                    child.add(bulbLight);
                    
                    if (child.material) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }

                    houseLights.push({ light: bulbLight, mesh: child });
                }
                
                // ✅ PUERTAS
                if (child.name.includes("Door") && !meshName.includes("frame")) {
                    child.userData.isOpen = false;
                    child.userData.isDoor = true;
                    doors.push(child);
                }
                
                collidableObjects.push(child);
            }
        });
        console.log("🏠 Casa lista. Books_005 preparado para leer.");
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
            if (child.isMesh && child.material) {
                if (child.material.name === 'mat15') {
                    child.material = child.material.clone();
                    child.material.emissive.setHex(0x002288);
                    child.material.emissiveIntensity = 0.5;
                }
            }
        });

        scene.add(laptopMesh);
        collidableObjects.push(laptopMesh);

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
        keyWorldPosition.copy(CONFIG.POSITIONS.KEY); 
        
        // 👇 AHORA SÍ: Hacemos que la llave se pueda tocar y detectar
        keyMesh.userData = { isKey: true };
        collidableObjects.push(keyMesh);
        
        scene.add(keyMesh);
    }, undefined, () => {
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        keyMesh = new THREE.Mesh(geometry, material);
        keyMesh.position.copy(CONFIG.POSITIONS.KEY);
        keyWorldPosition.copy(CONFIG.POSITIONS.KEY); 
        
        // 👇 Y lo mismo para el modelo fallback
        keyMesh.userData = { isKey: true };
        collidableObjects.push(keyMesh);
        
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