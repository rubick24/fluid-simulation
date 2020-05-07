#version 300 es
precision highp float;

layout (location = 0) in vec2 position;

uniform vec2 resolution;
uniform vec2 texelSize;

out vec2 fragCoord;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;

void main() {
    fragCoord = resolution * (position + 1.) / 2.;
    vL = fragCoord - vec2(texelSize.x, 0.0);
    vR = fragCoord + vec2(texelSize.x, 0.0);
    vT = fragCoord + vec2(0.0, texelSize.y);
    vB = fragCoord - vec2(0.0, texelSize.y);
    gl_Position = vec4(position, 0, 1);
}
