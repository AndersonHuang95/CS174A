# CS174A Assignment 2

> Solar system animation with sun, 4 planets, and 1 moon 

## Description 

The latest version is v1.4.
WebGL boilerplate was adapted using code from Mozilla's WebGL tutorial. 
The shaders were adapted from the WebGL fundamentals tutorial. 

The canvas is set to 1440 x 990, and the camera is intially 
30 units away from the scene. 

The matrix library used to perform mathematical calculations is gl-matrix. 
For documentation, visit http://glmatrix.net/docs/

Code for this project is broken into four main files

- `index.html`:				- Sets up the canvas, location of vertex and fragment shaders
- `solarsystem.js`: 		- Renders the scene upon loading of webpage, handles 
							keyboard events, defines prototypes for sphere object 
- `gl-matrix.js`: 			- Matrix library 
- `webgl-utils.js`:			- WebGL utility functions provided by Google 

All basic requirements of the assignment were implemented.

1. See solarsystem.js for comments 

2. Canvas is 1440 x 900, Z-buffer is enabled, and shaders are implemented.

3. Spheres are formed using subdivision, similar to the code in the textbook. I implemented a sphere prototype with several functions.
The constructor takes in the number of vertices to create and a shading type. As the spheres are formed using subdivision, the vertices
are rounded to the closest number that abides by the subdivision rule. The two other important methods are draw() and setLightingProperties(), 
which display the sphere and set material properties for the sphere, respectively. 

4. Normals are generated for each sphere depending on what is passed.
to the second parameter of the sphere constructor. Use 'FLAT', 'GOURAUD', or 'PHONG'. 
FLAT generates normals per-primitive. GOURAUD and PHONG generate normals per-vertex. 

5. The system consists of a sun, four planets, and a moon orbiting the third planet. 

6. The point light source sits at (5.0, 0.0, 0.0), where the sun is. The sun 
is a reddish color. The camera is translated 30 units back and 5 units up to start viewing. 

7. First planet has faceted, ice-gray color with flat shading. It is orbiting the sun 
with a radius of 7 units with a 5-second period. Its diameter is 2 units. 

8. Second planet has swampy, watery blue-green color with Gouraud shading. It is orbiting the sun 
with a radius of 12 units with a 8-second period. Its diameter is 1.5 units.

9. Third planet has calm smooth light blue color with Phong shading. It is orbiting the sun 
with a radius of 16 units with a 10-second period. Its diameter is 1 unit.

10. Fourth planet has muddy brownish-orange color with Phong shading. It is orbiting the sun 
with a radius of 22 units with a 15-second period. Its diameter is 1.75 units. 

11. Moon has a whitish color with Gouraud shading. It is orbiting the third planet 
with a radius of 2 units with a 4-second period. Its diamter is 0.5 units. 

12. Vertex shading takes care of the flat and Gouraud shading. The way to distinguish is
the different normals generated in the sphere prototype. Flat shading calculates normal
on a per-primitive basis. Gouraud shading calculates based on a per-vertex basis. Finally,
the fragment shader takes care of the Phong shading, which is performed on a per-fragment 
basis. Inversion calculations are done in the application as there are sophisticated 
matrix libraries to perform these calculations. The vertex shader performs the matrix calculations
because they stay uniform, and the GPU can parallelize these calculations. Finally, Phong
shading must be done in the fragment shader because the vertex shader has no concept of fragment. 

13. Keyboard navigation is implemented using 'keydown' event listener. 
See usage for description of controls. 

14. Camera detachment detaches to the third planet. 


## Usage

Clone or download the repository and change into the directory.  
Start by firing up a local webserver in the directory.  
If using Python 2.7.x, replace http.server with SimpleHTTPServer  

```sh
$ python3 -m http.server 

```

Open up localhost:8000 in a browser of choice. 

##### Camera options description:

- `ArrowUp`      	- Move up by N degrees
- `ArrowDown`      	- Move down by N degrees 
- `ArrowLeft`      	- Rotate left by N degrees
- `ArrowRight`      - Rotate right by N degrees 
- `Space`			- Move forward N units with respect to pitch and heading 
- `r`      			- Reload default view 
- `[1-9]` 			- Set the value of N for rotation and translationcommands 
- `a`				- Attach the camera to the third planet 
- `d`				- Detach the camera 

## Requirements
- WebGL-supported broser 

## Contribution
Pull requests are welcome, along with any feedback or ideas.


