import * as THREE from 'three';

export const CONFIG = {
    POSITIONS: {
        BED: new THREE.Vector3(3.87, 4.25, -1.01),
        SIT: new THREE.Vector3(4.75, 5.33, -0.57),
        PHONE: new THREE.Vector3(3.73, 4.64, -0.01),
        FUSEBOX: new THREE.Vector3(1.04, 1.58, -11.53),
        KEY: new THREE.Vector3(8.93, 1.42, -12.39),
        LAPTOP: new THREE.Vector3(3.91, 4.61, -3.75),

        BATTERIES: [
            new THREE.Vector3(4.51, 2.28, -9.32),
            new THREE.Vector3(4.07, 2.03, -13.27),
            new THREE.Vector3(0.59, 0.76, -2.63)
        ],

        // 🪨 Piedras rituales — posiciones ajustadas con el editor in-game
        RITUAL_STONES: [
            new THREE.Vector3(-5.53, -0.13, -25.30), // izquierda  — roca_3.glb (REAL ✅)
            new THREE.Vector3(-4.75, -0.16, -25.63), // centro     — roca.glb   (falsa)
            new THREE.Vector3(-4.35, -0.19, -26.51), // derecha    — roca_2.glb (falsa)
        ],

        UV_LAMP: new THREE.Vector3(7.30, 4.66, -10.36), // cuarto de Zare

        // Ending cinemática — coordenadas exactas del editor
        DOOR_VIEW: new THREE.Vector3(2.01, 2.11, -3.40), // estática mirando la puerta
        DOOR_EXIT: new THREE.Vector3(2.09, 2.11, -1.63), // avance suave hacia afuera
        WAKE_END:  new THREE.Vector3(4.75, 5.50, -0.57), // despertar junto a la cama

        // Ending
        DOOR_VIEW:  new THREE.Vector3(4.50, 5.33, -1.80), // cámara estática mirando la puerta
        DOOR_EXIT:  new THREE.Vector3(2.49, 5.33, -1.66), // punto justo frente a la puerta
        WAKE_END:   new THREE.Vector3(4.75, 5.33, -0.57), // despertar — misma que SIT

        VIEW: new THREE.Vector3(-1.85, 11.35, 38.80),
        EXPLOSION: new THREE.Vector3(-14.21, 8.22, 50.96),
        SPAWN: new THREE.Vector3(4.75, 5.33, -0.57)
    },
    ROTATIONS: {
        SIT: new THREE.Euler(-2.30, 0.78, 2.47),
        VIEW: new THREE.Euler(-2.87, 0.96, 2.92),
        SPAWN: new THREE.Euler(0, -2.0, 0),
        PHONE: new THREE.Euler(1.68, 0.03, 0.64),
        UV_LAMP: new THREE.Euler(0.00, 0.80, 0.00), // ligeramente girada
        DOOR_VIEW: new THREE.Euler(0.00, 0.00, 0.00), // mirando hacia -Z (la puerta)
        WAKE_END:  new THREE.Euler(0.00, -2.00, 0.00),  // mirando al frente desde la cama
        DOOR_VIEW: new THREE.Euler(0.00, Math.PI, 0.00), // mirando hacia la puerta (Z negativo)
        WAKE_END:  new THREE.Euler(0.10, -2.0, 0.00),   // mirando al frente desde la cama
        FUSEBOX: new THREE.Euler(0.00, 1.54, 0.00),
        LAPTOP: new THREE.Euler(0.00, 1.56, 0.00),

        BATTERIES: [
            new THREE.Euler(0.86, 0.51, -2.06),
            new THREE.Euler(0.00, 0.00, 0.00),
            new THREE.Euler(-1.80, 0.35, 0.56)
        ],

        // 🪨 Rotaciones Y de las piedras rituales
        RITUAL_STONES: [
            0.4,   // roca_3 izquierda
           -0.6,   // roca   centro
            1.2,   // roca_2 derecha (real)
        ]
    },
    SCALES: {
        UV_LAMP: new THREE.Vector3(0.55, 0.55, 0.55), // linterna pequeña realista
        FUSEBOX: new THREE.Vector3(0.50, 0.65, 0.30),
        KEY: new THREE.Vector3(0.0005, 0.0005, 0.0005),
        LAPTOP: new THREE.Vector3(0.19, 0.21, 0.21),

        BATTERIES: [
            new THREE.Vector3(0.22, 0.23, 0.30),
            new THREE.Vector3(0.30, 0.30, 0.30),
            new THREE.Vector3(0.30, 0.30, 0.30)
        ],

        // 🪨 Escalas de las piedras rituales
        RITUAL_STONES: [
            new THREE.Vector3(0.30, 0.30, 0.30), // roca_3 izquierda
            new THREE.Vector3(0.30, 0.30, 0.30), // roca   centro
            new THREE.Vector3(0.30, 0.30, 0.30), // roca_2 derecha (real)
        ]
    },
    PLAYER: {
        HEIGHT: 1.7,
        WIDTH: 0.1,
        SPEED: { WALK: 2.2, RUN: 4.5, FLY: 8.0 },
        GRAVITY: 25.0
    },
    ENV: {
        NO_RAIN_BOX: { MIN: new THREE.Vector3(-10, -5, -15), MAX: new THREE.Vector3(20, 20, 15) },
        AMBIENT_DARK: 0.01,
        AMBIENT_DIM: 0.15,
        AMBIENT_MOON: 0.35,
        FLASHLIGHT_INTENSITY: 2.0
    },
    TIMING: {
        WAKE_DURATION: 4.0, CALL_DURATION: 6.0, EXPLOSION_DELAY: 2.0, TRAVEL_DURATION: 8.0
    }
};