#version 300 es
precision highp float;

uniform sampler2D dye;
uniform vec2 resolution;
uniform int pressed;
uniform vec2 cursor;
uniform vec3 color;


in vec2 uv;
out vec4 outDye;

void main () {
    vec2 nuv = vec2(uv.x * resolution.x/resolution.y, uv.y);

    vec2 p = nuv - cursor;
    vec3 base = texture(dye, uv).xyz;
    float radius = 0.0025;
    vec3 c = pressed < 1 ? vec3(0.) : color;
    vec3 splat = exp(-dot(p, p) / radius) * c;
    outDye = vec4(base + splat, 1.);
}
