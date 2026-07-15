# Conectar el formulario a Google Sheets

El form (v1 y v2) manda las confirmaciones a un **Google Apps Script** publicado
como *Web App*, que agrega una fila en la planilla.

Planilla destino:
https://docs.google.com/spreadsheets/d/1cqENudvGclpA2WS9doLc_8y8P8jmJMNzpCo9o94MZxU/

## Pasos (una sola vez)

1. Abrí la planilla → menú **Extensiones → Apps Script**.
2. Borrá el código de ejemplo y pegá el contenido de [`Code.gs`](./Code.gs).
3. **Guardá** (ícono de disquete).
4. Arriba a la derecha: **Implementar → Nueva implementación**.
5. En "Seleccionar tipo" (ícono de engranaje) elegí **Aplicación web**.
6. Configurá:
   - **Descripción:** `RSVP ABN Launch`
   - **Ejecutar como:** `Yo (tu cuenta)`
   - **Quién tiene acceso:** **Cualquier usuario**  ← importante
7. **Implementar** → te va a pedir **autorizar permisos**: aceptá
   (aparece "Google no verificó la app" → *Configuración avanzada* →
   *Ir a (nombre del proyecto)* → *Permitir*).
8. Copiá la **URL de la aplicación web** (termina en `/exec`).
9. Pasame esa URL y la pego en las dos webs (`RSVP_ENDPOINT` en `script.js`).

## Verificación

- Abrir la URL `/exec` en el navegador debería mostrar
  `{"ok":true,"message":"ABN Launch RSVP endpoint activo."}`.
- Al confirmar en la web, se agrega una fila con:
  `Fecha de carga · Nombre y Apellido · Mail · Asistencia · Restricción alimenticia`.

## Notas

- Si más adelante editás `Code.gs`, hay que **Implementar → Gestionar
  implementaciones → editar (lápiz) → Nueva versión** para que los cambios
  tomen efecto (la URL `/exec` se mantiene).
- La web usa `mode:'no-cors'`: el navegador envía el dato pero no lee la
  respuesta (Apps Script no expone headers CORS). Para un RSVP alcanza.
