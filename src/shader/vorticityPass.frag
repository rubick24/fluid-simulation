#version 300 es
precision highp float;

uniform sampler2D velocity;
uniform sampler2D vorticity;
uniform vec2 texelSize;
uniform float curl;
uniform float dt;

in vec2 uv;
out vec2 outVelocity;

void main() {
    vec2 xOffset = vec2(texelSize.x, 0.0);
    vec2 yOffset = vec2(0.0, texelSize.y);

    float L = texture(vorticity, uv - xOffset).x;
    float R = texture(vorticity, uv + xOffset).x;
    float T = texture(vorticity, uv + yOffset).x;
    float B = texture(vorticity, uv - yOffset).x;
    float C = texture(vorticity, uv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;

    // vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    // float lengthSquared = max(2.4414e-4, dot(force, force));
    // force *= inversesqrt(lengthSquared) * curl * C;
    // force.y *= -1.0;

    vec2 vel = texture(velocity, uv).xy;
    outVelocity = vel + force * dt;
}
