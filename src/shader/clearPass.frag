#version 300 es
precision highp float;

uniform float value;
uniform sampler2D uPressure;

in vec2 fragCoord;
out float outPressure;

void main () {
    outPressure = value * texture(uPressure, fragCoord).x;
}
