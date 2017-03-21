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

var cubeVerticesBuffer;
var cubeVerticesColorBuffer;
var cubeVerticesIndexBuffer;
var cubeOutlineIndexBuffer;
var cubeOutlineColorBuffer;
var cubeByStripsIndexBuffer;
var cubeRotation = 0.0;
var lastCubeUpdateTime = 0;
var colors = [
		[0.25, 0.25, 0.25, 1.0], 
		[0.25, 0.25, 0.75, 1.0],
		[0.25, 0.75, 0.25, 1.0], 
		[0.25, 0.75, 0.75, 1.0], 
		[0.75, 0.25, 0.25, 1.0], 
		[0.75, 0.25, 0.75, 1.0], 
		[0.75, 0.75, 0.25, 1.0],
		[0.75, 0.75, 0.75, 1.0]
];

var POS_ADJUSTMENT = 0.25; 
var DEGREE_ADJUSTMENT = 4; 
var FOVY_DEGREES = 90; 

var fovy = FOVY_DEGREES; 
var toggle = false; 
var perspectiveMatrix = mat4.create();
var viewMatrix = mat4.create(); 
var mvMatrix = mat4.create();

var shaderProgram;
var vertexPositionAttribute;
var vertexColorAttribute;

////////////////////////////////////////////////////////////////////////////////////////////////
// Add an event handler to deal with user input 
// ArrowUp/ArrowDown - Move camera up or down by 0.25 units 
// ArrowLeft/ArrowRight - Move azimuthal angle by 4 degrees 
// i/j/k/m - forward/left/right/backward by 0.25 units, respectively relative to current heading
// r - reset to default view 
// n/w - adjust horizontal FOV narrower/wider 
// + - toggle an orthographic crosshair in center of scene
////////////////////////////////////////////////////////////////////////////////////////////////

// Ensure focus on keyboard input 
document.onmousedown = function() { window.focus(); };

document.addEventListener('keydown', function(event) {
	var CANVAS_HEIGHT = document.getElementById("glcanvas").offsetHeight; 
	var CANVAS_WIDTH = document.getElementById("glcanvas").offsetWidth; 
	var position = mat4.create();

	switch(event.key) {
		case "ArrowUp": 
			mat4.fromTranslation(position, vec3.fromValues(0, -POS_ADJUSTMENT, 0));
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;

		case "ArrowDown":
			mat4.fromTranslation(position, vec3.fromValues(0, POS_ADJUSTMENT, 0));
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;

		case "ArrowLeft":
			// mat4.rotateY(viewMatrix, viewMatrix, toRadians(-DEGREE_ADJUSTMENT));

			// Use quaternions instead of rotation matrix 
			
			var q = quat.create();
			quat.setAxisAngle(q, vec3.fromValues(0, 1, 0), toRadians(-DEGREE_ADJUSTMENT));
			quat.normalize(q, q); 
			mat4.fromQuat(position, q); 
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;
		case "ArrowRight":
			// mat4.rotateY(viewMatrix, viewMatrix, toRadians(DEGREE_ADJUSTMENT));
			var q = quat.create();
			quat.setAxisAngle(q, vec3.fromValues(0, 1, 0), toRadians(DEGREE_ADJUSTMENT));
			quat.normalize(q, q); 
			mat4.fromQuat(position, q); 
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;

		case "c": 
			var swapped = colors.shift(); 
			colors.push(swapped); 
			break;
		case "i":
			mat4.fromTranslation(position, vec3.fromValues(0, 0, POS_ADJUSTMENT));
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;
		case "j":
			mat4.fromTranslation(position, vec3.fromValues(POS_ADJUSTMENT, 0, 0));
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;
		case "k": 
			mat4.fromTranslation(position, vec3.fromValues(-POS_ADJUSTMENT, 0, 0));
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;
		case "m": 
			mat4.fromTranslation(position, vec3.fromValues(0, 0, -POS_ADJUSTMENT));
			mat4.mul(viewMatrix, viewMatrix, position); 
			break;

		// Reset perspective and view matrices 
		case "r": 
			viewMatrix = mat4.identity(viewMatrix); 
			toggle = false;
			fovy = 90;
			break; 

		// Altering the horizontal FOV is more math-intensive
		case "n":
			var fovx = 2 * Math.atan(CANVAS_WIDTH / CANVAS_HEIGHT * Math.tan( toRadians(fovy) / 2) ); 
			// console.log(toDegrees(fovx)); 
			
			// Decrease one degree 
			fovx -= toRadians(1); 

			// Recalculate fovy 
			fovy = 2 * toDegrees( Math.atan(CANVAS_HEIGHT / CANVAS_WIDTH * Math.tan(fovx / 2)) ); 
			break; 
		case "w":
			var fovx = 2 * Math.atan(CANVAS_WIDTH / CANVAS_HEIGHT * Math.tan( toRadians(fovy) / 2) ); 
			// console.log(toDegrees(fovx));  
			
			// Decrease one degree 
			fovx += toRadians(1); 

			// Recalculate fovy 
			fovy = 2 * toDegrees( Math.atan(CANVAS_HEIGHT / CANVAS_WIDTH * Math.tan(fovx / 2)) ); 
			break; 

		case "+":
			toggle = !toggle; 
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

/*
 * Crosshair prototype 
 */ 

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

	// Set a crosshair at center of scene, if that option is toggled 
	if (toggle) {
		mat4.ortho(perspectiveMatrix, -20.0, 20.0, -20.0, 20.0, -20.0, 20.0); 
		var ch = new crosshair(); 
		ch.draw(); 
	}
	// Multiply the model matrix by the view matrix (inverse of camera matrix) 

	mat4.mul(mvMatrix, mvMatrix, viewMatrix); 

	// Now move the drawing position a bit to where we want to start
	// drawing the cube.

	mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(0.0, 0.0, -30.0)); 

	// Start drawing our scene 
	// If toggle is selected, draw a crosshair 
	
	mat4.perspective(perspectiveMatrix, toRadians(fovy), 1440.0/900.0, 0.1, 100.0);

	// Save the current matrix 
	mvPushMatrix(); 

	// Create a cube and reuse it
	var cube = new WebGLCube();

	// Each cube gets a unique color 

	// TODO: 
	// Create 8 cubes centered at (+/- 10, +/- 10, +/- 10)
	// Not sure if I did this part correctly 
	// Scale and rotate across time, then translate (read in reverse order)
	var offset = 10; 
	var c = 0; 
	for(var i = -offset; i <= offset; i += 2 * offset) {
		for (var j = -offset; j <= offset; j += 2 * offset) {
			for (var k = -offset; k <= offset; k += 2 * offset) { 
				mvPushMatrix();
				mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(i, j, k));
				mat4.rotate(mvMatrix, mvMatrix, cubeRotation, vec3.fromValues(1.0, 0.0, 1.0));
				mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(1.0 + 0.2 * Math.sin(lastCubeUpdateTime / (Math.PI * 1000)) ,
																			1.0 + 0.2 * Math.sin(lastCubeUpdateTime / (Math.PI * 1000)),
																			1.0 + 0.2 * Math.sin(lastCubeUpdateTime / (Math.PI * 1000)))); 
				cube.draw(colors[c++]); 
				cube.drawOutline(); 
				mvPopMatrix();
			}
		}
	}
	mvPopMatrix(); 
	// Animation 
	// Done by successively calling time and subtracting from last known time 
	// Cube rotates at 20rpm 
	// Logic: render is called 60x per second (see webgl-utils.js) 
	// 20rpm comes out to (1/3) rotations per second, or 120 degrees per second
	// Divide needed revolutions by rendering rate and get 
	// 2 degrees per call 
	var currentTime = (new Date).getTime();
	if (lastCubeUpdateTime) {
		var delta = currentTime - lastCubeUpdateTime;

		cubeRotation += (2 * delta) / 1000.0;
	}
	lastCubeUpdateTime = currentTime;

	requestAnimFrame(render);
}

//
// Matrix utility functions
//

function setMatrixUniforms() {
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix));

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix));
}

var mvMatrixStack = [];

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

//
// Geometry helper functions
// 

function toDegrees(rad) {
	return (rad * 180 / Math.PI); 
}

function toRadians(deg) {
	return (deg * Math.PI / 180); 
}