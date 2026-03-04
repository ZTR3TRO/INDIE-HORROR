import * as THREE from 'three';
import { camera } from './world.js';
import { phoneMesh } from '../scenes/level.js';

const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
export const sounds = {}; 

export function initAudio() {
    camera.add(listener);

    const phoneSound = new THREE.PositionalAudio(listener);
    audioLoader.load('assets/sounds/telefono.mp3', (buffer) => {
        phoneSound.setBuffer(buffer);
        phoneSound.setLoop(true);
        phoneSound.setRefDistance(1); 
        phoneSound.setVolume(1.0);
        sounds['telefono'] = phoneSound; 
        
        if (phoneMesh) {
            phoneMesh.add(phoneSound);
        }
    });

    // --- CARGA DE TODOS TUS AUDIOS ---
    loadSound('lluvia', 'assets/sounds/lluvia.mp3', true, 0.3);
    loadSound('pasos', 'assets/sounds/pasos.mp3', false, 0.8);
    loadSound('respiracion', 'assets/sounds/respiracion.mp3', true, 0.6);
    loadSound('tinitus', 'assets/sounds/tinitus.mp3', false, 0.4);
    
    loadSound('puerta_scream', 'assets/sounds/puerta_scream.mp3', false, 1.5); 
    loadSound('zumbido_electrico', 'assets/sounds/zumbido_electrico.mp3', true, 0.2);
    
    // 👇 SUBIMOS EL VOLUMEN DE LA EXPLOSIÓN AL MÁXIMO (2.5)
    loadSound('explosion', 'assets/sounds/explosion.mp3', false, 2.5); 
    
    loadSound('jumpscare', 'assets/sounds/jumpscare.mp3', false, 1.0);
    loadSound('puerta_abierta', 'assets/sounds/puerta_abierta.mp3', false, 1.5);
    loadSound('puerta_cerrada', 'assets/sounds/puerta_cerrada.mp3', false, 1.5);
    loadSound('chispazo', 'assets/sounds/chispazo.mp3', false, 0.5);
    loadSound('objeto', 'assets/sounds/objeto.mp3', false, 1.2); 
    
    // 👇 LOS DOS SONIDOS NUEVOS
    loadSound('puerta_bloqueda', 'assets/sounds/puerta_bloqueda.mp3', false, 1.5); 
    loadSound('tocando', 'assets/sounds/tocando.mp3', false, 1.5); 
}

function loadSound(name, path, loop = false, volume = 1.0) {
    const sound = new THREE.Audio(listener);
    audioLoader.load(path, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(loop);
        sound.setVolume(volume);
        sounds[name] = sound;
    });
}

export function playSound(name) {
    if (sounds[name] && !sounds[name].isPlaying) {
        sounds[name].play();
    }
}

export function stopSound(name) {
    if (sounds[name] && sounds[name].isPlaying) {
        sounds[name].stop();
    }
}

export function isPlaying(name) {
    return sounds[name] && sounds[name].isPlaying;
}

export function updateRainVolume(isInside) {
    if (!sounds['lluvia']) return;
    const targetVolume = isInside ? 0.15 : 1.0; 
    const currentVolume = sounds['lluvia'].getVolume();
    if (Math.abs(currentVolume - targetVolume) > 0.01) {
        const newVolume = currentVolume + (targetVolume - currentVolume) * 0.05;
        sounds['lluvia'].setVolume(newVolume);
    }
}