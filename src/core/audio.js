import * as THREE from 'three';
import { camera } from './world.js';
import { phoneMesh } from '../scenes/level.js';

const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();
export const sounds = {};

// Volúmenes base de cada sonido — usados para aplicar el master volume correctamente
const _baseVolumes = {};
let _masterVolume = 1.0;

export function initAudio() {
    camera.add(listener);

    // Desbloquear AudioContext si el browser lo suspendió (política de autoplay)
    const _unlock = () => {
        if (listener.context.state === 'suspended') listener.context.resume();
        document.removeEventListener('click',   _unlock);
        document.removeEventListener('keydown', _unlock);
    };
    document.addEventListener('click',   _unlock);
    document.addEventListener('keydown', _unlock);

    // Teléfono — PositionalAudio, se adjunta al phoneMesh
    const phoneSound = new THREE.PositionalAudio(listener);
    audioLoader.load('assets/sounds/telefono.mp3', (buffer) => {
        phoneSound.setBuffer(buffer);
        phoneSound.setLoop(true);
        phoneSound.setRefDistance(1);
        phoneSound.setVolume(1.0 * _masterVolume);
        sounds['telefono'] = phoneSound;
        _baseVolumes['telefono'] = 1.0;
        if (phoneMesh) phoneMesh.add(phoneSound);
    }, undefined, () => console.warn('Audio no encontrado: telefono.mp3'));

    // --- CARGA DE TODOS LOS AUDIOS ---
    loadSound('lluvia',             'assets/sounds/lluvia.mp3',             true,  0.3);
    loadSound('pasos',              'assets/sounds/pasos.mp3',              false, 0.8);
    loadSound('respiracion',        'assets/sounds/respiracion.mp3',        true,  0.6);
    loadSound('tinitus',            'assets/sounds/tinitus.mp3',            false, 0.4);
    loadSound('puerta_scream',      'assets/sounds/puerta_scream.mp3',      false, 1.5);
    loadSound('zumbido_electrico',  'assets/sounds/zumbido_electrico.mp3',  true,  0.2);
    loadSound('explosion',          'assets/sounds/explosion.mp3',          false, 2.5);
    loadSound('jumpscare',          'assets/sounds/jumpscare.mp3',          false, 1.0);
    loadSound('puerta_abierta',     'assets/sounds/puerta_abierta.mp3',     false, 1.5);
    loadSound('puerta_cerrada',     'assets/sounds/puerta_cerrada.mp3',     false, 1.5);
    loadSound('chispazo',           'assets/sounds/chispazo.mp3',           false, 0.5);
    loadSound('objeto',             'assets/sounds/objeto.mp3',             false, 1.2);
    loadSound('puerta_bloqueada',   'assets/sounds/puerta_bloqueada.mp3',   false, 1.5);
    loadSound('tocando',            'assets/sounds/tocando.mp3',            false, 1.5);
}

function loadSound(name, path, loop = false, volume = 1.0) {
    _baseVolumes[name] = volume; // guardar volumen base ANTES de cargar
    const sound = new THREE.Audio(listener);
    audioLoader.load(path, (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(loop);
        sound.setVolume(volume * _masterVolume); // respetar master actual al cargar
        sounds[name] = sound;
    }, undefined, () => console.warn(`Audio no encontrado: ${path}`));
}

export function playSound(name) {
    if (sounds[name] && !sounds[name].isPlaying) sounds[name].play();
}

export function stopSound(name) {
    if (sounds[name] && sounds[name].isPlaying) sounds[name].stop();
}

export function isPlaying(name) {
    return !!(sounds[name]?.isPlaying);
}

// ── Pausa/reanuda el AudioContext entero — congela TODO el audio de golpe ───
// Es la forma correcta de pausar Web Audio: no stop()/play() uno a uno.
export function suspendAudio() {
    if (listener.context.state === 'running') listener.context.suspend();
}

export function resumeAudio() {
    if (listener.context.state === 'suspended') listener.context.resume();
}

// ── Master volume — escala TODOS los sonidos respecto a su volumen base ─────
export function setMasterVolume(v) {
    _masterVolume = Math.max(0, Math.min(1, v));
    // Sonidos ya cargados
    Object.keys(_baseVolumes).forEach(name => {
        if (sounds[name]?.setVolume) {
            sounds[name].setVolume(_baseVolumes[name] * _masterVolume);
        }
    });
    // Los sonidos que carguen después ya usarán _masterVolume en loadSound()
}

export function updateRainVolume(isInside) {
    if (!sounds['lluvia']) return;
    // El target se escala con el master para no romper la progresión
    const targetBase = isInside ? 0.15 : 0.3;
    const target = targetBase * _masterVolume;
    const current = sounds['lluvia'].getVolume();
    if (Math.abs(current - target) > 0.001) {
        sounds['lluvia'].setVolume(current + (target - current) * 0.05);
    }
}