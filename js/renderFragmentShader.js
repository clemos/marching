const glsl = require( 'glslify' )

const getMainContinuous = function( steps, minDistance, maxDistance, postprocessing ) {
  const out = `
  // adapted from https://www.shadertoy.com/view/ldfSWs
  vec3 calcNormal(vec3 pos, float eps) {
    const vec3 v1 = vec3( 1.0,-1.0,-1.0);
    const vec3 v2 = vec3(-1.0,-1.0, 1.0);
    const vec3 v3 = vec3(-1.0, 1.0,-1.0);
    const vec3 v4 = vec3( 1.0, 1.0, 1.0);

    return normalize( v1 * scene ( pos + v1*eps ).x+
                      v2 * scene ( pos + v2*eps ).x+
                      v3 * scene ( pos + v3*eps ).x+
                      v4 * scene ( pos + v4*eps ).x);
  }

  vec3 calcNormal(vec3 pos) {
    return calcNormal(pos, 0.002);
  }

  // Adapted from from https://www.shadertoy.com/view/ldfSWs
  vec2 calcRayIntersection( vec3 rayOrigin, vec3 rayDir, float maxd, float precis ) {
    float latest = precis * 2.0;
    float dist   = +0.0;
    float type   = -1.0;
    vec2 result;
    vec2 res = vec2(-50000., -1.);;

    for (int i = 0; i < ${steps} ; i++) {
      if (latest < precis || dist > maxd) break;

      result = scene(rayOrigin + rayDir * dist);

      latest = result.x;
      dist  += latest;
    }

    if( dist < maxd ) {
      result.x = dist;
      res = result;
    }

    return res;
  }

  out vec4 col;
  void main() {
    vec2 pos = v_uv * 2.0 - 1.0;

    // not sure why I need the -y axis but without it
    // everything is flipped using perspective-camera
    pos.x *= ( resolution.x / -resolution.y );

    vec3 color = bg; 
    vec3 ro = camera_pos;
    vec3 rd = normalize( mat3(camera) * vec3( pos, 2. ) ); 
    
    vec2 t = calcRayIntersection( ro, rd, ${maxDistance}, ${minDistance} );

    if( t.x > -0.5 ) {
      vec3 pos = ro + rd * t.x;
      vec3 nor = calcNormal( pos );

      color = lighting( pos, nor, ro, rd, t.y, true ); 
    }

    ${postprocessing}
    
    col = clamp( vec4( color, 1.0 ), 0., 1. );
  }`

  return out
}

const getMainVoxels = function( steps, postprocessing, voxelSize = .1 ) {
  const out = `
  struct VoxelDistance {
    bvec3 mask;
    vec3  distance;
    float fogCoeff;
    int   id;
  };

  VoxelDistance calcRayIntersection( vec3 rayOrigin, vec3 rayDir ) {
    vec2 result;

    float m = ${voxelSize};
    rayOrigin *= 1./m;
    vec3 mapPos = vec3(floor(rayOrigin));
    vec3 diff = mapPos - rayOrigin;

    vec3 deltaDist = abs(vec3(length(rayDir)) / rayDir);
    vec3 rayStep = vec3(sign(rayDir));
    vec3 sideDist = (sign(rayDir) * diff + (sign(rayDir) * 0.5) + 0.5) * deltaDist; 

    bvec3 mask;
    vec3 d = vec3(-100000.);
    float fogCoeff = 0.;

    for (int i = 0; i < ${Math.round(steps*1/voxelSize)} ; i++) {
      result = scene(mapPos*m);
      if( result.x <= 0. ) {
        d = mapPos*m+result.x;
        break;
      }

      mask = bvec3( lessThanEqual(sideDist.xyz, min(sideDist.yzx, sideDist.zxy)) );
      sideDist += vec3( mask ) * deltaDist; 
      mapPos += vec3(mask) * rayStep;
      fogCoeff += result.x * m;
    }

    VoxelDistance vd = VoxelDistance( mask, d, fogCoeff, int(result.y) );
    return vd;
  }

  out vec4 col;
  void main() {
    vec2 pos = v_uv * 2.0 - 1.0;

    // not sure why I need the -y axis but without it
    // everything is flipped using perspective-camera
    pos.x *= ( resolution.x / -resolution.y );
    
    vec3 color = bg; 
    vec3 ro = camera_pos;
    vec3 rd = normalize( mat3(camera) * vec3( pos, 2. ) ); 
                 
    VoxelDistance vd = calcRayIntersection( ro, rd );
    bvec3 mask = vd.mask;
    
    vec3 nor;
    if (mask.x) {
      color = vec3(0.5);
      nor = vec3(1.,0.,0.);
    }
    if (mask.y) {
      color = vec3(1.0);
      nor = vec3(0.,1.,0.);
    }
    if (mask.z) {
      color = vec3(0.75);
      nor = vec3(0.,0.,1.);
    }
    if( vd.distance.x == -100000. ) {
      color = bg;
    }
    
    float modAmount = ${(1./voxelSize).toFixed(1)};
    if( color != bg ) {
      vec3 pos = vd.distance; 
      //vec3 pos = ro + rd * vd.fogCoeff;

      color *= lighting( pos * modAmount, nor, ro, rd, float(vd.id), false ); 
      //color *= lighting( pos, nor, ro, rd, float(vd.id), false ); 
      //color = min(color,1.);
      //color = getTexture( 0, pos );
      
    }
    
    vec2 t = vec2( vd.fogCoeff, vd.id );
  ${postprocessing}; 
    col = vec4( color, 1. ); 
  }`

  return out
}

module.exports = function( variables, scene, preface, geometries, lighting, postprocessing, steps=90, minDistance=.001, maxDistance=20, ops, voxelSize=0 ) {

  const main = voxelSize === 0
    ? getMainContinuous( steps, minDistance, maxDistance, postprocessing ) 
    : getMainVoxels( steps, postprocessing, voxelSize )

    const fs_source = glsl`     #version 300 es
      precision mediump float;

      float PI = 3.141592653589793;

      in vec2 v_uv;

      struct Light {
        vec3 position;
        vec3 color;
        float attenuation;
      };

      int rotationCount = 1;

      mat4 rotations[4] = mat4[4](
        mat4(0.), mat4(0.), mat4(0.), mat4(0.)
      );

      struct Material {
        int  mode;
        vec3 ambient;
        vec3 diffuse;
        vec3 specular;
        float shininess;
        vec3 fresnel;
        int textureID;
      };     

      struct SDF {
        int materialID;
        mat4 transform;
        int textureID;
        vec3 repeat;
        mat4 repeatTransform;
      };

      uniform float time;
      uniform vec2 resolution;
      uniform vec3 camera_pos;
      uniform vec3 camera_normal;
      uniform float camera_rot;
      uniform mat4 camera;

      ${variables}

      // must be before geometries!
      float length8( vec2 p ) { 
        return float( pow( pow(p.x,8.)+pow(p.y,8.), 1./8. ) ); 
      }

      vec4 opElongate( in vec3 p, in vec3 h ) {
        //return vec4( p-clamp(p,-h,h), 0.0 ); // faster, but produces zero in the interior elongated box
       
        vec3 q = abs(p)-h;
        return vec4( max(q,0.0), min(max(q.x,max(q.y,q.z)),0.0) );
      }
      ${ops}

      /* GEOMETRIES */
      ${geometries}

      vec2 scene(vec3 p);

      // XXX todo put this in domainOperations.js
      vec3 polarRepeat(vec3 p, float repetitions) {
        float angle = 2.*PI/repetitions;
        float a = atan(p.z, p.x) + angle/2.;
        float r = length(p.xz);
        float c = floor(a/angle);
        a = mod(a,angle) - angle/2.;
        vec3 _p = vec3( cos(a) * r, p.y,  sin(a) * r );
        // For an odd number of repetitions, fix cell index of the cell in -x direction
        // (cell index would be e.g. -5 and 5 in the two halves of the cell):
        if (abs(c) >= (repetitions/2.)) c = abs(c);
        return _p;
      }

      // added k value to glsl-sdf-ops/soft-shadow
      float softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax, in float k ){
        float res = 1.0;
        float t = mint;

        for( int i = 0; i < 12; i++ ) {
          float h = scene( ro + rd * t ).x;
          res = min( res, k * h / t );
          t += clamp( h, 0.02, 0.10 );
          if( h<0.001 || t>tmax ) break;
        }

        return clamp( res, 0.0, 1.0 );
      }

${lighting}

    vec2 scene(vec3 _p ) {
      vec4 p = vec4( _p, 1. );
${preface}
      return ${scene};
    }
 
${main}
`

    return fs_source
  }
