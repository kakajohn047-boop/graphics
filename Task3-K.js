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

let gl, uMat, uSampler, uST, quad, tex = [];
let tPrev = 0, r2 = 1, r3 = 2, swap = 0;

function main(){
  const cv = document.getElementById('webgl');
  gl = getWebGLContext(cv);
  if(!gl) return;
  if(!initShaders(gl, VS, FS)) return;

  gl.viewport(0,0,cv.width,cv.height);
  quad = makeQuad(gl);

  uMat     = gl.getUniformLocation(gl.program,'uMat');
  uSampler = gl.getUniformLocation(gl.program,'uSampler');
  uST      = gl.getUniformLocation(gl.program,'uST');
  gl.uniform1i(uSampler, 0);

  loadAll(SRC, (arr)=>{ tex = arr; tPrev = performance.now(); requestAnimationFrame(tick); });
}

function tick(now){
  const dt = (now - tPrev) / 1000;
  tPrev = now;

  swap += dt * 0.5;               // 0→1
  if (swap >= 1){
    swap -= 1;
    const tmp = r2; r2 = r3; r3 = tmp;
  }

  draw(now * 0.001, swap);
  requestAnimationFrame(tick);
}

function draw(t, s){
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

    // row 1: rotate around Y
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex[0]);
    M.setIdentity();
    M.translate(centers[c], centers[3-0], 0);
    M.rotate(100*t, 0,1,0);
    gl.uniformMatrix4fv(uMat,false,M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // rows 2 & 3: slide and swap
    const d = 0.5;
    const y2 = centers[3-1] - d*s;
    const y3 = centers[3-2] + d*s;

    gl.bindTexture(gl.TEXTURE_2D, tex[r2]);
    M.setIdentity();
    M.translate(centers[c], y2, 0);
    gl.uniformMatrix4fv(uMat,false,M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindTexture(gl.TEXTURE_2D, tex[r3]);
    M.setIdentity();
    M.translate(centers[c], y3, 0);
    gl.uniformMatrix4fv(uMat,false,M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // row 4: rotate around X
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
  const uv  = new Float32Array([
    0,1,  0,0,  1,1,  1,0
  ]);

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

  return true;
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
