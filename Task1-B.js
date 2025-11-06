

const VSRC = `
  attribute vec2 a_xy;
  attribute vec3 a_rgb;
  uniform mat4 u_M;
  varying vec3 v_rgb;
  void main() {
    gl_Position = u_M * vec4(a_xy, 0.0, 1.0);
    v_rgb = a_rgb;
  }
`;

const FSRC = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  varying vec3 v_rgb;
  uniform vec3 u_tint;
  void main() {
    gl_FragColor = vec4(v_rgb * u_tint, 1.0);
  }
`;

function main() {
  const canvas = document.getElementById('webgl');
  const gl = getWebGLContext(canvas);
  if (!gl) { console.error('webgl context unavailable'); return; }

  if (!initShaders(gl, VSRC, FSRC)) {
    console.error('shader init failed');
    return;
  }

  const attribs = initGeometry(gl); // one origin-centered square
  if (!attribs) { console.error('geometry init failed'); return; }

  const uM    = gl.getUniformLocation(gl.program, 'u_M');
  const uTint = gl.getUniformLocation(gl.program, 'u_tint');
  if (!uM || !uTint) { console.error('uniforms missing'); return; }

  const m4 = new Matrix4();
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Centers for a 4×4 grid
  const centers = [-0.75, -0.25, 0.25, 0.75];


  const rowR = [0.85, 0.70, 0.95, 0.75];
  const colG = [0.80, 0.95, 0.70, 0.90];
  const mixB = [0.90, 0.75, 0.85, 0.65];

  gl.enableVertexAttribArray(attribs.a_xy);
  gl.enableVertexAttribArray(attribs.a_rgb);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = centers[col];
      const cy = centers[3 - row]; // top row first

      const r = rowR[row];
      const g = colG[col];
      const b = mixB[(row + col) % 4];

      m4.setIdentity();
      m4.translate(cx, cy, 0);
      gl.uniformMatrix4fv(uM, false, m4.elements);
      gl.uniform3f(uTint, r, g, b);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
}


function initGeometry(gl) {
  const hs = 0.25; // half-side → square side = 0.5

  // TRIANGLE_STRIP order: TL, BL, TR, BR
  const pos = new Float32Array([
    -hs,  hs,
    -hs, -hs,
     hs,  hs,
     hs, -hs,
  ]);

  const col = new Float32Array([
    1.0, 0.0, 1.0,   // TL
    0.0, 1.0, 1.0,   // BL
    1.0, 0.5, 0.0,   // TR
    0.6, 0.0, 1.0    // BR
  ]);

  // --- positions ---
  const bufPos = gl.createBuffer();
  if (!bufPos) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  const a_xy = gl.getAttribLocation(gl.program, 'a_xy');
  gl.vertexAttribPointer(a_xy, 2, gl.FLOAT, false, 0, 0);

  // --- colors ---
  const bufCol = gl.createBuffer();
  if (!bufCol) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
  gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
  const a_rgb = gl.getAttribLocation(gl.program, 'a_rgb');
  gl.vertexAttribPointer(a_rgb, 3, gl.FLOAT, false, 0, 0);

  return { a_xy, a_rgb };
}
