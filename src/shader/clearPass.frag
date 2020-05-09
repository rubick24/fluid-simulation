#version 300 es
precision highp float;

uniform float value;
uniform sampler2D uPressure;

in vec2 uv;
out float outPressure;

void main () {
    outPressure = value * texture(uPressure, uv).x;
}
