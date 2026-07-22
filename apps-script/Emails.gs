/**
 * ABN Group — Launch Event · MAILS
 * ------------------------------------------------------------
 * 3 correos en HTML (light mode, boutique, tipografía fina):
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

function testMailConfirmacion() { enviarMail_(TEST_EMAIL, ASUNTO_CONF, htmlConfirmacion_('Juan')); }
function testMailReminder30()  { enviarMail_(TEST_EMAIL, ASUNTO_R30,  htmlReminder30_('Juan')); }
function testMailReminder5()   { enviarMail_(TEST_EMAIL, ASUNTO_R5,   htmlReminder5_('Juan')); }


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
    titulo: n ? ('Gracias por confirmar, ' + n) : 'Gracias por confirmar',
    parrafos: [
      'Reservamos tu lugar en el <em>Launch Event de ABN Group</em>.',
      'Nos encontramos para presentarte nuestra nueva identidad y celebrarlo juntos. Te esperamos.'
    ],
  });
}

function htmlReminder30_(nombre) {
  return htmlEmail_({
    eyebrow: 'Falta una semana',
    titulo: 'Nos vemos en una semana',
    parrafos: [
      'Se acerca el <em>Launch Event de ABN Group</em>.',
      'En una semana te presentamos nuestra nueva identidad. Guardá la fecha y nos vemos ahí.'
    ],
  });
}

function htmlReminder5_(nombre) {
  return htmlEmail_({
    eyebrow: 'Es mañana',
    titulo: 'Te esperamos mañana',
    parrafos: [
      'Mañana es el gran día: el <em>Launch Event de ABN Group</em>.',
      'Te esperamos para vivirlo juntos.'
    ],
    dressCodeDestacado: true,
  });
}


// ─────────────────────── PLANTILLA HTML (light · boutique) ───────────────────────

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
  var botones = boton(EVENTO.calendarUrl, 'Agregar al calendario', ink, bg, '') +
                boton(EVENTO.mapaUrl, 'Ver cómo llegar', 'transparent', ink, 'rgba(43,38,34,0.28)');

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
          '<div style="height:10px;"></div>' +
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
