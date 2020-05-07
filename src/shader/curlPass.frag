#version 300 es
precision highp float;

uniform sampler2D velocity;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
in vec2 fragCoord;
out float vorticity;

void main() {
    float L = texture(velocity, vL).y;
    float R = texture(velocity, vR).y;
    float T = texture(velocity, vT).x;
    float B = texture(velocity, vB).x;
    vorticity = (R - L - T + B) * 0.5;
}
