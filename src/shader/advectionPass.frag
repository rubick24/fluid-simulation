#version 300 es
precision highp float;

uniform sampler2D uVelocity;
uniform sampler2D uSource;

uniform vec2 texelSize;
// uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;

in vec2 fragCoord;
out vec4 outTex;

// vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
//     vec2 st = uv / tsize - 0.5;
//     vec2 iuv = floor(st);
//     vec2 fuv = fract(st);
//     vec4 a = texture(sam, (iuv + vec2(0.5, 0.5)) * tsize);
//     vec4 b = texture(sam, (iuv + vec2(1.5, 0.5)) * tsize);
//     vec4 c = texture(sam, (iuv + vec2(0.5, 1.5)) * tsize);
//     vec4 d = texture(sam, (iuv + vec2(1.5, 1.5)) * tsize);
//     return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
// }

void main () {
    // #ifdef MANUAL_FILTERING
    // vec2 coord = fragCoord - dt * bilerp(uVelocity, fragCoord, texelSize).xy * texelSize;
    // vec4 result = bilerp(uSource, coord, dyeTexelSize);
    // #else
    // #endif
    vec2 coord = fragCoord - dt * texture(uVelocity, fragCoord).xy * texelSize;
    vec4 result = texture(uSource, coord);

    float decay = 1.0 + dissipation * dt;
    outTex = result / decay;
}
