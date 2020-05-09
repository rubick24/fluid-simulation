#version 300 es
precision highp float;

uniform vec2 texelSize;
uniform sampler2D velocity;

in vec2 uv;
out float outDivergence;

void main () {
    vec2 xOffset = vec2(texelSize.x, 0.0);
    vec2 yOffset = vec2(0.0, texelSize.y);
    float L = texture(velocity, uv - xOffset).y;
    float R = texture(velocity, uv + xOffset).y;
    float T = texture(velocity, uv + yOffset).x;
    float B = texture(velocity, uv - yOffset).x;

    vec2 C = texture(velocity, uv).xy;
    if (uv.x - xOffset.x < 0.0) { L = -C.x; }
    if (uv.x + xOffset.x > 1.0) { R = -C.x; }
    if (uv.y + yOffset.y > 1.0) { T = -C.y; }
    if (uv.y - yOffset.y < 0.0) { B = -C.y; }

    outDivergence = 0.5 * (R - L + T - B);
}
