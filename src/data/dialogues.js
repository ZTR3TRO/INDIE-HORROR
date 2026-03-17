// ─────────────────────────────────────────────────────────────────────────────
//  DIALOGUES — Sistema de diálogos basado en delta-time del game loop
//
//  En vez de setTimeout (reloj del SO, ignora el estado de pausa),
//  los diálogos avanzan solo cuando el game loop los actualiza con
//  updateDialogues(delta). Como el loop ya devuelve early si isPaused(),
//  los diálogos se congelan y reanudan gratis, sin clearTimeout ni flags.
// ─────────────────────────────────────────────────────────────────────────────

// --- GUION DEL JUEGO ---
export const DIALOGUES = {

    // Llamada 1 (Cinemática inicial)
    CALL_1: [
        { text: "Daniel: 'Hola amor, ya salí del trabajo, voy en camino...'",                                            duration: 3500, startAt: 0     },
        { text: "Daniel: 'Hay mucha lluvia de este lado, ¿qué tal está todo allá?'",                                    duration: 3500, startAt: 4000  },
        { text: "Zare: 'Aquí también... Oye, esta casa nueva me da escalofríos. Escucho ruidos raros.'",                duration: 4500, startAt: 8000  },
        { text: "Daniel: 'Amor, nos acabamos de mudar. Es una casa vieja, la madera suena. No te sugestiones.'",        duration: 5000, startAt: 13000 },
        { text: "Zare: 'De acuerdo... Vente con cuidado, te amo.'",                                                     duration: 3000, startAt: 18500 },
        { text: "Daniel: 'Sí, también te amo. Llego pronto.'",                                                          duration: 3000, startAt: 22000 },
    ],

    // Llamada 2 (Apagón)
    CALL_2: [
        { text: "Daniel: 'Amor hubo un apagón en toda la ciudad, ¿todo bien en casa?'",                                 duration: 4000, startAt: 0     },
        { text: "Zare: 'Sí... explotó algo cerca. Se fue la luz.'",                                                     duration: 3500, startAt: 4500  },
        { text: "Zare: 'Pero Daniel, te juro que escuché pasos en el pasillo... ¡Tengo miedo!'",                        duration: 4500, startAt: 8500  },
        { text: "Daniel: 'Tranquila, es tu imaginación. Revisa los fusibles, hay que cambiarlos...'",                   duration: 4500, startAt: 13500 },
        { text: "Daniel: 'La caja de fusibles está en el garaje.'",                                                     duration: 3500, startAt: 18500 },
        { text: "Zare: 'Okey, lo haré. Apresúrate por favor.'",                                                         duration: 3500, startAt: 22500 },
    ],

    // Llamada 3 (La revelación de la cámara)
    CALL_FINAL: [
        { text: "Daniel: '¡Zare! ¡Zare contesta!'",                                                                     duration: 3000, startAt: 0     },
        { text: "Zare: '¡La luz volvió a morir! ¡Daniel, te juro que vi algo... no sé si estoy perdiendo la cabeza!'", duration: 5000, startAt: 3000  },
        { text: "Daniel: 'Escúchame... la cámara de la sala subió un clip a la nube justo antes de la explosión...'",  duration: 5500, startAt: 8500  },
        { text: "Daniel: 'No estás loca. Había algo muy alto parado detrás de ti. Lleva horas ahí. ¡SAL AHORA!'",      duration: 5500, startAt: 14500 },
        { text: "Zare: '¡Dios mío... sabía que no era mi imaginación! ¡Voy a la puerta!'",                              duration: 4000, startAt: 20500 },
    ],

    // Frases sueltas para el sistema de paranoia
    PARANOIA_TOCANDO: [
        "Zare: '¿Qué fue eso...?'",
        "Zare: '¿Alguien está tocando...?'",
        "Zare: 'No... acabamos de mudarnos, nadie sabe que estamos aquí.'",
        "Zare: 'Solo es el viento... espero.'"
    ],
    PARANOIA_PUERTA: [
        "Zare: 'Juro que escuché moverse algo...'",
        "Zare: '¿Se movió eso solo?'",
        "Zare: 'Daniel dijo que era la madera vieja... sí, solo eso.'",
        "Zare: 'Odio esta casa.'"
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
//  Estado interno
// ─────────────────────────────────────────────────────────────────────────────

// Secuencia activa — null si no hay nada reproduciéndose
// {
//   lines:      [{ text, duration, startAt }]  — normalizados a startAt relativo a 0
//   elapsed:    number                         — ms acumulados desde que arrancó
//   nextLine:   number                         — índice de la próxima línea a mostrar
//   totalMs:    number                         — duración total de la secuencia
//   onComplete: fn | null
// }
let _seq = null;

// ─────────────────────────────────────────────────────────────────────────────
//  API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Arranca una secuencia de diálogos.
 * Cancela cualquier secuencia anterior automáticamente.
 *
 * @param {object} ui            — objeto con showSubtitle(text, ms)
 * @param {Array}  sequence      — array de { text, duration, startAt }
 * @param {Function} onComplete  — callback al terminar
 */
export function playDialogueSequence(ui, sequence, onComplete) {
    window._ui = ui; // referencia global usada en updateDialogues

    // Normalizar startAt: el primero empieza en 0
    const base = sequence[0].startAt;
    const lines = sequence.map(l => ({ ...l, startAt: l.startAt - base }));

    const totalMs = lines[lines.length - 1].startAt
                  + lines[lines.length - 1].duration
                  + 500; // margen tras la última línea

    _seq = { lines, elapsed: 0, nextLine: 0, totalMs, onComplete: onComplete ?? null };
}

/**
 * Debe llamarse desde el game loop con el delta del frame (en segundos).
 * Si el loop está pausado no se llama → los diálogos se congelan solos.
 */
export function updateDialogues(delta) {
    if (!_seq) return;

    _seq.elapsed += delta * 1000; // convertir a ms

    // Mostrar líneas cuyo startAt ya pasó
    while (_seq.nextLine < _seq.lines.length) {
        const line = _seq.lines[_seq.nextLine];
        if (_seq.elapsed >= line.startAt) {
            window._ui?.showSubtitle(line.text, line.duration);
            _seq.nextLine++;
        } else {
            break; // las siguientes también están en el futuro
        }
    }

    // ¿Terminó la secuencia?
    if (_seq.elapsed >= _seq.totalMs) {
        const cb = _seq.onComplete;
        _seq = null;
        if (cb) cb();
    }
}

/**
 * Cancela la secuencia activa sin ejecutar onComplete.
 * Útil si una escena cambia abruptamente.
 */
export function stopDialogues() {
    _seq = null;
}

// ── Compatibilidad con pauseUI.js (ya no necesitan hacer nada) ───────────────
// El pause lo maneja el game loop al no llamar updateDialogues cuando isPaused().
// Estas funciones se mantienen para no romper imports existentes.
export function pauseDialogues()  { /* no-op: el game loop ya no avanza el delta */ }
export function resumeDialogues() { /* no-op: el game loop reanuda sólo            */ }