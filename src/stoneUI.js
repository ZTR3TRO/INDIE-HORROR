// stoneUI.js — Inspección de piedra ritual con modelo GLB real + número grabado
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let stoneScene, stoneCamera, stoneRenderer, stoneGroup;
let isDragging = false, prevMouse = { x: 0, y: 0 };
let stoneInitialized = false;
let onFoundCallback = null;
let numberRevealed = false;
let animFrame = null;

export function initStoneUI(onFound) {
    onFoundCallback = onFound;

    const html = `
    <style>
        #stoneUI {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: radial-gradient(ellipse at center, #0d0a08 0%, #000 100%);
            font-family: 'Courier New', monospace;
        }
        #stoneUI .vignette {
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.92) 100%);
            pointer-events: none;
            z-index: 2;
        }
        #stoneCanvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            cursor: grab;
        }
        #stoneCanvas:active { cursor: grabbing; }
        #stoneHint {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,0.25);
            font-size: 12px;
            letter-spacing: 3px;
            text-transform: uppercase;
            z-index: 10;
            animation: hintPulse 2.5s ease-in-out infinite;
            pointer-events: none;
        }
        @keyframes hintPulse {
            0%, 100% { opacity: 0.25; }
            50% { opacity: 0.6; }
        }
        /* Indicador sutil al descubrir el número */
        #stoneReveal {
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            z-index: 10;
            pointer-events: none;
            opacity: 0;
            transition: opacity 1.5s ease;
        }
        #stoneReveal.visible { opacity: 1; }
        #stoneReveal .label {
            font-size: 10px;
            letter-spacing: 5px;
            color: rgba(180, 120, 60, 0.55);
            text-transform: uppercase;
        }
        #stoneReveal .sublabel {
            font-size: 9px;
            letter-spacing: 3px;
            color: rgba(180, 120, 60, 0.35);
            margin-top: 6px;
        }
        #stoneClose {
            position: absolute;
            top: 24px;
            right: 30px;
            color: rgba(255,255,255,0.3);
            font-size: 13px;
            letter-spacing: 3px;
            cursor: pointer;
            z-index: 10;
            text-transform: uppercase;
            transition: color 0.2s;
        }
        #stoneClose:hover { color: rgba(255,255,255,0.7); }

    </style>

    <div id="stoneUI">
        <canvas id="stoneCanvas"></canvas>
        <div class="vignette"></div>
        <div id="stoneHint">Arrastra para inspeccionar</div>
        <div id="stoneReveal">
            <div class="label">grabado en la piedra</div>
            <div class="sublabel">El número persiste</div>
        </div>
        <div id="stoneClose">[ Q ] Cerrar</div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('stoneClose').addEventListener('click', hideStoneUI);
}

// Genera textura de roca con número "9" grabado en el centro inferior
function makeEngravedTexture() {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 2048;
    const ctx = c.getContext('2d');

    // === BASE: roca oscura marrón-gris ===
    const grad = ctx.createLinearGradient(0, 0, 2048, 2048);
    grad.addColorStop(0,   '#3e3530');
    grad.addColorStop(0.5, '#4a4038');
    grad.addColorStop(1,   '#362e28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 2048);

    // === TEXTURA: ruido granular ===
    for (let i = 0; i < 80000; i++) {
        const x = Math.random() * 2048;
        const y = Math.random() * 2048;
        const s = Math.random() * 3 + 0.5;
        const b = Math.floor(Math.random() * 70);
        const a = Math.random() * 0.18 + 0.04;
        ctx.fillStyle = `rgba(${25+b},${22+b},${18+b},${a})`;
        ctx.fillRect(x, y, s, s);
    }

    // === VENAS de mineral ===
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 2048, Math.random() * 2048);
        ctx.bezierCurveTo(
            Math.random() * 2048, Math.random() * 2048,
            Math.random() * 2048, Math.random() * 2048,
            Math.random() * 2048, Math.random() * 2048
        );
        ctx.strokeStyle = `rgba(${70 + Math.random()*40},${60+Math.random()*30},${50+Math.random()*20},${Math.random()*0.18})`;
        ctx.lineWidth = Math.random() * 4 + 1;
        ctx.stroke();
    }

    // === NÚMERO "9" GRABADO — centrado en la textura ===
    // El grabado simula cincel: zona oscura (surco) + halo claro (borde desgastado)
    const cx = 1024, cy = 1024;
    const fontSize = 600;
    ctx.font = `bold ${fontSize}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Paso 1: sombra difusa (profundidad del hueco)
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.0)'; // transparente, solo sombra
    ctx.fillText('9', cx, cy);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // Paso 2: surco principal muy oscuro
    ctx.fillStyle = 'rgba(8, 6, 4, 0.92)';
    ctx.fillText('9', cx, cy);

    // Paso 3: borde desgastado (polvo claro acumulado en el grabado)
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(200, 175, 140, 0.35)';
    ctx.lineJoin = 'round';
    ctx.strokeText('9', cx, cy);

    // Paso 4: brillo sutil interior (luz rasante)
    ctx.fillStyle = 'rgba(160, 135, 100, 0.12)';
    ctx.fillText('9', cx - 3, cy - 3);

    return new THREE.CanvasTexture(c);
}

function initThreeStone() {
    const canvas = document.getElementById('stoneCanvas');
    const w = window.innerWidth, h = window.innerHeight;

    stoneRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    stoneRenderer.setSize(w, h);
    stoneRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stoneRenderer.setClearColor(0x000000, 0);
    stoneRenderer.shadowMap.enabled = true;

    stoneScene = new THREE.Scene();
    stoneCamera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    stoneCamera.position.set(0, 0.3, 3.2);

    // Iluminación dramática de antorcha
    const ambient = new THREE.AmbientLight(0x1a1208, 2.0);
    stoneScene.add(ambient);

    const key = new THREE.DirectionalLight(0xffcc88, 3.5);
    key.position.set(2, 4, 3);
    stoneScene.add(key);

    const fill = new THREE.DirectionalLight(0x223355, 1.0);
    fill.position.set(-3, 0, 1);
    stoneScene.add(fill);

    const rim = new THREE.DirectionalLight(0x554433, 1.5);
    rim.position.set(0, -2, -2);
    stoneScene.add(rim);

    stoneGroup = new THREE.Group();
    stoneScene.add(stoneGroup);

    // Cargar modelo GLB real
    const loader = new GLTFLoader();
    loader.load('assets/models/roca_3.glb', (gltf) => {
        const model = gltf.scene;

        // Calcular bounding box para centrar y escalar
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 1.6;
        const scaleFactor = targetSize / maxDim;

        model.scale.setScalar(scaleFactor);
        model.position.sub(center.multiplyScalar(scaleFactor));

        // Aplicar textura con número grabado
        const engravedTex = makeEngravedTexture();
        model.traverse((child) => {
            if (!child.isMesh) return;
            child.material = new THREE.MeshStandardMaterial({
                map: engravedTex,
                roughness: 0.88,
                metalness: 0.06,
                color: 0x999080,
            });
            child.castShadow = true;
        });

        stoneGroup.add(model);
    });

    // Orientación inicial: número abajo
    stoneGroup.rotation.x = 0.25;
    stoneGroup.rotation.y = 0.4;

    // Eventos mouse
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup',   onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);

    // Touch support
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true });
    canvas.addEventListener('touchend',   onMouseUp);

    stoneInitialized = true;
    animateStone();
}

function animateStone() {
    animFrame = requestAnimationFrame(animateStone);
    if (stoneRenderer && stoneScene && stoneCamera) {
        // Rotación suave automática si no se arrastra
        if (!isDragging && stoneGroup) {
            stoneGroup.rotation.y += 0.003;
        }
        stoneRenderer.render(stoneScene, stoneCamera);
    }
}

function onMouseDown(e) {
    isDragging = true;
    prevMouse = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
    if (!isDragging || !stoneGroup) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    stoneGroup.rotation.y += dx * 0.010;
    stoneGroup.rotation.x += dy * 0.010;
    prevMouse = { x: e.clientX, y: e.clientY };
    checkNumberRevealed();
}

function onTouchStart(e) {
    if (e.touches.length === 1) {
        isDragging = true;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
}

function onTouchMove(e) {
    if (!isDragging || !stoneGroup || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - prevMouse.x;
    const dy = e.touches[0].clientY - prevMouse.y;
    stoneGroup.rotation.y += dx * 0.010;
    stoneGroup.rotation.x += dy * 0.010;
    prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    checkNumberRevealed();
}

function onMouseUp() { isDragging = false; }

function checkNumberRevealed() {
    if (numberRevealed) return;
    // El "9" está en la parte inferior de la textura → cara de abajo
    // Cuando rotation.x está entre PI*0.55 y PI*1.45 la cara inferior mira al jugador
    const rx = ((stoneGroup.rotation.x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (rx > Math.PI * 0.55 && rx < Math.PI * 1.45) {
        numberRevealed = true;
        document.getElementById('stoneReveal').classList.add('visible');
        document.getElementById('stoneHint').style.opacity = '0';
        if (onFoundCallback) onFoundCallback();
    }
}

export function showStoneUI() {
    document.getElementById('stoneUI').style.display = 'block';
    numberRevealed = false;
    document.getElementById('stoneReveal').classList.remove('visible');
    document.getElementById('stoneHint').style.opacity = '1';

    if (!stoneInitialized) {
        initThreeStone();
    } else {
        if (stoneGroup) { stoneGroup.rotation.x = 0.25; stoneGroup.rotation.y = 0.4; }
        if (!animFrame) animateStone();
    }
}

export function hideStoneUI() {
    document.getElementById('stoneUI').style.display = 'none';
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
}