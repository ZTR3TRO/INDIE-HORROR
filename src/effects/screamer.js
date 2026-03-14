import * as THREE from 'three';
import { scene, camera } from '../core/world.js';
import { playSound } from '../core/audio.js';

export let shadowEntity = null;
export let shadowApproaching = false;

// ── Construcción procedural de la criatura ──────────────────────────────────
function buildShadowCreature() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const M = (geo) => new THREE.Mesh(geo, mat);

    // Cabeza pequeña y alargada, inclinada
    const head = M(new THREE.SphereGeometry(0.14, 6, 5));
    head.scale.set(0.8, 1.6, 0.8);
    head.position.set(0.05, 2.55, 0);
    head.rotation.z = -0.3;
    group.add(head);

    // Cuello fino
    const neck = M(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 5));
    neck.position.set(0, 2.28, 0);
    group.add(neck);

    // Torso delgado, ligeramente inclinado
    const torso = M(new THREE.CylinderGeometry(0.13, 0.16, 0.75, 6));
    torso.position.set(0, 1.78, 0);
    torso.rotation.z = 0.08;
    group.add(torso);

    // Cadera pequeña
    const hip = M(new THREE.SphereGeometry(0.17, 6, 4));
    hip.scale.set(1, 0.6, 0.8);
    hip.position.set(0, 1.38, 0);
    group.add(hip);

    // Brazos largos con garras
    function addArm(side) {
        const s = side === 'L' ? -1 : 1;
        const shoulder = M(new THREE.CylinderGeometry(0.055, 0.045, 0.85, 5));
        shoulder.position.set(s * 0.22, 1.95, 0);
        shoulder.rotation.z = s * 0.55;
        group.add(shoulder);

        const forearm = M(new THREE.CylinderGeometry(0.04, 0.03, 1.1, 5));
        forearm.position.set(s * 0.68, 1.28, 0);
        forearm.rotation.z = s * 1.05;
        group.add(forearm);

        const wrist = M(new THREE.SphereGeometry(0.055, 5, 4));
        wrist.position.set(s * 1.05, 0.62, 0);
        group.add(wrist);

        for (let f = 0; f < 4; f++) {
            const claw = M(new THREE.CylinderGeometry(0.018, 0.006, 0.38, 4));
            const angle = (f - 1.5) * 0.18;
            claw.position.set(s * (1.08 + Math.sin(angle) * 0.08), 0.28 - f * 0.04, Math.cos(angle) * 0.1);
            claw.rotation.z = s * 0.2 + angle * 0.3;
            group.add(claw);
        }
    }
    addArm('L');
    addArm('R');

    // Piernas dobladas en postura de acecho
    function addLeg(side) {
        const s = side === 'L' ? -1 : 1;
        const thigh = M(new THREE.CylinderGeometry(0.08, 0.065, 0.7, 5));
        thigh.position.set(s * 0.14, 0.98, 0);
        thigh.rotation.z = s * 0.25;
        group.add(thigh);

        const knee = M(new THREE.SphereGeometry(0.07, 5, 4));
        knee.position.set(s * 0.24, 0.60, 0.08);
        group.add(knee);

        const shin = M(new THREE.CylinderGeometry(0.055, 0.04, 0.65, 5));
        shin.position.set(s * 0.20, 0.28, 0.18);
        shin.rotation.x = -0.45;
        shin.rotation.z = s * 0.1;
        group.add(shin);

        for (let f = 0; f < 3; f++) {
            const toe = M(new THREE.CylinderGeometry(0.014, 0.005, 0.22, 4));
            toe.position.set(s * 0.18 + (f - 1) * 0.06, 0.0, 0.32 + f * 0.02);
            toe.rotation.x = -0.3;
            group.add(toe);
        }
    }
    addLeg('L');
    addLeg('R');

    return group;
}

// ── Init — llamar una vez al arrancar el juego ──────────────────────────────
export function initShadow() {
    shadowEntity = buildShadowCreature();
    shadowEntity.scale.set(1.6, 1.6, 1.6); // más grande y grueso
    shadowEntity.visible = false;
    scene.add(shadowEntity);

    // Luz negra/morada que irradia la entidad
    const darkLight = new THREE.PointLight(0x2a004a, 3.0, 8);
    darkLight.position.set(0, 1.5, 0);
    shadowEntity.add(darkLight);

    console.log('👤 Sombra criatura lista');
}

// ── Update — llamar cada frame desde el animate loop ───────────────────────
export function updateShadow(delta) {
    if (!shadowApproaching || !shadowEntity) return;

    const SPEED = 35.0;
    const dir = new THREE.Vector3().subVectors(camera.position, shadowEntity.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 1.8) {
        dir.normalize();
        shadowEntity.position.x += dir.x * SPEED * delta;
        shadowEntity.position.z += dir.z * SPEED * delta;
        shadowEntity.position.y = 0.0;
        shadowEntity.lookAt(new THREE.Vector3(camera.position.x, shadowEntity.position.y, camera.position.z));
        // Crece levemente al acercarse
        const growT = Math.max(0, 1 - dist / 20);
        shadowEntity.scale.setScalar(0.9 + growT * 1.8);
    } else {
        shadowApproaching = false;
        triggerScreamerFlash();
    }
}

// ── Aparece parada, sin moverse aún ────────────────────────────────────────
export function spawnShadowStill() {
    if (!shadowEntity) return;
    // Posición exterior frente a la puerta principal
    shadowEntity.position.set(-5.429, 0.0, 5.660);
    shadowEntity.lookAt(new THREE.Vector3(camera.position.x, 0, camera.position.z));
    shadowEntity.scale.setScalar(0.9);
    shadowEntity.visible = true;
}

// ── Trigger — inicia la secuencia del jumpscare ─────────────────────────────
export function triggerScreamer() {
    if (!shadowEntity) {
        playSound('jumpscare');
        const f = document.createElement('div');
        f.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;opacity:1;';
        document.body.appendChild(f);
        setTimeout(() => { f.style.background = 'black'; f.style.transition = 'opacity 1.5s'; }, 300);
        setTimeout(() => { f.remove(); showCredits(); }, 2800);
        return;
    }
    // Si spawnShadowStill ya la posicionó, solo arrancar el approach
    // Si no estaba visible, posicionarla ahora
    if (!shadowEntity.visible) {
        shadowEntity.position.set(-5.429, 0.0, 5.660);
        shadowEntity.lookAt(new THREE.Vector3(camera.position.x, 0, camera.position.z));
        shadowEntity.visible = true;
    }
    shadowApproaching = true;
}

function triggerScreamerFlash() {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999;opacity:1;';
    document.body.appendChild(flash);

    playSound('jumpscare');

    const img = document.createElement('div');
    img.style.cssText = 'position:fixed;inset:0;z-index:100000;background:black;';
    img.innerHTML = `<img src="assets/images/screamer.png" style="width:100vw;height:100vh;object-fit:cover;display:block;user-select:none;">`;
    document.body.appendChild(img);

    setTimeout(() => { flash.remove(); }, 150);
    setTimeout(() => { img.style.transition = 'opacity 1.5s'; img.style.opacity = '0'; }, 800);
    setTimeout(() => {
        if (shadowEntity) { scene.remove(shadowEntity); shadowEntity = null; }
        img.remove();
        showCredits();
    }, 2800);
}

// ── Créditos finales ────────────────────────────────────────────────────────
export function showCredits() {
    const credits = document.createElement('div');
    credits.style.cssText = `
        position: fixed; inset: 0; background: black; z-index: 100000;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: 'Courier New', monospace; color: #cc0000;
        opacity: 0; transition: opacity 3s;
    `;
    credits.innerHTML = `
        <div style="font-size:48px; letter-spacing:8px; margin-bottom:40px;">FIN</div>
        <div style="font-size:14px; color:#555; letter-spacing:4px; margin-bottom:60px;">LA CONGREGACIÓN DEL SÉPTIMO UMBRAL</div>
        <div style="font-size:12px; color:#333; letter-spacing:2px;">Un juego de</div>
        <div style="font-size:18px; color:#444; letter-spacing:4px; margin-top:10px;">ZARE</div>
        <div style="font-size:10px; color:#222; margin-top:60px; letter-spacing:2px;">Presiona R para reiniciar</div>
    `;
    document.body.appendChild(credits);
    setTimeout(() => { credits.style.opacity = '1'; }, 100);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyR') location.reload();
    }, { once: true });
}