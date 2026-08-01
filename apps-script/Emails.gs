/**
 * ABN Group — Launch Event · MAILS
 * ============================================================
 * 4 correos en HTML (light mode, boutique, tipografía fina):
 *   0) INVITACIÓN  — para ENVIAR a la base de invitados (BCC por ronda).
 *   1) Confirmación — al sumarse una persona nueva al Sheet.
 *   2) Reminder jueves 6/8 — "Nos vemos la semana que viene".
 *   3) Reminder lunes 10/8 — "¡Te esperamos mañana!" + dress code.
 *
 * Evento: MARTES 11 DE AGOSTO 2026, 19 a 22 hs.
 * Remitente: comms@abndigital.com.ar (alias "Enviar como").
 *
 * ⚠️ ENVÍO REAL — LEER ANTES DE CORRER
 *   · dryRunInvitacionRonda1()   → LEE y loguea a quién le llegaría (NO envía).
 *   · testMailInvitacion()       → envía SOLO a las casillas de test.
 *   · enviarInvitacionRonda1()   → 🔴 ENVÍA DE VERDAD a la ronda 1. Sin undo.
 * Regla de oro: SIEMPRE correr el dry-run y revisar el número ANTES del envío real.
 * Es seguro re-ejecutar: marca cada fila enviada ("Invitación enviada") y nunca
 * reenvía a un ya-marcado.
 *
 * Para testear (ejecutar a mano desde el editor):
 *   dryRunInvitacionRonda1 · testMailInvitacion · testMailConfirmacion
 *   testMailReminder1 · testMailReminder2
 * (la primera vez pide permiso de Gmail — aceptarlo).
 */

// ───────────────────────── CONFIG ─────────────────────────
var TEST_MODE = true;                                // ← en producción se pone false
// Destinos forzados en test (separados por coma). Se agrega comms@ para que
// lo vea el equipo de comunicación. NUNCA le llega a la base de invitados.
var TEST_EMAIL = 'juanpablo@abndigital.com.ar, comms@abndigital.com.ar';
var REMITENTE_NOMBRE = 'ABN Group';                  // nombre visible del remitente
var REMITENTE_ALIAS = 'comms@abndigital.com.ar';     // alias "Enviar como" (From)

var WEB_URL = 'https://dartsteam.github.io/abn-launch-event/';

var EVENTO = {
  fecha:     'Martes 11 de agosto',
  hora:      '19:00 a 22:00 hs',
  lugar:     'Blas Parera 51, Florida · Piso 6',
  dressCode: 'Elegante sport',
  mapaUrl:   'https://maps.app.goo.gl/rUzkkVGQqchp5KDQA',
  bannerUrl: 'https://dartsteam.github.io/abn-launch-event/og-image.png',
  // Google Calendar — 11/8/2026, 19 a 22 hs, zona Buenos Aires.
  // location = dirección completa y exacta → Google la geocodifica y muestra
  // el mapa embebido (el "Piso 6" va en las notas, no rompe la geocodificación).
  calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
               '&text=' + encodeURIComponent('ABN Group · Launch Event') +
               '&dates=20260811T190000/20260811T220000' +
               '&ctz=America/Argentina/Buenos_Aires' +
               '&location=' + encodeURIComponent('ABN Digital, Blas Parera 51, B1602 Buenos Aires, Provincia de Buenos Aires, Argentina') +
               '&details=' + encodeURIComponent('Te esperamos en el Launch Event de ABN Group. Piso 6. Dress code: Elegante sport.')
};

// Pestañas de la planilla
// (SHEET_GID ya está declarado en Code.gs; acá usamos otro nombre para no chocar)
var CONF_GID      = 587568949;   // pestaña de confirmaciones (RSVP del form)
var INVITADOS_GID = 0;           // pestaña BBDD_Invitados
var COL_RONDA     = 6;           // columna F = número de prioridad / ronda
var COL_TIPO      = 7;           // columna G = "Tipo de mensaje" (Mail / WWP)
var COL_MAIL_INV  = 8;           // columna H = email del invitado
var TIPO_MAIL     = 'Mail';      // solo se envía por email a las filas con este valor en G
var HEADER_ENVIADO = 'Invitación enviada por Email';  // columna de marca (matchea por prefijo, ver getColEnviado_)
var LOTE_BCC = 45;               // destinatarios por mensaje (Apps Script corta ~50; 45 = margen seguro)

// Asuntos
var ASUNTO_INVITACION = '¡Invitación ABN Group Launch Event!';
var ASUNTO_CONF = '¡Confirmado! Te esperamos en el Launch Event de ABN Group';
var ASUNTO_R1   = 'La semana que viene nos vemos — Launch Event de ABN Group';
var ASUNTO_R2   = 'Mañana nos vemos — Launch Event de ABN Group';


// ═══════════════════ FUNCIONES DE TEST (seguras) ═══════════════════
// Todas mandan SOLO a juanpablo@ (TEST_EMAIL) — nunca a la base real.

function testMailInvitacion()   { enviarMail_(TEST_EMAIL, ASUNTO_INVITACION, htmlInvitacion_()); }
function testMailConfirmacion() { enviarMail_(TEST_EMAIL, ASUNTO_CONF, htmlConfirmacion_('Juan')); }
function testMailReminder1()    { enviarMail_(TEST_EMAIL, ASUNTO_R1, htmlReminder1_()); }
function testMailReminder2()    { enviarMail_(TEST_EMAIL, ASUNTO_R2, htmlReminder2_()); }


// ═══════════════════ DRY-RUN INVITACIÓN (NO envía) ═══════════════════
// Lee la base y muestra a quién le llegaría, sin mandar nada.

function dryRunInvitacionRonda1() { return dryRunInvitacion_(1); }
function dryRunInvitacionRonda2() { return dryRunInvitacion_(2); }
function dryRunInvitacionRonda3() { return dryRunInvitacion_(3); }

function dryRunInvitacion_(ronda) {
  var sheet = getSheetByGid_(INVITADOS_GID);
  var colEnv = getColEnviado_(sheet, false);           // solo lectura (0 si no existe aún)
  var d = destinatariosRonda_(sheet, ronda, colEnv);
  Logger.log('── DRY-RUN · Ronda ' + ronda + ' ──');
  Logger.log('Nuevos a enviar: ' + d.nuevos.length + (d.yaEnviados ? ('   ·   ya enviados antes: ' + d.yaEnviados) : ''));
  Logger.log('Primeros 10: ' + (d.nuevos.slice(0, 10).join(', ') || '(ninguno)'));
  Logger.log('⚠️ NO se envió nada. Esto es solo una simulación de lectura.');
  return { ronda: ronda, nuevos: d.nuevos.length, yaEnviados: d.yaEnviados, muestra: d.nuevos.slice(0, 10) };
}


// ═══════════════════ 🔴 ENVÍO REAL DE LA INVITACIÓN ═══════════════════
// ⚠️ ESTAS FUNCIONES ENVÍAN A LAS PERSONAS REALES. No hay undo.
// Correr SIEMPRE el dry-run antes y revisar el número. Un solo mail con
// todos en BCC, desde comms@. Marca cada fila enviada → re-ejecutar no duplica.

function enviarInvitacionRonda1() { return enviarInvitacionReal_(1); }
function enviarInvitacionRonda2() { return enviarInvitacionReal_(2); }
function enviarInvitacionRonda3() { return enviarInvitacionReal_(3); }

function enviarInvitacionReal_(ronda) {
  var sheet = getSheetByGid_(INVITADOS_GID);
  var colEnv = getColEnviado_(sheet, true);            // busca o crea la columna "Invitación enviada"
  var d = destinatariosRonda_(sheet, ronda, colEnv);

  if (!d.nuevos.length) {
    Logger.log('Ronda ' + ronda + ': 0 nuevos para enviar (ya enviados: ' + d.yaEnviados + '). No se mandó nada.');
    return { ronda: ronda, enviados: 0, yaEnviados: d.yaEnviados };
  }

  // Chequeo de cuota diaria: no arrancamos un envío que no podamos terminar.
  var quota = MailApp.getRemainingDailyQuota();
  if (quota < d.nuevos.length) {
    Logger.log('⛔ Cuota diaria insuficiente: quedan ' + quota + ' envíos y hay ' + d.nuevos.length +
               ' destinatarios. NO se mandó nada. Reintentá cuando se reponga la cuota (24hs).');
    return { ronda: ronda, enviados: 0, yaEnviados: d.yaEnviados, error: 'cuota' };
  }

  // Envío en LOTES de BCC (Apps Script limita los destinatarios por mensaje).
  // Se marca cada lote apenas se envía → si un lote posterior falla, los previos
  // quedan registrados y no se reenvían.
  var last = sheet.getLastRow();
  var colVals = sheet.getRange(2, colEnv, last - 1, 1).getValues();
  var ahora = new Date();
  var enviados = 0;
  var totalLotes = Math.ceil(d.nuevos.length / LOTE_BCC);

  for (var ini = 0; ini < d.nuevos.length; ini += LOTE_BCC) {
    var loteMails = d.nuevos.slice(ini, ini + LOTE_BCC);
    var loteFilas = d.filas.slice(ini, ini + LOTE_BCC);

    GmailApp.sendEmail(REMITENTE_ALIAS, ASUNTO_INVITACION, 'Este correo requiere un cliente con HTML.', {
      htmlBody: htmlInvitacion_(),
      name: REMITENTE_NOMBRE,
      from: REMITENTE_ALIAS,
      bcc: loteMails.join(','),
    });

    // Marca este lote y persiste ya mismo.
    for (var k = 0; k < loteFilas.length; k++) colVals[loteFilas[k] - 2][0] = ahora;
    sheet.getRange(2, colEnv, last - 1, 1).setValues(colVals);

    enviados += loteMails.length;
    Logger.log('  · lote enviado: ' + loteMails.length + ' (acumulado ' + enviados + '/' + d.nuevos.length + ')');
  }

  Logger.log('✅ Ronda ' + ronda + ': invitación enviada a ' + enviados + ' destinatarios en ' +
             totalLotes + ' lote(s) de BCC, desde ' + REMITENTE_ALIAS + '. Ya estaban enviados: ' + d.yaEnviados + '.');
  return { ronda: ronda, enviados: enviados, yaEnviados: d.yaEnviados };
}

/** Destinatarios de una ronda, separando nuevos vs ya-enviados (por colEnv). */
function destinatariosRonda_(sheet, ronda, colEnv) {
  var last = sheet.getLastRow();
  if (last < 2) return { nuevos: [], filas: [], yaEnviados: 0 };
  var ancho = Math.max(COL_MAIL_INV, COL_RONDA, colEnv || 1);
  var datos = sheet.getRange(2, 1, last - 1, ancho).getValues();
  var nuevos = [], filas = [], yaEnviados = 0, vistos = {};
  for (var i = 0; i < datos.length; i++) {
    var mail = String(datos[i][COL_MAIL_INV - 1] || '').trim();
    var r = String(datos[i][COL_RONDA - 1]).trim();
    var tipo = String(datos[i][COL_TIPO - 1] || '').trim().toLowerCase();
    // Solo tipo "Mail" (los WWP se invitan por WhatsApp, nunca por email).
    if (tipo !== TIPO_MAIL.toLowerCase()) continue;
    if (r !== String(ronda) || !esEmailValido_(mail) || vistos[mail.toLowerCase()]) continue;
    vistos[mail.toLowerCase()] = true;
    if (colEnv && String(datos[i][colEnv - 1] || '').trim() !== '') { yaEnviados++; continue; }
    nuevos.push(mail);
    filas.push(i + 2); // fila real en la planilla
  }
  return { nuevos: nuevos, filas: filas, yaEnviados: yaEnviados };
}

/**
 * Busca la columna de marca por PREFIJO ("Invitación enviada...") para que un
 * rename (ej. agregarle "por Email") no rompa el seguimiento ni cree duplicados.
 * Con crear=true la crea solo si no existe ninguna.
 */
function getColEnviado_(sheet, crear) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c]).trim().toLowerCase();
    if (h.indexOf('invitación enviada') === 0) return c + 1;   // empieza con "invitación enviada"
  }
  if (!crear) return 0;
  var nueva = lastCol + 1;
  sheet.getRange(1, nueva).setValue(HEADER_ENVIADO);
  return nueva;
}


// ═══════════════════ RECONCILIACIÓN (quién recibió el email) ═══════════════════
// Read-only: NO envía ni borra nada. Cruza la planilla con Gmail (Enviados).
// La primera vez pide permiso de LECTURA de Gmail — aceptalo.

function reconciliarInvitacion() {
  var sheet = getSheetByGid_(INVITADOS_GID);
  var last = sheet.getLastRow();
  var colEnv = getColEnviado_(sheet, false);
  if (!colEnv) { Logger.log('⚠️ No encontré la columna "Invitación enviada…". Nada que reconciliar.'); return; }

  var ancho = Math.max(COL_MAIL_INV, COL_RONDA, COL_TIPO, colEnv, 3);
  var datos = sheet.getRange(2, 1, last - 1, ancho).getValues();

  var mailOK = [], wwpError = [], marcados = {};
  for (var i = 0; i < datos.length; i++) {
    if (String(datos[i][colEnv - 1] || '').trim() === '') continue; // sin marca = no se le envió
    var nombre  = String(datos[i][1] || '').trim();                // B
    var empresa = String(datos[i][2] || '').trim();                // C
    var tipo    = String(datos[i][COL_TIPO - 1] || '').trim();     // G
    var mail    = String(datos[i][COL_MAIL_INV - 1] || '').trim(); // H
    if (mail) marcados[mail.toLowerCase()] = true;
    var linea = '• ' + nombre + ' — ' + empresa + ' — ' + mail;
    if (tipo.toLowerCase() === 'mail') mailOK.push(linea);
    else wwpError.push(linea + '   [Tipo: ' + tipo + ']');
  }

  Logger.log('════════ RECONCILIACIÓN — según la planilla ════════');
  Logger.log('Marcados como "email enviado": ' + (mailOK.length + wwpError.length));
  Logger.log('   · Tipo Mail (correcto):            ' + mailOK.length);
  Logger.log('   · Tipo WWP (recibieron por ERROR): ' + wwpError.length);
  Logger.log('');
  Logger.log('──── WWP que recibieron el email por error ────');
  Logger.log(wwpError.length ? wwpError.join('\n') : '(ninguno)');

  Logger.log('');
  Logger.log('════════ CROSS-CHECK con Gmail (Enviados) ════════');
  try {
    var enGmail = destinatariosDesdeGmail_();
    var setG = {}; enGmail.forEach(function (m) { setG[m.toLowerCase()] = true; });
    Logger.log('Direcciones a las que Gmail dice que se envió: ' + enGmail.length);
    var marcadoSinGmail = Object.keys(marcados).filter(function (m) { return !setG[m]; });
    var gmailSinMarca   = enGmail.filter(function (m) { return !marcados[m.toLowerCase()]; });
    Logger.log('Marcados en planilla pero NO figuran en Gmail: ' + marcadoSinGmail.length +
               (marcadoSinGmail.length ? ('\n   ' + marcadoSinGmail.join('\n   ')) : ''));
    Logger.log('En Gmail pero SIN marca en planilla: ' + gmailSinMarca.length +
               (gmailSinMarca.length ? ('\n   ' + gmailSinMarca.join('\n   ')) : ''));
  } catch (e) {
    Logger.log('No se pudo leer Gmail (¿falta autorizar la lectura?): ' + e);
  }
}

/** Direcciones a las que se envió la invitación, leídas de Gmail (Enviados). */
function destinatariosDesdeGmail_() {
  var threads = GmailApp.search('in:sent subject:"Invitación ABN Group Launch Event"', 0, 100);
  var set = {};
  for (var t = 0; t < threads.length; t++) {
    var msgs = threads[t].getMessages();
    for (var i = 0; i < msgs.length; i++) {
      var campos = [msgs[i].getTo(), msgs[i].getCc(), msgs[i].getBcc()];
      for (var c = 0; c < campos.length; c++) {
        var partes = String(campos[c] || '').split(',');
        for (var p = 0; p < partes.length; p++) {
          var e = extraerEmail_(partes[p]);
          if (e) set[e.toLowerCase()] = true;
        }
      }
    }
  }
  return Object.keys(set);
}

function extraerEmail_(s) {
  var m = String(s).match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/);
  return m ? m[0] : '';
}


// ═══════════════════ ENVÍOS "REALES" (confirmación / reminders) ═══════════════════
// Respetan TEST_MODE. Se disparan por trigger recién con TEST_MODE = false.

/** Confirmación individual. En test va a TEST_EMAIL; en prod al invitado. */
function enviarConfirmacion(nombre, emailInvitado) {
  var to = TEST_MODE ? TEST_EMAIL : emailInvitado;
  if (!to) return;
  enviarMail_(to, ASUNTO_CONF, htmlConfirmacion_(nombre));
}

/** Reminder a TODOS los confirmados en CCO. En test va solo a TEST_EMAIL. */
function enviarReminder(fase) {
  var asunto = (fase === 1) ? ASUNTO_R1 : ASUNTO_R2;
  var html   = (fase === 1) ? htmlReminder1_() : htmlReminder2_();

  if (TEST_MODE) {
    enviarMail_(TEST_EMAIL, asunto, html);
    return;
  }
  var lista = emailsConfirmados_();
  if (!lista.length) return;
  var yo = Session.getActiveUser().getEmail();
  enviarMail_(yo, asunto, html, lista.join(','));
}


// ═══════════════════ TRIGGERS (reminders por fecha) ═══════════════════
// La CONFIRMACIÓN no va acá: se dispara sola con cada envío del formulario
// (se engancha en doPost de Code.gs; ver instrucciones aparte).

// Handlers que dispara cada trigger (sin argumentos).
function triggerReminder1() { enviarReminder(1); }  // jueves 6/8
function triggerReminder2() { enviarReminder(2); }  // lunes 10/8

/**
 * ▶️ Ejecutar UNA vez desde el editor para instalar los 2 triggers por fecha.
 * Es idempotente: borra los previos de estos handlers antes de crear (no duplica).
 *
 * Los reminders respetan TEST_MODE:
 *   · TEST_MODE = true  → el 6 y el 10 se envían SOLO a las casillas de test.
 *   · TEST_MODE = false → se envían a los confirmados ("Sí") en CCO.
 * Podés instalarlos ahora; el trigger corre el código que esté guardado ese día,
 * así que basta con dejar TEST_MODE = false (y guardar) antes del 6/8 para que salgan en serio.
 * Disparan ~10:00 en la zona horaria del proyecto (revisá Configuración → Zona horaria).
 */
function crearTriggersReminders() {
  borrarTriggersReminders();
  ScriptApp.newTrigger('triggerReminder1').timeBased().at(new Date(2026, 7, 6, 10, 0, 0)).create();   // jue 6/8
  ScriptApp.newTrigger('triggerReminder2').timeBased().at(new Date(2026, 7, 10, 10, 0, 0)).create();  // lun 10/8
  Logger.log('✅ Triggers instalados: reminder 1 (jue 6/8 ~10hs) y reminder 2 (lun 10/8 ~10hs).');
}

/** Borra los triggers de los reminders (para limpiar o reinstalar). */
function borrarTriggersReminders() {
  var handlers = ['triggerReminder1', 'triggerReminder2'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
}


// ─────── Envío PROGRAMADO de la invitación (los pendientes de ronda 1) ───────

/** Handler del trigger: envía la invitación pendiente de ronda 1. */
function triggerEnviarInvitacionRonda1() { enviarInvitacionRonda1(); }

/**
 * ▶️ Ejecutar UNA vez para PROGRAMAR el envío de la invitación (ronda 1, los
 * que faltan) para el LUNES 3/8/2026 a las 09:00 (hora Argentina).
 * NO envía nada ahora: solo deja el trigger. Idempotente (no duplica).
 * El lunes a las 9 corre enviarInvitacionRonda1 → manda solo a los NO enviados
 * (respeta la marca, así que los 78 ya enviados no reciben de nuevo).
 */
function programarInvitacionLunes() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'triggerEnviarInvitacionRonda1') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('triggerEnviarInvitacionRonda1')
    .timeBased().at(new Date(2026, 7, 3, 9, 0, 0)).create();   // lunes 3/8/2026 09:00 (Buenos Aires)
  Logger.log('✅ Programado: la invitación a los pendientes de ronda 1 sale el LUNES 3/8 a las 09:00 (Argentina).');
}

/** Cancela el envío programado del lunes (por si hace falta frenarlo). */
function cancelarInvitacionProgramada() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'triggerEnviarInvitacionRonda1') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log(n ? ('🗑️ Envío del lunes cancelado (' + n + ' trigger).') : 'No había envío programado.');
}

/** Chequeo: confirma que el envío del lunes está agendado y cuántos pendientes saldrían. */
function verificarEnvioProgramado() {
  var triggers = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'triggerEnviarInvitacionRonda1';
  });
  if (triggers.length) {
    Logger.log('✅ Envío PROGRAMADO: ' + triggers.length + ' trigger para el lunes 3/8 09:00 (Argentina).');
    Logger.log('   (La hora exacta se ve en ⏰ Activadores.)');
  } else {
    Logger.log('⚠️ NO hay envío programado. Corré programarInvitacionLunes.');
  }
  var sheet = getSheetByGid_(INVITADOS_GID);
  var colEnv = getColEnviado_(sheet, false);
  var d = destinatariosRonda_(sheet, 1, colEnv);
  Logger.log('Pendientes de ronda 1 que saldrían el lunes: ' + d.nuevos.length);
  Logger.log('Primeros 10: ' + (d.nuevos.slice(0, 10).join(', ') || '(ninguno)'));
}


// ═══════════════════ HELPERS ═══════════════════

/** Envía con From = comms@ (alias). bcc opcional. */
function enviarMail_(to, asunto, html, bcc) {
  var opts = { htmlBody: html, name: REMITENTE_NOMBRE, from: REMITENTE_ALIAS };
  if (bcc) opts.bcc = bcc;
  GmailApp.sendEmail(to, asunto, 'Este correo requiere un cliente con HTML.', opts);
}

/** Emails únicos de la columna Mail con Asistencia = "Sí" (confirmados). */
function emailsConfirmados_() {
  var sheet = getSheetByGid_(CONF_GID);
  var filas = sheet.getLastRow() - 1;
  if (filas <= 0) return [];
  var datos = sheet.getRange(2, 3, filas, 2).getValues(); // col 3 Mail, col 4 Asistencia
  var vistos = {}, out = [];
  for (var i = 0; i < datos.length; i++) {
    var mail = String(datos[i][0]).trim();
    var asiste = String(datos[i][1]).trim();
    if (asiste === 'Sí' && esEmailValido_(mail) && !vistos[mail.toLowerCase()]) {
      vistos[mail.toLowerCase()] = true;
      out.push(mail);
    }
  }
  return out;
}

function getSheetByGid_(gid) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return sheets[0];
}

function esEmailValido_(m) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m);
}

function primerNombre_(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || '';
}


// ═══════════════════ CONTENIDO DE CADA MAIL ═══════════════════

function htmlInvitacion_() {
  return htmlEmail_({
    eyebrow: 'Invitación',
    titulo: '¡Hola!',
    parrafos: [
      'Se acerca un día muy especial para todos los que formamos parte de <b style="font-weight:600;color:#2b2622;">ABN Digital</b>, <b style="font-weight:600;color:#2b2622;">Hike The Cloud</b>, <b style="font-weight:600;color:#2b2622;">Detrics</b> y <b style="font-weight:600;color:#2b2622;">ABN Studio</b>: el lanzamiento de <b style="font-weight:600;color:#2b2622;">ABN Group</b>.',
      'Bajo una premisa que nos llena de orgullo — <em>Nueva identidad, la misma esencia</em> — queremos invitarte a compartir esta tarde de festejo con nosotros.',
      'Por favor, confirmanos tu asistencia con el botón de abajo.'
    ],
    cierre: '¡Ojalá nos puedas acompañar para festejar esta nueva etapa juntos!',
    firma: 'Un abrazo,<br>El equipo de ABN Group',
    ctaConfirmarUrl: WEB_URL,
  });
}

function htmlConfirmacion_(nombre) {
  var n = primerNombre_(nombre);
  return htmlEmail_({
    eyebrow: 'Confirmación de asistencia',
    titulo: n ? ('Gracias por confirmar, ' + n) : 'Gracias por confirmar',
    parrafos: [
      'Reservamos tu lugar en el <em>Launch Event de ABN Group</em>.',
      'Nos encontramos para presentarte nuestra nueva identidad y celebrarlo juntos.'
    ],
    cierre: '¡Te esperamos!',
  });
}

function htmlReminder1_() {  // jueves 6/8
  return htmlEmail_({
    eyebrow: 'Cada vez menos',
    titulo: 'Nos vemos la semana que viene',
    parrafos: [
      'Se acerca el <em>Launch Event de ABN Group</em>.',
      '¡Cada vez falta menos para encontrarnos y festejar este nuevo lanzamiento!'
    ],
  });
}

function htmlReminder2_() {  // lunes 10/8
  return htmlEmail_({
    eyebrow: 'Llegó el día',
    titulo: '¡Te esperamos mañana!',
    parrafos: [
      'Nos encontramos a las 19 hs en nuestras oficinas para compartir una tarde de festejo.'
    ],
    cierre: '¡Nos vemos ahí!',
    dressCodeDestacado: true,
  });
}


// ═══════════════════ PLANTILLA HTML (light · boutique) ═══════════════════

function htmlEmail_(cfg) {
  var bg = '#f3f0e9';      // marfil cálido (fondo)
  var card = '#ffffff';    // tarjeta
  var ink = '#2b2622';     // texto principal (casi negro cálido)
  var body = '#6e675f';    // texto secundario
  var muted = '#a39a8d';   // labels / taupe
  var line = 'rgba(43,38,34,0.10)';
  var font = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  var parrafos = (cfg.parrafos || []).map(function (p) {
    return '<p style="margin:0 0 16px;font-family:' + font + ';font-size:15px;font-weight:300;line-height:1.75;color:' + body + ';">' + p + '</p>';
  }).join('');

  var cierre = cfg.cierre
    ? '<p style="margin:4px 0 0;font-family:' + font + ';font-size:18px;font-weight:400;line-height:1.5;color:' + ink + ';letter-spacing:0.01em;">' + cfg.cierre + '</p>'
    : '';

  var firma = cfg.firma
    ? '<p style="margin:22px 0 0;font-family:' + font + ';font-size:14px;font-weight:300;line-height:1.7;color:' + body + ';">' + cfg.firma + '</p>'
    : '';

  function fila(label, valor) {
    return '<tr>' +
      '<td style="padding:13px 0;border-top:1px solid ' + line + ';font-family:' + font + ';font-size:11px;font-weight:400;letter-spacing:0.18em;text-transform:uppercase;color:' + muted + ';">' + label + '</td>' +
      '<td align="right" style="padding:13px 0;border-top:1px solid ' + line + ';font-family:' + font + ';font-size:14px;font-weight:400;color:' + ink + ';">' + valor + '</td>' +
    '</tr>';
  }
  var lugarLink = '<a href="' + EVENTO.mapaUrl + '" style="color:' + ink + ';text-decoration:none;border-bottom:1px solid ' + muted + ';">' + EVENTO.lugar + '</a>';
  var filasDetalle = fila('Fecha', EVENTO.fecha) + fila('Hora', EVENTO.hora) + fila('Lugar', lugarLink);
  if (!cfg.dressCodeDestacado) filasDetalle += fila('Dress code', EVENTO.dressCode);
  var detalle = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 30px;">' + filasDetalle + '</table>';

  var dressDestacado = cfg.dressCodeDestacado
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">' +
        '<tr><td style="background:#faf8f3;border:1px solid ' + line + ';border-radius:12px;padding:18px 20px;text-align:center;">' +
          '<div style="font-family:' + font + ';font-size:10px;font-weight:400;letter-spacing:0.26em;text-transform:uppercase;color:' + muted + ';margin-bottom:7px;">Dress code</div>' +
          '<div style="font-family:' + font + ';font-size:19px;font-weight:300;color:' + ink + ';letter-spacing:0.02em;">' + EVENTO.dressCode + '</div>' +
        '</td></tr></table>'
    : '';

  function boton(href, texto, fondo, color, borde) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">' +
      '<tr><td align="center" style="border-radius:40px;background:' + fondo + ';' + (borde ? 'border:1px solid ' + borde + ';' : '') + '">' +
        '<a href="' + href + '" target="_blank" style="display:inline-block;padding:15px 34px;font-family:' + font + ';font-size:11px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:' + color + ';text-decoration:none;">' + texto + '</a>' +
      '</td></tr></table>';
  }
  var borde = 'rgba(43,38,34,0.28)';
  var botones;
  if (cfg.ctaConfirmarUrl) {
    // Invitación: "Confirmar" es el botón principal; calendario y mapa secundarios.
    botones = boton(cfg.ctaConfirmarUrl, 'Confirmar asistencia', ink, bg, '') +
              boton(EVENTO.calendarUrl, 'Agregar al calendario', 'transparent', ink, borde) +
              boton(EVENTO.mapaUrl, 'Ver cómo llegar', 'transparent', ink, borde);
  } else {
    botones = boton(EVENTO.calendarUrl, 'Agregar al calendario', ink, bg, '') +
              boton(EVENTO.mapaUrl, 'Ver cómo llegar', 'transparent', ink, borde);
  }

  return '' +
'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
'<body style="margin:0;padding:0;background:' + bg + ';">' +
  '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Launch Event de ABN Group · ' + EVENTO.fecha + ' · ' + EVENTO.hora + '</div>' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + bg + ';padding:36px 14px;font-family:' + font + ';">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:' + card + ';border:1px solid ' + line + ';border-radius:20px;overflow:hidden;">' +
        '<tr><td style="padding:0;line-height:0;">' +
          '<img src="' + EVENTO.bannerUrl + '" width="600" alt="ABN Group" style="display:block;width:100%;height:auto;border:0;">' +
        '</td></tr>' +
        '<tr><td style="padding:44px 46px 48px;">' +
          '<div style="font-family:' + font + ';font-size:11px;font-weight:400;letter-spacing:0.26em;text-transform:uppercase;color:' + muted + ';margin-bottom:16px;">' + (cfg.eyebrow || '') + '</div>' +
          '<h1 style="margin:0 0 22px;font-family:' + font + ';font-size:30px;line-height:1.2;font-weight:200;color:' + ink + ';letter-spacing:-0.01em;">' + cfg.titulo + '</h1>' +
          parrafos +
          cierre +
          firma +
          '<div style="height:28px;"></div>' +
          detalle +
          dressDestacado +
          botones +
        '</td></tr>' +
        '<tr><td style="padding:24px 46px;border-top:1px solid ' + line + ';text-align:center;">' +
          '<div style="font-family:' + font + ';font-size:10px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:' + muted + ';">ABN Group · Digital · Detrics · Hike · Studio</div>' +
        '</td></tr>' +
      '</table>' +
      '<div style="font-family:' + font + ';font-size:11px;font-weight:300;color:' + muted + ';margin-top:18px;">Blas Parera 51, Florida · Piso 6</div>' +
    '</td></tr>' +
  '</table>' +
'</body></html>';
}
