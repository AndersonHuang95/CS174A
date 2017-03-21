/*******************************************
 * Crosshair prototype 
*******************************************/

function crosshair() {

	// Create a buffer
	this.crosshairBuffer = gl.createBuffer(); 

	// Bind the buffer 
	gl.bindBuffer(gl.ARRAY_BUFFER, this.crosshairBuffer); 

	var vertices = [
		-0.5, 0.0, 0.0, 
		0.5, 0.0, 0.0, 
		0.0, -0.5, 0.0, 
		0.0, 0.5, 0.0
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	// Now for color 
	// Draw in white
	var color = [1.0, 1.0, 1.0, 1.0]; 
	var color_array = [];
	for(var i=0; i < vertices.length; i++) {
		color_array = color_array.concat(color); 
	}

	// Create a buffer, bind it, then buffer data 
	this.crosshairColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.crosshairColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color_array), gl.STATIC_DRAW);
}

crosshair.prototype.draw = function() {

	// Set the position attributes for the vertices 

	gl.bindBuffer(gl.ARRAY_BUFFER, this.crosshairBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the colors attribute for the vertices.

	gl.bindBuffer(gl.ARRAY_BUFFER, this.crosshairColorBuffer);
	gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	// Draw the cube.
	setMatrixUniforms();
	gl.drawArrays(gl.LINES, 0, 4); 
}

/*******************************************
 * Cube prototype 
 * Each cube object is centered at the origin and has unit size 
 * Each cube is drawn using an index-method that jumps into the vertex array 
*******************************************/
function WebGLCube() { 

	// Create a buffer for the cube's vertices.

	cubeVerticesBuffer = gl.createBuffer();

	// Select the cubeVerticesBuffer as the one to apply vertex
	// operations to from here out.

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);

	// Now create an array of vertices for the cube.

	var vertices = [
		// Front face
		-0.5, -0.5,  0.5,
		 0.5, -0.5,  0.5,
		 0.5,  0.5,  0.5,
		-0.5,  0.5,  0.5,

		// Back face
		-0.5, -0.5, -0.5,
		-0.5,  0.5, -0.5,
		 0.5,  0.5, -0.5,
		 0.5, -0.5, -0.5,

		// Top face
		-0.5,  0.5, -0.5,
		-0.5,  0.5,  0.5,
		 0.5,  0.5,  0.5,
		 0.5,  0.5, -0.5,

		// Bottom face
		-0.5, -0.5, -0.5,
		 0.5, -0.5, -0.5,
		 0.5, -0.5,  0.5,
		-0.5, -0.5,  0.5,

		// Right face
		 0.5, -0.5, -0.5,
		 0.5,  0.5, -0.5,
		 0.5,  0.5,  0.5,
		 0.5, -0.5,  0.5,

		// Left face
		-0.5, -0.5, -0.5,
		-0.5, -0.5,  0.5,
		-0.5,  0.5,  0.5,
		-0.5,  0.5, -0.5
	];

	// Now pass the list of vertices into WebGL to build the shape. We
	// do this by creating a Float32Array from the JavaScript array,
	// then use it to fill the current vertex buffer.

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	// Build the element array buffer; this specifies the indices
	// into the vertex array for each face's vertices.

	cubeVerticesIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);

	// This array defines each face as two triangles, using the
	// indices into the vertex array to specify each triangle's
	// position.

	var cubeVertexIndices = [
		0,  1,  2,      0,  2,  3,    // front
		4,  5,  6,      4,  6,  7,    // back
		8,  9,  10,     8,  10, 11,   // top
		12, 13, 14,     12, 14, 15,   // bottom
		16, 17, 18,     16, 18, 19,   // right
		20, 21, 22,     20, 22, 23    // left
	];

	// Now send the element array to GL

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

	// Build a second element array buffer for shape outlining

	cubeOutlineIndexBuffer = gl.createBuffer(); 
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeOutlineIndexBuffer); 

	// This array defines pairs of lines to render 
	// There are redundancies, but they are kept for 
	// simplicity and because this project is not rendering-intensive 

	var cubeOutlineIndices = [
		0, 1,	1, 2, 	2, 3, 	3, 0, 
		4, 5, 	5, 6, 	6, 7, 	7, 4, 
		8, 9, 	9, 10, 	10, 11, 11, 8, 
		12, 13, 13, 14, 14, 15, 15, 12, 
		16, 17, 17, 18, 18, 19, 19, 16, 
		20, 21, 21, 22, 22, 23, 23, 20, 
	];

	// Now send the second element array to GL
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeOutlineIndices), gl.STATIC_DRAW); 

	// Attempt to draw cube with strips 
	cubeByStripsIndexBuffer = gl.createBuffer(); 
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeByStripsIndexBuffer); 

	var cubeStripIndices = [
		0, 1, 3, 2, 5, 6, 4, 7, 0, 1, 2, 6, 7, 1, 4, 0, 5, 3
	];

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeStripIndices), gl.STATIC_DRAW); 
}

/* 
 * draw(color) 
 * Takes a parameter color which will cover the cube uniformly 
 */ 
WebGLCube.prototype.draw = function(color) {
	var generatedColors = [];

	for (var i=0; i<24; i++) {
	  	generatedColors = generatedColors.concat(color);
	}

	// Create a buffer, bind it, then buffer data 
	cubeVerticesColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generatedColors), gl.STATIC_DRAW);

	// Set the position attributes for the vertices 

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the colors attribute for the vertices.

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesColorBuffer);
	gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	// Draw the cube.

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeByStripsIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLE_STRIP, 18, gl.UNSIGNED_SHORT, 0);
}

/* 
 * drawOutline() 
 * Displays a white outline around the cube 
 */ 
WebGLCube.prototype.drawOutline = function() {
	var color = [1.0, 1.0, 1.0, 1.0]; 
	var color_array = [];
	for(var i=0; i < 24; i++) {
		color_array = color_array.concat(color); 
	}

	// Create a buffer, bind it, then buffer data 
	cubeOutlineColorBuffer = gl.createBuffer(); 
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeOutlineColorBuffer); 
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color_array), gl.STATIC_DRAW); 

	// Set the position attributes for the vertices 

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	// Set the colors attribute for the vertices 
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeOutlineColorBuffer);
	gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	// Draw the cube outline 
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeOutlineIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
}
