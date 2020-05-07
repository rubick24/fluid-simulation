#version 300 es
precision highp float;

uniform sampler2D velocity;
uniform sampler2D vorticity;

uniform float curl;
uniform float dt;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
in vec2 fragCoord;
out vec2 outVelocity;

void main() {
    float L = texture(vorticity, vL).x;
    float R = texture(vorticity, vR).x;
    float T = texture(vorticity, vT).x;
    float B = texture(vorticity, vB).x;
    float C = texture(vorticity, fragCoord).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;

    vec2 vel = texture(velocity, fragCoord).xy;
    outVelocity = vel + force * dt;
}
