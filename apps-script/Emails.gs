/**
 * ABN Group — Launch Event · MAILS
 * ------------------------------------------------------------
 * 3 correos en HTML (mismo look & feel que la invitación):
 *   1) Confirmación — al sumarse una persona nueva al Sheet.
 *   2) Reminder 30/7 — "nos vemos en una semana".
 *   3) Reminder 5/8  — "los esperamos" + dress code.
 *
 * MODO TEST: mientras TEST_MODE = true, TODO se manda forzado a
 * TEST_EMAIL (juanpablo@abndigital.com.ar) para poder iterar el diseño.
 *
 * Para probar: ejecutá a mano desde el editor
 *   testMailConfirmacion() · testMailReminder30() · testMailReminder5()
 * (la primera vez va a pedir permiso para enviar correos — aceptalo).
 */

// ───────────────────────── CONFIG ─────────────────────────
var TEST_MODE = true;                               // ← en producción se pone false
var TEST_EMAIL = 'juanpablo@abndigital.com.ar';     // destino forzado en test
var REMITENTE_NOMBRE = 'ABN Group';                 // nombre visible del remitente

var EVENTO = {
  fecha:     'Jueves 6 de agosto',
  hora:      '19:00 a 23:00 hs',
  lugar:     'Blas Parera 51, Florida · Piso 6',
  dressCode: 'Elegante sport',
  mapaUrl:   'https://maps.app.goo.gl/rUzkkVGQqchp5KDQA',
  bannerUrl: 'https://dartsteam.github.io/abn-launch-event/og-image.png',
  // Google Calendar — 6/8/2026, 19 a 23 hs, zona Buenos Aires
  calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
               '&text=' + encodeURIComponent('ABN Group · Launch Event') +
               '&dates=20260806T190000/20260806T230000' +
               '&ctz=America/Argentina/Buenos_Aires' +
               '&location=' + encodeURIComponent('Blas Parera 51, Florida - Piso 6') +
               '&details=' + encodeURIComponent('Te esperamos en el Launch Event de ABN Group. Dress code: Elegante sport.')
};

// Asuntos
var ASUNTO_CONF = '¡Confirmado! Te esperamos en el Launch Event de ABN Group';
var ASUNTO_R30  = 'Falta una semana — Launch Event de ABN Group';
var ASUNTO_R5   = 'Mañana nos vemos — Launch Event de ABN Group';


// ─────────────────────── FUNCIONES DE TEST ───────────────────────
// Ejecutá estas desde el editor. Mandan a juanpablo@ (TEST_EMAIL).

function testMailConfirmacion() {
  enviarMail_(TEST_EMAIL, ASUNTO_CONF, htmlConfirmacion_('Juan'));
}

function testMailReminder30() {
  enviarMail_(TEST_EMAIL, ASUNTO_R30, htmlReminder30_('Juan'));
}

function testMailReminder5() {
  enviarMail_(TEST_EMAIL, ASUNTO_R5, htmlReminder5_('Juan'));
}


// ─────────────────────── ENVÍOS "REALES" ───────────────────────
// (Se usan después, cuando aprobemos el diseño. Respetan TEST_MODE.)

/** Confirmación individual. En test va a TEST_EMAIL; en prod al invitado. */
function enviarConfirmacion(nombre, emailInvitado) {
  var to = TEST_MODE ? TEST_EMAIL : emailInvitado;
  if (!to) return;
  enviarMail_(to, ASUNTO_CONF, htmlConfirmacion_(nombre));
}

/** Reminder a TODOS los confirmados en CCO. En test va solo a TEST_EMAIL. */
function enviarReminder(fase) {
  var asunto = (fase === 30) ? ASUNTO_R30 : ASUNTO_R5;
  var html   = (fase === 30) ? htmlReminder30_('') : htmlReminder5_('');

  if (TEST_MODE) {
    enviarMail_(TEST_EMAIL, asunto, html);
    return;
  }
  var lista = emailsConfirmados_();
  if (!lista.length) return;
  var yo = Session.getActiveUser().getEmail();
  MailApp.sendEmail(yo, asunto, 'Este correo requiere HTML.', {
    htmlBody: html, name: REMITENTE_NOMBRE, bcc: lista.join(',')
  });
}


// ─────────────────────── HELPERS ───────────────────────

function enviarMail_(to, asunto, html) {
  MailApp.sendEmail(to, asunto, 'Este correo requiere un cliente con HTML.', {
    htmlBody: html,
    name: REMITENTE_NOMBRE,
  });
}

/** Emails únicos de la columna Mail con Asistencia = "Sí". */
function emailsConfirmados_() {
  var sheet = getTargetSheet_();
  var filas = sheet.getLastRow() - 1;
  if (filas <= 0) return [];
  var datos = sheet.getRange(2, 3, filas, 2).getValues(); // col 3 Mail, col 4 Asistencia
  var vistos = {}, out = [];
  for (var i = 0; i < datos.length; i++) {
    var mail = String(datos[i][0]).trim();
    var asiste = String(datos[i][1]).trim();
    if (asiste === 'Sí' && mail && !vistos[mail.toLowerCase()]) {
      vistos[mail.toLowerCase()] = true;
      out.push(mail);
    }
  }
  return out;
}

function primerNombre_(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || '';
}


// ─────────────────────── CONTENIDO DE CADA MAIL ───────────────────────

function htmlConfirmacion_(nombre) {
  var n = primerNombre_(nombre);
  return htmlEmail_({
    eyebrow: 'Confirmación de asistencia',
    titulo: n ? ('¡Gracias por confirmar, ' + n + '!') : '¡Gracias por confirmar!',
    parrafos: [
      'Reservamos tu lugar en el <strong>Launch Event de ABN Group</strong>.',
      'Nos encontramos para presentarte nuestra nueva identidad y celebrarlo juntos. Te esperamos.'
    ],
  });
}

function htmlReminder30_(nombre) {
  return htmlEmail_({
    eyebrow: 'Falta una semana',
    titulo: 'Nos vemos en una semana',
    parrafos: [
      'Se acerca el <strong>Launch Event de ABN Group</strong>.',
      'En una semana te presentamos nuestra nueva identidad. Guardá la fecha y nos vemos ahí.'
    ],
  });
}

function htmlReminder5_(nombre) {
  return htmlEmail_({
    eyebrow: 'Es mañana',
    titulo: '¡Te esperamos mañana!',
    parrafos: [
      'Mañana es el gran día: el <strong>Launch Event de ABN Group</strong>.',
      'Te esperamos para vivirlo juntos.'
    ],
    dressCodeDestacado: true,
  });
}


// ─────────────────────── PLANTILLA HTML (una sola) ───────────────────────

function htmlEmail_(cfg) {
  var ash = '#f9f7f2', base = '#06060f', card = '#0e0e1c';
  var accent = '#8f9bff', muted = 'rgba(249,247,242,0.62)', line = 'rgba(249,247,242,0.12)';

  var parrafos = (cfg.parrafos || []).map(function (p) {
    return '<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:' + muted + ';">' + p + '</p>';
  }).join('');

  // Bloque de datos del evento
  function fila(label, valor) {
    return '<tr>' +
      '<td style="padding:11px 0;border-top:1px solid ' + line + ';font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:' + muted + ';">' + label + '</td>' +
      '<td align="right" style="padding:11px 0;border-top:1px solid ' + line + ';font-size:14px;color:' + ash + ';">' + valor + '</td>' +
    '</tr>';
  }
  var lugarLink = '<a href="' + EVENTO.mapaUrl + '" style="color:' + ash + ';text-decoration:none;border-bottom:1px solid ' + accent + ';">' + EVENTO.lugar + '</a>';
  var filasDetalle = fila('Fecha', EVENTO.fecha) + fila('Hora', EVENTO.hora) + fila('Lugar', lugarLink);
  if (!cfg.dressCodeDestacado) filasDetalle += fila('Dress code', EVENTO.dressCode); // si va destacado, no duplicar
  var detalle =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 26px;">' +
      filasDetalle +
    '</table>';

  // Dress code destacado (solo reminder del 5/8)
  var dressDestacado = cfg.dressCodeDestacado
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">' +
        '<tr><td style="background:rgba(143,155,255,0.12);border:1px solid rgba(143,155,255,0.4);border-radius:12px;padding:16px 18px;">' +
          '<span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:' + accent + ';">Dress code</span><br>' +
          '<span style="font-size:18px;color:' + ash + ';font-weight:600;">' + EVENTO.dressCode + '</span>' +
        '</td></tr>' +
      '</table>'
    : '';

  // Botones (bulletproof, apilados y centrados)
  function boton(href, texto, bg, color, borde) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">' +
      '<tr><td align="center" style="border-radius:11px;background:' + bg + ';' + (borde ? 'border:1px solid ' + borde + ';' : '') + '">' +
        '<a href="' + href + '" target="_blank" style="display:inline-block;padding:15px 30px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:' + color + ';text-decoration:none;">' + texto + '</a>' +
      '</td></tr></table>';
  }
  var botones =
    boton(EVENTO.calendarUrl, 'Agregar al calendario', ash, base, '') +
    boton(EVENTO.mapaUrl, 'Ver cómo llegar', 'transparent', ash, line);

  return '' +
'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
'<body style="margin:0;padding:0;background:' + base + ';">' +
  // preheader oculto
  '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Launch Event de ABN Group · ' + EVENTO.fecha + ' · ' + EVENTO.hora + '</div>' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + base + ';padding:28px 14px;font-family:Inter,Arial,Helvetica,sans-serif;">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:' + card + ';border:1px solid ' + line + ';border-radius:18px;overflow:hidden;">' +
        // header con el gradiente de la marca
        '<tr><td style="padding:0;line-height:0;">' +
          '<img src="' + EVENTO.bannerUrl + '" width="600" alt="ABN Group" style="display:block;width:100%;height:auto;border:0;">' +
        '</td></tr>' +
        // cuerpo
        '<tr><td style="padding:36px 40px 40px;">' +
          '<div style="font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:' + accent + ';margin-bottom:12px;">' + (cfg.eyebrow || '') + '</div>' +
          '<h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;font-weight:300;color:' + ash + ';letter-spacing:-0.01em;">' + cfg.titulo + '</h1>' +
          parrafos +
          '<div style="height:8px;"></div>' +
          detalle +
          dressDestacado +
          botones +
        '</td></tr>' +
        // footer
        '<tr><td style="padding:22px 40px;border-top:1px solid ' + line + ';text-align:center;">' +
          '<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:' + muted + ';">ABN Group · Digital · Detrics · Hike · Studio</div>' +
        '</td></tr>' +
      '</table>' +
      '<div style="font-size:11px;color:rgba(249,247,242,0.35);margin-top:16px;">Blas Parera 51, Florida · Piso 6</div>' +
    '</td></tr>' +
  '</table>' +
'</body></html>';
}
