import DesktopInput from './input/DesktopInput'
import TouchInput from './input/TouchInput'
// import { vec3, mat4 } from 'gl-matrix'
import Shader from './shader'
import vsSource from './shader/main.vert'

import splatPassSource from './shader/splatPass.frag'
import curlPassSource from './shader/curlPass.frag'
import vorticityPassSource from './shader/vorticityPass.frag'
import divergencePassSource from './shader/divergencePass.frag'
import clearPassSource from './shader/clearPass.frag'
import pressurePassSource from './shader/pressurePass.frag'
import gradientSubtractPassSource from './shader/gradientSubtractPass.frag'
import advectionPassSource from './shader/advectionPass.frag'
import displayPassSource from './shader/displayPass.frag'

// basic setup
const canvas = document.getElementById('main') as HTMLCanvasElement
canvas.height = window.innerHeight
canvas.width = window.innerWidth
const gl = canvas.getContext('webgl2', { premultipliedAlpha: false })
if (!gl) {
  throw new Error('webgl2 not available')
}
gl.clearColor(0, 0, 0, 0)
gl.getExtension('EXT_color_buffer_float')
// gl.getExtension('OES_texture_float_linear')

gl.viewport(0, 0, canvas.width, canvas.height)
const di = new DesktopInput(canvas, { updateRate: 1 })
const ti = new TouchInput(canvas)

// quad
const quad = [-1, 1, -1, -1, 1, 1, 1, -1]
const quadVAO = gl.createVertexArray()
const quadVBO = gl.createBuffer()
gl.bindVertexArray(quadVAO)
gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad), gl.STATIC_DRAW)
gl.enableVertexAttribArray(0)
gl.vertexAttribPointer(0, 2, gl.FLOAT, true, 8, 0)
gl.bindBuffer(gl.ARRAY_BUFFER, null)

interface IFBOConfig {
  size?: number
  resolution?: {
    width: number, height: number
  }
}

const createFBO = (c?: IFBOConfig) => {
  const config = {...{
    size: 4,
    resolution: { width: canvas.clientWidth, height: canvas.clientHeight }
  }, ...c}
  const sizeFormatMap = [
    [gl.R32F, gl.RED],
    [gl.RG32F, gl.RG],
    [gl.RGB32F, gl.RGB],
    [gl.RGBA32F, gl.RGBA]
  ]
  const [internalformat, format] = sizeFormatMap[config.size - 1]

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, config.resolution.width, config.resolution.height, 0, format, gl.FLOAT, null)
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.viewport(0, 0, config.resolution.width, config.resolution.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  return { fb, tex }
}

const createDoubleFBO = (c?: IFBOConfig) => {
  const t = [0, 1].map(() => createFBO(c))
  return {
    get fb() { return t[0].fb },
    get tex()  { return t[1].tex },
    swap: () => t.reverse()
  }
}

const r = canvas.clientHeight / canvas.clientWidth
const texelRes = [128, 128 * r]
const texelSize = texelRes.map(v => 1/v)

const dye = createDoubleFBO()
const velocity = createDoubleFBO({size: 2, resolution: { width: texelRes[0], height: texelRes[1] }})
const vorticity = createFBO({size: 1, resolution: { width: texelRes[0], height: texelRes[1] }})
const divergence = createFBO({size: 1, resolution: { width: texelRes[0], height: texelRes[1] }})
const pressure = createDoubleFBO({size: 1, resolution: { width: texelRes[0], height: texelRes[1] }})


// pass



// input, velocity => velocity
const splatPass = (() => {
  const splatShader = new Shader(gl, vsSource, splatPassSource)
  splatShader.use()
  splatShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  splatShader.setUniform('texelSize', 'VEC2', texelSize)
  return () => {
    splatShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)

    splatShader.setUniform('pressed', 'BOOLEAN', di.mouseInput.draging)

    const cursor = [di.mouseInput.x / canvas.clientHeight, 1 - di.mouseInput.y / canvas.clientHeight]
    splatShader.setUniform('cursor', 'VEC2', cursor)

    const force = [di.mouseInput.x - di.mouseInput.lastX, di.mouseInput.lastY - di.mouseInput.y]
    splatShader.setUniform('force', 'VEC2', force)

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity => vorticity
const curlPass = (() => {
  const curlShader = new Shader(gl, vsSource, curlPassSource)
  curlShader.use()
  curlShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  curlShader.setUniform('texelSize', 'VEC2', texelSize)
  return () => {
    curlShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gl.bindFramebuffer(gl.FRAMEBUFFER, vorticity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
})()


// velocity, vorticity => velocity
const vorticityPass = (() => {
  const vorticityShader = new Shader(gl, vsSource, vorticityPassSource)
  vorticityShader.use()
  vorticityShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  vorticityShader.setUniform('texelSize', 'VEC2', texelSize)
  return (dt: number) => {
    vorticityShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    vorticityShader.setUniform('velocity', 'INT', 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, vorticity.tex)
    vorticityShader.setUniform('vorticity', 'INT', 1)

    vorticityShader.setUniform('curl', 'FLOAT', 25) // vorticity 0 - 50
    vorticityShader.setUniform('dt', 'FLOAT', dt/1000.)

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity => divergence
const divergencePass = (() => {
  const divergenceShader = new Shader(gl, vsSource, divergencePassSource)
  divergenceShader.use()
  divergenceShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  divergenceShader.setUniform('texelSize', 'VEC2', texelSize)

  return () => {
    divergenceShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
})()

// pressure => pressure
const clearPass = (() => {
  const clearShader = new Shader(gl, vsSource, clearPassSource)
  clearShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  clearShader.setUniform('texelSize', 'VEC2', texelSize)
  return () => {
    clearShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressure.tex)

    clearShader.setUniform('value', 'FLOAT', 0.8) // config.PRESSURE

    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    pressure.swap()
  }
})()

 // pressure, divergence => pressure
const pressurePass = (() => {
  const presureShader = new Shader(gl, vsSource, pressurePassSource)
  presureShader.use()
  presureShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  presureShader.setUniform('texelSize', 'VEC2', texelSize)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, divergence.tex)
  presureShader.setUniform('uDivergence', 'INT', 0)
  return () => {
    for (let i = 0; i<20; i++) {
      presureShader.use()
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
      presureShader.setUniform('uPressure', 'INT', 1)
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.fb)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      pressure.swap()
    }
  }
})()

// pressure,velocity => velocity
const gradientSubtractPass = (() => {
  const gradienSubtractShader = new Shader(gl, vsSource, gradientSubtractPassSource)
  gradienSubtractShader.use()
  gradienSubtractShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  gradienSubtractShader.setUniform('texelSize', 'VEC2', texelSize)

  return () => {
    gradienSubtractShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
    gradienSubtractShader.setUniform('uPressure', 'INT', 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gradienSubtractShader.setUniform('uVelocity', 'INT', 1)

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity => velocity
// velocity,dye => dye
const advectionPass = (() => {
  const advectionShader = new Shader(gl, vsSource, advectionPassSource)
  advectionShader.use()
  advectionShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  advectionShader.setUniform('texelSize', 'VEC2', texelSize)
  return (dt: number) => {
    advectionShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)

    advectionShader.setUniform('dt', 'FLOAT', dt)
    advectionShader.setUniform('dissipation', 'FLOAT', 1)

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()


    // gl.activeTexture(gl.TEXTURE0)
    // gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    // advectionShader.setUniform('uVelocity', 'INT', 0)
    // gl.activeTexture(gl.TEXTURE1)
    // gl.bindTexture(gl.TEXTURE_2D, dye.tex)
    // advectionShader.setUniform('uSource', 'INT', 0)
    // advectionShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    // advectionShader.setUniform('texelSize', 'VEC2', texelSize)
    // advectionShader.setUniform('dt', 'FLOAT', dt)
    // advectionShader.setUniform('dissipation', 'FLOAT', 1)

    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    dye.swap()
  }
})()

const displayPass = (() => {
  const displayShader = new Shader(gl, vsSource, displayPassSource)
  displayShader.use()
  displayShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  return (target: WebGLTexture | null) => {

    displayShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
})()

let lastTime = 0
let dt = 0
const renderLoop = (time: number) => {
  dt = time -  lastTime
  lastTime = time

  gl.viewport(0, 0, texelRes[0], texelRes[1])
  splatPass()

  curlPass()
  vorticityPass(dt)

  // divergencePass()
  // clearPass()
  // pressurePass()
  // gradientSubtractPass()
  // advectionPass(dt)


  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)

  // velocity  vorticity  pressure  divergence  dye
  displayPass(velocity.tex)

  requestAnimationFrame(renderLoop)
}
requestAnimationFrame(renderLoop)
