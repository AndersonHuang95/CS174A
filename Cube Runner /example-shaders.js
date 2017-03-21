// UCLA's Graphics Example Code (Javascript and C++ translations available), by Garett Ridge for CS174a.
// example-shaders.js:  Fill in this file with subclasses of Shader, each of which will store and manage a complete GPU program.

// ******* THE DEFAULT SHADER: Phong Shading Model with Gouraud option *******
Declare_Any_Class( "Phong_or_Gouraud_Shader",
  { 'update_uniforms'          : function( g_state, model_transform, material )     // Send javascrpt's variables to the GPU to update its overall state.
      {
          let [ P, C, M ]  = [ g_state.projection_transform, g_state.camera_transform, model_transform ],   // PCM will mean Projection * Camera * Model
          CM             = mult( C,  M ),
          PCM            = mult( P, CM ),                               // Send the current matrices to the shader.  Go ahead and pre-compute the products
          inv_trans_CM   = toMat3( transpose( inverse( CM ) ) );        // we'll need of the of the three special matrices and just send those, since these
                                                                        // will be the same throughout this draw call & across each instance of the vertex shader.
        gl.uniformMatrix4fv( g_addrs.camera_transform_loc,                  false, flatten(  C  ) );
        gl.uniformMatrix4fv( g_addrs.camera_model_transform_loc,            false, flatten(  CM ) );
        gl.uniformMatrix4fv( g_addrs.projection_camera_model_transform_loc, false, flatten( PCM ) );
        gl.uniformMatrix3fv( g_addrs.camera_model_transform_normal_loc,     false, flatten( inv_trans_CM ) );

        if( g_state.gouraud === undefined ) { g_state.gouraud = g_state.color_normals = false; }    // Keep the flags seen by the shader program
        gl.uniform1i( g_addrs.GOURAUD_loc,         g_state.gouraud      );                          // up-to-date and make sure they are declared.
        gl.uniform1i( g_addrs.COLOR_NORMALS_loc,   g_state.color_normals);

        gl.uniform4fv( g_addrs.shapeColor_loc,     material.color       );    // Send a desired shape-wide color to the graphics card
        gl.uniform1f ( g_addrs.ambient_loc,        material.ambient     );
        gl.uniform1f ( g_addrs.diffusivity_loc,    material.diffusivity );
        gl.uniform1f ( g_addrs.shininess_loc,      material.shininess   );

        gl.uniform1f ( g_addrs.smoothness_loc,     material.smoothness  );
        gl.uniform1f ( g_addrs.animation_time_loc, g_state.animation_time / 1000 );

        if( !g_state.lights.length )  return;
        var lightPositions_flattened = [], lightColors_flattened = []; lightAttenuations_flattened = [];
        for( var i = 0; i < 4 * g_state.lights.length; i++ )
          { lightPositions_flattened                  .push( g_state.lights[ Math.floor(i/4) ].position[i%4] );
            lightColors_flattened                     .push( g_state.lights[ Math.floor(i/4) ].color[i%4] );
            lightAttenuations_flattened[ Math.floor(i/4) ] = g_state.lights[ Math.floor(i/4) ].attenuation;
          }
        gl.uniform4fv( g_addrs.lightPosition_loc,       lightPositions_flattened );
        gl.uniform4fv( g_addrs.lightColor_loc,          lightColors_flattened );
        gl.uniform1fv( g_addrs.attenuation_factor_loc,  lightAttenuations_flattened );
      },
    'vertex_glsl_code_string'  : function()           // ********* VERTEX SHADER *********
      { return `
          // The following string is loaded by our javascript and then used as the Vertex Shader program.  Our javascript sends this code to the graphics card at runtime, where on each run it gets
          // compiled and linked there.  Thereafter, all of your calls to draw shapes will launch the vertex shader program once per vertex in the shape (three times per triangle), sending results on
          // to the next phase.  The purpose of this program is to calculate the final resting place of vertices in screen coordinates; each of them starts out in local object coordinates.

          precision mediump float;
          const int N_LIGHTS = 2;               // Be sure to keep this line up to date as you add more lights

          attribute vec4 vColor;
          attribute vec3 vPosition, vNormal;
          attribute vec2 vTexCoord;
          varying vec2 fTexCoord;
          varying vec3 N, E, pos;

          uniform float ambient, diffusivity, shininess, smoothness, animation_time, attenuation_factor[N_LIGHTS];
          uniform bool GOURAUD, COLOR_NORMALS, COLOR_VERTICES;    // Flags for alternate shading methods

          uniform vec4 lightPosition[N_LIGHTS], lightColor[N_LIGHTS], shapeColor;
          varying vec4 VERTEX_COLOR;
          varying vec3 L[N_LIGHTS], H[N_LIGHTS];
          varying float dist[N_LIGHTS];

          uniform mat4 camera_transform, camera_model_transform, projection_camera_model_transform;
          uniform mat3 camera_model_transform_normal;

          void main()
          {
            N = normalize( camera_model_transform_normal * vNormal );

            vec4 object_space_pos = vec4(vPosition, 1.0);
            gl_Position = projection_camera_model_transform * object_space_pos;
            fTexCoord = vTexCoord;

            if( COLOR_NORMALS || COLOR_VERTICES )   // Bypass phong lighting if we're lighting up vertices some other way
            {
              VERTEX_COLOR   = COLOR_NORMALS ? ( vec4( N[0] > 0.0 ? N[0] : sin( animation_time * 3.0   ) * -N[0],             // In normals mode, rgb color = xyz quantity.  Flash if it's negative.
                                                       N[1] > 0.0 ? N[1] : sin( animation_time * 15.0  ) * -N[1],
                                                       N[2] > 0.0 ? N[2] : sin( animation_time * 45.0  ) * -N[2] , 1.0 ) ) : vColor;
              VERTEX_COLOR.a = VERTEX_COLOR.w;
              return;
            }

            pos = ( camera_model_transform * object_space_pos ).xyz;
            E = normalize( -pos );

            for( int i = 0; i < N_LIGHTS; i++ )
            {
              L[i] = normalize( ( camera_transform * lightPosition[i] ).xyz - lightPosition[i].w * pos );   // Use w = 0 for a directional light -- a vector instead of a point.
              H[i] = normalize( L[i] + E );
                                                                                // Is it a point light source?  Calculate the distance to it from the object.  Otherwise use some arbitrary distance.
              dist[i]  = lightPosition[i].w > 0.0 ? distance((camera_transform * lightPosition[i]).xyz, pos) : distance( attenuation_factor[i] * -lightPosition[i].xyz, object_space_pos.xyz );
            }

            if( GOURAUD )         // Gouraud mode?  If so, finalize the whole color calculation here in the vertex shader, one per vertex, before we even break it down to pixels in the fragment shader.
            {
              VERTEX_COLOR = vec4( shapeColor.xyz * ambient, shapeColor.w);
              for(int i = 0; i < N_LIGHTS; i++)
              {
                float attenuation_multiplier = 1.0 / (1.0 + attenuation_factor[i] * (dist[i] * dist[i]));
                float diffuse  = max(dot(L[0], N), 0.0);                                                                                   // TODO
                float specular = pow(max(dot(N, H[0]), 0.0), smoothness); 

                VERTEX_COLOR.xyz += attenuation_multiplier * ( shapeColor.xyz * diffusivity * diffuse + lightColor[i].xyz * shininess * specular );
              }
              VERTEX_COLOR.a = VERTEX_COLOR.w;
            }
          }`;
      },
    'fragment_glsl_code_string': function()           // ********* FRAGMENT SHADER *********
      { return `
          // Likewise, the following string is loaded by our javascript and then used as the Fragment Shader program, which gets sent to the graphics card at runtime.  The fragment shader runs
          // once all vertices in a triangle / element finish their vertex shader programs, and thus have finished finding out where they land on the screen.  The fragment shader fills in (shades)
          // every pixel (fragment) overlapping where the triangle landed.  At each pixel it interpolates different values from the three extreme points of the triangle, and uses them in formulas
          // to determine color.

          precision mediump float;

          const int N_LIGHTS = 2;

          uniform vec4 lightColor[N_LIGHTS], shapeColor;
          varying vec3 L[N_LIGHTS], H[N_LIGHTS];
          varying float dist[N_LIGHTS];
          varying vec4 VERTEX_COLOR;

          uniform float ambient, diffusivity, shininess, smoothness, animation_time, attenuation_factor[N_LIGHTS];

          varying vec2 fTexCoord;   // per-fragment interpolated values from the vertex shader
          varying vec3 N, E, pos;

          uniform sampler2D texture;
          uniform bool GOURAUD, COLOR_NORMALS, COLOR_VERTICES, USE_TEXTURE;

          void main()
          {
            if( GOURAUD || COLOR_NORMALS )    // Bypass phong lighting if we're only interpolating predefined colors across vertices
            {
              gl_FragColor = VERTEX_COLOR;
              return;
            }

            vec4 tex_color = texture2D( texture, fTexCoord );
            gl_FragColor = tex_color * ( USE_TEXTURE ? ambient : 0.0 ) + vec4( shapeColor.xyz * ambient, USE_TEXTURE ? shapeColor.w * tex_color.w : shapeColor.w ) ;
            for( int i = 0; i < N_LIGHTS; i++ )
            {
              float attenuation_multiplier = 1.0 / (1.0 + attenuation_factor[i] * (dist[i] * dist[i]));
                float diffuse  = max(dot(L[0], N), 0.0);                                                                                   // TODO
                float specular = pow(max(dot(N, H[0]), 0.0), smoothness); 

              gl_FragColor.xyz += attenuation_multiplier * (shapeColor.xyz * diffusivity * diffuse  + lightColor[i].xyz * shininess * specular );
            }
            gl_FragColor.a = gl_FragColor.w;
          }`;
      }
  }, Shader );

Declare_Any_Class( "Funny_Shader",                    // This one borrows almost everything from Phong_or_Gouraud_Shader.
  { 'fragment_glsl_code_string': function()           // ********* FRAGMENT SHADER *********
      { return `
          // An alternate fragment shader to the above that's a procedural function of time.
          precision mediump float;

          uniform float animation_time;
          uniform bool USE_TEXTURE;
          varying vec2 fTexCoord;   // per-fragment interpolated values from the vertex shader

          void main()
          {
            if( !USE_TEXTURE ) return;    // USE_TEXTURE must be enabled for any shape using this shader; otherwise texture_coords lookup will fail.

            float a = animation_time, u = fTexCoord.x, v = fTexCoord.y;

            gl_FragColor = vec4(
              2.0 * u * sin(17.0 * u ) + 3.0 * v * sin(11.0 * v ) + 1.0 * sin(13.0 * a),
              3.0 * u * sin(18.0 * u ) + 4.0 * v * sin(12.0 * v ) + 2.0 * sin(14.0 * a),
              4.0 * u * sin(19.0 * u ) + 5.0 * v * sin(13.0 * v ) + 3.0 * sin(15.0 * a),
              5.0 * u * sin(20.0 * u ) + 6.0 * v * sin(14.0 * v ) + 4.0 * sin(16.0 * a));
            gl_FragColor.a = gl_FragColor.w;
          }`;
      }
  }, Phong_or_Gouraud_Shader );