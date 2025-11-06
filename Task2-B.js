const VS = `
attribute vec2 a_xy;
attribute vec2 a_uv;
uniform mat4 u_M;
varying vec2 v_uv;
void main(){
  gl_Position = u_M * vec4(a_xy,0.0,1.0);
  v_uv = a_uv;
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

// top row → bottom row
const IMAGES = [
  "../resourcesB/pic1.jpg",
  "../resourcesB/pic2.jpg",
  "../resourcesB/pic3.jpg",
  "../resourcesB/pic4.jpg"
];

function main(){
  const canvas = document.getElementById("webgl");
  const gl = getWebGLContext(canvas);
  if(!gl) return;
  if(!initShaders(gl, VS, FS)) return;

  const quad = initQuad(gl);
  const uM   = gl.getUniformLocation(gl.program, "u_M");
  const uTex = gl.getUniformLocation(gl.program, "u_tex");

  loadTextures(gl, IMAGES, (texList)=>{
    drawGrid(gl, quad, uM, uTex, texList);
  });
}

function initQuad(gl){
  const hs = 0.25;
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const data = new Float32Array([
    -hs,  hs,  0, 1,
    -hs, -hs,  0, 0,
     hs,  hs,  1, 1,
     hs, -hs,  1, 0
  ]);
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

function loadTextures(gl, urls, done){
  const out = new Array(urls.length);
  let k = 0;
  urls.forEach((src,i)=>{
    const img = new Image();
    img.onload = ()=>{
      const t = gl.createTexture();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      out[i] = t;
      if(++k === urls.length) done(out);
    };
    img.src = src;
  });
}

function drawGrid(gl, quad, uM, uTex, texList){
  const centers = [-0.75, -0.25, 0.25, 0.75];
  const M = new Matrix4();
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(uTex, 0);

  for(let r=0;r<4;r++){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texList[r]);
    for(let c=0;c<4;c++){
      M.setIdentity();
      M.translate(centers[c], centers[3-r], 0);
      gl.uniformMatrix4fv(uM, false, M.elements);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, quad.count);
    }
  }
}
