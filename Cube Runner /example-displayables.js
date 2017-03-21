// UCLA's Graphics Example Code (Javascript and C++ translations available), by Garett Ridge for CS174a.
// example-displayables.js - The subclass definitions here each describe different independent animation processes that you want to fire off each frame, by defining a display
// event and how to react to key and mouse input events.  Make one or two of your own subclasses, and fill them in with all your shape drawing calls and any extra key / mouse controls.

// Now go down to Example_Animation's display() function to see where the sample shapes you see drawn are coded, and a good place to begin filling in your own code.

Declare_Any_Class( "Debug_Screen",  // Debug_Screen - An example of a displayable object that our class Canvas_Manager can manage.  Displays a text user interface.
  { 'construct': function( context )
      { this.define_data_members( { string_map: context.shared_scratchpad.string_map, start_index: 0, tick: 0, visible: true, graphicsState: new Graphics_State() } );
        shapes_in_use.debug_text = new Text_Line( 35 );
      },
    'init_keys': function( controls )
      { 
        //Do nothing
      },
    'update_strings': function( debug_screen_object )   // Strings that this displayable object (Debug_Screen) contributes to the UI:
      { 
       //Do nothing
      },
    'display': function( time )
      { if( !this.visible ) return;

        shaders_in_use["Default"].activate();
        gl.uniform4fv( g_addrs.shapeColor_loc, Color( .8, .8, .8, 1 ) );

        var font_scale = scale( .02, .04, 1 ),
            model_transform = mult( translation( -.95, -.9, 0 ), font_scale ),
            strings = Object.keys( this.string_map );

        for( var i = 0, idx = this.start_index; i < 4 && i < strings.length; i++, idx = (idx + 1) % strings.length )
        {
          shapes_in_use.debug_text.set_string( this.string_map[ strings[idx] ] );
          shapes_in_use.debug_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );  // Draw some UI text (strings)
          model_transform = mult( translation( 0, .08, 0 ), model_transform );
        }
        model_transform = mult( translation( .7, .9, 0 ), font_scale );

      }
  }, Animation );

Declare_Any_Class( "Example_Camera",     // An example of a displayable object that our class Canvas_Manager can manage.  Adds both first-person and
  { 'construct': function( context )     // third-person style camera matrix controls to the canvas.
      { // 1st parameter below is our starting camera matrix.  2nd is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
        context.shared_scratchpad.graphics_state = new Graphics_State( translation(0, 0,-5), perspective(50, canvas.width/canvas.height, .1, 1000), 0 );
        this.define_data_members( { graphics_state: context.shared_scratchpad.graphics_state, thrust: vec3(), origin: vec3( 0, 5, 0 ), looking: false } );

        // *** Mouse controls: ***
        this.mouse = { "from_center": vec2() };

         canvas.addEventListener( "mouseup",   ( function(self) { return function(e) { e = e || window.event;    self.mouse.anchor = undefined;      context.shared_scratchpad.clicked = false;        } } ) (this), false );
         canvas.addEventListener( "mousedown", ( function(self) { return function(e) { e = e || window.event;     
            context.shared_scratchpad.clicked = true; 
            console.log("Click");

            context.shared_scratchpad.mousex = e.clientX;
            context.shared_scratchpad.mousey = e.clientY;

              } } ) (this), false );

    
              canvas.addEventListener( "mouseout",  ( function(self) { return function(e) { self.mouse.from_center = vec2(); }; } ) (this), false );    // Stop steering if the mouse leaves the canvas.

      },
    'init_keys': function( controls )   // init_keys():  Define any extra keyboard shortcuts here
      { 
        
      },
    'update_strings': function( user_interface_string_manager )       // Strings that this displayable object (Animation) contributes to the UI:
      { var C_inv = inverse( this.graphics_state.camera_transform ), pos = mult_vec( C_inv, vec4( 0, 0, 0, 1 ) ),
                                                                  z_axis = mult_vec( C_inv, vec4( 0, 0, 1, 0 ) );                                                                 
             },
    'display': function( time )
      { var leeway = 70,  degrees_per_frame = .0004 * this.graphics_state.animation_delta_time,
                          meters_per_frame  =   .01 * this.graphics_state.animation_delta_time;
        // Third-person camera mode: Is a mouse drag occurring?
        if( this.mouse.anchor )
        {
          var dragging_vector = subtract( this.mouse.from_center, this.mouse.anchor );            // Arcball camera: Spin the scene around the world origin on a user-determined axis.
          if( length( dragging_vector ) > 0 )
            this.graphics_state.camera_transform = mult( this.graphics_state.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
                mult( translation( this.origin ),
                mult( rotation( .05 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ),
                      translation(scale_vec( -1, this.origin ) ) ) ) );
        }
        // First-person flyaround mode:  Determine camera rotation movement when the mouse is past a minimum distance (leeway) from the canvas's center.
        var offset_plus  = [ this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway ];
        var offset_minus = [ this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway ];

        for( var i = 0; this.looking && i < 2; i++ )      // Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
        {
          var velocity = ( ( offset_minus[i] > 0 && offset_minus[i] ) || ( offset_plus[i] < 0 && offset_plus[i] ) ) * degrees_per_frame;  // Use movement's quantity unless the &&'s zero it out
          this.graphics_state.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), this.graphics_state.camera_transform );     // On X step, rotate around Y axis, and vice versa.
        }     // Now apply translation movement of the camera, in the newest local coordinate frame
        this.graphics_state.camera_transform = mult( translation( scale_vec( meters_per_frame, this.thrust ) ), this.graphics_state.camera_transform );
      }
  }, Animation );

Declare_Any_Class( "Example_Animation",  // An example of a displayable object that our class Canvas_Manager can manage.  This one draws the scene's 3D shapes.
  { 'construct': function( context )
      { 
        /////////////////////////
        // Global game variables 
        /////////////////////////
        this.shared_scratchpad    = context.shared_scratchpad;
        this.initialLoc = [];
       
        this.reset_variables();

        this.tunnel_loc = [];
        this.spinner_loc = [], this.spinner_rand_angles = [], this.spinner_rot_speeds = [];
        this.fireball_loc = []; 
        this.shield_loc = [];
        

        this.universe_dimension = 40;

        this.shared_scratchpad.mousex;
        this.shared_scratchpad.mousey;
        this.shared_scratchpad.clicked = false;

        this.sleep_counter = 0;
        this.high_score = 0;

        /////////////////////////
        // Sound effects 
        /////////////////////////
        this.rainbow_effect = document.getElementById("rainbow_effect"); 
        this.invincible_effect = document.getElementById("invincible_effect");
        this.explosion_effect = document.getElementById("explosion_effect"); 
        this.ghost_effect = document.getElementById("ghost_effect"); 
        this.interstellar_effect = document.getElementById("interstellar_effect"); 
        this.apocalypse_effect = document.getElementById("apocalypse_effect"); 

        ///////////////////////////////
        // Shapes we'll be using 
        ///////////////////////////////
        shapes_in_use.tetrahedron     = new Tetrahedron( true );      
        shapes_in_use.cube_base = (new Cube());
        shapes_in_use.sphere_base = new Sphere(50, 50);
        shapes_in_use.shield = new Regular_2D_Polygon(50,50);
        shapes_in_use.Cube_Tunnel = new Cube_Tunnel();
        shapes_in_use.spinner = new Spinner(this.universe_dimension*2); 
        shapes_in_use.play_button = new Triangular_Prism(true);
        shapes_in_use.star = new Star();

        //initalize star locations
        this.star_loc = vec3(Math.random() * (this.universe_dimension * 2) - this.universe_dimension,
                     Math.random() * (this.universe_dimension * 2) - this.universe_dimension, 
                     Math.random()*100-150);

        // Give each cube a random location (Base & Hansen's level)
        for(var i = 0; i<this.cube_num; i++){             // PLUS 1 for powerup
          //shapes_in_use.push(new Cube());
          var loc = vec3(Math.random() * (this.universe_dimension * 2) - this.universe_dimension,
                     Math.random() * (this.universe_dimension * 2) - this.universe_dimension, 
                     Math.random()*100-150);
          this.initialLoc.push(loc);
        }

        //Generate shields
        for(var i =0 ; i<this.shield_num; i++){
          var loc = vec3(Math.random() * (this.universe_dimension * 2) - this.universe_dimension,
                     Math.random() * (this.universe_dimension * 2) - this.universe_dimension, 
                     Math.random()*100-150);
          this.shield_loc.push(loc);
        }

        // Give each tunnel box a varying location (Connor's level)
        for (var i = 0; i < this.cube_tunnel_num; i++) {
          this.tunnel_loc[i] = vec3(0, 0, -100 -5 * i);
        }

        // Give each spinner a varying location (Anderson's level) 
        for (var i = 0; i < this.spinner_num; i++) {
          this.spinner_loc.push(vec3(Math.random() * (this.universe_dimension * 2) - this.universe_dimension,
                                Math.random() * (this.universe_dimension * 2) - this.universe_dimension, 
                                Math.random()*100-125));
          this.spinner_rand_angles.push(Math.random() * 360); 
          this.spinner_rot_speeds.push(Math.random() * 2 + 2);
        } 

        for (var i = 0; i < this.fireball_num; i++) {
          this.fireball_loc.push(vec3(Math.random() * (this.universe_dimension * 2) - this.universe_dimension,
                                Math.random() * (this.universe_dimension * 2) - this.universe_dimension, 
                                Math.random()*100-125));
        }

        // Always animate (might want to change this later)
        this.shared_scratchpad.animate = 1;

        // Keep track of whether the game has started or not 
        this.game_states = { not_started: "NOT_STARTED", started: "STARTED", game_over: "GAME_OVER" }; 
        this.current_game_state = this.game_states.not_started; 

        // Look up the text canvas
        this.textCanvas = document.getElementById("text"); 

        this.titleCanvas = document.getElementById("title");
         this.titleContext = this.titleCanvas.getContext("2d"); 

        // Make a 2d Context for it 
        this.context = this.textCanvas.getContext("2d"); 
      
        this.increment = 0;
      },
    'init_keys': function( controls )   // init_keys():  Define any extra keyboard shortcuts here
      {

        controls.add( "a", this, function() { this.score = 3500; } );           
        controls.add( "s", this, function() { this.score = 7500; } );           
        controls.add( "d", this, function() { this.score = 11500; } );           
        controls.add( "f", this, function() { this.score = 15000; } ); 
        controls.add( "g", this, function() { this.score += 1000; } );           
          

        controls.add( "down", this, function() { this.delta_y = 0.3; this.pitch_d = true; } );           
        controls.add( "down", this, function() { this.delta_y =  0;   this.pitch_d=false; }, {'type':'keyup'} );
        
        controls.add( "up",     this, function() { this.delta_y = -0.3; this.pitch_u = true; } );     
        controls.add( "up",     this, function() { this.delta_y =  0; this.pitch_u = false; }, {'type':'keyup'} );
        
        controls.add( "left", this, function() { this.delta_x = 0.3; this.roll_l = true; } );           
        controls.add( "left", this, function() { this.delta_x =  0;   this.roll_l = false;}, {'type':'keyup'} );
        
        controls.add( "right",     this, function() { this.delta_x = -0.3; this.roll_r=true;} );    
        controls.add( "right",     this, function() { this.delta_x =  0;    this.roll_r=false; }, {'type':'keyup'} );
        
      },
    'update_strings': function( user_interface_string_manager )       // Strings that this displayable object (Animation) contributes to the UI:
      {

        if (this.current_game_state === "STARTED")
          user_interface_string_manager.string_map["time"]    = "Score: " + Math.ceil(this.score);
        else
          user_interface_string_manager.string_map["time"]    = "";//set to not show anything

      },

      //Moves the camera to have realistic sideways and upwards/downwards movement
    'camera_movement': function()
      {
        var graphics_state  = this.shared_scratchpad.graphics_state
        if(this.roll_r){
            if(this.tilt_angle>-7){
              graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( 2, 0, 0,  1 ));
              this.tilt_angle -=2;              
            }
          } else {
            if(this.tilt_angle<0){
            graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( -2, 0, 0,  1 ));
            this.tilt_angle +=2;}
          }
          if(this.roll_l){
            if(this.tilt_angle<7){
              graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( -2, 0, 0,  1 ));
              this.tilt_angle +=2;
              
            }
          } else {
            if(this.tilt_angle>0){
            graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( 2, 0, 0,  1 ));
            this.tilt_angle -=2;}
          }
          if(this.pitch_d){
            if(this.pitch_angle>-2){
              graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( .5, 1, 0,  0 ));
              this.pitch_angle -=0.5;             
            }
          } else {
            if(this.pitch_angle<0){
            graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( -.5, 1, 0,  0 ));
            this.pitch_angle +=0.5;}
          }
          if(this.pitch_u){
            if(this.pitch_angle<2){
              graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( -.5, 1, 0,  0 ));
              this.pitch_angle +=0.5;
              
            }
          } else {
            if(this.pitch_angle>0){
            graphics_state.camera_transform = mult(graphics_state.camera_transform, rotation( .5, 1, 0,  0));
            this.pitch_angle -=0.5;}
          }
      }, 

      //Resets game
'game_over': function()
      {
        this.high_score = Math.max(this.high_score, this.score);
        this.current_game_state = "GAME_OVER";
        this.reset_variables();
        
        // Play the game_over sound effect 
        this.explosion_effect.play(); 
      }, 

'reset_variables' : function()
  {
       for(var i = 0; i<this.cube_num; i++){             // PLUS 1 for powerup
          //shapes_in_use.push(new Cube());
          var loc = vec3(Math.random() * (this.universe_dimension * 2) - this.universe_dimension,
                     Math.random() * (this.universe_dimension * 2) - this.universe_dimension, 
                     Math.random()*100-150);
          this.initialLoc.push(loc);
        }

        this.speed = 1.3;
        this.delta_y = 0;
        this.delta_x = 0;
        this.roll_r = false;
        this.roll_l = false;
        this.pitch_u = false;
        this.pitch_d = false;

        this.tilt_angle = 0;
        this.pitch_angle = 0;
        this.score = 0; 
        this.cube_num = 400;
        this.cube_tunnel_num = 20; 
        this.spinner_num = 30;
        this.fireball_num = 40;
        
        this.invincible_time = 30;
        this.shield_num = 5;
        this.shield = 0; 
        this.tunnel_x_delta = 0;
        this.tunnel_y_delta = 0;
        this.tunnel_turns = 0;
        this.tunnel_countdown = 150;  
  },

'run_start_screen': function(time)       // Strings that this displayable object (Animation) contributes to the UI:
      {
        var greenPlastic = new Material(Color(0.1,0.9,0.2,1),  .3, .7, .4, 20);
        var graphics_state  = this.shared_scratchpad.graphics_state;

        var model_transform =mat4();
        model_transform = mult(model_transform, translation (0,0,-5));
        model_transform = mult(model_transform, rotation(time*90, 0,1,0));
        model_transform = mult(model_transform, translation (-Math.sqrt(3)/3,0,-0.5));
        
        shapes_in_use.play_button . draw(graphics_state,model_transform,greenPlastic);

        if(this.shared_scratchpad.clicked){
          var pixels = new Uint8Array( 4);
          gl.readPixels(this.shared_scratchpad.mousex, this.shared_scratchpad.mousey, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, pixels); //make sure to set canvas preserveDrawingBuffer to true before this

            if(pixels[1] > 1 && this.current_game_state === "NOT_STARTED") //If we're looking at the green button
              {this.current_game_state = this.game_states.started;}
        }      
      },

    'display': function(time)
      {
        var graphics_state  = this.shared_scratchpad.graphics_state,
        model_transform = mat4();             // 

        // Activate Phong & Gouraud shaders 
        shaders_in_use[ "Default" ].activate();

        // *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
        // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html). 
        // For some reason this won't work in Firefox.
        graphics_state.lights = [];                    // First clear the light list each frame so we can replace & update lights.

        var t = graphics_state.animation_time/1000, light_orbit = [ Math.cos(0), Math.sin(Math.PI) ];
        graphics_state.lights.push( new Light( vec4(  60*light_orbit[0],  80,  50*light_orbit[0], 1 ), Color( .9, .8, .3, 1 ), 100000 ) );
        
        //Game state machine
        switch(this.current_game_state) {
          case "NOT_STARTED": 

            this.run_start_screen(t);
            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
            this.titleContext.clearRect(0, 0, this.titleContext.canvas.width, this.titleContext.canvas.height);

            // Style the game text 
            this.context.font = "50px arial";
            var gradient = this.context.createLinearGradient(0, 0, 0, 50);

            gradient.addColorStop(0, "rgb(131, 0, 255)");
            gradient.addColorStop(1, "rgb(120, 180, 91)");
            this.context.fillStyle = gradient;

            this.context.font = "small-caps bold 48px arial"; 
            this.context.textAlign = "center";
            this.context.fillText("PLAY", 100, 100);


           

            //this.titleContext.clearRect(0, 0, this.titleContext.canvas.width, this.titleContext.canvas.height);

            // Style the game text 
            this.titleContext.font = "50px arial";
            var gradient = this.titleContext.createLinearGradient(0, 0, 0, 50);

            gradient.addColorStop(0, "rgb(251, 235, 225)");
            gradient.addColorStop(1, "rgb(120, 224, 191)");
            this.titleContext.fillStyle = gradient;

            this.titleContext.font = "small-caps bold italic 100px arial"; 
            this.titleContext.textAlign = "center";
            this.titleContext.fillText("CUBE RUNNER", 400, 100);
            

            // Change the background image by finding the HTML canvas 
            // Use this for conditional background images later 
            document.getElementById("gl-canvas").style.background = "url('space.jpg')";

            var   purplePlastic = new Material( Color( .3,.5,.9,1 ), .3, .6, .8, 20 )
            for(var i = 0; i<this.cube_num; i++){
                if (this.initialLoc[i][0] >= this.universe_dimension || this.initialLoc[i][0] < -1* this.universe_dimension) //Bound left/right
                  this.initialLoc[i][0] *= -(this.universe_dimension-1)/(this.universe_dimension);
                if (this.initialLoc[i][1] >= this.universe_dimension || this.initialLoc[i][1] < -1* this.universe_dimension)//Bound up/down
                  this.initialLoc[i][1] *= -(this.universe_dimension-1)/(this.universe_dimension);;
                  if(this.initialLoc[i][2] > 0) {//bound backwards
                    this.initialLoc[i][0] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.initialLoc[i][1] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.initialLoc[i][2] = -100;
                  }

                this.initialLoc[i][0] += this.delta_x;
                this.initialLoc[i][1] += this.delta_y;
                this.initialLoc[i][2] += this.speed;
                shapes_in_use.cube_base.draw(graphics_state,translation(this.initialLoc[i]), purplePlastic);
            }
            break;

          case "STARTED": 
                      this.titleContext.clearRect(0, 0, this.titleContext.canvas.width, this.titleContext.canvas.height);
            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
            this.score += (this.speed * 1.6);

            // *** Materials: *** Declare new ones as temps when needed; they're just cheap wrappers for some numbers.
            // 1st parameter:  Color (4 floats in RGBA format)
            // 2nd: Ambient light, 
            // 3rd: Diffuse reflectivity, 
            // 4th: Specular reflectivity, 
            // 5th: Smoothness exponent, 
            // 6th: Texture image.

            //////////////////////////////
            // Materials for First level 
            //////////////////////////////
            var   purplePlastic = new Material( Color( .3,.5,.9,1 ), .3, .6, .8, 20 ), // Omit the final (string) parameter if you want no texture
                  yellowPlastic = new Material( Color( .9,.5,.2,1 ), .4, .8, .4, 20 ),
                  dimYellowPlastic = new Material( Color( .9,.5,.2,1 ), .1, .4, .4, 20 ),
                  shield = new Material ( Color (0.2, 0.5, 0.7, 0.5), 0.5, 0.5, 0.5, 30),
                  placeHolder = new Material( Color(0,0,0,0), 0,0,0,0, "Blank" );

            ////////////////////////////
            // Materials for Connor's level 
            ////////////////////////////
            var rainbow_material = [];
            rainbow_material.push(new Material( Color( 1, 0, 0) , 0.5, 0.5, 0.5, 50));
            rainbow_material.push(new Material( Color( 1, 127 / 255, 0) , 0.5, 0.5, 0.5, 50));
            rainbow_material.push(new Material( Color( 1, 1, 0) , 0.5, 0.5, 0.5, 50));
            rainbow_material.push(new Material( Color( 0, 1, 0) , 0.5, 0.5, 0.5, 50));
            rainbow_material.push(new Material( Color( 0, 0, 1) , 0.5, 0.5, 0.5, 50));
            rainbow_material.push(new Material( Color( 75 / 255, 0, 130 / 255) , 0.5, 0.5, 0.5, 50));
            rainbow_material.push(new Material( Color( 238 / 255, 130 / 255, 238 / 255) , 0.5, 0.5, 0.5, 50));
            rainbow_material.push(new Material( Color( 0, 0, 0) , 0.5, 0.5, 0.5, 50));

            var shield_powerup = new Material ( Color(0, 0, 0, 1), 1, 1, 1, 50, "shield.png");
            

            ////////////////////////////
            // Materials for Hansen's level
            ////////////////////////////
            var dark_material = [];
            dark_material.push(new Material( Color( 0.1,0.2,.1,.9)  , .05, 0, 0.1, 50, "boo1.png" ));
            dark_material.push(new Material( Color( 0.1,0.2,.1,.9)  , .05, 0, 0.1, 50, "boo2.png" ));
            dark_material.push(new Material( Color( 0.1,0.2,.1,.9)  , .05, 0, 0.1, 50, "boo3.png" ));
            dark_material.push(new Material( Color( 0.1,0.2,.1,.9)  , .05, 0, 0.1, 50, "boo4.png" ));

            ////////////////////////////
            // Materials for Anderson's level
            ////////////////////////////
            var fire_material = new Material( Color(0, 0, 0, 1), 1, 1, 1, 50, "fire.jpg" );
            var wood_material = new Material( Color(0, 0, 0, 1), 1, 1, 1, 50, "wood.jpg" );

            /**********************************
            Start coding down here!!!!
            **********************************/  

            //On each render, see if an arrow key is pressed and adjust camera
            this.camera_movement();
            
            //translate and rotate the ship in response to movement
            //this is weird so i just guessed and checked until it looked ok
     
            model_transform = mult( model_transform, rotation( this.tilt_angle*0.6, 0, 1, 0 ) );        
            model_transform = mult( model_transform, rotation( this.tilt_angle, 0, 0, 1 ) );
            model_transform = mult( model_transform, rotation( this.pitch_angle*2.3, 1, 0, 0 ) );
            model_transform = mult( model_transform, translation( 0, -2, 0 ) );
            model_transform = mult( model_transform, rotation( this.tilt_angle, 0, 0, 1 ) );

            ////////////////////////////////////
            // Game is split into 4 levels
            // Level 1: in space 
            // 
            // Level 2: dimly lit, with ghosts 
            // 
            // Level 3: rainbow level 
            // 

            ////////////////////////////////////
            //Super-star powerup 
            //Not in Connor's level

            if(this.score<12000){
              if(this.star_loc[0]>-1.5 && this.star_loc[0]<1.5 && 
                    this.star_loc[1]> -3 && this.star_loc[1]<-0.6 && 
                    this.star_loc[2]<0 && this.star_loc[2]> -this.speed ){
                    this.invincible_time = 300;
                    this.invincible_effect.play(); 
                }


                if (this.star_loc[0] >= this.universe_dimension || this.star_loc[0] < -1* this.universe_dimension) //Bound left/right
                  this.star_loc[0] *= -(this.universe_dimension-1)/(this.universe_dimension);
                if (this.star_loc[1] >= this.universe_dimension || this.star_loc[1] < -1* this.universe_dimension)//Bound up/down
                  this.star_loc[1] *= -(this.universe_dimension-1)/(this.universe_dimension);;
                  if(this.star_loc[2] > 0) {//bound backwards
                    this.star_loc[0] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.star_loc[1] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.star_loc[2] = -100;
                  }

                this.star_loc[0] += this.delta_x;
                this.star_loc[1] += this.delta_y;
                this.star_loc[2] += this.speed;


                shapes_in_use.star.draw(graphics_state,mult(translation(this.star_loc), rotation(t*160,0,1,0)), yellowPlastic);

                //=====================================Shield =========================================
                for(var i = 0; i< this.shield_num; i++){
                if(this.shield_loc[i][0]>-1.5 && this.shield_loc[i][0]<1.5 && 
                    this.shield_loc[i][1]> -3 && this.shield_loc[i][1]<-0.6 && 
                    this.shield_loc[i][2]<0 && this.shield_loc[i][2]> -this.speed ){
                    this.shield = 1;
                }


                if (this.shield_loc[i][0] >= this.universe_dimension || this.shield_loc[i][0] < -1* this.universe_dimension) //Bound left/right
                  this.shield_loc[i][0] *= -(this.universe_dimension-1)/(this.universe_dimension);
                if (this.shield_loc[i][1] >= this.universe_dimension || this.shield_loc[i][1] < -1* this.universe_dimension)//Bound up/down
                  this.shield_loc[i][1] *= -(this.universe_dimension-1)/(this.universe_dimension);;
                  if(this.shield_loc[i][2] > 0) {//bound backwards
                    this.shield_loc[i][0] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.shield_loc[i][1] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.shield_loc[i][2] = -100;
                  }

                this.shield_loc[i][0] += this.delta_x;
                this.shield_loc[i][1] += this.delta_y;
                this.shield_loc[i][2] += this.speed;

                shapes_in_use.shield.draw(graphics_state,mult(translation(this.shield_loc[i]), rotation(150*t, 0,1,0)), shield_powerup)
                
              }
            }


            if(this.invincible_time > 0){
              

              this.invincible_time--; 
            }

         
            // Basic Level
            if (this.score < 4000) {
              this.interstellar_effect.play();
              ///////////////////////////////////////
              // Fade to black for next level 
              //////////////////////////////////////
              if (this.score > 3500) {
                document.getElementById("gl-canvas").style.background = "url('black.jpg')";
              } else {
                document.getElementById("gl-canvas").style.background = "url('space.jpg')"; 
              } 
              if(this.invincible_time > 0){
                shapes_in_use.tetrahedron    .draw( graphics_state, model_transform, rainbow_material[this.invincible_time %8]);
              } else              
                shapes_in_use.tetrahedron    .draw( graphics_state, model_transform, yellowPlastic);

              //probably move this for loop outside and have just the model_transform modifications in the if statments
              //but when i try it, game gets slow :(
              for(var i = 0; i<this.cube_num; i++){

                //Literally all we need for collision detection... seems too simple for our "advanced" topic
                //if we hit something, just set speed to 0 so we can visually see rn
                if(this.invincible_time <= 0 && this.initialLoc[i][0]>-1.5 && this.initialLoc[i][0]<1.5 && 
                    this.initialLoc[i][1]> -3 && this.initialLoc[i][1]<-0.6 && 
                    this.initialLoc[i][2]<0 && this.initialLoc[i][2]> -this.speed ){
                    if (this.shield === 1) {
                    this.shield = 0;} 
                    else {
                      this.game_over();
                      this.interstellar_effect.pause();
                    }
                }
                if (this.initialLoc[i][0] >= this.universe_dimension || this.initialLoc[i][0] < -1* this.universe_dimension) //Bound left/right
                  this.initialLoc[i][0] *= -(this.universe_dimension-1)/(this.universe_dimension);
                if (this.initialLoc[i][1] >= this.universe_dimension || this.initialLoc[i][1] < -1* this.universe_dimension)//Bound up/down
                  this.initialLoc[i][1] *= -(this.universe_dimension-1)/(this.universe_dimension);;
                  if(this.initialLoc[i][2] > 0) {//bound backwards
                    this.initialLoc[i][0] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.initialLoc[i][1] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.initialLoc[i][2] = -100;
                  }

                this.initialLoc[i][0] += this.delta_x;
                this.initialLoc[i][1] += this.delta_y;
                this.initialLoc[i][2] += this.speed;

                shapes_in_use.cube_base.draw(graphics_state,translation(this.initialLoc[i]), purplePlastic);

              }
            
            } 

            // Hansen's Level
            else if (this.score < 8000) {  
              this.interstellar_effect.pause();
              this.ghost_effect.play();   
              if(this.speed < 1.6 && this.speed !== 0)
                this.speed += 0.05;     
              if(this.invincible_time > 0){
                  shapes_in_use.tetrahedron    .draw( graphics_state, model_transform, rainbow_material[this.invincible_time %8]);
                } else              
                  shapes_in_use.tetrahedron    .draw( graphics_state, model_transform, dimYellowPlastic);
              
                document.getElementById("gl-canvas").style.background = "url('black.jpg')";

              //set light to be behind ship and move to point in direction of movement
              graphics_state.lights = []; 
              graphics_state.lights.push( new Light( vec4( -1.3* this.tilt_angle,  -2 + 3 * this.pitch_angle, -4, 1 ), Color( 2, 2, 2, 1 ), 100000000 ) );
            

              //more "collision detection"
              for(var i = 0; i<this.cube_num; i++){
                if(this.invincible_time <= 0 && this.initialLoc[i][0]>-1.5 && this.initialLoc[i][0]<1.5 && 
                    this.initialLoc[i][1]> -3 && this.initialLoc[i][1]<-0.6 && 
                    this.initialLoc[i][2]<0 && this.initialLoc[i][2]> -this.speed ){
                    if (this.shield === 1) 
                        this.shield = 0;
                    else {
                        this.game_over();
                        this.ghost_effect.pause();
                    }

                }

                if (this.initialLoc[i][0] >= this.universe_dimension || this.initialLoc[i][0] < -1* this.universe_dimension) //Bound left/right
                  this.initialLoc[i][0] *= -(this.universe_dimension-1)/(this.universe_dimension);
                if (this.initialLoc[i][1] >= this.universe_dimension || this.initialLoc[i][1] < -1* this.universe_dimension)//Bound up/down
                  this.initialLoc[i][1] *= -(this.universe_dimension-1)/(this.universe_dimension);;
                  if(this.initialLoc[i][2] > 0) {//bound backwards
                    this.initialLoc[i][0] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.initialLoc[i][1] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.initialLoc[i][2] = -100;
                  }
                this.initialLoc[i][0] += this.delta_x;
                this.initialLoc[i][1] += this.delta_y;
                this.initialLoc[i][2] += this.speed;

                shapes_in_use.cube_base.draw(graphics_state,translation(this.initialLoc[i]), dark_material[i%4]);
              
              }          


            } 

            //////////////////////////////////
            // Anderson's Level
            //////////////////////////////////
            else if (this.score < 12000) { 
              this.ghost_effect.pause();
              this.apocalypse_effect.play(); 

              if(this.speed > 0.8 && this.speed !== 0)
                this.speed -= 0.05;
              document.getElementById("gl-canvas").style.background = "url('jungle.jpg')";          
              if(this.invincible_time > 0){
                shapes_in_use.tetrahedron    .draw( graphics_state, model_transform, rainbow_material[this.invincible_time %8]);
              } else              
                shapes_in_use.tetrahedron    .draw( graphics_state, model_transform, yellowPlastic);

              // Create a bunch of spinners
              for(var i = 0; i<this.spinner_num; i++){
                /////////////////////////////////////
                // Collision detection for spinners 
                /////////////////////////////////////
                if(this.invincible_time <= 0 && ((this.spinner_loc[i][0]>-1 && this.spinner_loc[i][0]<1) ||
                    (this.spinner_loc[i][1]> -2.5 && this.spinner_loc[i][1]<-1.1)) && 
                    this.spinner_loc[i][2]<0 && this.spinner_loc[i][2]> -this.speed ){
                  console.log(i, this.shield);
                    if (this.shield === 1) 
                        this.shield = 0;
                      else {
                        this.game_over();
                        this.apocalypse_effect.pause();
                      }
                    }


                if (this.spinner_loc[i][0] >= this.universe_dimension || this.spinner_loc[i][0] < -1* this.universe_dimension) //Bound left/right
                  this.spinner_loc[i][0] *= -(this.universe_dimension-1)/(this.universe_dimension);
                if (this.spinner_loc[i][1] >= this.universe_dimension || this.spinner_loc[i][1] < -1* this.universe_dimension)//Bound up/down
                  this.spinner_loc[i][1] *= -(this.universe_dimension-1)/(this.universe_dimension);;
                  if(this.spinner_loc[i][2] > 0) {//bound backwards
                    this.spinner_loc[i][0] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.spinner_loc[i][1] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                    this.spinner_loc[i][2] = -100;
                  }
                
                this.spinner_loc[i][0] += this.delta_x;
                this.spinner_loc[i][1] += this.delta_y;
                this.spinner_loc[i][2] += this.speed;

                // Lets get some rotation going for the spinners 
                // Rotate, then translate somewhere into the scene
                // var spinner_transform = mult(translation(this.spinner_loc[i]), 
                //                               rotation((this.shared_scratchpad.graphics_state.current_rotation + this.spinner_rand_angles[i]) * this.spinner_rot_speeds[i] , 0, 0, 1));

                var spinner_transform = translation(this.spinner_loc[i]); 
                //spinner_transform = mult(spinner_transform, rotation(this.spinner_rand_angles[i], 0, 0, 1)); 
                shapes_in_use.spinner.draw(graphics_state, spinner_transform, wood_material);
              
              }

              // Create some fireballs
              for(var i = 0; i<this.fireball_num; i++){
                if(this.invincible_time <= 0 && this.fireball_loc[i][0]>-1.5 && this.fireball_loc[i][0]<1.5 && 
                    this.fireball_loc[i][1]> -3 && this.fireball_loc[i][1]<-0.6 && 
                    this.fireball_loc[i][2]<0 && this.fireball_loc[i][2]> -this.speed ){
    
                    if (this.shield === 1) 
                        this.shield = 0;
                    else {
                        this.game_over();
                        this.apocalypse_effect.pause();
                    }
                }

                if (this.fireball_loc[i][0] >= this.universe_dimension || this.fireball_loc[i][0] < -1* this.universe_dimension) //Bound left/right
                  this.fireball_loc[i][0] *= -(this.universe_dimension-1)/(this.universe_dimension);
                if (this.fireball_loc[i][1] < -1* this.universe_dimension)//Bound up/down
                  this.fireball_loc[i][1] = this.universe_dimension;
                if(this.fireball_loc[i][2] > 0) {//bound backwards
                  this.fireball_loc[i][0] = Math.random()*2*this.universe_dimension -this.universe_dimension;
                  this.fireball_loc[i][1] = this.universe_dimension;
                  this.fireball_loc[i][2] = Math.random()*100-100;
                  }

                this.fireball_loc[i][1] -= 0.7;
                this.fireball_loc[i][0] += this.delta_x;
                this.fireball_loc[i][2] += this.speed;

                shapes_in_use.sphere_base.draw(graphics_state, translation(this.fireball_loc[i]), fire_material);
              }
            } 

            // Connor's Level
            else if (this.score < 16000) { 
              this.apocalypse_effect.pause();
              this.rainbow_effect.play();   
              shapes_in_use.tetrahedron  .draw( graphics_state, model_transform, yellowPlastic );

              if (this.tunnel_countdown > 0) {
                this.tunnel_countdown --;
                this.pitch_angle = 0;
                this.tilt_angle = 0;
                this.delta_x = 0;
                this.delta_y = 0;
                this.roll_l = false;
                this.roll_r = false;
                this.pitch_u = false;
                this.pitch_d = false;
                graphics_state.camera_transform = translation(0,0,-5);
              }
              //increase speed gradually for new level
              if(this.speed > 0.8 && this.speed !== 0)
                this.speed -= 0.05;

              // Reset the tunnel direction change
              if (this.tunnel_turns == 0) {
                this.tunnel_x_delta = (Math.round(Math.random()) * 2 - 1) * 0.6;
                this.tunnel_y_delta = (Math.round(Math.random()) * 2 - 1) * 0.6;
                this.tunnel_turns = 100;
              }
              
              // Adjust the current tunnel turn count
              this.tunnel_turns--;
              
              // Change background to something else
              document.getElementById("gl-canvas").style.background = "url('lightspeed.jpg')";

              for (var i = 0; i < 20; i++) {
                // Change direction
                this.tunnel_loc[i][0] += this.delta_x;
                this.tunnel_loc[i][1] += this.delta_y;
                this.tunnel_loc[i][2] += this.speed;

                // Collision detection
                if((this.tunnel_loc[i][0] <= -3.5 || this.tunnel_loc[i][0] >= 3.5 || this.tunnel_loc[i][1] <= -3.6 || this.tunnel_loc[i][1] >= 4) && (this.tunnel_loc[i][2] < 0 && this.tunnel_loc[i][2] > -this.speed - 2)){
                  if (this.shield === 1) {
                    this.shield = 0;
                  } else {
                    this.game_over();
                    this.rainbow_effect.pause();
                  }
                }

                // If pass the player, put them at the back
                if (this.tunnel_loc[i][2] > 0) {
                  this.tunnel_loc[i][0] = this.tunnel_loc[i == 0 ? 19 : i -1][0] + (i != 0 ? this.tunnel_x_delta : 0);
                  this.tunnel_loc[i][1] = this.tunnel_loc[i == 0 ? 19 : i -1][1] + (i != 0 ? this.tunnel_y_delta : 0);
                  this.tunnel_loc[i][2] = -100;
                }

                shapes_in_use.Cube_Tunnel.draw(graphics_state, mult(model_transform, translation(this.tunnel_loc[i])), rainbow_material[i % 7]);
              }
            

              // Draw shield around our ship
             

            }

            else { 
          

              model_transform = mult(model_transform, translation(0, 0, -this.increment));
              this.increment += 0.05; 
              shapes_in_use.tetrahedron    .draw( graphics_state, model_transform, yellowPlastic);

              // Render game-winning text 
              var text_canvas = document.getElementById("text");
            
              text_canvas.width = 1000;
              text_canvas.height = 800;
              text_canvas.style.left = 100 + "px";
              text_canvas.style.top = 200 + "px";

              this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);

              // Style the game text 
              
              this.context.font = "50px arial";
              var gradient = this.context.createLinearGradient(0, 0, 800, 500);
              gradient.addColorStop(0, "rgb(131, 0, 255)");
              gradient.addColorStop(1, "rgb(255, 153, 51)");
              this.context.fillStyle = gradient;
        
              this.context.font = "italic small-caps bold 80px arial"; 
              this.context.textAlign = "center";
              this.context.fillText("The end", 500, 200);
              this.context.font = "italic small-caps bold 72px arial"; 
              // this.context.fillText("High Score: " + Math.ceil(this.high_score), 500, 300);
            }

            if (this.shield) {
                model_transform = mult(model_transform, scale(0.6, 0.6, 1.4));
                model_transform = mult(model_transform, translation(0, 0, -0.5));
                shapes_in_use.sphere_base.draw(graphics_state, model_transform, shield);
            }
            break;

          case "GAME_OVER": 
            // You're dead 
            var text_canvas = document.getElementById("text");
            
            text_canvas.width = 1000;
            text_canvas.height = 800;
            text_canvas.style.left = 100 + "px";
            text_canvas.style.top = 200 + "px";

            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);

            // Style the game text 
            
            this.context.font = "50px arial";
            var gradient = this.context.createLinearGradient(0, 0, 800, 500);
            gradient.addColorStop(0, "rgb(131, 0, 255)");
            gradient.addColorStop(1, "rgb(255, 153, 51)");
            this.context.fillStyle = gradient;
      
            this.context.font = "italic small-caps bold 102px arial"; 
            this.context.textAlign = "center";
            this.context.fillText("Game Over", 500, 200);
            this.context.font = "italic small-caps bold 72px arial"; 
            this.context.fillText("High Score: " + Math.ceil(this.high_score), 500, 300);
            if(this.sleep_counter < 201){
              this.sleep_counter++;

            } else {
              //reset the game and canvas
              this.sleep_counter = 0;
              this.current_game_state = "NOT_STARTED";
              text_canvas.width = 200;
              text_canvas.height = 100;
              text_canvas.style.left = 520 + "px";
              text_canvas.style.top = 440 + "px";
              this.score = 0;
              this.tilt_angle = 0;
              this.pitch_angle = 0;
              graphics_state.camera_transform = translation(0, 0,-5);
            }
            break; 
        }

      }

  }, Animation );