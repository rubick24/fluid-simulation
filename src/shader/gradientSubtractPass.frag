#version 300 es
precision highp float;

uniform vec2 texelSize;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

in vec2 uv;
out vec2 outVelocity;

void main () {
    vec2 xOffset = vec2(texelSize.x, 0.0);
    vec2 yOffset = vec2(0.0, texelSize.y);
    float L = texture(uPressure, uv - xOffset).y;
    float R = texture(uPressure, uv + xOffset).y;
    float T = texture(uPressure, uv + yOffset).x;
    float B = texture(uPressure, uv - yOffset).x;
    outVelocity = texture(uVelocity, uv).xy - vec2(R - L, T - B);
}


