// Task3-B.js — animated

const VS = `
attribute vec2 a_xy;
attribute vec2 a_uv;
uniform mat4 u_M;
uniform vec2 u_ST;
varying vec2 v_uv;
void main(){
  gl_Position = u_M * vec4(a_xy,0.0,1.0);
  v_uv = a_uv * u_ST;
}
`;

const FS = `
#ifdef GL_ES
precision mediump float;
#endif
uniform sampler2D u_tex;
varying vec2 v_uv;
void main(){
  gl_FragColor = texture2D(u_tex, v_uv);
}
`;

// same image set you used for Task 2 (top → bottom)
const IMAGES = [
  "../resourcesB/pic1.jpg",
  "../resourcesB/pic2.jpg",
  "../resourcesB/pic3.jpg",
  "../resourcesB/pic4.jpg"
];

let gl, uM, uTex, uST, quad, textures;
let t0 = 0, running = false;

// row swap state (rows 2 & 3)
const rowDist = 0.5;           // distance between row centers in NDC
let swapProgress = 0;          // 0→1
const swapSpeed = 0.5;         // cycles/sec
let texRow2Index = 1;          // IMAGES[1]
let texRow3Index = 2;          // IMAGES[2]

function main(){
  const canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas);
  if(!gl) return;
  if(!initShaders(gl, VS, FS)) return;

  gl.viewport(0, 0, canvas.width, canvas.height);

  quad = initQuad(gl);
  uM   = gl.getUniformLocation(gl.program, "u_M");
  uTex = gl.getUniformLocation(gl.program, "u_tex");
  uST  = gl.getUniformLocation(gl.program, "u_ST");

  loadTexturesPOT(gl, IMAGES, (texList)=>{
    textures = texList;
    gl.clearColor(0,0,0,1);
    gl.uniform1i(uTex, 0);
    running = true;
    t0 = performance.now();
    requestAnimationFrame(loop);
  });
}

function loop(now){
  if(!running) return;
  const dt = (now - t0) / 1000.0;
  t0 = now;

  // animate rows 2 & 3: swap every 1/swapSpeed seconds
  const period = 1.0 / swapSpeed;
  swapProgress += dt / period;
  if (swapProgress >= 1.0){
    swapProgress -= 1.0;
    // swap their textures so the motion looks continuous
    const tmp = texRow2Index; 
    texRow2Index = texRow3Index; 
    texRow3Index = tmp;
  }

  drawFrame(now / 1000.0, swapProgress);
  requestAnimationFrame(loop);
}

function drawFrame(timeSec, prog){
  gl.clear(gl.COLOR_BUFFER_BIT);

  const centers = [-0.75, -0.25, 0.25, 0.75]; // x/y anchor points
  const M = new Matrix4();

  for(let c=0;c<4;c++){
    let wrapS = gl.CLAMP_TO_EDGE, wrapT = gl.CLAMP_TO_EDGE, st = [1,1];
    if(c === 1){ wrapS = gl.REPEAT;            st = [2,1]; }
    if(c === 2){ wrapT = gl.MIRRORED_REPEAT;   st = [1,2]; }
    if(c === 3){ wrapS = gl.REPEAT; wrapT = gl.MIRRORED_REPEAT; st = [2,2]; }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.uniform2f(uST, st[0], st[1]);

    // Row 1: rotate around Y
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    M.setIdentity();
    M.translate(centers[c], centers[3-0], 0);          // row 1 base
    M.rotate(90*timeSec, 0,1,0);                       // degrees/sec
    gl.uniformMatrix4fv(uM, false, M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, quad.count);

    // Rows 2 & 3: slide and swap
    const y2 =  centers[3-1] + (-rowDist)*prog;        // down
    const y3 =  centers[3-2] + (+rowDist)*prog;        // up

    gl.bindTexture(gl.TEXTURE_2D, textures[texRow2Index]);
    M.setIdentity();
    M.translate(centers[c], y2, 0);
    gl.uniformMatrix4fv(uM, false, M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, quad.count);

    gl.bindTexture(gl.TEXTURE_2D, textures[texRow3Index]);
    M.setIdentity();
    M.translate(centers[c], y3, 0);
    gl.uniformMatrix4fv(uM, false, M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, quad.count);

    // Row 4: rotate around X
    gl.bindTexture(gl.TEXTURE_2D, textures[3]);
    M.setIdentity();
    M.translate(centers[c], centers[3-3], 0);          // row 4 base
    M.rotate(120*timeSec, 1,0,0);                      // degrees/sec
    gl.uniformMatrix4fv(uM, false, M.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, quad.count);
  }
}

function initQuad(gl){
  const hs = 0.25;
  const data = new Float32Array([
    -hs,  hs,  0, 1,
    -hs, -hs,  0, 0,
     hs,  hs,  1, 1,
     hs, -hs,  1, 0
  ]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const FSZ = data.BYTES_PER_ELEMENT;
  const a_xy = gl.getAttribLocation(gl.program, "a_xy");
  const a_uv = gl.getAttribLocation(gl.program, "a_uv");
  gl.vertexAttribPointer(a_xy, 2, gl.FLOAT, false, FSZ*4, 0);
  gl.enableVertexAttribArray(a_xy);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, FSZ*4, FSZ*2);
  gl.enableVertexAttribArray(a_uv);

  return { count: 4 };
}

// POT helpers (so REPEAT/MIRROR work everywhere)
function isPOT(v){ return (v & (v - 1)) === 0; }
function nextPOT(v){ v--; v|=v>>1; v|=v>>2; v|=v>>4; v|=v>>8; v|=v>>16; v++; return v; }
function toPOTImage(img){
  if (isPOT(img.width) && isPOT(img.height)) return img;
  const w = nextPOT(img.width), h = nextPOT(img.height);
  const can = document.createElement("canvas");
  can.width = w; can.height = h;
  can.getContext("2d").drawImage(img, 0, 0, w, h);
  return can;
}

function loadTexturesPOT(gl, urls, done){
  const out = new Array(urls.length);
  let k = 0;
  urls.forEach((src,i)=>{
    const img = new Image();
    img.onload = ()=>{
      const source = toPOTImage(img);
      const t = gl.createTexture();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      out[i] = t;
      if(++k === urls.length) done(out);
    };
    img.src = src;
  });
}
