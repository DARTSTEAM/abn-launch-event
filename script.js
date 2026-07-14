/* ============================================
   ABN GROUP — LAUNCH EVENT
   WebGL fluid gradient (shared with ABN Group) + RSVP form
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ========================================
     WEBGL FLUID GRADIENT SHADER
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

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float f = 0.0;
          float amp = 0.5;
          float freq = 1.0;
          for (int i = 0; i < 6; i++) {
            f += amp * noise(p * freq);
            freq *= 2.0;
            amp *= 0.5;
          }
          return f;
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution;
          float aspect = u_resolution.x / u_resolution.y;
          vec2 p = uv;
          p.x *= aspect;

          float t = u_time * 0.08;

          vec2 m = u_mouse;
          m.x *= aspect;
          vec2 toMouse = p - m;
          float mouseDist = length(toMouse);
          float mouseForce = smoothstep(0.8, 0.0, mouseDist);
          p += normalize(toMouse + 0.001) * mouseForce * 0.05;
          float swirlAngle = mouseForce * 0.35;
          vec2 swirl = vec2(
            toMouse.x * cos(swirlAngle) - toMouse.y * sin(swirlAngle),
            toMouse.x * sin(swirlAngle) + toMouse.y * cos(swirlAngle)
          );
          p += (swirl - toMouse) * mouseForce * 0.15;

          vec2 q = vec2(
            fbm(p * 2.5 + vec2(0.0, 0.0) + t * 0.6),
            fbm(p * 2.5 + vec2(5.2, 1.3) + t * 0.5)
          );

          vec2 r = vec2(
            fbm(p * 2.5 + q * 3.5 + vec2(1.7, 9.2) + t * 0.35),
            fbm(p * 2.5 + q * 3.5 + vec2(8.3, 2.8) + t * 0.4)
          );

          float f = fbm(p * 2.5 + r * 3.0 + t * 0.15);
          float f2 = fbm(p * 1.8 + vec2(f * 2.0, r.x * 1.5) + t * 0.2);
          float blend = f * 0.65 + f2 * 0.35;

          vec3 black      = vec3(0.01, 0.005, 0.008);
          vec3 darkWine   = vec3(0.12, 0.02, 0.04);
          vec3 deepCrimson= vec3(0.35, 0.06, 0.10);
          vec3 crimson    = vec3(0.55, 0.10, 0.17);
          vec3 rose       = vec3(0.77, 0.20, 0.30);
          vec3 hotRose    = vec3(0.90, 0.35, 0.42);

          vec3 col = black;
          col = mix(col, darkWine,   smoothstep(0.0,  0.25, blend));
          col = mix(col, deepCrimson,smoothstep(0.2,  0.42, blend));
          col = mix(col, crimson,    smoothstep(0.38, 0.62, blend));
          col = mix(col, rose,       smoothstep(0.58, 0.78, blend));
          col = mix(col, hotRose,    smoothstep(0.75, 0.95, blend));

          float warpIntensity = length(q) + length(r) * 0.5;
          col *= 0.85 + 0.4 * smoothstep(0.5, 1.5, warpIntensity);

          float vig = 1.0 - 0.35 * pow(length(uv - vec2(0.45, 0.45)) * 1.2, 2.0);
          col *= max(vig, 0.0);

          col = pow(col, vec3(0.92));
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
        mouseSmoothX += (mouseTargetX - mouseSmoothX) * 0.18;
        mouseSmoothY += (mouseTargetY - mouseSmoothY) * 0.18;
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
     RSVP FORM
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

      // Native validation (name, email, attendance are required)
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
        // ── TODO: conectar el destino real del lead acá. ──────────────
        // Cuando definas dónde caen los datos (Google Sheets / Apps Script,
        // Formspree, n8n webhook, etc.), reemplazá este bloque simulado por:
        //
        //   const res = await fetch(RSVP_ENDPOINT, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data),
        //   });
        //   if (!res.ok) throw new Error('bad response');
        //
        // Por ahora solo lo logueamos para poder verlo funcionando.
        console.log('[RSVP] lead capturado (maqueta):', data);
        await new Promise(r => setTimeout(r, 600));
        // ──────────────────────────────────────────────────────────────

        // Success state
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
