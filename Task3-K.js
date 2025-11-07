const VS = `
attribute vec2 a_xy;
attribute vec2 a_uv;
uniform mat4 uMat;
uniform vec2 uST;
varying vec2 v_uv;
void main(){
  gl_Position = uMat * vec4(a_xy,0.0,1.0);
  v_uv = a_uv * uST;
}
`;

const FS = `
#ifdef GL_ES
precision mediump float;
#endif
uniform sampler2D uSampler;
varying vec2 v_uv;
void main(){
  gl_FragColor = texture2D(uSampler, v_uv);
}
`;

const SRC = [
  '../resourcesK/row1.jpg',
  '../resourcesK/row2.jpg',
  '../resourcesK/row3.jpg',
  '../resourcesK/row4.jpg'
];

let gl, uMat, uSampler, uST, tPrev = 0, tex = [];

function main(){
  const cv = document.getElementById('webgl');
  gl = getWebGLContext(cv);
  if(!gl) return;
  if(!initShaders(gl, VS, FS)) return;

  gl.viewport(0,0,cv.width,cv.height);
  makeQuad(gl);

  uMat     = gl.getUniformLocation(gl.program,'uMat');
  uSampler = gl.getUniformLocation(gl.program,'uSampler');
  uST      = gl.getUniformLocation(gl.program,'uST');
  gl.uniform1i(uSampler, 0);

  loadAll(SRC, (arr)=>{ tex = arr; tPrev = performance.now(); requestAnimationFrame(tick); });
}

function tick(now){
  const dt = (now - tPrev) / 1000;
  tPrev = now;
  draw(now * 0.001);  // seconds
  requestAnimationFrame(tick);
}

function draw(t){
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const centers = Array.from({length:4},(_,i)=>-0.75 + i*0.5);
  const M = new Matrix4();

  for(let c=0;c<4;c++){
    let st = [1,1];
    if(c===1) st=[2,1];
    if(c===2) st=[1,2];
    if(c===3) st=[2,2];
    gl.uniform2f(uST, st[0], st[1]);

    // row 1: rotate Y
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex[0]);
    M.setIdentity();
    M.translate(centers[c], centers[3-0], 0);
    M.rotate(100*t, 0,1,0);
    gl.uniformMatrix4fv(uMat,false,M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // rows 2 & 3: vertical oscillation (no swap)
    const A = 0.25;                 // amplitude
    const w = 2*Math.PI*0.5;        // 0.5 Hz
    const off = Math.sin(w*t)*A;

    gl.bindTexture(gl.TEXTURE_2D, tex[1]); // row 2 stays row 2 image
    M.setIdentity();
    M.translate(centers[c], centers[3-1] - off, 0); // down when off>0
    gl.uniformMatrix4fv(uMat,false,M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindTexture(gl.TEXTURE_2D, tex[2]); // row 3 stays row 3 image
    M.setIdentity();
    M.translate(centers[c], centers[3-2] + off, 0); // up when off>0
    gl.uniformMatrix4fv(uMat,false,M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // row 4: rotate X
    gl.bindTexture(gl.TEXTURE_2D, tex[3]);
    M.setIdentity();
    M.translate(centers[c], centers[3-3], 0);
    M.rotate(140*t, 1,0,0);
    gl.uniformMatrix4fv(uMat,false,M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

function makeQuad(gl){
  const hs = 0.25;

  const pos = new Float32Array([
    -hs,  hs,
    -hs, -hs,
     hs,  hs,
     hs, -hs
  ]);
  const uv  = new Float32Array([ 0,1,  0,0,  1,1,  1,0 ]);

  const bPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  const a_xy = gl.getAttribLocation(gl.program,'a_xy');
  gl.vertexAttribPointer(a_xy, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_xy);

  const bUV = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bUV);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
  const a_uv = gl.getAttribLocation(gl.program,'a_uv');
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_uv);
}

function loadAll(list, done){
  const out = new Array(list.length);
  let k = 0;
  list.forEach((src,i)=>{
    const img = new Image();
    img.onload = ()=>{
      const t = gl.createTexture();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      out[i] = t;
      if(++k===list.length) done(out);
    };
    img.src = src;
  });
}
