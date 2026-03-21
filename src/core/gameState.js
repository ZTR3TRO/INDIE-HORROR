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

// ── Helper: descartar sombra y registrarla en GS ──────────────────────────────
// Fuente única de verdad — evita que interaction.js y main.js dupliquen la lógica.
// dismissShadow se inyecta desde main.js para evitar dependencia circular con screamer.js.
let _dismissShadowFn = null;
export function setDismissShadowFn(fn) { _dismissShadowFn = fn; }

export function dismissAndTrack(id) {
    _dismissShadowFn?.(id);
    if (!GS.shadowsDismissed.includes(id)) {
        GS.shadowsDismissed.push(id);
    }
}

// ── Misión activa inferida desde el estado ────────────────────────────────────
// Fuente única de verdad para saveSystem y cualquier otro módulo que la necesite.
export function getActiveMission() {
    if (GS.numpadDialogShown && GS.cluesFound >= 4)  return 'Introduce el código para salir';
    if (GS.numpadDialogShown)                         return `Busca las pistas del código (${GS.cluesFound}/4)`;
    if (GS.finalCallAnswered && GS.cluesFound >= 4)   return 'Regresa a la puerta principal';
    if (GS.finalCallAnswered)                         return 'Escapa por la puerta principal';
    if (GS.batteriesCollected === 3)                  return 'Regresa a la caja de fusibles';
    if (GS.batteriesCollected > 0)                    return `Buscar los fusibles (${GS.batteriesCollected}/3)`;
    if (GS.hasKey)                                    return 'Abre la puerta del garaje';
    if (GS.powerOutageAnswered)                       return 'Buscar la llave del garaje';
    if (GS.powerOutageCall)                           return 'Ve a la caja de fusibles en el garaje';
    return '';
}