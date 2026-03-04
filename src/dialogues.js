// --- GUION DEL JUEGO ---
export const DIALOGUES = {
    
    // Llamada 1 (Cinemática inicial)
    CALL_1: [
        { text: "Daniel: 'Hola amor, ya salí del trabajo, voy en camino...'", duration: 4000, startAt: 0 },
        { text: "Daniel: 'Hay mucha lluvia de este lado, ¿qué tal está todo allá?'", duration: 4000, startAt: 4000 },
        { text: "Zare: 'Hola amor, sí aquí también está la lluvia muy fuerte.'", duration: 4000, startAt: 8000 },
        { text: "Zare: 'Vente con cuidado, te amo.'", duration: 3000, startAt: 12000 },
        { text: "Daniel: 'Sí, también te amo.'", duration: 3000, startAt: 15000 }
    ],

    // Llamada 2 (Apagón)
    CALL_2: [
        { text: "Daniel: 'Amor hubo un apagón en toda la ciudad, ¿todo bien en casa?'", duration: 4500, startAt: 0 },
        { text: "Zare: 'Sí, todo bien pero parece que se fue la luz...'", duration: 4000, startAt: 4500 },
        { text: "Zare: 'Explotó algo cerca de aquí.'", duration: 3500, startAt: 8500 },
        { text: "Daniel: 'Revisa los fusibles, quizás solo hay que cambiarlo...'", duration: 4500, startAt: 12000 },
        { text: "Daniel: 'La caja de fusibles está en el garage.'", duration: 4000, startAt: 16500 },
        { text: "Zare: 'Okey amor, lo haré, hablamos luego.'", duration: 4000, startAt: 20500 }
    ],

    // Frases sueltas para el sistema de paranoia
    PARANOIA_TOCANDO: [
        "Zare: '¿Qué fue eso...?'",
        "Zare: '¿Alguien está tocando...?'",
        "Zare: 'Juro que escuché algo...'",
        "Zare: 'Solo es el viento... espero.'"
    ],
    PARANOIA_PUERTA: [
        "Zare: '¿Qué fue eso...?'",
        "Zare: '¿Se cerró una puerta?'",
        "Zare: 'Juro que escuché algo...'",
        "Zare: 'Solo es el viento... espero.'"
    ]
};

// --- REPRODUCTOR DE DIÁLOGOS ---
// Esta función lee el guion y muestra los subtítulos automáticamente
export function playDialogueSequence(ui, sequence, onComplete) {
    let maxTime = 0;
    
    sequence.forEach(line => {
        setTimeout(() => {
            ui.showSubtitle(line.text, line.duration);
        }, line.startAt);
        
        // Calculamos cuándo termina el diálogo más largo
        if (line.startAt + line.duration > maxTime) {
            maxTime = line.startAt + line.duration;
        }
    });

    // Si pasamos una función para ejecutar al final (ej. cambiar de cámara o dar misión)
    if (onComplete) {
        setTimeout(onComplete, maxTime + 500); // 500ms de respiro al final
    }
}