import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export let scene, camera, renderer, controls, transformControls;

export function initWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.02); // 👈 ARREGLADO: densidad 0.02
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // 1. Controles de Cámara (Ratón)
    controls = new PointerLockControls(camera, renderer.domElement);
    
    // 2. Configurar Transform Controls (El Editor de flechas)
    transformControls = new TransformControls(camera, renderer.domElement);
    
    transformControls.addEventListener('dragging-changed', (event) => {
        // Para PointerLock simplemente sirve para saber que estamos editando
    });
    
    // Logear cambios automáticamente
    transformControls.addEventListener('change', () => {
        const obj = transformControls.object;
        if (obj) {
            console.log(`--- 🛠️ DATOS ACTUALIZADOS DEL OBJETO ---`); // 👈 ARREGLADO
            console.log(`Pos: new THREE.Vector3(${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
            console.log(`Rot: new THREE.Euler(${obj.rotation.x.toFixed(2)}, ${obj.rotation.y.toFixed(2)}, ${obj.rotation.z.toFixed(2)})`);
            console.log(`Sca: new THREE.Vector3(${obj.scale.x.toFixed(2)}, ${obj.scale.y.toFixed(2)}, ${obj.scale.z.toFixed(2)})`);
        }
    });
    
    scene.add(transformControls);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}