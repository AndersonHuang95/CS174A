/* 
 * Code adapted from Mozilla Firefox WebGL tutorial 
 * Matrix math is done using the gl-matrix library 
 * See http://glmatrix.net/docs/ for documentation 
 *
 * Note: Web browser may cache results 
 * CTRL-F5 to clear the cache 
 */ 

var canvas;
var gl;

// Cube variables 
var cubeVerticesBuffer;
var cubeVerticesTextureCoordBuffer;
var cubeVerticesIndexBuffer;
var cubeVerticesIndexBuffer;

var isCubeRotating = false; 
var cubeRotation = 0.0;
var lastCubeRotation = 0.0; 
var lastCubeUpdateTime = 0;

// Texture mapping variables 
var cubeImage;
var cubeImage2; 
var cubeTexture; 
var cubeTexture2; 

var lastTextureRotation = 0.0; 
var textureRotation = 0.0;
var isTextureRotating = false;

var lastScrollUnit = 0.0; 
var scrollUnit = 0.0;  
var isTextureScrolling = false; 

// Shader program attributes 
var shaderProgram;
var vertexPositionAttribute;
var textureCoordAttribute;
var fovy = 50; 

// Matrices  
var perspectiveMatrix = mat4.create();
var viewMatrix = mat4.create(); 
var cameraMatrix = mat4.create(); 
var mvMatrix = mat4.create();
var mvMatrixStack = [];
var cameraMatrixStack = []; 

// Ensure focus on keyboard input 
document.onmousedown = function() { window.focus(); };

document.addEventListener('keydown', function(event) {
    var CANVAS_HEIGHT = document.getElementById("glcanvas").offsetHeight; 
    var CANVAS_WIDTH = document.getElementById("glcanvas").offsetWidth; 
    var position = mat4.create();

    switch(event.key) {
        // Toggle rotation 
        case "r": 
            // Rember the last rotation when toggling
            if (isCubeRotating) 
                lastCubeRotation = cubeRotation; 
            else 
                cubeRotation = lastCubeRotation; 

            isCubeRotating = !isCubeRotating; 
            break;

        // Move camera forward (-z direction)
        case "i": 
            mat4.translate(cameraMatrix, cameraMatrix, vec3.fromValues(0, 0, -1.0)); 
            break;
        // Move camera backward 
        case "o":
            mat4.translate(cameraMatrix, cameraMatrix, vec3.fromValues(0, 0, 1.0)); 
            break; 

        // Rotate texture on cube 1 
        case "t":
            if (isTextureRotating)
                lastTextureRotation = textureRotation;
            else 
                textureRotation = lastTextureRotation; 

            isTextureRotating = !isTextureRotating; 
            break;

        // Scroll texture on cube 2
        case "s": 
            if (isTextureScrolling)
                lastScrollUnit = scrollUnit; 
            else 
                scrollUnit = lastScrollUnit; 

            isTextureScrolling = !isTextureScrolling; 
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

    // Initialize the textures we'll be using 

    initTextures(); 

    // Render the scene 

    render(); 
}

/* 
 * Cube constructor 
 * @param zoom_factor - determines whether to shrink or expand cube texture 
 * default keeps texture map at 100% 
 */ 
function Cube(zoom_factor = 1) {

    // Create a buffer for the cube's vertices.

    cubeVerticesBuffer = gl.createBuffer();

    // Select the cubeVerticesBuffer as the one to apply vertex
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);

    // Now create an array of vertices for the cube.

    var vertices = [
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,

        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,

        // Right face
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0
    ];

    // Now pass the list of vertices into WebGL to build the shape. We
    // do this by creating a Float32Array from the JavaScript array,
    // then use it to fill the current vertex buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Map the texture onto the cube's faces.

    cubeVerticesTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesTextureCoordBuffer);

    this.textureCoordinates = [
        // Front
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Back - modified 
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        0.0,  0.0,
        // Top
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Bottom
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        // Right - modified
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0,
        0.0,  0.0,
        // Left
        0.0,  0.0,
        1.0,  0.0,
        1.0,  1.0,
        0.0,  1.0
    ];

    var scale = 1 / zoom_factor; 
    for (var i = 0; i < this.textureCoordinates.length; i++) {
        this.textureCoordinates[i] *= scale; 
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureCoordinates), gl.STATIC_DRAW);

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
    ]

    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}

/* 
 * draw
 * @param texture - variable with bound texture to map onto cube faces 
 */ 
Cube.prototype.draw = function(texture) {
    // Draw the cube by binding the array buffer to the cube's vertices
    // array, setting attributes, and pushing it to GL.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesTextureCoordBuffer);
    gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

    // Draw the cube.

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

/* 
 * rotateTexture 
 * @param degrees - variable to rotate texture by 
 */ 
Cube.prototype.rotateTexture = function(radians) {
    // Keep in mind that textureCoordinates in this setting
    // are formatted as (s, t) pairs 
    // For the cube there are 24 pairs in a single array 

    for (var i = 0; i < this.textureCoordinates.length; i += 2) {
        var s = this.textureCoordinates[i]
        var t = this.textureCoordinates[i+1]; 

        // Normalize around origin 
        s -= 0.5;
        t -= 0.5; 

        // 2D rotation 
        var s_new = s * Math.cos(radians) + t * Math.sin(radians); 
        var t_new = -s * Math.sin(radians) + t * Math.cos(radians); 

        // Change back into [0.0, 1.0] texel domain
        s_new += 0.5;
        t_new += 0.5; 

        this.textureCoordinates[i] = s_new; 
        this.textureCoordinates[i+1] = t_new; 
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureCoordinates), gl.STATIC_DRAW);
}

/* 
 * scrollTexture 
 * @param units - variable to increase s coordinate by 
 */ 
Cube.prototype.scrollTexture = function(units) {
    // Keep in mind that textureCoordinates in this setting
    // are formatted as (s, t) pairs 
    // For the cube there are 24 pairs in a single array 
    for (var i = 0; i < this.textureCoordinates.length; i += 2) {
        this.textureCoordinates[i] = this.textureCoordinates[i] + units; 
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureCoordinates), gl.STATIC_DRAW);
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//
function initTextures() {
    cubeTexture = gl.createTexture();
    cubeImage = new Image();
    cubeImage.onload = function() { handleTextureLoaded(cubeImage, cubeTexture, 1); }
    cubeImage.src = "./images/naruto.jpg";

    cubeTexture2 = gl.createTexture(); 
    cubeImage2 = new Image(); 
    cubeImage2.onload = function() { handleTextureLoaded(cubeImage2, cubeTexture2, 2); }
    cubeImage2.src = "./images/sasuke.png";
}

function handleTextureLoaded(image, texture, filter_type) {
    console.log("handleTextureLoaded, image = " + image);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Need to flip coordinates since texture coords start from bottom left 
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // for first image, do nearest neighbor filtering 
    if (filter_type == 1) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); 
    }
    // for second image, do mip mapping with tri-linear filtering 
    if (filter_type == 2) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); 
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
}

//
// drawScene
//
// Draw the scene.
//
function render() {
    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    mat4.perspective(perspectiveMatrix, toRadians(fovy), 1440.0/900.0, 0.1, 100.0);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.

    mat4.identity(mvMatrix);  
    mat4.identity(viewMatrix); 

    // Camera transform for inverting later 
    var camera_transform = mat4.create(); 

    // Now move the drawing position a bit to where we want to start
    // drawing the cube.

    mat4.fromTranslation(camera_transform, vec3.fromValues(0.0, 0.0, 10.0));

    // View matrix is the "opposite" of camera transform 
    mat4.mul(camera_transform, camera_transform, cameraMatrix); 
    mat4.invert(viewMatrix, camera_transform); 

    // if rotating is toggled, let cubeRotation change over time 
    // otherwise set it to lastCubeRotation so it is static 

    if (!isCubeRotating)
        cubeRotation = lastCubeRotation; 

    // Create shapes 
    var first_cube = new Cube(); 

    // Draw the first cube at (-4.0, 0.0, 0.0)

    // Save the current matrix, then rotate before we draw.

    mvPushMatrix();
    mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(-4.0, 0.0, 0.0)); 
    mat4.rotate(mvMatrix, mvMatrix, 2 * cubeRotation, vec3.fromValues(0.0, 1.0, 0.0));

    // Check if texture rotation is toggled 
    // if it is, rotate texture at 15 rpm 

    if (!isTextureRotating) 
        textureRotation = lastTextureRotation; 

    // Rotate texture; if not enabled then nothing happens 

    first_cube.rotateTexture(textureRotation);

    first_cube.draw(cubeTexture); 

    // Restore the original matrix
    mvPopMatrix();

    // Draw the second cube at (4.0, 0.0, 0.0) with texture zoomed out by 50% (image shrinks) 

    var second_cube = new Cube(0.5); 
    mvPushMatrix(); 
    mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(4.0, 0.0, 0.0)); 
    mat4.rotate(mvMatrix, mvMatrix, 3 * cubeRotation, vec3.fromValues(1.0, 0.0, 0.0));

    // Check if scrolling is enabled for the second cube 
    // If it is, scroll s coordinate 1 unit per second 
    // Otherwise, do nothing

    if (!isTextureScrolling)
        scrollUnit = lastScrollUnit;

    second_cube.scrollTexture(scrollUnit); 

    second_cube.draw(cubeTexture2); 

    // Restore the original matrix

    mvPopMatrix();

    // Update the rotation for the next draw, if it's time to do so.
    // requestAnimFrame is called 60x per second 
    // This updates degrees by 10 rpm by default. Adjust accordingly by multiplying 
    // cubeRotation by a constant when calling mat4.rotate on an axis 
    // For scrolling, since this is called 60 fps, each time update increments by 1/60 units.
    var currentTime = (new Date).getTime();
    if (lastCubeUpdateTime) {
        var delta = currentTime - lastCubeUpdateTime;

        cubeRotation += delta / 1000.0;
        textureRotation += (1.5 * delta) / 1000.0; 
        scrollUnit += delta / 1000.0;
    }

    lastCubeUpdateTime = currentTime;

    requestAnimFrame(render);
}

/////////////////////////////////////
// Matrix Utility Functions
/////////////////////////////////////

function setMatrixUniforms() {
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix));

    var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix));

    var vUniform = gl.getUniformLocation(shaderProgram, "uVMatrix"); 
    gl.uniformMatrix4fv(vUniform, false, new Float32Array(viewMatrix)); 
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

