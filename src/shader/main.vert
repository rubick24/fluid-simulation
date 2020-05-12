#version 300 es
precision highp float;

layout (location = 0) in vec2 position;

out vec2 uv;

void main() {
    uv = (position + 1.) / 2.;
    gl_Position = vec4(position, 0, 1);
}
