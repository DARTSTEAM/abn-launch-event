/**
 * ABN Group — Launch Event · RSVP → Google Sheets
 * ------------------------------------------------------------
 * Recibe los datos del formulario (v1 y v2) y los agrega como
 * una fila en la planilla. Se despliega como "Web app" y la URL
 * .../exec es la que consume el formulario.
 *
 * Planilla:
 *   https://docs.google.com/spreadsheets/d/1cqENudvGclpA2WS9doLc_8y8P8jmJMNzpCo9o94MZxU/
 */

// Pestaña donde se guardan las confirmaciones (gid tomado de la URL de la planilla).
const SHEET_GID = 587568949;

// Encabezados de las columnas (se crean solos si la hoja está vacía).
const HEADERS = ['Fecha de carga', 'Nombre y Apellido', 'Mail', 'Asistencia', 'Restricción alimenticia'];

/**
 * Recibe el POST del formulario y agrega la fila.
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

    sheet.appendRow([
      new Date(),                                   // timestamp del servidor
      String(data.name || '').trim(),
      String(data.email || '').trim(),
      data.attending === 'no' ? 'No' : 'Sí',
      String(data.diet || '').trim(),
    ]);

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
