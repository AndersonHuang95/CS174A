/* 
 * Code adapted from Mozilla Firefox WebGL tutorial 
 * Matrix math is done using the gl-matrix library 
 * See http://glmatrix.net/docs/ for documentation 
 *
 * Note: Web browser may cache results 
 * CTRL-F5 to clear the cache 
 */ 


"use strict" 

var canvas;
var gl;

var currentRotation = 0.0;
var lastUpdateTime = 0;
var Shading = {
	FLAT: 'FLAT',
	GOURAUD: 'GOURAUD', 
	PHONG: 'PHONG'
};
 
var fovy = 90; 
// amount to rotate the camera and move forward the camera 
var DEGREE_ADJUSTMENT = 1; 
// pitch is analagous to nodding 
var pitch_degrees = 0; 
// heading is analagous to shaking your head 
var heading_degrees = 0; 
var attached = false; 

// Matrices  
var perspectiveMatrix = mat4.create();
var viewMatrix = mat4.create(); 
var cameraMatrix = mat4.create(); 
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var cameraMatrixStack = []; 

// Singular point light source components 
var ambientLight = vec4.fromValues(0.5, 0.5, 0.5, 1.0); 
var diffuseLight = vec4.fromValues(0.5, 0.5, 0.5, 1.0); 
var specularLight = vec4.fromValues(0.5, 0.5, 0.5, 1.0); 

// light interaction values to pass to shader 
var ambientProduct = vec4.create();
var diffuseProduct = vec4.create(); 
var specularProduct = vec4.create(); 

// Singular point light source and shininess factor 
var lightPosition = vec3.fromValues(5.0, 0.0, 0.0); 
var shininess = 50.0;

// The follow variables are intialized and sent to the shader 
// in initShaders.js 
var shaderProgram;
var vertexPositionAttribute;
var vertexColorAttribute;
var vertexNormalAttribute; 
var lightUniform;

// Light property variables 
var vAmbientProductUniform;
var vDiffuseProductUniform;
var vSpecularProductUniform;

var fAmbientProductUniform;
var fDiffuseProductUniform;
var fSpecularProductUniform; 

////////////////////////////////////////////////////////////////////////////////////////////////
// Add an event handler to deal with user input 
// ArrowUp/ArrowDown - Move camera up or down by DEGREE_ADJUSTMENT degrees
// ArrowLeft/ArrowRight - Move azimuthal angle by DEGREE_ADJUSTMENT degrees 
// Space - forward by DEGREE_ADJUSTMENT units relative to current heading
// r - reset to default view 
// a/d - attach to third planet/detach and return to normal view 
////////////////////////////////////////////////////////////////////////////////////////////////

// Ensure focus on keyboard input 
document.onmousedown = function() { window.focus(); };

document.addEventListener('keydown', function(event) {
	var CANVAS_HEIGHT = document.getElementById("glcanvas").offsetHeight; 
	var CANVAS_WIDTH = document.getElementById("glcanvas").offsetWidth; 
	var position = mat4.create();

	switch(event.key) {
		case "ArrowUp": 
			if (!attached) {
				mat4.rotateX(cameraMatrix, cameraMatrix, toRadians(-DEGREE_ADJUSTMENT));
				pitch_degrees += DEGREE_ADJUSTMENT; 
			}
			break;
		case "ArrowDown":
			if (!attached) {
				mat4.rotateX(cameraMatrix, cameraMatrix, toRadians(DEGREE_ADJUSTMENT));
				pitch_degrees -= DEGREE_ADJUSTMENT; 
			}
			break;

		case "ArrowLeft":
			mat4.rotateY(cameraMatrix, cameraMatrix, toRadians(DEGREE_ADJUSTMENT));
			if (!attached) 
				heading_degrees -= DEGREE_ADJUSTMENT;
			break;
		case "ArrowRight":
			mat4.rotateY(cameraMatrix, cameraMatrix, toRadians(-DEGREE_ADJUSTMENT));
			if (!attached) 
				heading_degrees += DEGREE_ADJUSTMENT;
			break;
		case "1": 
			DEGREE_ADJUSTMENT = 1; 
			break; 
		case "2":
			DEGREE_ADJUSTMENT = 2; 
			break; 
		case "3": 
			DEGREE_ADJUSTMENT = 3; 
			break; 
		case "4":
			DEGREE_ADJUSTMENT = 4; 
			break; 
		case "5":
			DEGREE_ADJUSTMENT = 5; 
			break; 
		case "6":
			DEGREE_ADJUSTMENT = 6; 
			break; 
		case "7":
			DEGREE_ADJUSTMENT = 7; 
			break; 
		case "8":
			DEGREE_ADJUSTMENT = 8; 
			break; 
		case "9": 
			DEGREE_ADJUSTMENT = 9; 
			break; 

		// Reset perspective and view matrices 
		case "r": 
			mat4.identity(cameraMatrix); 
			cameraMatrixStack = []; 
			DEGREE_ADJUSTMENT = 1; 
			pitch_degrees = 0;
			heading_degrees = 0;
			attached = false; 
			break; 

		// Move the camera forward by (DEGREE_ADUSTMENT) units, with respect to the heading and pitch 
		// of the camera
		case " ": 
			if (!attached) {
				// Calculate the distance to move in y using the pitch angle 
				// Also calculate the diagonal for xz calculation
				var y = Math.sin(toRadians(pitch_degrees)) * DEGREE_ADJUSTMENT; 
				var xz_diagonal = Math.cos(toRadians(pitch_degrees)) * DEGREE_ADJUSTMENT; 

				// x and z are more complicated
				// the heading is with respect to the -z axis 
				// subtract from 90 to get an angle with respect to the x axis 
				// z must be negated because the clip coordinate system is flipped 
				var x_heading_degrees = 90 - heading_degrees; 
				var x = Math.cos(toRadians(x_heading_degrees)) * xz_diagonal; 
				var z = -Math.sin(toRadians(x_heading_degrees)) * xz_diagonal; 

				mat4.fromTranslation(position, vec3.fromValues(x, y, z)); 
				mat4.mul(cameraMatrix, cameraMatrix, position); 
			}
			break; 

		case "a":
			if (!attached) { 
				attached = true; 
				cameraMatrixStack.push(mat4.clone(cameraMatrix)); 
				mat4.identity(cameraMatrix); 
			}
			break; 
		case "d": 
			if (attached) {
				attached = false; 
				if (!cameraMatrixStack.length) {
					throw("Can't pop from an empty matrix stack.");
				}
				cameraMatrix = cameraMatrixStack.pop(); 
			}
			break;
	}	
});

//
// start
//
// Called when the canvas is created to get the ball rolling.
//
window.onload = function start() {
	canvas = document.getElementById("glcanvas");

	gl = WebGLUtils.setupWebGL( canvas );

	// Only continue if WebGL is available and working

	if (!gl) {
		alert("WebGL context could not be initialized.");
	}
	gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.

    initShaders(gl);

    // Here's where we call the routine that builds all the objects
    // we'll be drawing.

    render(); 
}

/****************************************************
* Sphere prototype 
* @param n_vertices - number of vertices to generate 
* @param mode - either 'FLAT', 'GOURAUD', or 'PHONG'
* Created using subdivision 
* 
****************************************************/ 

function Sphere(n_vertices, shading_type) {
	// These four vertices correspond to points on 
	// the unit sphere. Connecting them simply  
	// forms a tetrahedron 
	var v1 = vec3.fromValues(0.0, 0.0, -1.0); 
	var v2 = vec3.fromValues(0.0, 0.942809, 0.333333); 
	var v3 = vec3.fromValues(-0.816497, -0.471405, 0.333333);
	var v4 = vec3.fromValues(0.816497, -0.471405, 0.333333);
	var n_divisions = Math.ceil(Math.log(n_vertices) / Math.log(4)); 

	// Member variables to buffer data 
	this.sphereBuffer = gl.createBuffer(); 
	this.normalsBuffer = gl.createBuffer(); 
	this.vertices = [];
	this.normals = []; 
	this.numVertices = 0; 

	// Dividing each of the four triangle faces gives 
	// an approximation of a sphere 
	// Vertex data is built up in the divideTriangle function
	this.divideTriangle(v1, v2, v3, n_divisions, shading_type); 
	this.divideTriangle(v4, v3, v2, n_divisions, shading_type); 
	this.divideTriangle(v1, v4, v2, n_divisions, shading_type); 
	this.divideTriangle(v1, v3, v4, n_divisions, shading_type); 

	// Bind the buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereBuffer); 
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW); 

	gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW); 

	// Send the correct uniform shading type to the shaders 
	var gouraudUniform = gl.getUniformLocation(shaderProgram, "Gouraud");
	var phongUniform = gl.getUniformLocation(shaderProgram, "Phong"); 

	if (shading_type == 'FLAT') {
		// For flat shading, calculate color in the vertex
		// shader like Gouraud shading
		// However, the normals will be the same per primitive 
		gl.uniform1i(gouraudUniform, true);
		gl.uniform1i(phongUniform, false);
	}

	if (shading_type == 'GOURAUD') {
		gl.uniform1i(gouraudUniform, true);
		gl.uniform1i(phongUniform, false);
	}

	if (shading_type == 'PHONG') {
		gl.uniform1i(gouraudUniform, false);
		gl.uniform1i(phongUniform, true);
	}
}


Sphere.prototype.divideTriangle = function(a, b, c, count, type) {
	var self = this; 

	if (count > 0) {
		// Get midpoints of each triangle edge 
		var ab = vec3.create(), ac = vec3.create(), bc = vec3.create(); 
		vec3.normalize(ab, vec3.fromValues( (a[0] + b[0])/2 , (a[1] + b[1])/2 , (a[2] + b[2]) / 2 ) );
		vec3.normalize(ac, vec3.fromValues( (a[0] + c[0])/2 , (a[1] + c[1])/2 , (a[2] + c[2]) / 2 ) );
		vec3.normalize(bc, vec3.fromValues( (b[0] + c[0])/2 , (b[1] + c[1])/2 , (b[2] + c[2]) / 2 ) );

		// Divide triangle into four smaller triangles 
		self.divideTriangle(a, ab, ac, count - 1, type); 
		self.divideTriangle(ab, b, bc, count - 1, type); 
		self.divideTriangle(bc, c, ac, count - 1, type); 
		self.divideTriangle(ab, bc, ac, count - 1, type); 
	}

	else {
		// Flatten the data and add to buffers
		// For unit sphere, the vertex on the surface
		// is equivalent to the normal 
		if (type == 'FLAT') {
			// Use vertices a, b, and c to calculate the normal per primitive
			var ab = vec3.create(), ac = vec3.create(), normal = vec3.create(); 
			vec3.subtract(ab, b, a); 
			vec3.subtract(ac, c, a); 
			vec3.cross(normal, ab, ac); 

			for (var i = 0; i < 3; i++) {
				this.vertices.push(a[i]);
				this.normals.push(normal[i]); 
			}
			for (var i = 0; i < 3; i++) {
				this.vertices.push(b[i]);  
				this.normals.push(normal[i]); 
			}
			for (var i = 0; i < 3; i++) {
				this.vertices.push(c[i]);
				this.normals.push(normal[i]); 
			} 

			this.numVertices += 3; 
		}

		if (type == 'GOURAUD' || type == 'PHONG') {
			if (a[1] >= 0) {
				for (var i = 0; i < 3; i++) {
					this.vertices.push(a[i]);
					this.normals.push(a[i]); 
				}
				this.numVertices += 1; 
			}
			if (b[1] >= 0) {
				for (var i = 0; i < 3; i++) {
					this.vertices.push(b[i]); 
					this.normals.push(b[i]); 
				}
				this.numVertices += 1; 
			}
			if (c[1] >= 0) {
				for (var i = 0; i < 3; i++) {
					this.vertices.push(c[i]);
					this.normals.push(c[i]); 
				} 
				this.numVertices += 1; 
			}
		}
	}
}

Sphere.prototype.draw = function() {
		// Color handling goes here or in separate function 
	// this.color_array = [];
	// for(var i=0; i < this.vertices.length; i++ ) {
	// 	this.color_array = this.color_array.concat(color); 
	// }

	// Create a buffer, bind it, then buffer data 
	// this.sphereColorBuffer = gl.createBuffer();
	// gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereColorBuffer);
	// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.color_array), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer); 
	gl.vertexAttribPointer(vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0); 
	// Set the colors attribute for the vertices.

	// gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereColorBuffer);
	// gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	// Draw the sphere
	setUniforms();

	gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
}

/* 
 * setLightingProperties
 * @param ambient - vec4
 * @param diffuse - vec4 
 * @parma specular - vec4 
 */
Sphere.prototype.setLightingProperties = function(ambientProperty, diffuseProperty, specularProperty) {
	// Calculate light interactions 
	vec4.mul(ambientProduct, ambientLight, ambientProperty); 
	vec4.mul(diffuseProduct, diffuseLight, diffuseProperty); 
	vec4.mul(specularProduct, specularLight, specularProperty);

	// Set the values in the shader 
	gl.uniform4fv(vAmbientProductUniform, new Float32Array(ambientProduct));
	gl.uniform4fv(vDiffuseProductUniform, new Float32Array(diffuseProduct));
	gl.uniform4fv(vSpecularProductUniform, new Float32Array(specularProduct));

	gl.uniform4fv(fAmbientProductUniform, new Float32Array(ambientProduct));
	gl.uniform4fv(fDiffuseProductUniform, new Float32Array(diffuseProduct));
	gl.uniform4fv(fSpecularProductUniform, new Float32Array(specularProduct));
}

//
// render
//
// Draw the scene.
//
function render() {

	// Clear the canvas before we start drawing on it.

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Establish the perspective with which we want to view the
	// scene. Our field of view is 45 degrees, with a width/height
	// ratio of 960:540, and we only want to see objects between 0.1 units
	// and 100 units away from the camera.

	mat4.identity(mvMatrix);  
	mat4.identity(viewMatrix); 

	// Multiply the model matrix by the view matrix (inverse of camera matrix)
	// Do this in the vertex shader instead  

	// Now move the drawing position a bit to where we want to start
	// drawing the scene 

	var camera_transform = mat4.create(); 
	if (attached) {
		// Move to the third planet 
		// mat4.lookAt(camera_transform, vec3.fromValues(5 + 20 * Math.cos(2 * Math.PI * lastUpdateTime / (10 * 1000)), 
		// 												0,
		// 												20 * Math.sin(2 * Math.PI * lastUpdateTime / (10 * 1000))), 
		// 							  vec3.fromValues(5 + 16 * Math.cos(2 * Math.PI * lastUpdateTime / (10 * 1000)), 
		// 												0,
		// 												20 * Math.sin(2 * Math.PI * lastUpdateTime / (10 * 1000))),
		// 							  vec3.fromValues(0.0, 1.0, 0.0)); 

		mat4.fromTranslation(camera_transform, vec3.fromValues(5 + 20 * Math.cos(2 * Math.PI * lastUpdateTime / (10 * 1000)), 
														0,
														20 * Math.sin(2 * Math.PI * lastUpdateTime / (10 * 1000))));
	}
	else {
		mat4.fromTranslation(camera_transform, vec3.fromValues(0.0, 5.0, 30.0)); 
	}

	// Invert the camera matrix to arrive at the view matrix 
	// We want to move the scene instead of the camera, so we do 
	// the inverse matrix of all operations 
	// We then send the matrix to the shader using a uniform variable 
	// in setUniforms() 
 
	mat4.mul(camera_transform, camera_transform, cameraMatrix); 
	mat4.invert(viewMatrix, camera_transform); 
 
	// Set the perspective matrix, which is also sent to the
	// shader in setUniforms()

	mat4.perspective(perspectiveMatrix, toRadians(fovy), 1440.0/900.0, 0.1, 100.0);

	// Create Solar System 
	// Sun is located at (5.0, 0.0, 0.0)
	// First planet is faceted, ice-gray with flat shading 
	// Second planet is swampy, watery blue-green with Gouraud shading
	// Third planet is light-blue with Phong Shading 
	// Fourth planet is muddy brownish-orange with Phong Shading 
	// A moon with Gouraud shading orbits the third planet

	// Save the model-view matrix 
	mvPushMatrix(); 

	// create sun with medium complexity 
	// Diameter is 3 units 
	// Centered at (5.0, 0.0, 0.0) 
	mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(5.0, 0.0, 0.0)); 
	mvPushMatrix(); 
	mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(3.0, 3.0, 3.0)); 
	var sun = new Sphere(64, Shading.GOURAUD); 
	sun.setLightingProperties(vec4.fromValues(1.0, 0.2, 0.0, 1.0), vec4.fromValues(1.0, 1.0, 0.3, 1.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0)); 
	sun.draw(); 
	mvPopMatrix();

	// First planet with low complexity 
	// Diameter is 2 units 
	// Orbit is 7 units in radius with a 5 second period 
	mvPushMatrix(); 
	mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(7 * Math.cos(2 * Math.PI * lastUpdateTime / (5 * 1000)), 
														0,
														7 * Math.sin(2 * Math.PI * lastUpdateTime / (5 * 1000))));
	mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(2.0, 2.0, 2.0)); 
	var first_planet = new Sphere(16, Shading.FLAT);
	first_planet.setLightingProperties(vec4.fromValues(0.7, 0.7, 0.7), vec4.fromValues(0.9, 0.9, 0.9, 1.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0)); 
	first_planet.draw(); 
	mvPopMatrix(); 

	// Second planet 
	// Diameter is 1.5 units 
	// Orbit is 12 units in radius with a 8 second period 
	mvPushMatrix(); 
	var second_planet = new Sphere(64, Shading.GOURAUD); 
	mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(12 * Math.cos(2 * Math.PI * lastUpdateTime / (8 * 1000)), 
														0,
														12 * Math.sin(2 * Math.PI * lastUpdateTime / (8 * 1000))));
	mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(1.5, 1.5, 1.5));
	second_planet.setLightingProperties(vec4.fromValues(0.0, 0.7, 0.6), vec4.fromValues(0.0, 0.0, 0.0, 1.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0)); 
	second_planet.draw(); 
	mvPopMatrix(); 

	// Third planet 
	// Diameter is 1 unit 
	// Orbit is 16 units in radius with a 10 second period 
	mvPushMatrix(); 
	var third_planet = new Sphere(256, Shading.PHONG); 
	mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(16 * Math.cos(2 * Math.PI * lastUpdateTime / (10 * 1000)), 
														0,
														16 * Math.sin(2 * Math.PI * lastUpdateTime / (10 * 1000))));
	third_planet.setLightingProperties(vec4.fromValues(0.0, 0.8, 0.8), vec4.fromValues(0.0, 0.9, 0.9, 1.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0)); 
	third_planet.draw(); 

	// Moon orbiting third planet 
	// Diameter is 0.5 units 
	// Orbit is 2 units in radius around the third planet with a 4 second period 
	var third_planet_moon = new Sphere(64, Shading.GOURAUD); 
	mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(2 * Math.cos(2 * Math.PI * lastUpdateTime / (4 * 1000)), 
														0,
														2 * Math.sin(2 * Math.PI * lastUpdateTime / (4 * 1000))));
	mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(0.5, 0.5, 0.5));
	third_planet_moon.setLightingProperties(vec4.fromValues(0.9, 0.8, 0.9), vec4.fromValues(0.9, 0.9, 0.9, 1.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0)); 
	third_planet_moon.draw();
	mvPopMatrix(); 

	// Fourth planet 
	// Diameter is 1.75 units 
	// Orbit is 22 units in radius with a 15 second period 
	mvPushMatrix(); 
	var fourth_planet = new Sphere(256, Shading.PHONG); 
	mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(22 * Math.cos(2 * Math.PI * lastUpdateTime / (15 * 1000)), 
														0,
														22 * Math.sin(2 * Math.PI * lastUpdateTime / (15 * 1000))));
	mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(1.75, 1.75, 1.75));
	fourth_planet.setLightingProperties(vec4.fromValues(0.8, 0.5, 0.2), vec4.fromValues(0.0, 0.0, 0.0, 1.0), vec4.fromValues(1.0, 1.0, 1.0, 1.0)); 
	fourth_planet.draw(); 
	mvPopMatrix(); 

	// Back to origin 
	mvPopMatrix(); 

	// Animation 
	// Done by successively calling time and subtracting from last known time 
	var currentTime = (new Date).getTime();
	if (lastUpdateTime) {
		var delta = currentTime - lastUpdateTime;

		currentRotation += (2 * delta) / 1000.0;
	}
	lastUpdateTime = currentTime;

	requestAnimFrame(render);
}

//////////////////////////////////////
// Matrix utility functions
/////////////////////////////////////

function setUniforms() {
	// Perpsective matrix 
	var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix));

	// Model-view matrix 
	var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix));

	var vUniform = gl.getUniformLocation(shaderProgram, "uVMatrix"); 
	gl.uniformMatrix4fv(vUniform, false, new Float32Array(viewMatrix)); 

	// Model-view inverse transpose (for moving normals)
	var mvInverseTransposeUniform = gl.getUniformLocation(shaderProgram, "uMVInverseTranspose"); 
	var mvInverseTranspose = mat4.create(); 
	mat4.mul(mvInverseTranspose, viewMatrix, mvMatrix); 
	mat4.invert(mvInverseTranspose, mvInverseTranspose); 
	mat4.transpose(mvInverseTranspose, mvInverseTranspose);
	gl.uniformMatrix4fv(mvInverseTransposeUniform, false, new Float32Array(mvInverseTranspose));

	// Set uniform light position and shininess here
	lightUniform = gl.getUniformLocation(shaderProgram, "uLightPosition");
	gl.uniform3fv(lightUniform, new Float32Array(lightPosition));

	// Set uniform view position 
	var viewPositionUniform = gl.getUniformLocation(shaderProgram, "uViewPosition"); 
	// gl.uniform3fv(viewPositionUniform, [0.0, -5.0, -30.0]); 

    var shinyVertexUniform = gl.getUniformLocation(shaderProgram, "uv_shininess"); 
    gl.uniform1f(shinyVertexUniform, shininess); 

	// Get ambient, diffuse, and specular products 
	vAmbientProductUniform = gl.getUniformLocation(shaderProgram, "uv_ambientProduct");
	gl.uniform4fv(vAmbientProductUniform, new Float32Array(ambientProduct));

	vDiffuseProductUniform = gl.getUniformLocation(shaderProgram, "uv_diffuseProduct");
	gl.uniform4fv(vDiffuseProductUniform, new Float32Array(diffuseProduct)); 

	vSpecularProductUniform = gl.getUniformLocation(shaderProgram, "uv_specularProduct");
	gl.uniform4fv(vSpecularProductUniform, new Float32Array(specularProduct));

	var shinyFragmentUniform = gl.getUniformLocation(shaderProgram, "uf_shininess");
    gl.uniform1f(shinyFragmentUniform, shininess);

	fAmbientProductUniform = gl.getUniformLocation(shaderProgram, "uf_ambientProduct");
	gl.uniform4fv(fAmbientProductUniform, new Float32Array(ambientProduct));

	fDiffuseProductUniform = gl.getUniformLocation(shaderProgram, "uf_diffuseProduct");
	gl.uniform4fv(fDiffuseProductUniform, new Float32Array(diffuseProduct)); 

	fSpecularProductUniform = gl.getUniformLocation(shaderProgram, "uf_specularProduct");
	gl.uniform4fv(fSpecularProductUniform, new Float32Array(specularProduct));
}

function mvPushMatrix(m) {
  if (m) {
    mvMatrixStack.push(mat4.clone(m));
    mvMatrix = mat4.clone(m);
  } else {
    mvMatrixStack.push(mat4.clone(mvMatrix));
  }
}

function mvPopMatrix() {
  if (!mvMatrixStack.length) {
    throw("Can't pop from an empty matrix stack.");
  }

  mvMatrix = mvMatrixStack.pop();
  return mvMatrix;
}

//////////////////////////////////////
// Geometry helper functions
//////////////////////////////////////

function toDegrees(rad) {
	return (rad * 180 / Math.PI); 
}

function toRadians(deg) {
	return (deg * Math.PI / 180); 
}