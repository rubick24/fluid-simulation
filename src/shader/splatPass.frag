#version 300 es
precision highp float;

uniform sampler2D velocity;
uniform vec2 resolution;

uniform vec2 cursor;
uniform vec2 force;

uniform int pressed;

in vec2 uv;
out vec2 outVelocity;

void main () {
    vec2 nuv = vec2(uv.x * resolution.x/resolution.y, uv.y);

    vec2 p = nuv - cursor;
    vec2 base = texture(velocity, uv).xy;
    float radius = 0.0002;
    vec2 f = pressed < 1 ? vec2(0.) : force * 100.;
    vec2 splat = vec2(exp(-dot(p, p) / radius)) * f;
    outVelocity = base + splat;
}
