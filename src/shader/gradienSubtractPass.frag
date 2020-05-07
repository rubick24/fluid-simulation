#version 300 es
precision highp float;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
in vec2 fragCoord;
out vec2 outVelocity;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    vec2 velocity = texture(uVelocity, fragCoord).xy;
    velocity.xy -= vec2(R - L, T - B);
    outVelocity = velocity;
}


