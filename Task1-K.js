// CS3110 – Task 1: 4x4 grid of squares
// Each square's 4 vertices have different colors, AND each square has a different overall tint.
// No textures, no mipmaps; same structure as class WebGL samples.

var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec3 a_Color;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'varying vec3 v_Color;\n' +
  'void main(){\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

var FSHADER_SOURCE =
  '#ifdef GL_ES\nprecision mediump float;\n#endif\n' +
  'varying vec3 v_Color;\n' +
  'uniform vec3 u_Tint;   // per-cell tint so squares don’t all look identical\n' +
  'void main(){\n' +
  '  gl_FragColor = vec4(v_Color * u_Tint, 1.0);\n' +
  '}\n';

function main() {
  var canvas = document.getElementById('webgl');
  var gl = getWebGLContext(canvas);
  if (!gl) { console.log('Failed to get WebGL context'); return; }
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.'); return;
  }

  var n = initVertexBuffers(gl); // 4 verts for one square (TRIANGLE_STRIP)
  if (n < 0) { console.log('Failed to set vertex info'); return; }

  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_Tint        = gl.getUniformLocation(gl.program, 'u_Tint');
  if (!u_ModelMatrix || !u_Tint) { console.log('Failed to get uniforms'); return; }

  var modelMatrix = new Matrix4();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 4x4 grid centers across NDC: -0.75, -0.25, +0.25, +0.75
  var centers = [-0.75, -0.25, 0.25, 0.75];

  for (var r = 0; r < 4; r++) {
    for (var c = 0; c < 4; c++) {
      var cx = centers[c];
      var cy = centers[3 - r]; // top row first

      // Simple deterministic tint per cell (keeps values in [0.4, 1.0] for brightness)
      // You still get 4 different vertex colors, but each square looks unique overall.
      var tr = 0.4 + 0.15 * (r + 1);               // varies by row
      var tg = 0.4 + 0.10 * (c + 1);               // varies by column
      var tb = 0.4 + 0.05 * ((r + c) % 4 + 1);     // varies by both

      modelMatrix.setTranslate(cx, cy, 0.0);
      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      gl.uniform3f(u_Tint, tr, tg, tb);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
    }
  }
}

function initVertexBuffers(gl) {
  // One square centered at origin; each vertex a different color (R, G, B, Y)
  var s = 0.25; // half-side (square side = 0.5)
  var verticesColors = new Float32Array([
    // x,   y,     r,   g,   b
    -s,  s,    1.0, 0.0, 0.0,  // top-left     red
    -s, -s,    0.0, 1.0, 0.0,  // bottom-left  green
     s,  s,    0.0, 0.0, 1.0,  // top-right    blue
     s, -s,    1.0, 1.0, 0.0   // bottom-right yellow
  ]);
  var n = 4;

  var buffer = gl.createBuffer();
  if (!buffer) return -1;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
  gl.enableVertexAttribArray(a_Color);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return n;
}
