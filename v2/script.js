/* ============================================
   ABN GROUP — LAUNCH EVENT · V2
   WebGL colour mesh gradient + RSVP form
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ========================================
     WEBGL COLOUR MESH GRADIENT
     Soft drifting light sources over deep navy.
     ======================================== */
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (gl) {
      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      window.addEventListener('resize', resize);
      resize();

      const vertSrc = `
        attribute vec2 a_position;
        void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
      `;

      const fragSrc = `
        precision highp float;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        /* soft radial light contribution */
        vec3 lightBlob(vec2 p, vec2 c, vec3 color, float radius, float intensity) {
          float d = length(p - c);
          float f = exp(-(d * d) / (radius * radius));
          return color * f * intensity;
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution;
          float aspect = u_resolution.x / u_resolution.y;
          vec2 p = uv;
          p.x *= aspect;                 /* work in aspect-corrected space */

          float t = u_time * 0.09;

          /* deep, near-black navy base */
          vec3 col = vec3(0.008, 0.008, 0.03);

          /* --- palette pulled from the reference gradient (vivid) --- */
          vec3 orange = vec3(1.00, 0.48, 0.05);
          vec3 teal   = vec3(0.06, 0.82, 0.56);
          vec3 blue   = vec3(0.18, 0.38, 1.00);
          vec3 violet = vec3(0.46, 0.26, 0.92);
          vec3 white  = vec3(0.92, 0.92, 1.00);

          /* helper: fraction (0..1, y up) -> aspect space */
          #define C(fx, fy) vec2((fx) * aspect, (fy))

          /* drifting light sources — slow, organic motion.
             Tighter radii + higher intensity keep the colours saturated
             and the centre dark (mesh-gradient look). */
          col += lightBlob(p, C(0.33 + 0.05 * sin(t * 0.7),  0.93 + 0.03 * cos(t * 0.5)), orange, 0.34 * aspect, 1.55);
          col += lightBlob(p, C(0.97 + 0.03 * cos(t * 0.6),  0.82 + 0.05 * sin(t * 0.4)), teal,   0.38 * aspect, 1.60);
          col += lightBlob(p, C(0.94 + 0.04 * sin(t * 0.5),  0.16 + 0.04 * cos(t * 0.6)), teal,   0.28 * aspect, 0.75);
          col += lightBlob(p, C(0.55 + 0.06 * cos(t * 0.45), 0.03 + 0.05 * sin(t * 0.55)), blue,  0.36 * aspect, 1.60);
          col += lightBlob(p, C(0.18 + 0.05 * sin(t * 0.6),  0.58 + 0.04 * cos(t * 0.5)), violet, 0.34 * aspect, 1.45);
          col += lightBlob(p, C(0.05 + 0.03 * cos(t * 0.5),  0.54 + 0.05 * sin(t * 0.4)), white,  0.15 * aspect, 1.05);

          /* subtle glow following the cursor */
          vec2 m = u_mouse; m.x *= aspect;
          col += lightBlob(p, m, white, 0.26 * aspect, 0.14);

          /* deepen the centre for that dark mesh-gradient core */
          float vig = 1.0 - 0.42 * pow(length(uv - vec2(0.54, 0.5)) * 1.15, 2.0);
          col *= max(vig, 0.0);

          /* exponential tone-map — retains saturation, never clips harshly */
          col = vec3(1.0) - exp(-col * 1.15);
          col = pow(col, vec3(1.02));

          gl_FragColor = vec4(col, 1.0);
        }
      `;

      function createShader(type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.error('Shader error:', gl.getShaderInfoLog(s));
          gl.deleteShader(s);
          return null;
        }
        return s;
      }

      const vert = createShader(gl.VERTEX_SHADER, vertSrc);
      const frag = createShader(gl.FRAGMENT_SHADER, fragSrc);

      const program = gl.createProgram();
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
      }
      gl.useProgram(program);

      const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uTime = gl.getUniformLocation(program, 'u_time');
      const uRes  = gl.getUniformLocation(program, 'u_resolution');
      const uMouse = gl.getUniformLocation(program, 'u_mouse');

      let mouseTargetX = 0.5, mouseTargetY = 0.5;
      let mouseSmoothX = 0.5, mouseSmoothY = 0.5;

      if (window.matchMedia('(pointer: fine)').matches) {
        window.addEventListener('mousemove', (e) => {
          mouseTargetX = e.clientX / window.innerWidth;
          mouseTargetY = 1.0 - e.clientY / window.innerHeight;
        });
      }

      const startTime = performance.now();
      function render() {
        const elapsed = (performance.now() - startTime) / 1000;
        resize();
        mouseSmoothX += (mouseTargetX - mouseSmoothX) * 0.16;
        mouseSmoothY += (mouseTargetY - mouseSmoothY) * 0.16;
        gl.uniform1f(uTime, elapsed);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform2f(uMouse, mouseSmoothX, mouseSmoothY);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
      }
      render();
    }
  }


  /* ========================================
     RSVP FORM  (same behaviour as v1)
     ======================================== */
  const form = document.getElementById('rsvp-form');
  const note = document.getElementById('form-note');
  const btn = document.getElementById('submit-btn');
  const thanks = document.getElementById('thanks');
  const thanksText = document.getElementById('thanks-text');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      note.textContent = '';

      if (!form.checkValidity()) {
        note.textContent = 'Completá los campos obligatorios.';
        form.reportValidity();
        return;
      }

      const data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        attending: form.attending.value,          // "si" | "no"
        diet: form.diet.value.trim() || null,
      };

      btn.disabled = true;
      btn.textContent = 'Enviando…';

      try {
        // ── TODO: conectar el destino real del lead acá (ver v1). ──────
        console.log('[RSVP v2] lead capturado (maqueta):', data);
        await new Promise(r => setTimeout(r, 600));
        // ──────────────────────────────────────────────────────────────

        if (data.attending === 'no') {
          thanksText.textContent = '¡Gracias por avisarnos! Será en otra ocasión.';
        } else {
          thanksText.textContent = `¡Gracias, ${data.name.split(' ')[0]}! Te esperamos en Blas Parera el 6 de agosto a las 19 hs.`;
        }
        form.hidden = true;
        thanks.hidden = false;
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = 'Confirmar';
        note.textContent = 'Hubo un problema al enviar. Probá de nuevo.';
      }
    });
  }

});
