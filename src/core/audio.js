import * as THREE from 'three';
import { camera } from './world.js'; // El "oído" del jugador
import { phoneMesh } from '../scenes/level.js'; // Para que el teléfono suene en 3D

const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();

// Aquí guardaremos los sonidos cargados
const sounds = {
    rain: null,
    phone: null,
    steps: null,
    breath: null
};

export function initAudio() {
    camera.add(listener); // Pegamos las orejas a la cámara

    // 1. CARGAR LLUVIA (Sonido Ambiente)
    const rainSound = new THREE.Audio(listener);
    audioLoader.load('assets/sounds/lluvia.mp3', (buffer) => {
        rainSound.setBuffer(buffer);
        rainSound.setLoop(true);
        rainSound.setVolume(0.5);
        sounds.rain = rainSound;
        console.log("🌧️ Audio: Lluvia lista");
    });

    // 2. CARGAR TELÉFONO (Sonido 3D)
    // Usamos PositionalAudio para que se escuche desde el buró
    const phoneSound = new THREE.PositionalAudio(listener);
    audioLoader.load('assets/sounds/telefono.mp3', (buffer) => {
        phoneSound.setBuffer(buffer);
        phoneSound.setLoop(true);
        phoneSound.setRefDistance(1); // A 1 metro suena real
        phoneSound.setVolume(1.0);
        sounds.phone = phoneSound;
        
        if (phoneMesh) {
            phoneMesh.add(phoneSound); // Pegar sonido al modelo 3D
            console.log("☎️ Audio: Teléfono 3D listo");
        }
    });

    // 3. CARGAR PASOS Y RESPIRACIÓN (Efectos simples)
    loadEffect('pasos', 'assets/sounds/pasos.mp3');
    loadEffect('breath', 'assets/sounds/respiracion.mp3');
}

// Helper para cargar efectos simples
function loadEffect(name, path) {
    const sound = new THREE.Audio(listener);
    audioLoader.load(path, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(0.8);
        sounds[name] = sound;
    });
}

// --- FUNCIONES PARA USAR EN EL JUEGO ---

export function playSound(name) {
    if (sounds[name]) {
        if (sounds[name].isPlaying) sounds[name].stop(); // Reiniciar si ya suena
        sounds[name].play();
    }
}

export function stopSound(name) {
    if (sounds[name] && sounds[name].isPlaying) {
        sounds[name].stop();
    }
}

// ... (Todo tu código anterior de initAudio y helpers sigue igual)

// --- FUNCIÓN NUEVA: CONTROL DE LLUVIA ---
export function updateRainVolume(isInside) {
    if (!sounds.rain) return;

    // Definir volúmenes objetivo
    const targetVolume = isInside ? 0.15 : 1.0; // 0.15 adentro (suave), 1.0 afuera (fuerte)
    
    // Obtener volumen actual
    const currentVolume = sounds.rain.getVolume();

    // "Lerp" para que el cambio sea suave y no de golpe
    // Si la diferencia es muy pequeña, ya no calculamos para ahorrar CPU
    if (Math.abs(currentVolume - targetVolume) > 0.01) {
        const newVolume = currentVolume + (targetVolume - currentVolume) * 0.05; // 0.05 es la velocidad del cambio
        sounds.rain.setVolume(newVolume);
    }
}