// --- GUION DEL JUEGO ---
export const DIALOGUES = {
    
    // Llamada 1 (Cinemática inicial)
    CALL_1: [
        { text: "Daniel: 'Hola amor, ya salí del trabajo, voy en camino...'", duration: 3500, startAt: 0 },
        { text: "Daniel: 'Hay mucha lluvia de este lado, ¿qué tal está todo allá?'", duration: 3500, startAt: 4000 },
        { text: "Zare: 'Aquí también... Oye, esta casa nueva me da escalofríos. Escucho ruidos raros.'", duration: 4500, startAt: 8000 },
        { text: "Daniel: 'Amor, nos acabamos de mudar. Es una casa vieja, la madera suena. No te sugestiones.'", duration: 5000, startAt: 13000 },
        { text: "Zare: 'De acuerdo... Vente con cuidado, te amo.'", duration: 3000, startAt: 18500 },
        { text: "Daniel: 'Sí, también te amo. Llego pronto.'", duration: 3000, startAt: 22000 }
    ],

    // Llamada 2 (Apagón)
    CALL_2: [
        { text: "Daniel: 'Amor hubo un apagón en toda la ciudad, ¿todo bien en casa?'", duration: 4000, startAt: 0 },
        { text: "Zare: 'Sí... explotó algo cerca. Se fue la luz.'", duration: 3500, startAt: 4500 },
        { text: "Zare: 'Pero Daniel, te juro que escuché pasos en el pasillo... ¡Tengo miedo!'", duration: 4500, startAt: 8500 },
        { text: "Daniel: 'Tranquila, es tu imaginación. Revisa los fusibles, quizás solo hay que cambiarlo...'", duration: 4500, startAt: 13500 },
        { text: "Daniel: 'La caja de fusibles está en el garage.'", duration: 3500, startAt: 18500 },
        { text: "Zare: 'Okey, lo haré. Apresúrate por favor.'", duration: 3500, startAt: 22500 }
    ],

    // 👇 NUEVA: Llamada 3 (La revelación de la cámara)
    CALL_FINAL: [
        { text: "Daniel: '¡Zare! ¡Zare contesta!'", duration: 3000, startAt: 0 },
        { text: "Zare: '¡La luz volvió a morir! ¡Te dije que había alguien aquí!'", duration: 4000, startAt: 3000 },
        { text: "Daniel: 'Escúchame... la cámara de la sala subió un clip a la nube justo antes de la explosión...'", duration: 5500, startAt: 7500 },
        { text: "Daniel: 'Había alguien muy alto... parado detrás de ti en la oscuridad. ¡SAL DE LA CASA AHORA MISMO!'", duration: 6000, startAt: 13500 },
        { text: "Zare: '¡Dios mío! ¡Voy a la puerta principal!'", duration: 3500, startAt: 20000 }
    ],

    // Frases sueltas para el sistema de paranoia
    PARANOIA_TOCANDO: [
        "Zare: '¿Qué fue eso...?'",
        "Zare: '¿Alguien está tocando...?'",
        "Zare: 'No... acabamos de mudarnos, nadie sabe que estamos aquí.'",
        "Zare: 'Solo es el viento... espero.'"
    ],
    PARANOIA_PUERTA: [
        "Zare: '¿Qué fue eso...?'",
        "Zare: '¿Se cerró una puerta?'",
        "Zare: 'Daniel dijo que era la madera vieja... sí, solo eso.'",
        "Zare: 'Odio esta casa.'"
    ]
};

// --- REPRODUCTOR DE DIÁLOGOS ---
export function playDialogueSequence(ui, sequence, onComplete) {
    let maxTime = 0;
    
    sequence.forEach(line => {
        setTimeout(() => {
            ui.showSubtitle(line.text, line.duration);
        }, line.startAt);
        
        if (line.startAt + line.duration > maxTime) {
            maxTime = line.startAt + line.duration;
        }
    });

    if (onComplete) {
        setTimeout(onComplete, maxTime + 500); 
    }
}