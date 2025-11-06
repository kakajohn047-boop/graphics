

// ======= Shaders =======
const VSRC = `
  attribute vec2 a_Position;
  attribute vec2 a_TexCoord;
  uniform mat4 u_Model;
  varying vec2 v_TexCoord;
  void main() {
    gl_Position = u_Model * vec4(a_Position, 0.0, 1.0);
    v_TexCoord = a_TexCoord;
  }
`;

const FSRC = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  uniform sampler2D u_Sampler;
  varying vec2 v_TexCoord;
  void main() {
    gl_FragColor = texture2D(u_Sampler, v_TexCoord);
  }
`;

const IMAGE_SOURCES = [
  '../resources/row1.jpg', // Row 1 texture 
  '../resources/row2.jpg', // Row 2 texture 
  '../resources/row3.jpg', // Row 3 texture 
  '../resources/row4.jpg'  // Row 4 texture 
];

function main() {
  const canvas = document.getElementById('webgl');
  const gl = getWebGLContext(canvas);
  if (!gl) { console.error('Failed to get WebGL context'); return; }

  if (!initShaders(gl, VSRC, FSRC)) {
    console.error('Failed to init shaders'); return;
  }

  const { n, a_Position, a_TexCoord, u_Model, u_Sampler } = initBuffersAndUniforms(gl);
  if (n < 0) { console.error('Failed to set vertex info'); return; }

  // Prepare 4 textures (one per row), load all images first
  loadAllTextures(gl, IMAGE_SOURCES, function(textures) {
    // After ALL textures are loaded & uploaded, draw the 4×4 grid.
    drawGrid(gl, n, u_Model, u_Sampler, textures);
  });
}


function initBuffersAndUniforms(gl) {
  // Positions (TRIANGLE_STRIP): TL, BL, TR, BR
  const hs = 0.25; 
  const verticesTex = new Float32Array([
    //   x,    y,     s,   t
    -hs,  hs,   0.0, 1.0,  // TL
    -hs, -hs,   0.0, 0.0,  // BL
     hs,  hs,   1.0, 1.0,  // TR
     hs, -hs,   1.0, 0.0   // BR
  ]);
  const n = 4;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verticesTex, gl.STATIC_DRAW);

  const FSIZE = verticesTex.BYTES_PER_ELEMENT;

  const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
  gl.enableVertexAttribArray(a_Position);

  const a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
  gl.enableVertexAttribArray(a_TexCoord);

  const u_Model   = gl.getUniformLocation(gl.program, 'u_Model');
  const u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');

  gl.clearColor(0, 0, 0, 1);

  return { n, a_Position, a_TexCoord, u_Model, u_Sampler };
}


function loadAllTextures(gl, srcs, onReady) {
  const textures = new Array(4);
  let loaded = 0;

  srcs.forEach((src, i) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Create & upload texture (no mipmaps, clamp to edge)
      const tex = gl.createTexture();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);   
      gl.activeTexture(gl.TEXTURE0);               
      gl.bindTexture(gl.TEXTURE_2D, tex);

      // CLAMP on both S & T per spec
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                    gl.UNSIGNED_BYTE, img);

      textures[i] = tex;
      loaded++;
      if (loaded === srcs.length) onReady(textures);
    };
    img.onerror = () => { console.error('Failed to load image:', src); };
    img.src = src;
  });
}

function drawGrid(gl, n, u_Model, u_Sampler, textures) {
  const m4 = new Matrix4();
  const centers = [-0.75, -0.25, 0.25, 0.75];

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(u_Sampler, 0); // sampler → texture unit 0 (course style)

  // For each row: bind that row’s texture, then draw 4 columns.
  for (let row = 0; row < 4; row++) {
    // Bind the row’s texture on unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[row]);

    for (let col = 0; col < 4; col++) {
      const cx = centers[col];
      const cy = centers[3 - row]; // top row first visually

      m4.setIdentity();
      m4.translate(cx, cy, 0);
      gl.uniformMatrix4fv(u_Model, false, m4.elements);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
    }
  }
}
