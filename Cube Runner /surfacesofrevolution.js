  // 2.  MORE DIFFICULT PRIMITIVES:     ------------------------------------------------------------------------------------------------------------------------------

  // SURFACE OF REVOLUTION: Produce a curved patch of triangles with rows and columns.  Begin with an input array of points, defining a curved path -- let each point be a row.  
  // Sweep the whole curve around the Z axis in equal steps, stopping and storing new points along the way; let each step be a column.  Now we have a flexible "generalized 
  // cylinder" spanning an area until total_curvature_angle -- or if zero was passed in for that angle, we linearly extruded the curve instead (translating up y).  Lastly, 
  // connect this curved grid of rows and columns into a tesselation of triangles by generating a certain predictable pattern of indices.
Declare_Any_Class( "Surface_Of_Revolution", 
  { 
    populate: function( rows, columns, points, total_curvature_angle = 360, texture_coord_range = [ [ 0, 1 ] [ 0, 1 ] ] ) 
      { 
        for( var i = 0; i <= rows; i++ )        // Travel down the curve spelled out by the parameter "points"
        {
          var frac = i / rows * ( points.length - 1 ), alpha = frac - Math.floor( frac ),   // Which points in that array are we between?
              currPoint = add( scale_vec( 1 - alpha, points[ Math.floor( frac ) ] ), scale_vec( alpha, points[ Math.ceil( frac ) ] ) ).concat( 1 ),
              tangent   = frac-1 < 0     ? subtract( points[ 1 ], points[ 0 ] ) : subtract( points[ Math.ceil( frac ) ], points[ Math.ceil( frac - 1 ) ] );
              normal    = normalize( cross( tangent, vec3( 0, 1, 0 ) ) ).concat( 0 ); 
          
          for( var j = 0; j <= columns; j++ )
          {
            var spin = ( total_curvature_angle == 0 ) ? translation( 0, j, 0 ) : rotation( j * total_curvature_angle/columns, 0, 0, 1 );
            this.positions.push( mult_vec( spin, currPoint ).slice(0,3) );           this.normals.push( mult_vec( spin, normal ).slice(0,3) );
            this.texture_coords.push( vec2( j/columns, -i/rows ) );
          }
        }
        for( var h = 0; h < rows; h++ )             // Generate a sequence like this (if #columns is 10):  "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..." 
          for( var i = 0; i < 2 * columns; i++ )
            for( var j = 0; j < 3; j++ )
              this.indices.push( h * ( columns + 1 ) + columns * ( ( i + ( j % 2 ) ) % 2 ) + ( Math.floor( ( j % 3 ) / 2 ) ? 
                                     ( Math.floor( i / 2 ) + 2 * ( i % 2 ) )       :         ( Math.floor( i / 2 ) + 1 ) ) );                                                                                                        
      }
  }, Shape )                                           //***************************** MORE SHAPES, THAT EXPLOIT THE ABOVE SHAPE TO CONSTRUCT THEMSELVES: *************
Declare_Any_Class( "Regular_2D_Polygon",  // Approximates a flat disk / circle
  { populate: function( rows, columns )
      { Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, [ vec3( 0, 0, 0 ), vec3( 1, 0, 0 ) ] ] ); 
        for( let t in this.texture_coords ) { this.texture_coords[t][0] = this.positions[t][0]/2 + 0.5; this.texture_coords[t][1] = this.positions[t][1]/2 + 0.5; }
      } }, Shape )
  
Declare_Any_Class( "Cylindrical_Tube",    // An open tube shape with equally sized sections, pointing down Z locally.    
  { populate : function( rows, columns ) 
      { Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, [ vec3( 1, 0, .5 ), vec3( 1, 0, -.5 ) ] ] ); } }, Shape )

Declare_Any_Class( "Cone_Tip",            // Note:  Curves that touch the Z axis degenerate from squares into triangles as they sweep around
  { populate: function( rows, columns ) 
      { Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, [ vec3( 0, 0,  1 ), vec3( 1, 0, -1 ) ] ] ); } }, Shape )

Declare_Any_Class( "Torus",
  { populate: function( rows, columns )  
      { var circle_points = [];
        for( var i = 0; i <= rows; i++ )   circle_points.push( vec3( 1.5 + Math.cos( i/rows * 2*Math.PI ), 0, Math.sin( i/rows * 2*Math.PI ) ) );
        
        Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, circle_points ] );     
      } }, Shape )
Declare_Any_Class( "Sphere",      // With lattitude / longitude divisions; this means singularities are at the mesh's top and bottom.  Alternatives exist.
  { populate: function( rows, columns ) 
      { var circle_points = [];
        for( var i = 0; i <= rows; i++ )   circle_points.push( vec3( Math.cos( i/rows * Math.PI - Math.PI/2 ), 0, Math.sin( i/rows * Math.PI - Math.PI/2 ) ) );
        
        Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, circle_points ] );     
      } }, Shape ) 
      
// 3.  COMPOUND SHAPES, BUILT FROM THE ABOVE HELPER SHAPES      --------------------------------------------------------------------------------------------------------------

Declare_Any_Class( "Closed_Cone",     // Combine a cone tip and a regular polygon to make a closed cone.
  { populate: function( rows, columns ) 
      { Cone_Tip          .prototype.insert_transformed_copy_into( this, [ rows, columns ] );    
        Regular_2D_Polygon.prototype.insert_transformed_copy_into( this, [ 1, columns ], mult( rotation( 180, 0, 1, 0 ), translation( 0, 0, 1 ) ) ); } }, Shape )

Declare_Any_Class( "Rounded_Closed_Cone",   // An alternative without two separate sections
  { populate: function( rows, columns )
      { Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, [ vec3( 0, 0, 1 ), vec3( 1, 0, -1 ), vec3( 0, 0, -1 )  ] ] ) ; } }, Shape )

Declare_Any_Class( "Capped_Cylinder",   // Combine a tube and two regulra polygons to make a closed cylinder.  Flat shade this to make a prism, where #columns = #sides.
  { populate: function ( rows, columns )
      { Cylindrical_Tube  .prototype.insert_transformed_copy_into( this, [ rows, columns ] );
        Regular_2D_Polygon.prototype.insert_transformed_copy_into( this, [ 1, columns ],                                 translation( 0, 0, .5 ) );
        Regular_2D_Polygon.prototype.insert_transformed_copy_into( this, [ 1, columns ], mult( rotation( 180, 0, 1, 0 ), translation( 0, 0, .5 ) ) ); }
  }, Shape )
Declare_Any_Class( "Rounded_Capped_Cylinder",   // An alternative without three separate sections
  { populate: function ( rows, columns )
      { Surface_Of_Revolution.prototype.insert_transformed_copy_into( this, [ rows, columns, [ vec3( 0, 0, .5 ), vec3( 1, 0, .5 ), vec3( 1, 0, -.5 ), vec3( 0, 0, -.5 ) ] ] ); } }, Shape ) 
    
Declare_Any_Class( "Cube",    // A cube inserts six square strips into its lists.
  { populate: function()  
      { for( var i = 0; i < 3; i++ )                    
          for( var j = 0; j < 2; j++ )
          { var square_transform = mult( rotation( i == 0 ? 90 : 0, vec3( 1, 0, 0 ) ), rotation( 180 * j - ( i == 1 ? 90 : 0 ), vec3( 0, 1, 0 ) ) );
                square_transform = mult( square_transform, translation(0, 0, 1) );
            Square.prototype.insert_transformed_copy_into( this, [], square_transform );             
          } 
      } }, Shape )
  
Declare_Any_Class( "Axis_Arrows",   // Made out of a lot of various primitives.
{ populate: function()  
    {
      var stack = [];       
      var object_transform = scale(.25, .25, .25);
      Subdivision_Sphere.prototype.insert_transformed_copy_into( this, [ 3 ], object_transform );
      this.drawOneAxis( mat4() );
      object_transform = rotation(-90, vec3(1,0,0));
      object_transform = mult( object_transform, scale(1, -1, 1));
      this.drawOneAxis(object_transform);
      object_transform = rotation(90, vec3(0,1,0));
      object_transform = mult( object_transform, scale(-1, 1, 1));
      this.drawOneAxis(object_transform); 
    },
  drawOneAxis: function( object_transform )
    {
      var original = object_transform;
      object_transform = mult( object_transform, translation(0, 0, 4));
      object_transform = mult( object_transform, scale(.25, .25, .25));
      Closed_Cone.prototype.insert_transformed_copy_into ( this, [ 4, 10 ], object_transform, 0 );
      object_transform = original;
      object_transform = mult( object_transform, translation(.95, .95, .5));
      object_transform = mult( object_transform, scale(.05, .05, .5));
      Cube.prototype.insert_transformed_copy_into( this, [ ], object_transform, 0 );
      object_transform = original;
      object_transform = mult( object_transform, translation(.95, 0, .5));
      object_transform = mult( object_transform, scale(.05, .05, .5));
      Cube.prototype.insert_transformed_copy_into( this, [ ], object_transform, 0 );
      object_transform = original;
      object_transform = mult( object_transform, translation(0, .95, .5));
      object_transform = mult( object_transform, scale(.05, .05, .5));
      Cube.prototype.insert_transformed_copy_into( this, [ ], object_transform, 0 );
      object_transform = original;      
      object_transform = mult( object_transform, translation(0, 0, 2));
      object_transform = mult( object_transform, scale(.1, .1, 4));
      Cylindrical_Tube.prototype.insert_transformed_copy_into( this, [ 7, 7 ], object_transform, 0 );
    }
}, Shape )