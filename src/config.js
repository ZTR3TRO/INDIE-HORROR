import * as THREE from 'three';

export const CONFIG = {
    POSITIONS: {
        BED: new THREE.Vector3(3.87, 4.25, -1.01),
        SIT: new THREE.Vector3(4.75, 5.33, -0.57),
        PHONE: new THREE.Vector3(3.73, 4.64, -0.01),
        FUSEBOX: new THREE.Vector3(1.04, 1.58, -11.53),
        
        // 👇 LISTA DE POSICIONES (Aquí están tus 3 coordenadas)
        BATTERIES: [
            new THREE.Vector3(4.51, 2.28, -9.32), // Batería 1
            new THREE.Vector3(2.78, 5.62, -9.69), // Batería 2
            new THREE.Vector3(0.59, 0.76, -2.63)  // Batería 3
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
        
        // 👇 LISTA DE ROTACIONES
        BATTERIES: [
            new THREE.Euler(0.86, 0.51, -2.06),   // Rotación Bat 1
            new THREE.Euler(-2.16, 0.28, 1.23),   // Rotación Bat 2
            new THREE.Euler(-1.80, 0.35, 0.56)    // Rotación Bat 3
        ]
    },
    SCALES: {
        FUSEBOX: new THREE.Vector3(0.50, 0.65, 0.30),
        
        // 👇 LISTA DE ESCALAS (Porque la 1 es diferente a la 2 y 3)
        BATTERIES: [
            new THREE.Vector3(0.22, 0.23, 0.30), // Escala Bat 1
            new THREE.Vector3(0.30, 0.30, 0.30), // Escala Bat 2
            new THREE.Vector3(0.30, 0.30, 0.30)  // Escala Bat 3
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
        FLASHLIGHT_INTENSITY: 0.55
    },
    TIMING: {
        WAKE_DURATION: 4.0, CALL_DURATION: 6.0, EXPLOSION_DELAY: 2.0, TRAVEL_DURATION: 8.0
    }
};