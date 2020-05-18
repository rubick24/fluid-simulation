#version 300 es
precision highp float;

uniform vec2 texelSize;
uniform sampler2D uDivergence;
uniform sampler2D uPressure;

in vec2 uv;
out float outPressure;

void main () {

    vec2 xOffset = vec2(texelSize.x, 0.0);
    vec2 yOffset = vec2(0.0, texelSize.y);
    float L = texture(uPressure, uv - xOffset).x;
    float R = texture(uPressure, uv + xOffset).x;
    float T = texture(uPressure, uv + yOffset).x;
    float B = texture(uPressure, uv - yOffset).x;
    float C = texture(uPressure, uv).x;
    float divergence = texture(uDivergence, uv).x;
    outPressure = (L + R + B + T - divergence) * 0.25;
}
