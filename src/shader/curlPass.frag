#version 300 es
precision highp float;

uniform vec2 texelSize;
uniform sampler2D velocity;

in vec2 uv;
out float vorticity;

void main() {
    vec2 xOffset = vec2(texelSize.x, 0.0);
    vec2 yOffset = vec2(0.0, texelSize.y);
    float L = texture(velocity, uv - xOffset).y;
    float R = texture(velocity, uv + xOffset).y;
    float T = texture(velocity, uv + yOffset).x;
    float B = texture(velocity, uv - yOffset).x;
    vorticity = (R - L - T + B) * 0.5;
}
