import DesktopInput from './input/DesktopInput'
import TouchInput from './input/TouchInput'
import Shader from './shader'
import vsSource from './shader/main.vert'

import splatPassSource from './shader/splatPass.frag'
import splatDyePassSource from './shader/splatDyePass.frag'
import curlPassSource from './shader/curlPass.frag'
import vorticityPassSource from './shader/vorticityPass.frag'
import divergencePassSource from './shader/divergencePass.frag'
import clearPassSource from './shader/clearPass.frag'
import pressurePassSource from './shader/pressurePass.frag'
import gradientSubtractPassSource from './shader/gradientSubtractPass.frag'
import advectionPassSource from './shader/advectionPass.frag'
import advectionDyePassSource from './shader/advectionDyePass.frag'
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
gl.getExtension('OES_texture_float_linear')

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
  linear?: boolean
}

const createFBO = (c?: IFBOConfig) => {
  const config = {...{
    size: 4,
    resolution: { width: canvas.clientWidth, height: canvas.clientHeight },
    linear: false
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, config.linear ? gl.LINEAR : gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, config.linear ?  gl.LINEAR : gl.NEAREST)
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

const dye = createDoubleFBO({ linear: true })
const velocity = createDoubleFBO({size: 2, resolution: { width: texelRes[0], height: texelRes[1] }, linear: true})
const vorticity = createFBO({size: 1, resolution: { width: texelRes[0], height: texelRes[1] }})
const divergence = createFBO({size: 1, resolution: { width: texelRes[0], height: texelRes[1] }})
const pressure = createDoubleFBO({size: 1, resolution: { width: texelRes[0], height: texelRes[1] }})


// pass

// input, velocity => velocity
const splatPass = (() => {
  const shader = new Shader(gl, vsSource, splatPassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)
  return () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)

    shader.setUniform('pressed', 'BOOLEAN', di.mouseInput.draging)

    const cursor = [di.mouseInput.x / canvas.clientHeight, 1 - di.mouseInput.y / canvas.clientHeight]
    shader.setUniform('cursor', 'VEC2', cursor)

    const force = [di.mouseInput.x - di.mouseInput.lastX, di.mouseInput.lastY - di.mouseInput.y]
    shader.setUniform('force', 'VEC2', force)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// input, dye => dye
const splatDyePass = (() => {
  const shader = new Shader(gl, vsSource, splatDyePassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  return () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, dye.tex)
    const cursor = [di.mouseInput.x / canvas.clientHeight, 1 - di.mouseInput.y / canvas.clientHeight]
    shader.setUniform('cursor', 'VEC2', cursor)
    shader.setUniform('pressed', 'BOOLEAN', di.mouseInput.draging)
    shader.setUniform('color', 'VEC3', [0, 0.5, 1])

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    dye.swap()
  }
})()

// velocity => vorticity
const curlPass = (() => {
  const shader = new Shader(gl, vsSource, curlPassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)
  return () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, vorticity.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
})()

// velocity, vorticity => velocity
const vorticityPass = (() => {
  const shader = new Shader(gl, vsSource, vorticityPassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)
  return (dt: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    shader.setUniform('velocity', 'INT', 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, vorticity.tex)
    shader.setUniform('vorticity', 'INT', 1)

    shader.setUniform('curl', 'FLOAT', 25) // vorticity 0 - 50
    shader.setUniform('dt', 'FLOAT', dt)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity => divergence
const divergencePass = (() => {
  const shader = new Shader(gl, vsSource, divergencePassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)

  return () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
})()

// pressure => pressure
const clearPass = (() => {
  const shader = new Shader(gl, vsSource, clearPassSource)
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)
  return () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
    shader.setUniform('value', 'FLOAT', 0.8) // config.PRESSURE

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    pressure.swap()
  }
})()

 // pressure, divergence => pressure
const pressurePass = (() => {
  const shader = new Shader(gl, vsSource, pressurePassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)

  return () => {
    for (let i = 0; i<20; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.fb)
      shader.use()
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, divergence.tex)
      shader.setUniform('uDivergence', 'INT', 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
      shader.setUniform('uPressure', 'INT', 1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      pressure.swap()
    }
  }
})()

// pressure,velocity => velocity
const gradientSubtractPass = (() => {
  const shader = new Shader(gl, vsSource, gradientSubtractPassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)

  return () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pressure.tex)
    shader.setUniform('uPressure', 'INT', 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    shader.setUniform('uVelocity', 'INT', 1)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity => velocity
const advectionPass = (() => {
  const shader = new Shader(gl, vsSource, advectionPassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)
  return (dt: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)

    shader.setUniform('dt', 'FLOAT', dt)
    shader.setUniform('dissipation', 'FLOAT', 1)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    velocity.swap()
  }
})()

// velocity,dye => dye
const advectionDyePass = (() => {
  const shader = new Shader(gl, vsSource, advectionDyePassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  shader.setUniform('texelSize', 'VEC2', texelSize)
  return (dt: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.fb)
    shader.use()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, velocity.tex)
    shader.setUniform('uVelocity', 'INT', 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, dye.tex)
    shader.setUniform('uSource', 'INT', 1)
    shader.setUniform('dt', 'FLOAT', dt)
    shader.setUniform('dissipation', 'FLOAT', 1)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    dye.swap()
  }
})()

const displayPass = (() => {
  const shader = new Shader(gl, vsSource, displayPassSource)
  shader.use()
  shader.setUniform('resolution', 'VEC2', [canvas.clientWidth, canvas.clientHeight])
  return (target: WebGLTexture | null) => {

    shader.use()
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
  dt /= 1000
  lastTime = time

  gl.viewport(0, 0, texelRes[0], texelRes[1])
  splatPass()
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)
  splatDyePass()
  gl.viewport(0, 0, texelRes[0], texelRes[1])
  curlPass()
  vorticityPass(dt)

  divergencePass()
  clearPass()
  pressurePass()
  gradientSubtractPass()
  advectionPass(dt)

  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)
  advectionDyePass(dt)

  // velocity  vorticity  divergence  pressure  dye
  displayPass(dye.tex)

  requestAnimationFrame(renderLoop)
}
requestAnimationFrame(renderLoop)
