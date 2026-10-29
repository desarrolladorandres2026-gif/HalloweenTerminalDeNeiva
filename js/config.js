/*
 * Configuración central. Todos los tiempos están en milisegundos desde que
 * el visitante pulsa "ENTRAR A LA EXPERIENCIA". Ajústalos cuando llegue la música real.
 */
window.CONFIG = {
  audioSrc: 'assets/audio/halloween.mp3', // archivo aún por incorporar
  volume: 0.8,
  audioReactive: false,  // la luz late con los graves (solo si se sirve por http/https)
  syncToAudio: false,    // true: la línea de tiempo sigue audio.currentTime en vez del reloj

  photoSrc: '', // fachada del Terminal: pon 'assets/images/terminal.jpg' cuando tengas la foto

  breakHits: 10,         // toques para romper la calabaza de la introducción
  secretClicks: 7,       // (después de romperla)        // clics sobre la calabaza para el mensaje oculto
  secretHold: 9000,
  secretText: 'El verdadero espíritu de Halloween está en compartir con quienes hacen posible cada viaje',

  // Marcas de tiempo (ms). Cada clave dispara un manejador en main.js.
  timeline: {
    ember: 300,            // primeras brasas
    glow: 500,             // resplandor tenue
    smoke: 1200,           // humo
    reveal: 2200,          // la calabaza emerge
    interactive: 3200,     // la calabaza responde; aparece ¡SORPRÉNDEME!
    hint: 4200,            // aparece DESCUBRIR EL MISTERIO
    bats: 6000,            // permite murciélagos ocasionales
    transition: 13000,     // transición automática (el botón o 3 clics la adelantan)
    terminal: 13700,       // nombre del Terminal (aparece REVELAR LA INVITACIÓN)
    terminalOut: 17800,
    announceTitle: 18300,
    announceSub: 18800,
    announceDate: 19250,
    announceInst: 19650,
    announceInvite: 20050,
    end: 21800             // aparecen EXPLORAR EFECTOS y REPETIR EXPERIENCIA
  }
};
