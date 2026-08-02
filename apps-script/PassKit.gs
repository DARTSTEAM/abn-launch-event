/**
 * ABN Group — Launch Event · PASSKIT (pases Apple/Google Wallet)
 * ------------------------------------------------------------
 * Genera un pase de Wallet por persona (vía el producto "membership" de
 * PassKit, que sí está habilitado en la cuenta) estilado como ticket ABN.
 *
 * Credenciales privadas en Propiedades del proyecto (NO en el código):
 *   PASSKIT_KEY / PASSKIT_SECRET
 *
 * IDs de la cuenta (ABN Digital, región pub2):
 */
var PASSKIT_BASE = 'https://api.pub2.passkit.io';   // región verificada de la cuenta
var PK_PROGRAM_ID  = '5uAdBCAgKCPa51Ug3EJkLZ';      // programa (My Loyalty Program → ABN Launch)
var PK_TIER_ID     = 'base';                        // tier
var PK_TEMPLATE_ID = '1R3XbVozlVD0fXDn6uLbq1';      // template del tier


// ─────────────────────── AUTH ───────────────────────

/** JWT de PassKit (HS256: {uid,iat,exp} firmado con el secret). */
function passkitJwt_() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('PASSKIT_KEY');
  var secret = props.getProperty('PASSKIT_SECRET');
  if (!key || !secret) throw new Error('Faltan PASSKIT_KEY / PASSKIT_SECRET en Propiedades del proyecto.');
  var now = Math.floor(Date.now() / 1000);
  var header = b64url_(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  var payload = b64url_(JSON.stringify({ uid: key, iat: now, exp: now + 3600 }));
  var sig = b64url_(Utilities.computeHmacSha256Signature(header + '.' + payload, secret));
  return header + '.' + payload + '.' + sig;
}

function b64url_(data) {
  return Utilities.base64EncodeWebSafe(data).replace(/=+$/, '');
}

function pkHeaders_() {
  return { 'Authorization': passkitJwt_(), 'Content-Type': 'application/json' };
}

/** Llamada REST. Devuelve { code, text }. */
function pkFetch_(method, path, body) {
  var o = { method: method, headers: pkHeaders_(), muteHttpExceptions: true };
  if (body !== undefined) o.payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch(PASSKIT_BASE + path, o);
  return { code: res.getResponseCode(), text: res.getContentText() };
}


// ─────────────────────── EMISIÓN DEL PASE ───────────────────────

/**
 * Emite un pase de Wallet para una persona y devuelve el link "Agregar a
 * Wallet" (o null si falla). Se usa desde el mail de confirmación.
 */
function pkEmitirPase(nombre, email) {
  var partes = String(nombre || '').trim().split(/\s+/);
  var forename = partes.shift() || String(nombre || '');
  var surname = partes.join(' ');
  var r = pkFetch_('post', '/members/member', {
    programId: PK_PROGRAM_ID,
    tierId: PK_TIER_ID,
    person: { forename: forename, surname: surname, displayName: nombre, emailAddress: email },
  });
  if (r.code !== 200) { console.error('PassKit enrol falló: ' + r.code + ' ' + r.text); return null; }
  try {
    var id = (JSON.parse(r.text).result || JSON.parse(r.text)).id;
    return id ? ('https://pub2.pskt.io/' + id) : null;
  } catch (e) { return null; }
}


// ─────────────────────── TESTS / MANTENIMIENTO ───────────────────────

/** ▶️ Test de conexión (debe dar HTTP 200 con datos de la cuenta). */
function testPassKitAuth() {
  var r = pkFetch_('get', '/user/profile');
  Logger.log('HTTP ' + r.code + '  (200 = OK)');
  Logger.log(r.text.substring(0, 400));
}

/** ▶️ Emite un pase de prueba y loguea el link (para abrir en el celular). */
function pkEnrolarTest() {
  var url = pkEmitirPase('Juan Pablo Prueba', 'juanpablo@abndigital.com.ar');
  Logger.log(url ? ('👉 Pase: ' + url) : 'Falló la emisión (ver logs).');
}

/** ▶️ Sube el gradiente ABN y lo pone de fondo del pase (strip/hero/background). */
function pkFondo() {
  var blob = UrlFetchApp.fetch('https://dartsteam.github.io/abn-launch-event/og-image.png').getBlob();
  var b64 = Utilities.base64Encode(blob.getBytes());
  var up = pkFetch_('post', '/images', { imageData: { strip: b64, hero: b64, background: b64 } });
  Logger.log('POST /images  →  ' + up.code);
  if (up.code !== 200) { Logger.log(up.text.substring(0, 300)); return; }

  var ids = JSON.parse(up.text);
  var tpl = pkTemplate_(PK_TEMPLATE_ID);
  if (ids.strip)      tpl.imageIds.strip = ids.strip;
  if (ids.hero)       tpl.imageIds.hero = ids.hero;
  if (ids.background) tpl.imageIds.background = ids.background;

  var r = pkFetch_('put', '/template', tpl);
  Logger.log('PUT /template  →  ' + r.code + '   ' + r.text.substring(0, 120));
  Logger.log('imageIds nuevos: strip=' + ids.strip + ' hero=' + ids.hero + ' background=' + ids.background);
}

/** ▶️ TODO JUNTO: logo + gradiente + colores + nombre + QR + campos del evento. */
function pkEstilarTodo() {
  // 1) Subir imágenes (isotipo y gradiente)
  var logoB64 = Utilities.base64Encode(UrlFetchApp.fetch('https://dartsteam.github.io/abn-launch-event/assets/abn-icon-white.png').getBlob().getBytes());
  var gradB64 = Utilities.base64Encode(UrlFetchApp.fetch('https://dartsteam.github.io/abn-launch-event/og-image.png').getBlob().getBytes());
  var upL = pkFetch_('post', '/images', { imageData: { logo: logoB64, icon: logoB64, appleLogo: logoB64 } });
  var upG = pkFetch_('post', '/images', { imageData: { strip: gradB64, hero: gradB64, background: gradB64 } });
  Logger.log('imágenes → logo:' + upL.code + '  gradiente:' + upG.code);
  var L = upL.code === 200 ? JSON.parse(upL.text) : {};
  var G = upG.code === 200 ? JSON.parse(upG.text) : {};

  function armar(conCampos) {
    var tpl = pkTemplate_(PK_TEMPLATE_ID);
    tpl.name = 'ABN Group Launch Event';
    tpl.organizationName = 'ABN Group';
    tpl.description = 'Ticket de acceso · Blas Parera 51, Florida';
    tpl.colors = { backgroundColor: '#0E0E1C', labelColor: '#A39A8D', textColor: '#F9F7F2', foregroundColor: '#F9F7F2', stripColor: '', footerBackgroundColor: '' };
    if (tpl.barcode) tpl.barcode.format = 'QR';
    if (L.logo) tpl.imageIds.logo = L.logo;
    if (L.icon) tpl.imageIds.icon = L.icon;
    if (L.appleLogo) tpl.imageIds.appleLogo = L.appleLogo;
    if (G.strip) tpl.imageIds.strip = G.strip;
    if (G.hero) tpl.imageIds.hero = G.hero;
    if (G.background) tpl.imageIds.background = G.background;
    if (conCampos && tpl.data && tpl.data.dataFields && tpl.data.dataFields.length) {
      var base = tpl.data.dataFields[0];   // clonar una estructura válida
      function campo(uniq, label, valor) {
        var f = JSON.parse(JSON.stringify(base));
        f.uniqueName = uniq; f.fieldType = 'CUSTOM_FIELDS'; f.dataType = 'TEXT';
        f.label = label; f.defaultValue = valor; f.userCanSetValue = false;
        return f;
      }
      tpl.data.dataFields.push(campo('custom.fecha', 'Fecha', 'Martes 11 de agosto'));
      tpl.data.dataFields.push(campo('custom.hora', 'Hora', '19:00 a 22:00 hs'));
      tpl.data.dataFields.push(campo('custom.lugar', 'Lugar', 'Blas Parera 51, Florida · Piso 6'));
      tpl.data.dataFields.push(campo('custom.dress', 'Dress code', 'Elegante sport'));
    }
    return tpl;
  }

  // 2) Intentar con campos; si falla, aplicar sin campos (el visual siempre entra)
  var r = pkFetch_('put', '/template', armar(true));
  Logger.log('PUT (con campos)  →  ' + r.code + '   ' + r.text.substring(0, 160));
  if (r.code !== 200) {
    var r2 = pkFetch_('put', '/template', armar(false));
    Logger.log('PUT (sin campos)  →  ' + r2.code + '   (los campos fallaron; logo/gradiente/colores SÍ se aplicaron)');
  } else {
    Logger.log('✅ Todo aplicado (logo + gradiente + colores + QR + campos).');
  }
}

/** ▶️ Quita el código de barras (nadie lo va a escanear) y loguea los campos. */
function pkQuitarQr() {
  var t0 = pkTemplate_(PK_TEMPLATE_ID);
  Logger.log('— campos actuales del pase —');
  ((t0.data && t0.data.dataFields) || []).forEach(function (f) {
    Logger.log(f.uniqueName + '  |  "' + f.label + '" = "' + f.defaultValue + '"');
  });
  var intentos = [
    ['barcode = null',     function (t) { t.barcode = null; }],
    ['delete barcode',     function (t) { delete t.barcode; }],
    ['format NONE',        function (t) { t.barcode = t.barcode || {}; t.barcode.format = 'NONE'; }],
    ['format NO_BARCODE',  function (t) { t.barcode = t.barcode || {}; t.barcode.format = 'NO_BARCODE'; }],
    ['format BARCODE_NONE',function (t) { t.barcode = t.barcode || {}; t.barcode.format = 'BARCODE_NONE'; }]
  ];
  for (var i = 0; i < intentos.length; i++) {
    var tpl = pkTemplate_(PK_TEMPLATE_ID);
    intentos[i][1](tpl);
    var r = pkFetch_('put', '/template', tpl);
    Logger.log('intento "' + intentos[i][0] + '"  →  ' + r.code + '   ' + r.text.substring(0, 110));
    if (r.code === 200) { Logger.log('✅ Código quitado.'); return; }
  }
  Logger.log('Ninguno anduvo — pasame el log y lo veo.');
}

/** ▶️ Look MINIMAL CLARO (tipo US Open): fondo crema, texto oscuro, sin banda,
 *  logo oscuro, y POINTS/TIER → Fecha/Ubicación. */
function pkMinimal() {
  var darkB64 = Utilities.base64Encode(UrlFetchApp.fetch('https://dartsteam.github.io/abn-launch-event/assets/abn-logo-dark.png').getBlob().getBytes());
  var up = pkFetch_('post', '/images', { imageData: { logo: darkB64, icon: darkB64, appleLogo: darkB64 } });
  Logger.log('logo oscuro → ' + up.code);
  var D = up.code === 200 ? JSON.parse(up.text) : {};

  var t0 = pkTemplate_(PK_TEMPLATE_ID);
  Logger.log('— campos —');
  ((t0.data && t0.data.dataFields) || []).forEach(function (f) {
    Logger.log(f.uniqueName + '  |  "' + f.label + '" = "' + f.defaultValue + '"');
  });

  function armar(conCampos) {
    var tpl = pkTemplate_(PK_TEMPLATE_ID);
    tpl.colors = { backgroundColor: '#F3F0E9', labelColor: '#A39A8D', textColor: '#2B2622', foregroundColor: '#2B2622', stripColor: '', footerBackgroundColor: '' };
    ['strip', 'hero', 'background', 'eventStrip', 'thumbnail', 'footer', 'coupon'].forEach(function (k) {
      if (tpl.imageIds && tpl.imageIds[k] !== undefined) delete tpl.imageIds[k];
    });
    if (D.logo) tpl.imageIds.logo = D.logo;
    if (D.icon) tpl.imageIds.icon = D.icon;
    if (D.appleLogo) tpl.imageIds.appleLogo = D.appleLogo;
    if (conCampos) {
      ((tpl.data && tpl.data.dataFields) || []).forEach(function (f) {
        var u = (f.uniqueName || '').toLowerCase(), l = (f.label || '').toLowerCase();
        if (l.indexOf('tier') >= 0 || u.indexOf('tier') >= 0) {
          f.label = 'Ubicación'; f.dataType = 'TEXT'; f.defaultValue = 'Blas Parera 51'; f.userCanSetValue = false;
        } else if (l.indexOf('point') >= 0 || u.indexOf('point') >= 0 || u.indexOf('balance') >= 0) {
          f.label = 'Fecha'; f.dataType = 'TEXT'; f.defaultValue = '11 ago'; f.userCanSetValue = false;
        }
      });
    }
    return tpl;
  }

  var r = pkFetch_('put', '/template', armar(true));
  Logger.log('PUT (con campos) → ' + r.code + '   ' + r.text.substring(0, 150));
  if (r.code !== 200) {
    var r2 = pkFetch_('put', '/template', armar(false));
    Logger.log('PUT (sin campos) → ' + r2.code + '   (colores/logo/sin-banda SÍ; campos no)');
  } else {
    Logger.log('✅ Minimal claro aplicado.');
  }
}

/** ▶️ Sube el isotipo ABN y lo pone de logo/icono del pase (reemplaza el rojo). */
function pkLogo() {
  var blob = UrlFetchApp.fetch('https://dartsteam.github.io/abn-launch-event/assets/abn-icon-white.png').getBlob();
  var b64 = Utilities.base64Encode(blob.getBytes());
  var up = pkFetch_('post', '/images', { imageData: { logo: b64, icon: b64, appleLogo: b64 } });
  Logger.log('POST /images  →  ' + up.code);
  if (up.code !== 200) { Logger.log(up.text.substring(0, 300)); return; }
  var ids = JSON.parse(up.text);
  var tpl = pkTemplate_(PK_TEMPLATE_ID);
  if (ids.logo)      tpl.imageIds.logo = ids.logo;
  if (ids.icon)      tpl.imageIds.icon = ids.icon;
  if (ids.appleLogo) tpl.imageIds.appleLogo = ids.appleLogo;
  var r = pkFetch_('put', '/template', tpl);
  Logger.log('PUT /template  →  ' + r.code + '   ' + r.text.substring(0, 120));
}

/** ▶️ Saca las imágenes de ejemplo (flores) y loguea la estructura de imageIds. */
function pkImagenes() {
  var tpl = pkTemplate_(PK_TEMPLATE_ID);
  if (!tpl) { Logger.log('No encontré el template'); return; }
  Logger.log('imageIds: ' + JSON.stringify(tpl.imageIds));
  // Vaciar hero/strip (la tira de flores) — probamos varias claves posibles:
  if (tpl.imageIds) {
    ['hero', 'strip', 'heroImage', 'stripImage', 'thumbnail'].forEach(function (k) {
      if (k in tpl.imageIds) tpl.imageIds[k] = '';
    });
  }
  var r = pkFetch_('put', '/template', tpl);
  Logger.log('PUT /template  →  ' + r.code + '   ' + r.text.substring(0, 150));
}

/** Trae un template por id desde la lista NDJSON de PassKit. */
function pkTemplate_(id) {
  var lines = pkFetch_('get', '/templates').text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i].trim();
    if (!l) continue;
    try {
      var o = JSON.parse(l);
      var t = (o.result && o.result.template) ? o.result.template : o;
      if (t && t.id === id) return t;
    } catch (e) {}
  }
  return null;
}

/** ▶️ Rebrand: nombre + colores ABN + organización. Loguea barcode/campos. */
function pkRebrand() {
  var tpl = pkTemplate_(PK_TEMPLATE_ID);
  if (!tpl) { Logger.log('No encontré el template ' + PK_TEMPLATE_ID); return; }

  tpl.name = 'ABN Group Launch Event';
  tpl.description = 'Ticket de acceso · Blas Parera 51, Florida · 11 ago 19–22';
  tpl.organizationName = 'ABN Group';
  tpl.colors = {
    backgroundColor: '#0E0E1C',   // fondo oscuro ABN
    labelColor: '#A39A8D',        // labels taupe
    textColor: '#F9F7F2',         // valores crema
    foregroundColor: '#F9F7F2',
    stripColor: '',
    footerBackgroundColor: ''
  };
  if (tpl.barcode) tpl.barcode.format = 'QR';   // QR para el check-in
  var r = pkFetch_('put', '/template', tpl);
  Logger.log('PUT /template  →  ' + r.code);

  var prog = JSON.parse(pkFetch_('get', '/members/program/' + PK_PROGRAM_ID).text);
  prog = prog.result ? prog.result : prog;
  prog.name = 'ABN Group Launch Event';
  var r2 = pkFetch_('put', '/members/program', prog);
  Logger.log('PUT /members/program  →  ' + r2.code);
}
