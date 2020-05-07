#version 300 es
precision highp float;

uniform sampler2D velocity;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
in vec2 fragCoord;
out float outDivergence;

void main () {
    float L = texture(velocity, vL).x;
    float R = texture(velocity, vR).x;
    float T = texture(velocity, vT).y;
    float B = texture(velocity, vB).y;

    vec2 C = texture(velocity, fragCoord).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    outDivergence = 0.5 * (R - L + T - B);
}
