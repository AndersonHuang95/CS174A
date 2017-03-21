# CS174A Assignment 3

> Two rotating cubes demonstrating texture mapping 

## Description 

The latest version is v1.0.
WebGL boilerplate was adapted using code from Mozilla's WebGL tutorial. 
The shaders were adapted from the WebGL fundamentals tutorial. 

The canvas is set to 1440 x 990, and the camera is intially 
10 units away from the scene. 

The matrix library used to perform mathematical calculations is gl-matrix. 
For documentation, visit http://glmatrix.net/docs/

Code for this project is broken into four main files

- `index.html`:				- Sets up the canvas, location of vertex and fragment shaders
- `textures.js`: 			- Renders the scene upon loading of webpage, handles 
							keyboard events, defines prototypes for cube object and defines
							methods for texture mapping
- `gl-matrix.js`: 			- Matrix library 
- `webgl-utils.js`:			- WebGL utility functions provided by Google 

All basic requirements of the assignment were implemented.

1. See textures.js for extensive comments. 

2. Two square images are included in the project directory. 

3. A cube with dimensions 2x2x2 implements nearest-neighbor filtering

4. A cube with dimensions 2x2x2, where each face is textured mapped with 
the the second image but zoomed out by 50%. Tri-linear filter implemented.

5. Cube 1 is at (-4, 0, 0). Cube 2 is at (4, 0, 0). Perspective 
projection is used and the horizontal FOV is 50 degrees. 'i' and 'o'
move the camera along the z-axis by 1 unit, forward and backward. 

6. 'r' starts rotation for both cubes. Cube 1 rotates at 20rpm around 
the y-axis. Cube 2 rotates around X-axis at 30rpm. 

All extra credit items were attempted. 

1. 't' starts and stops rotation of the texture map itself on all faces 
of cube #1 around center at rate of 15rpm. WRAP texture repeat mode is used. 

2. 's' starts and stops the continuous scrolling of texture map on cube.
The texture varying the s texture coordinate changes 1 unit per 
second. WRAP Texture repeat mode is used. 

## Usage

Clone or download the repository and change into the directory.  
Start by firing up a local webserver in the directory.  
If using Python 2.7.x, replace http.server with SimpleHTTPServer  

```sh
$ python3 -m http.server 

```

Open up localhost:8000 in a browser of choice. 

##### Camera options description:

- `r` - start/stop rotation for cubes 
- `i` - move the camera forward by 1 unit
- `o` - move the camera backward by 1 unit
- `t` - start/stop texture map rotation on cube 1
- `s` - start/stop texture map rotation on cube 2 

## Requirements
- WebGL-supported broser 

## Contribution
Pull requests are welcome, along with any feedback or ideas.


