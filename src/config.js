import * as THREE from 'three';

export const CONFIG = {
    POSITIONS: {
        BED: new THREE.Vector3(3.87, 4.25, -1.01),
        SIT: new THREE.Vector3(4.75, 5.33, -0.57),
        PHONE: new THREE.Vector3(3.73, 4.64, -0.01),
        FUSEBOX: new THREE.Vector3(1.04, 1.58, -11.53),
        
        // 👇 POSICIÓN CORREGIDA
        KEY: new THREE.Vector3(8.93, 1.42, -12.39),

        BATTERIES: [
            new THREE.Vector3(4.51, 2.28, -9.32),
            new THREE.Vector3(2.78, 5.62, -9.69),
            new THREE.Vector3(0.59, 0.76, -2.63)
        ],

        VIEW: new THREE.Vector3(-1.85, 11.35, 38.80),
        EXPLOSION: new THREE.Vector3(-14.21, 8.22, 50.96),
        SPAWN: new THREE.Vector3(4.75, 5.33, -0.57)
    },
    ROTATIONS: {
        SIT: new THREE.Euler(-2.30, 0.78, 2.47), 
        VIEW: new THREE.Euler(-2.87, 0.96, 2.92),
        SPAWN: new THREE.Euler(0, -2.0, 0),
        PHONE: new THREE.Euler(1.68, 0.03, 0.64),
        FUSEBOX: new THREE.Euler(0.00, 1.54, 0.00),
        
        BATTERIES: [
            new THREE.Euler(0.86, 0.51, -2.06), 
            new THREE.Euler(-2.16, 0.28, 1.23), 
            new THREE.Euler(-1.80, 0.35, 0.56)  
        ]
    },
    SCALES: {
        FUSEBOX: new THREE.Vector3(0.50, 0.65, 0.30),
        BATTERIES: [
            new THREE.Vector3(0.22, 0.23, 0.30),
            new THREE.Vector3(0.30, 0.30, 0.30),
            new THREE.Vector3(0.30, 0.30, 0.30)
        ],
        // 👇 ESCALA CORREGIDA
        KEY: new THREE.Vector3(0.0005, 0.0005, 0.0005)
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
        // 👇 Más intensidad para la nueva linterna
        FLASHLIGHT_INTENSITY: 2.0 
    },
    TIMING: {
        WAKE_DURATION: 4.0, CALL_DURATION: 6.0, EXPLOSION_DELAY: 2.0, TRAVEL_DURATION: 8.0
    }
};