/**
 * ABN Group — Launch Event · RSVP → Google Sheets + Slack
 * ------------------------------------------------------------
 * Recibe los datos del formulario (v1 y v2), los agrega como fila
 * en la planilla y, cuando la persona CONFIRMA asistencia, avisa
 * al canal de Slack con el nombre y el total de confirmados.
 *
 * Planilla:
 *   https://docs.google.com/spreadsheets/d/1cqENudvGclpA2WS9doLc_8y8P8jmJMNzpCo9o94MZxU/
 *
 * El webhook de Slack NO se guarda en el código (el repo es público).
 * Se lee de las "Propiedades de la secuencia de comandos":
 *   Configuración del proyecto → Propiedades → SLACK_WEBHOOK_URL
 */

// Pestaña donde se guardan las confirmaciones (gid tomado de la URL de la planilla).
const SHEET_GID = 587568949;

// Encabezados de las columnas (se crean solos si la hoja está vacía).
const HEADERS = ['Fecha de carga', 'Nombre y Apellido', 'Mail', 'Asistencia', 'Restricción alimenticia'];

/**
 * Recibe el POST del formulario: agrega la fila y notifica a Slack.
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

    // Aviso a Slack SOLO cuando confirma asistencia ("Sí").
    if (asiste === 'Sí') {
      notificarSlack_(nombre, contarConfirmados_(sheet));
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Chequeo rápido de salud: abrir la URL /exec en el navegador debería
 * mostrar {"ok":true,...}.
 */
function doGet() {
  return json_({ ok: true, message: 'ABN Launch RSVP endpoint activo.' });
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

/** Manda el aviso al canal de Slack. Si algo falla, no rompe el guardado. */
function notificarSlack_(nombre, total) {
  const url = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  if (!url) return; // sin webhook configurado, no hace nada

  const texto = 'Nueva confirmación: *' + nombre + '* :tada:\n'
              + 'Cantidad de confirmados al momento: ' + total;
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ text: texto }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    // Slack caído / webhook inválido: lo ignoramos para no perder el RSVP.
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
