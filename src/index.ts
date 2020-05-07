import DesktopInput from './input/DesktopInput'
import TouchInput from './input/TouchInput'
import { vec3, mat4 } from 'gl-matrix'
import Shader from './shader'
import vsSource from './shader/main.vert'

import curlPassSource from './shader/curlPass.frag'
import vorticityPassSource from './shader/vorticityPass.frag'
import divergencePassSource from './shader/divergencePass.frag'
import clearPassSource from './shader/clearPass.frag'
import gradienSubtractPassSource from './shader/gradienSubtractPass.frag'
import advectionPassSource from './shader/advectionPass.frag'

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
const di = new DesktopInput(canvas)
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

// framebuffer
const createFBO = (size: number = 4) => {
  const sizeFormatMap = [
    [gl.R32F, gl.RED],
    [gl.RG32F, gl.RG],
    [gl.RGB32F, gl.RGB],
    [gl.RGBA32F, gl.RGBA]
  ]
  const [internalformat, format] = sizeFormatMap[size - 1]

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, canvas.width, canvas.height, 0, format, gl.FLOAT, null)

  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  return { fb, tex }
}

const createDoubleFBO = (size?: number) => {
  const t = [0, 1].map(() => createFBO(size))
  return {
    get fb() { return t[0].fb },
    get tex()  { return t[1].tex },
    swap: t.reverse
  }
}

const dye = createDoubleFBO()
const velocity = createDoubleFBO(2)
const divergence = createFBO(1)
const vorticity = createFBO(1) // ?
const pressure = createDoubleFBO()


// pass

// velocity => vorticity
const curlPass = (() => {
  const curlShader = new Shader(gl, vsSource, curlPassSource)
  return () => {
    curlShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    curlShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    curlShader.setUniform('texelSize', 'VEC2', [1, 1])

    gl.bindFramebuffer(gl.FRAMEBUFFER, vorticity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
})()


// velocity, vorticity => velocity
const vorticityPass = (() => {
  const vorticityShader = new Shader(gl, vsSource, vorticityPassSource)
  return () => {
    vorticityShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, vorticity.tex)
    vorticityShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    vorticityShader.setUniform('texelSize', 'VEC2', [1, 1])

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity => divergence
const divergencePass = (() => {
  const divergenceShader = new Shader(gl, vsSource, divergencePassSource)
  return () => {
    divergenceShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    divergenceShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    divergenceShader.setUniform('texelSize', 'VEC2', [1, 1])

    gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
})()

// pressure => pressure
const clearPass = (() => {
  const clearShader = new Shader(gl, vsSource, clearPassSource)
  return () => {
    clearShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
    clearShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    clearShader.setUniform('texelSize', 'VEC2', [1, 1])

    clearShader.setUniform('value', 'FLOAT', 1)

    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    pressure.swap()
  }
})()

 // pressure, divergence => pressure
const pressurePass = (() => {
  const clearShader = new Shader(gl, vsSource, clearPassSource)
  return () => {
    clearShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, divergence.tex)
    clearShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    clearShader.setUniform('texelSize', 'VEC2', [1, 1])

    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    pressure.swap()
  }
})()

// pressure,velocity => velocity
const gradienSubtractPass = (() => {
  const gradienSubtractShader = new Shader(gl, vsSource, gradienSubtractPassSource)
  return () => {
    gradienSubtractShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gradienSubtractShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    gradienSubtractShader.setUniform('texelSize', 'VEC2', [1, 1])

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity => velocity
// velocity,dye => dye
const advectionPass = (() => {
  const advectionShader = new Shader(gl, vsSource, advectionPassSource)
  return (dt: number) => {
    advectionShader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    advectionShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    advectionShader.setUniform('texelSize', 'VEC2', [1, 1])
    advectionShader.setUniform('dt', 'FLOAT', dt)
    advectionShader.setUniform('dissipation', 'FLOAT', 1)

    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()


    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, dye.tex)
    advectionShader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
    advectionShader.setUniform('texelSize', 'VEC2', [1, 1])
    advectionShader.setUniform('dt', 'FLOAT', dt)
    advectionShader.setUniform('dissipation', 'FLOAT', 1)

    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.fb)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    dye.swap()
  }
})()

const displayPass = {}


let lastTime = 0
let dt = 0
const renderLoop = (time: number) => {
  dt = time -  lastTime
  lastTime = time

  curlPass()
  vorticityPass()
  divergencePass()
  clearPass()
  pressurePass()
  gradienSubtractPass()
  advectionPass(dt)

  requestAnimationFrame(renderLoop)
}
requestAnimationFrame(renderLoop)
