Declare_Any_Class( "Subdivision_Sphere",      // A subdivision surface ( Wikipedia ) is initially simple, then builds itself into a more and more detailed shape of the same 
  {                                           // layout.  Each act of subdivision makes it a better approximation of some desired mathematical surface by projecting each new 
                                              // point onto that surface's known implicit equation.  For a sphere, we begin with a closed 3-simplex (a tetrahedron).  For 
                                              // each face, connect the midpoints of each edge together to make more faces.  Repeat recursively until the desired level of 
    populate: function ( max_subdivisions )   // detail is obtained.  Project all new vertices to unit vectors (onto the unit sphere) and group them into triangles by 
      {                                       // following the predictable pattern of the recursion.
        this.positions.push( [ 0, 0, -1 ], [ 0, .9428, .3333 ], [ -.8165, -.4714, .3333 ], [ .8165, -.4714, .3333 ] );  // Start with this equilateral tetrahedron
        
        var subdivideTriangle = function( a, b, c, count )   // This function will recurse through each level of detail by splitting triangle (a,b,c) into four smaller ones.
          { 
            if( count <= 0) { this.indices.push(a,b,c); return; }  // Base case of recursion - we've hit the finest level of detail we want.
                                
            var ab_vert = normalize( mix( this.positions[a], this.positions[b], 0.5) ),     // We're not at the base case.  So,
                ac_vert = normalize( mix( this.positions[a], this.positions[c], 0.5) ),     // build 3 new vertices at midpoints, and extrude them out to
                bc_vert = normalize( mix( this.positions[b], this.positions[c], 0.5) );     // touch the unit sphere (length 1).
                  
            var ab = this.positions.push( ab_vert ) - 1,      // Here, push() returns the indices of the three new vertices (plus one).
                ac = this.positions.push( ac_vert ) - 1,  
                bc = this.positions.push( bc_vert ) - 1;  
            
            subdivideTriangle.call( this, a, ab, ac,  count - 1 );      // Recurse on four smaller triangles, and we're done.
            subdivideTriangle.call( this, ab, b, bc,  count - 1 );      // Skipping every fourth vertex index in our list takes you down one level of detail, and 
            subdivideTriangle.call( this, ac, bc, c,  count - 1 );      // so on, due to the way we're building it.
            subdivideTriangle.call( this, ab, bc, ac, count - 1 );
          }
        subdivideTriangle.call( this, 0, 1, 2, max_subdivisions);  // Begin recursion.
        subdivideTriangle.call( this, 3, 2, 1, max_subdivisions);
        subdivideTriangle.call( this, 1, 0, 3, max_subdivisions);
        subdivideTriangle.call( this, 0, 2, 3, max_subdivisions); 
        
        for( let p of this.positions )
          { this.normals       .push( p.slice() );    // Each point has a normal vector that simply goes to the point from the origin.  Copy array value using slice().
            this.texture_coords.push( vec2( .5 + Math.atan2( p[2], p[0] ) / 2 / Math.PI, .5 - 2 * Math.asin( p[1] ) / 2 / Math.PI ) ); }
      }
  }, Shape )