// #version 300 es
// precision highp float;

// uniform float time;
// uniform float fovy;
// uniform vec2 resolution;
// uniform vec2 mouse;
// uniform vec3 cameraPosition;
// uniform mat4 viewMatrixInverse;

// uniform sampler2D moonTexture;

// in vec2 fragCoord;
// out vec4 fragColor;

// const float PI = 3.1415926;

// float sphIntersect( vec3 ro, vec3 rd, vec3 center, float radius) {
//     vec3 oc = ro - center;
//     float b = dot( oc, rd );
//     float c = dot( oc, oc ) - radius * radius;
//     float h = b*b - c;
//     if (h < 0.) {
//         return -1.;
//     }
//     return -b - sqrt(h);
// }

// void main() {
//     vec2 uv = fragCoord / resolution;
//     vec2 p = (-resolution + 2. * fragCoord) / resolution.y; // -1 <> 1 by height
//     fragColor = vec4(vec3(0.), 1.);

//     vec3 rayOrigin = cameraPosition;
//     // per set
//     vec3 target = vec3(0.);

//     // vec3 cameraFront = normalize(target - rayOrigin);
//     float focalLength = 1./atan(fovy/2.);
//     vec3 rayDirection = normalize((viewMatrixInverse * vec4(p, -focalLength, 0.)).xyz);

//     vec3 center = vec3(0., 0., 0.);
//     float radius = 0.3;

//     float d = sphIntersect(rayOrigin, rayDirection, center, radius);
//     if (d > 0.) {
//         // normal
//         vec3 ld = normalize(vec3(1.));
//         vec3 nor = normalize(rayOrigin + rayDirection * d - center);
//         fragColor = vec4(clamp(vec3(1.) * dot(ld, nor), 0., 1.), 1.);
//         vec3 diffuse = max(dot(nor, ld), 0.0) * vec3(1.);

//         vec2 muv = vec2(atan(nor.x, nor.z), acos(nor.y)) * radius;
//         muv.x = (muv.x + 1.) /2.;
//         vec4 baseColor = vec4(vec3(0.5), 1.);
//         baseColor = texture(moonTexture, muv);
//         fragColor = vec4(baseColor.rgb * (0.05 + diffuse), 1.);
//     }
// }
