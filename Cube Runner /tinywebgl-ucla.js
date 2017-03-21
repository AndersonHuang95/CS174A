// UCLA's Graphics Example Code (Javascript and C++ translations available), by Garett Ridge for CS174a.
// tinywebgl_ucla.js - A file to show how to organize a complete graphics program.  It wraps common WebGL commands.

var shapes_in_use = [], shaders_in_use = [], textures_in_use = [], active_shader, texture_filenames_to_load = [], gl, g_addrs;    // ****** GLOBAL VARIABLES *******

function Declare_Any_Class( name, methods, superclass = Object, scope = window )              // Making javascript behave more like Object Oriented C++
  {
    scope[name] = function( args ) { if( this.construct ) this.construct.apply( this, arguments );  } // When new gets called on the class name, call its construct():
    var p = Object.create(superclass.prototype);                                                      // Use prototypes to make the object.  Begin with the superclass's.
    p.constructor = scope[name];                                                                      // Override the prototype so that member functions work.
    p.class_name = name;                                                                              // Let classes be aware of their type name.
    p.define_data_members = function( args ) { for( let i in args ) this[i] = args[i]; }              // Optional utility method for all classes
    for ( let i in methods ) p[i] = methods[i];                                                       // Include all the other supplied methods.
    scope[ name ].prototype = p;                                                                      // The class and its prototype are complete.
  }

// *********** SHAPE SUPERCLASS ***********
// Each shape manages lists of its own vertex positions, vertex normals, and texture coordinates per vertex, and can copy them into a buffer in the graphics card's memory.
// IMPORTANT: When you extend the Shape class, you must supply a populate() function that fills in four arrays: One list enumerating all the vertices' (vec3) positions,
// one for their (vec3) normal vectors pointing away from the surface, one for their (vec2) texture coordinates (the vertex's position in an image's coordinate space,
// where the whole picture spans x and y in the range 0.0 to 1.0), and usually one for indices, a list of index triples defining which three vertices
// belong to each triangle.  Call new on a Shape and add it to the shapes_in_use array; it will populate its arrays and the GPU buffers will recieve them.
Declare_Any_Class( "Shape",
  {
    'construct': function( args )
      { this.define_data_members( { positions: [], normals: [], texture_coords: [], indices: [], indexed: true, sent_to_GPU: false } );
        this.populate.apply( this, arguments ); // Immediately fill in appropriate vertices via polymorphism, calling whichever sub-class's populate().
      },
    'insert_transformed_copy_into': function( recipient, args, points_transform = mat4() )
      { var temp_shape = new ( window[ this.class_name ] )( ...args );  // If you try to bypass making a temporary shape and instead directLy insert new data into
                                                                        // the recipient, you'll run into trouble when the recursion tree stops at different depths.
        for( var i = 0; i < temp_shape.indices.length; i++ ) recipient.indices.push( temp_shape.indices[i] + recipient.positions.length );

        for( var i = 0; i < temp_shape.positions.length; i++ )  // Apply points_transform to all points added during this call
          {
            recipient.positions.push( mult_vec(                     points_transform    , temp_shape.positions[ i ].concat( 1 ) ).slice(0,3) );
            recipient.normals  .push( mult_vec( transpose( inverse( points_transform ) ), temp_shape.normals  [ i ].concat( 1 ) ).slice(0,3) );
          }
        Array.prototype.push.apply( recipient.texture_coords, temp_shape.texture_coords );
      },
    'copy_onto_graphics_card': function()
      { this.graphics_card_buffers = [];  // Send the completed vertex and index lists to their own buffers in the graphics card.
        for( var i = 0; i < 3; i++ )      // Memory addresses of the buffers given to this shape in the graphics card.
        { this.graphics_card_buffers.push( gl.createBuffer() );
          gl.bindBuffer(gl.ARRAY_BUFFER, this.graphics_card_buffers[i] );
          switch(i) {
            case 0: gl.bufferData(gl.ARRAY_BUFFER, flatten(this.positions), gl.STATIC_DRAW); break;
            case 1: gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW); break;
            case 2: gl.bufferData(gl.ARRAY_BUFFER, flatten(this.texture_coords), gl.STATIC_DRAW); break;  }
        }
        if( this.indexed )
        { gl.getExtension("OES_element_index_uint");
          this.index_buffer = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices), gl.STATIC_DRAW);
        }
        this.sent_to_GPU = true;
      },      
    'draw': function( graphics_state, model_transform, material )                                       // The same draw() function is used for every shape -
      { if( !this.sent_to_GPU ) throw "This shape's arrays are not copied over to graphics card yet.";  // these calls produce different results by varying which
        active_shader.update_uniforms( graphics_state, model_transform, material );                     // vertex list in the GPU we consult.

        if( material.texture_filename )  // Omit the texture string parameter from Material's constructor to signal not to draw a texture.
        { g_addrs.shader_attributes[2].enabled = true;
          gl.uniform1f ( g_addrs.USE_TEXTURE_loc, 1 );
          if( textures_in_use[ material.texture_filename ] ) gl.bindTexture( gl.TEXTURE_2D, textures_in_use[ material.texture_filename ].id );
        }
        else  { gl.uniform1f ( g_addrs.USE_TEXTURE_loc, 0 );   g_addrs.shader_attributes[2].enabled = false; }

        for( var i = 0, it = g_addrs.shader_attributes[0]; i < g_addrs.shader_attributes.length, it = g_addrs.shader_attributes[i]; i++ )
          if( it.enabled )
          { gl.enableVertexAttribArray( it.index );
            gl.bindBuffer( gl.ARRAY_BUFFER, this.graphics_card_buffers[i] );
            gl.vertexAttribPointer( it.index, it.size, it.type, it.normalized, it.stride, it.pointer );
          }
          else  gl.disableVertexAttribArray( it.index );

        if( this.indexed )
        { gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.index_buffer );
          gl.drawElements( gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0 );
        }
        else  gl.drawArrays( gl.TRIANGLES, 0, this.vertices.length );   // If no indices were provided, assume the vertices are arranged in triples
      },
    'auto_flat_shaded_version': function( args )
      { var populate_and_auto_flat_shade = ( function( superclass ) { return function(args) { superclass.prototype.populate.apply( this, arguments );  this.duplicate_the_shared_vertices();  this.flat_shade(); } } )( window[ this.class_name ] );
        Declare_Any_Class( this.class_name.concat( "_flat" ), { "populate" : populate_and_auto_flat_shade }, window[this.class_name] );
        return new window[ this.class_name.concat( "_flat" ) ]( ...arguments );
      },
    'duplicate_the_shared_vertices': function( offset = 0, index_offset = 0 )
      { // Prepare an indexed shape for flat shading if it is not ready -- that is, if there are any edges where the same vertices are indexed by
        // both the adjacent triangles, and those two triangles are not co-planar.  The two would therefore fight over assigning different normal vectors to the shared vertices.
        var temp_positions = this.positions.slice( 0, offset ), temp_tex_coords = this.texture_coords.slice( 0, offset ), temp_normals = this.normals.slice( 0, offset );
        var temp_indices   = this.indices.slice( 0, index_offset );

        for( var counter = index_offset; counter < this.indices.length; counter++ )
          { temp_positions.push( this.positions[ this.indices[ counter ] ] );   temp_tex_coords.push( this.texture_coords[ this.indices[ counter ] ] );
            temp_indices.push( temp_positions.length - 1 );    }
        this.positions =  temp_positions;       this.indices = temp_indices;    this.texture_coords = temp_tex_coords;
      },
    'flat_shade': function( index_offset = 0 )
      { // Automatically assign the correct normals to each triangular element to achieve flat shading.  Affect all recently added triangles (those past "offset" in the list).
        // Assumes that no vertices are shared across seams.
        for( var counter = index_offset; counter < this.indices.length; counter += 3 )         // Iterate through triangles (every triple in the "indices" array)
        { var indices = this.indexed ? [ this.indices[ counter ], this.indices[ counter + 1 ], this.indices[ counter + 2 ] ] : [ counter, counter + 1, counter + 2 ];
          var p1 = this.positions[ indices[0] ],     p2 = this.positions[ indices[1] ],      p3 = this.positions[ indices[2] ];
          var n1 = normalize( cross( subtract(p1, p2), subtract(p3, p1) ) );    // Cross two edge vectors of this triangle together to get the normal

           if( length( add( scale_vec( .1, n1 ), p1 ) ) < length( p1 ) )
             n1 = scale_vec( -1, n1 );                    // Flip the normal if adding it to the triangle brings it closer to the origin.

          this.normals[ indices[0] ] = this.normals[ indices[1] ] = this.normals[ indices[2] ] = vec3( n1[0], n1[1], n1[2] );   // Propagate the normal to the 3 vertices.
        }
      }
  } );

Declare_Any_Class( "Shortcut_Manager",        // Google shortcut.js for this keyboard library's full documentation; this copy of it is more compact.
  { 'all_shortcuts': {},
    'add': function( shortcut_combination, recipient = window, callback, opt )
      { var default_options = { 'type':'keydown', 'propagate':false, 'disable_in_input':true, 'target':document, 'keycode':false }
        if(!opt) opt = default_options;
        else     for(var dfo in default_options) if( typeof opt[dfo] == 'undefined' ) opt[dfo] = default_options[dfo];
        var ele = opt.target == 'string' ? document.getElementById(opt.target) : opt.target;
        shortcut_combination = shortcut_combination.toLowerCase();
        var onkeypress = function(e) // On each keypress, this gets called [# of bound keys] times
          { e = e || window.event;
            if( opt['disable_in_input'] )
            { var element = e.target || e.srcElement || element.parentNode;
              if( element.nodeType == 3 ) element = element.parentNode;
              if( element.tagName == 'INPUT' || element.tagName == 'TEXTAREA' ) return;
            }
            var code = e.keyCode || e.which, character = code == 188 ? "," : ( code == 190 ? "." : String.fromCharCode(code).toLowerCase() );
            var keycombo = shortcut_combination.split("+"), num_pressed = 0;
            var special_keys = {'esc':27,'escape':27,'tab':9,'space':32,'return':13,'enter':13,'backspace':8,'scrolllock':145,
                                'scroll_lock':145,'scroll':145,'capslock':20,'caps_lock':20,'caps':20,'numlock':144,
                                'num_lock':144,'num':144,'pause':19,'break':19,'insert':45,'home':36,'delete':46,'end':35,
                                'pageup':33,'page_up':33,'pu':33,'pagedown':34,'page_down':34,'pd':34,'left':37,'up':38,
                                'right':39,'down':40,'f1':112,'f2':113,'f3':114,'f4':115,'f5':116,'f6':117,'f7':118,'f8':119,
                                'f9':120,'f10':121,'f11':122,'f12':123 }
            var modifiers = { shift: { wanted: false, pressed: e.shiftKey },
                              ctrl : { wanted: false, pressed: e.ctrlKey  },
                              alt  : { wanted: false, pressed: e.altKey   },
                              meta : { wanted: false, pressed: e.metaKey  } }; //Mac specific
            for( let k of keycombo )                                    // Check if current keycombo in consideration matches the actual keypress
            { modifiers.ctrl .wanted |= ( k == 'ctrl' || k == 'control' && ++num_pressed );
              modifiers.shift.wanted |= ( k == 'shift'                  && ++num_pressed );
              modifiers.alt  .wanted |= ( k == 'alt'                    && ++num_pressed );
              modifiers.meta .wanted |= ( k == 'meta'                   && ++num_pressed );
              var shift_nums = {"`":"~","1":"!","2":"@","3":"#","4":"$" ,"5":"%","6":"^","7":"&","8":"*","9":"(",
                                "0":")","-":"_","=":"+",";":":","'":"\"",",":"<",".":">","/":"?","\\":"|" }
              if     ( k.length > 1   && special_keys[k] == code ) num_pressed++;
              else if( opt['keycode'] && opt['keycode']  == code ) num_pressed++;
              else if( character == k ) num_pressed++; //The special keys did not match
              else if( shift_nums[character] && e.shiftKey ) { character = shift_nums[character]; if(character == k) num_pressed++;   }
            }
            if(num_pressed == keycombo.length && modifiers.ctrl .pressed == modifiers.ctrl .wanted
                                              && modifiers.shift.pressed == modifiers.shift.wanted
                                              && modifiers.alt  .pressed == modifiers.alt  .wanted
                                              && modifiers.meta .pressed == modifiers.meta .wanted )
              { callback.call( recipient, e );          // *** Fire off the function that matched the pressed keys ***********************************
                if(!opt['propagate'])  { e.cancelBubble = true;  e.returnValue = false; if (e.stopPropagation) { e.stopPropagation(); e.preventDefault(); } return; }
              }
          }
        this.all_shortcuts[ shortcut_combination ] = { 'callback':onkeypress, 'target':ele, 'event': opt['type'] };
        if     ( ele.addEventListener ) ele.addEventListener(opt['type'],   onkeypress, false);
        else if( ele.attachEvent )      ele.attachEvent('on'+opt['type'],   onkeypress);
        else                            ele[            'on'+opt['type']] = onkeypress;
      },
    'remove': function(shortcut_combination)       // Just specify the shortcut and this will remove the binding
      { shortcut_combination = shortcut_combination.toLowerCase();
        var binding = this.all_shortcuts[shortcut_combination];
        delete(       this.all_shortcuts[shortcut_combination] )
        if( !binding ) return;
        var type = binding[ 'event' ], ele = binding[ 'target' ], callback = binding[ 'callback' ];
        if(ele.detachEvent) ele.detachEvent('on'+type, callback);
        else if(ele.removeEventListener) ele.removeEventListener(type, callback, false);
        else ele['on'+type] = false;
      }
  } );

Declare_Any_Class( "Graphics_State", // The properties of the whole scene
  { 'construct': function(          camera_transform = mat4(), projection_transform = mat4(), animation_time = 0 )
      { this.define_data_members( { camera_transform,          projection_transform,          animation_time, animation_delta_time: 0, lights: [], current_rotation: 0 } );

        Declare_Any_Class( "Light",          // The properties of one light in the scene
          { 'construct': function(          position, color, size )
              { this.define_data_members( { position, color, attenuation: 1/size } ); }
          } );
      } } );

Declare_Any_Class( "Material",
  { 'construct': function(          color, ambient, diffusivity, shininess, smoothness, texture_filename )
      { this.define_data_members( { color, ambient, diffusivity, shininess, smoothness, texture_filename } ); } } );
function Color( r, g, b, a ) { return vec4( r, g, b, a ); }     // Colors are just special vec4s expressed as: ( red, green, blue, opacity )

Declare_Any_Class( "Graphics_Addresses",  // Find out the memory addresses internal to the graphics card of each of its variables, and store them here locally for the Javascript to use
  { 'construct': function( program )
      { Declare_Any_Class( "Shader_Attribute",
        { 'construct': function(        index, size, type, enabled, normalized, stride, pointer )
          { this.define_data_members( { index, size, type, enabled, normalized, stride, pointer } ); } } )

        this.shader_attributes = [ new Shader_Attribute( gl.getAttribLocation( program, "vPosition"), 3, gl.FLOAT, true,  false, 0, 0 ),  // Pointers to all shader
                                   new Shader_Attribute( gl.getAttribLocation( program, "vNormal"  ), 3, gl.FLOAT, true,  false, 0, 0 ),  // attribute variables
                                   new Shader_Attribute( gl.getAttribLocation( program, "vTexCoord"), 2, gl.FLOAT, false, false, 0, 0 ),
                                   new Shader_Attribute( gl.getAttribLocation( program, "vColor"   ), 3, gl.FLOAT, false, false, 0, 0 ) ];

        var num_uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < num_uniforms; ++i)
        { var u = gl.getActiveUniform(program, i).name.split('[')[0];    // Retrieve the GPU addresses of each uniform variable in the shader,
          this[ u + "_loc" ] = gl.getUniformLocation( program, u );      // based on their names, and store these pointers for later.
        }
      }
  } );

Declare_Any_Class( "Shader",  // Shader superclass.  Instantiate subclasses that have all methods filled in.  That loads a new vertex & fragment shader onto the GPU.
  { 'construct': function()
      { var vertShdr = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vertShdr, this.vertex_glsl_code_string() );
        gl.compileShader( vertShdr );
        if ( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) ) throw "Vertex shader compile error: "   + gl.getShaderInfoLog( vertShdr );

        var fragShdr = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fragShdr, this.fragment_glsl_code_string() );
        gl.compileShader( fragShdr );
        if ( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) ) throw "Fragment shader compile error: " + gl.getShaderInfoLog( fragShdr );

        var program = gl.createProgram();
        gl.attachShader( program, vertShdr );
        gl.attachShader( program, fragShdr );
        gl.linkProgram( program );
        if ( !gl.getProgramParameter(program, gl.LINK_STATUS) )    throw "Shader linker error: "           + gl.getProgramInfoLog( program );
        this.program = program;
      },
    'activate'                 : function() { gl.useProgram( this.program ); g_addrs = new Graphics_Addresses( this.program ); active_shader = this; },
    'update_uniforms'          : function() { },                                                                                      // Override this one
    'vertex_glsl_code_string'  : function() { },                                                                                      // Override this one
    'fragment_glsl_code_string': function() { }                                                                                       // Override this one
  } );

Declare_Any_Class( "Canvas_Manager",                      // This class performs all the setup of doing graphics.   It informs OpenGL of which
  { 'construct': function( canvas_id, background_color )  // functions to call during events - such as a key getting pressed or it being time to redraw.
      { canvas = document.getElementById( canvas_id );
        for ( let name of [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ] )
          if ( this.gl = gl = canvas.getContext( name ) ) break;                                            // Get the GPU ready, creating a new WebGL context for this canvas
        if (  !gl && canvas.parentNode ) canvas.parentNode.innerHTML = "Canvas failed to make a WebGL context.";

        gl.clearColor.apply( gl, background_color );    // Tell the GPU which color to clear the canvas with each frame
        gl.viewport( 0, 0, canvas.width, canvas.height );
        gl.enable( gl.DEPTH_TEST );
        gl.enable( gl.BLEND );
        gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
        this.controls = new Shortcut_Manager();                 // All per-canvas key controls will be stored here
        this.displayables = [];
        this.shared_scratchpad = { animate: false, string_map: {}, graphics_state: new Graphics_State() };

      },
    'register_display_object': function( object ) { this.displayables.unshift( object );  object.init_keys( this.controls ); },
    'render': function( time = 0 )                                                // Animate shapes based upon how much measured real time has transpired.
      {                                      this.shared_scratchpad.graphics_state.animation_delta_time = time - ( this.prev_time || 0 );
        ///////////////////////////////////////////////
        // Update rotation, assuming it is called 60fps 
        ///////////////////////////////////////////////
        this.shared_scratchpad.graphics_state.current_rotation += (2 * this.shared_scratchpad.graphics_state.animation_delta_time / 1000 * 180 / Math.PI);
        if( this.shared_scratchpad.animate ) this.shared_scratchpad.graphics_state.animation_time      += this.shared_scratchpad.graphics_state.animation_delta_time;
        this.prev_time = time;

        for ( let name in shapes_in_use ) if( !shapes_in_use[name].sent_to_GPU ) shapes_in_use[name].copy_onto_graphics_card();

        gl = this.gl;                                                     // Set the global gl variable to the current one that is drawing, belonging to this canvas.
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);             // Clear its pixels and z-buffer.           
        for( var i = 0; i < this.displayables.length; i++ )
        {
          this.displayables[ i ].display( time );                                 // Draw each registered displayable.
          this.displayables[ i ].update_strings( this.shared_scratchpad );
        }
        window.requestAnimFrame( this.render.bind( this ) );      // Now that this frame is drawn, request that it happen again as soon as all other OpenGL events are processed.
      }
  } );

Declare_Any_Class( "Texture",                                                             // Wrap a pointer to a new texture buffer along with a new HTML image object.
  { construct: function(            filename, bool_mipMap, bool_will_copy_to_GPU = true )
      { this.define_data_members( { filename, bool_mipMap, bool_will_copy_to_GPU,       id: gl.createTexture() } );

        gl.bindTexture(gl.TEXTURE_2D, this.id );
        gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                      new Uint8Array([255, 0, 0, 255]));              // A single red pixel, as a placeholder image to prevent console warning
        this.image          = new Image();
        this.image.onload   = ( function (texture, bool_mipMap)       // This self-executing anonymous function makes the real onload() function
          { return function( )      // Instrctions for whenever the real image file is ready
            { gl.pixelStorei  ( gl.UNPACK_FLIP_Y_WEBGL, true );
              gl.bindTexture  ( gl.TEXTURE_2D, texture.id );
              gl.texImage2D   ( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image );
              gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
              if( bool_mipMap )
                { gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D); }
              else
                  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
              texture.loaded = true;
            }
          } ) ( this, bool_mipMap, bool_will_copy_to_GPU );
        if( bool_will_copy_to_GPU ) this.image.src = this.filename;
      } } );

Declare_Any_Class( "Animation",           // Animation Superclass -- the base for all displayable sub-programs we can use on a canvas
  { 'construct': function() {},    'init_keys': function() {},    'update_strings': function() {},    'display': function() {} } );