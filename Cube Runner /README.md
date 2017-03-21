# Cube Runner

> CS174A, Winter 2017 

> Hansen Qiu, Connor Kenny, Anderson Huang 

## Description 

Cubefield is a popular childhood game where a player attempts to navigate 
as long as possible without crashing into a cube. Cube Runner is our 3-dimensional 
take on Cubefield. Our game has four levels, each with different terrains and power-ups. 

Hansen worked primarily on collision detection, picking, and the second level. 
Connor worked on the last level and on powerups. Anderson worked on the third level,
audio, and refactoring. 

Level changes are prompted when scores are the following values. 
- Level 1 - Space world 	: Score < 4000
- Level 2 - Ghost world 	: Score < 8000
- Level 3 - Forest world 	: Score < 12000
- Level 4 - Rainbow world 	: Score < 16000

## Usage

Clone or download the repository and change into the directory.  
Start by firing up a local webserver in the directory.  
If using Python 2.7.x, replace http.server with SimpleHTTPServer  

```sh
$ python3 -m http.server 

```

Open up localhost:8000 in a browser of choice. 

##### Controls: 

- `ArrowUp`      	- Move up 
- `ArrowDown`      	- Move down 
- `ArrowLeft`      	- Move left 
- `ArrowRight`      - Move right 

## Requirements
- WebGL-supported browser 

## Contribution
Pull requests are welcome, along with any feedback or ideas.


