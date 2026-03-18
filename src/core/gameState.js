// ─────────────────────────────────────────────────────────────────────────────
//  gameState.js — Estado centralizado del juego
//
//  Un único objeto mutable con todos los flags de progreso.
//  Evita las 15+ variables sueltas en main.js y facilita futuras
//  funcionalidades como guardar/cargar partida.
// ─────────────────────────────────────────────────────────────────────────────

export const GS = {
    // ── Estado principal de la máquina de estados ───────────────────────────
    state:     'START',   // estado actual del juego
    timer:      0,        // segundos desde que inició el estado actual
    paranoia:   0,        // temporizador para eventos de paranoia

    // ── Progreso del juego ───────────────────────────────────────────────────
    hasKey:              false,
    batteriesCollected:  0,
    hasUVLamp:           false,
    uvMode:              'off',   // 'off' | 'normal' | 'uv'

    // ── Estado de sombras scripted ───────────────────────────────────────────
    // Registra cuáles sombras ya fueron descartadas para no recrearlas al cargar
    shadowsDismissed: [],  // array de ids: ['closet', 'hallway', 'patio', 'garage']

    // ── Pistas del código ────────────────────────────────────────────────────
    // Cuántas de las 4 fuentes del código ha descubierto el jugador
    // (libro, laptop, piedra ritual, marca UV)
    cluesFound:          0,
    clueBook:            false,
    clueLaptop:          false,
    clueStone:           false,
    clueUV:              false,

    // ── Flags de eventos únicos ──────────────────────────────────────────────
    doorHintShown:       false,
    tutorialShown:       false,
    powerOutageCall:     false,
    powerOutageAnswered: false,
    powerRestored:       false,
    fuseboxUsed:         false,
    numpadDialogShown:   false,
    finalCallTriggered:  false,
    finalCallAnswered:   false,
    endingTriggered:     false,

    // ── Estado de UIs abiertas ───────────────────────────────────────────────
    isLaptopOpen:   false,
    isNumpadOpen:   false,
    isBookOpen:     false,
    isStoneOpen:    false,
    isFuseboxOpen:  false,

    // ── Coleccionables ────────────────────────────────────────────────────────
    fugglers: [],   // ids de fugglers recogidos: ['fuggler_1', 'fuggler_2', ...]

    // ── Teclas del ending (independientes del PointerLock) ──────────────────
    endingKeys: { forward: false, backward: false, left: false, right: false },
};