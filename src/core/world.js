import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export let scene, camera, renderer, controls, transformControls;

export function initWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.02); 
    
    // FOV 60 ayuda al look "cinemático" de terror antiguo (PS2)
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // 🛑 CAMBIO 1: antialias: false. Los bordes de sierra son clave para el estilo PS1 y salvan MUCHOS recursos.
    renderer = new THREE.WebGLRenderer({ 
        antialias: false, 
        powerPreference: "high-performance" 
    });
    
    // 🛑 CAMBIO 2: BAJA RESOLUCIÓN (Magia M1). 
    // Dividimos la resolución de tu pantalla por 3. Se calcularán muchísimos menos píxeles.
    const scaleFactor = 3; 
    renderer.setPixelRatio(1); // Ignoramos la pantalla Retina
    renderer.setSize(window.innerWidth / scaleFactor, window.innerHeight / scaleFactor, false);
    
    renderer.shadowMap.enabled = true;
    // 🛑 CAMBIO 3: Sombras básicas. No se difuminan, son bordes duros (Retro y ultra rápidas).
    renderer.shadowMap.type = THREE.BasicShadowMap; 
    
    // 🛑 CAMBIO 4: CSS para estirar el mini-canvas a toda la pantalla sin que se vea borroso.
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated'; // Esto hace que los píxeles se vean "crujientes" y cuadrados.
    
    document.body.appendChild(canvas);
    
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
        if (!obj) return;

        const p = obj.position;
        const s = obj.scale;

        // Log genérico siempre visible
        console.log(`--- 🛠️ ${obj.name} ---`);
        console.log(`Pos: ${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}`);
        console.log(`Rot: ${obj.rotation.x.toFixed(3)}, ${obj.rotation.y.toFixed(3)}, ${obj.rotation.z.toFixed(3)}`);
        console.log(`Sca: ${s.x.toFixed(3)}, ${s.y.toFixed(3)}, ${s.z.toFixed(3)}`);

        // Si es un collider de vidrio: imprimir el addWall() listo para copiar/pegar
        // BoxGeometry base es 1x1x1, así que scale.xyz = tamaño final
        if (obj.name.startsWith('col_glass')) {
            const shortName = obj.name.replace('col_', '');
            console.log(
                `%c📋 COPIAR → addWall('${shortName}',  ${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)},  ${s.x.toFixed(3)}, ${s.y.toFixed(3)}, ${s.z.toFixed(3)});`,
                'color:#00ff88; font-weight:bold; font-size:13px; background:#111; padding:2px 6px;'
            );
        }
    });
    
    scene.add(transformControls);
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        // Mantenemos la escala retro al cambiar el tamaño de la ventana
        renderer.setSize(window.innerWidth / scaleFactor, window.innerHeight / scaleFactor, false);
    });
}