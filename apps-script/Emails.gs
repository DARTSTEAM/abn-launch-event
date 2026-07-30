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
 * ⚠️ SEGURIDAD — MUY IMPORTANTE
 * Este archivo NO tiene ninguna función que envíe la invitación al
 * listado real. Solo hay:
 *   · dryRunInvitacionRonda1()  → LEE y loguea a quién le llegaría (NO envía).
 *   · testMailInvitacion()      → envía SOLO a juanpablo@ (TEST_EMAIL).
 * El envío real a la base se agrega recién cuando se apruebe todo.
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
var COL_MAIL_INV  = 8;           // columna H = email del invitado

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
  var emails = emailsInvitados_(ronda);
  Logger.log('── DRY-RUN · Ronda ' + ronda + ' ──');
  Logger.log('Destinatarios: ' + emails.length);
  Logger.log('Primeros 10: ' + (emails.slice(0, 10).join(', ') || '(ninguno)'));
  Logger.log('⚠️ NO se envió nada. Esto es solo una simulación de lectura.');
  return { ronda: ronda, total: emails.length, muestra: emails.slice(0, 10) };
}

/*
 * ⚠️ ENVÍO REAL DE LA INVITACIÓN — TODAVÍA NO EXISTE A PROPÓSITO.
 * Se agrega recién cuando se apruebe todo, con: BCC por ronda, From=comms@,
 * marca de "enviado" por fila (anti-doble-envío) y dry-run previo obligatorio.
 */


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


// ═══════════════════ HELPERS ═══════════════════

/** Envía con From = comms@ (alias). bcc opcional. */
function enviarMail_(to, asunto, html, bcc) {
  var opts = { htmlBody: html, name: REMITENTE_NOMBRE, from: REMITENTE_ALIAS };
  if (bcc) opts.bcc = bcc;
  GmailApp.sendEmail(to, asunto, 'Este correo requiere un cliente con HTML.', opts);
}

/** Emails de invitados de una ronda (col H) donde col F = ronda. Válidos y únicos. */
function emailsInvitados_(ronda) {
  var sheet = getSheetByGid_(INVITADOS_GID);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var ancho = Math.max(COL_MAIL_INV, COL_RONDA);
  var datos = sheet.getRange(2, 1, last - 1, ancho).getValues(); // desde fila 2 (salta encabezado)
  var vistos = {}, out = [];
  for (var i = 0; i < datos.length; i++) {
    var mail = String(datos[i][COL_MAIL_INV - 1] || '').trim();
    var r = String(datos[i][COL_RONDA - 1]).trim();
    if (r === String(ronda) && esEmailValido_(mail) && !vistos[mail.toLowerCase()]) {
      vistos[mail.toLowerCase()] = true;
      out.push(mail);
    }
  }
  return out;
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
      'Se acerca un día muy especial para todos los que formamos parte de <em>ABN Digital</em>, <em>Hike The Cloud</em>, <em>Detrics</em> y <em>ABN Studio</em>: el lanzamiento de <em>ABN Group</em>.',
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
