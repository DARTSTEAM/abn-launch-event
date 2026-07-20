/**
 * ABN Group — Launch Event · RSVP → Google Sheets + Slack
 * ------------------------------------------------------------
 * Recibe los datos del formulario, los agrega como fila en la planilla
 * y avisa al canal de Slack (confirma / no asiste) con el total de
 * confirmados.
 *
 * Planilla:
 *   https://docs.google.com/spreadsheets/d/1cqENudvGclpA2WS9doLc_8y8P8jmJMNzpCo9o94MZxU/
 *
 * El webhook de Slack NO va en el código (el repo es público). Se lee de
 * las "Propiedades de la secuencia de comandos":
 *   Configuración del proyecto → Propiedades → SLACK_WEBHOOK_URL
 */

const VERSION = 'v3';

// Pestaña donde se guardan las confirmaciones (gid tomado de la URL de la planilla).
const SHEET_GID = 587568949;

// Encabezados de las columnas (se crean solos si la hoja está vacía).
const HEADERS = ['Fecha de carga', 'Nombre y Apellido', 'Mail', 'Asistencia', 'Restricción alimenticia'];

/**
 * ▶️ EJECUTAR A MANO DESDE EL EDITOR (una sola vez).
 * Dispara el pedido de permisos para conectarse a Slack (UrlFetchApp) y
 * manda un mensaje de prueba. Si Slack no anda, empezá por acá.
 */
function probarSlack() {
  const r = enviarSlack_('🔧 Prueba manual desde el editor de Apps Script (ignorar)');
  Logger.log(JSON.stringify(r));
  return r;
}

/**
 * Recibe el POST del formulario: agrega la fila y notifica a Slack.
 * Devuelve el detalle del envío a Slack para poder diagnosticar.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // evita que dos envíos simultáneos pisen la misma fila
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getTargetSheet_();

    // Fila de encabezados la primera vez.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    const nombre = String(data.name || '').trim();
    const asiste = data.attending === 'no' ? 'No' : 'Sí';

    sheet.appendRow([
      new Date(),                                   // timestamp del servidor
      nombre,
      String(data.email || '').trim(),
      asiste,
      String(data.diet || '').trim(),
    ]);

    // Aviso a Slack: 🎉 si confirma, o aviso simple si no asiste.
    const total = contarConfirmados_(sheet);
    const texto = (asiste === 'Sí')
      ? 'Nueva confirmación: *' + nombre + '* :tada:\nCantidad de confirmados al momento: ' + total
      : '*' + nombre + '* marcó que no asiste.\nCantidad de confirmados al momento: ' + total;

    const slack = enviarSlack_(texto);
    console.log('Slack: ' + JSON.stringify(slack));

    return json_({ ok: true, version: VERSION, slack: slack });
  } catch (err) {
    console.error('doPost error: ' + err);
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Health check y diagnóstico.
 *   /exec            → estado general
 *   /exec?diag=1     → dice si el webhook está cargado (sin revelarlo entero)
 *   /exec?test=1     → intenta mandar un mensaje a Slack y reporta el resultado
 */
function doGet(e) {
  const p = (e && e.parameter) || {};

  if (p.diag === '1') {
    const props = PropertiesService.getScriptProperties();
    const url = props.getProperty('SLACK_WEBHOOK_URL');
    return json_({
      ok: true,
      version: VERSION,
      slackConfigurado: !!url,
      slackLargo: url ? String(url).length : 0,
      slackEmpiezaCon: url ? String(url).substring(0, 30) : null,
      propiedadesCargadas: props.getKeys(),
    });
  }

  if (p.test === '1') {
    return json_({ ok: true, version: VERSION, resultado: enviarSlack_('🔧 Test remoto (ignorar)') });
  }

  return json_({ ok: true, version: VERSION, message: 'ABN Launch RSVP endpoint activo.' });
}

/** Cuenta cuántas filas tienen Asistencia = "Sí" (confirmados). */
function contarConfirmados_(sheet) {
  const filas = sheet.getLastRow() - 1; // sin contar el encabezado
  if (filas <= 0) return 0;
  const asistencia = sheet.getRange(2, 4, filas, 1).getValues(); // columna 4 = Asistencia
  let n = 0;
  for (let i = 0; i < asistencia.length; i++) {
    if (String(asistencia[i][0]).trim() === 'Sí') n++;
  }
  return n;
}

/**
 * Manda un mensaje al canal de Slack.
 * Devuelve SIEMPRE un objeto con el resultado (no se traga los errores),
 * así se puede diagnosticar desde la respuesta del endpoint.
 */
function enviarSlack_(texto) {
  const url = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  if (!url) {
    return { enviado: false, motivo: 'Falta la propiedad SLACK_WEBHOOK_URL en Configuración del proyecto.' };
  }

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ text: texto }),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    return {
      enviado: code === 200,
      httpCode: code,
      respuesta: String(res.getContentText()).substring(0, 120),
    };
  } catch (err) {
    // Típico acá: falta autorizar el permiso de conexión externa (UrlFetchApp).
    console.error('Slack error: ' + err);
    return { enviado: false, motivo: String(err) };
  }
}

/** Devuelve la pestaña por gid; si no la encuentra, usa la primera. */
function getTargetSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === SHEET_GID) return sheets[i];
  }
  return sheets[0];
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
