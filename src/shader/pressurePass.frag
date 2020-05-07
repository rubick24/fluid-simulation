#version 300 es
precision highp float;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
in vec2 fragCoord;
out float outPressure;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    float C = texture(uPressure, fragCoord).x;
    float divergence = texture(uDivergence, fragCoord).x;
    outPressure = (L + R + B + T - divergence) * 0.25;
}
