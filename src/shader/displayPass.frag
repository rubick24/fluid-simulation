#version 300 es
precision highp float;
uniform vec2 texelSize;
uniform sampler2D uTarget;

in vec2 uv;
out vec4 fragColor;

void main () {
    fragColor = texture(uTarget, uv);
    // fragColor = (texture(uTarget, uv) + 1.)/2.;
}
