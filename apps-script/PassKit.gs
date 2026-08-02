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
