#version 300 es
precision highp float;

uniform sampler2D velocity;
uniform sampler2D advected;

uniform vec2 texelSize;
uniform float gridScale;

uniform float time;
uniform float dissipation;

in vec2 uv;
out vec4 fargColor;

vec2 bilerp(sampler2D d, vec2 p)
{
    vec4 ij; // i0, j0, i1, j1
    ij.xy = floor(p - 0.5) + 0.5;
    ij.zw = ij.xy + 1.0;

    vec4 guv = ij / texelSize.xyxy;
    vec2 d11 = texture(d, guv.xy).xy;
    vec2 d21 = texture(d, guv.zy).xy;
    vec2 d12 = texture(d, guv.xw).xy;
    vec2 d22 = texture(d, guv.zw).xy;

    vec2 a = p - ij.xy;

    return mix(mix(d11, d21, a.x), mix(d12, d22, a.x), a.y);
}

void main()
{
    vec2 guv = uv / texelSize.xy;
    float scale = 1.0 / gridScale;

    // trace point back in time
    vec2 p = uv - time * scale * texture(velocity, guv).xy;

    fargColor = vec4(dissipation * bilerp(advected, p), 0.0, 1.0);
}
