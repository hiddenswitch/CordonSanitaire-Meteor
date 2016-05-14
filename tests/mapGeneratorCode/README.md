#Cordon Sanitaire#
##Map Generator Tool##

###Desciption###
The map generator tool is a tool to create unique, interesting maps to be used to play Cordon Sanitaire.

It generates random maps given settings of map size (number of tiles in rows * number of tiles in columns),
size of blocks, density of the map and whether or not there should be deadend alleys. It also has a tool to 
allow manual adjustment of the map by drawing directly on the map to add or remove roads. 

The generated maps can be saved to the computer. The map tile IDs can also be changed to match those used in 
the game before saving, such that they can be imported and used in the game. Maps generated before can also be
loaded from the computer into the tool for editing, however, they need to have the default IDs. 

*Note: Currently the tool is tested to work in Google Chrome. The behavior in other browsers is not verified.*

###Instructions for using the Map Generator###

*Note: Maps can only be edited and viewed if they have the dafault tile IDs.* 

####Start####
1. Open the mapTweekerTester.html file in Google Chrome  
	a. Upon loading, it is start out by showing a new random map

####Generating and editing new maps####
Generating new maps is really simple, and can be used without setting up a local server

1. To change the size of the map, the size of blocks, the density and whether or not deadends are present:  
	a. Go to the tab to the right  
	b. Under "tweek", update the parameters as desired   
	c. Click "update" to create a map with the new parameters  

2. To manually edit the map:  
	a. Above the map, click "Edit"  
	b. Click "Add Roads" to add roads. Click and drag directly onto the map to draw.  
	c. Click "Remove Roads" to remove roads. Click and drag directly onto the map to remove roads.  
	d. Clicking "Reset" will take the map back to the state it was before the current session of edits.  
	e. Clicking "Done" will end the current session. (In the next edit session, clicking "Reset" will get
	the map back to this state.)  

3. To start at a black slate to create your own map:  
	a. Go to the tab to the right  
	b. Under "tweek", click "cleanSlate"  
		This will give you a map with no roads, the same size as specified above  

#####Changing Scale#####
To make the map appear smaller or bigger:

1. Go to the tab to the right

2. Under "resizeDisplay", choose cellSize

3. Click "resizeCurrent" to have the current map resized

#####Changing Default Values#####
To change the values that the tool starts with, in `mapTweekerTester.html` (using an editor) change the following parameters:
```
// Default values

// For generating the map
var numTilesCol = 40;
var numTilesRow = 50;
var blockWidth = 8;
var blockHeight = 8;

...

// the zoom factor for display
var cellSize = 9;
```

####Saving Maps####
Saving maps also does not require a local server.

*Note: Maps can only be edited and viewed if they have the dafault tile IDs. If you want to save a map to edit 
it again later, save with the default IDs. Save it user defined IDs only when you are done with the map.*

1. To save with default IDs:  
	a. Go to the tab to the right  
	b. Under "save", click "default_Mapping"  

2. To save with user defined IDs:  
	a. Go to the tab to the right  
	b. Under "defineTileMapping", change the numbers to numbers usable in Cordon Sanitaire  
	b. Under "save", click "userDefined_Mapping"  

####Loading Maps####
Saving maps also DOES require a local server. This can be set up by running "server_code.py", which sets up a 
local server at `localhost:8000`. Then the tool can be run at `localhost:8000/mapTweekerTester.html`.

*Note: Maps can only be edited and viewed if they have the dafault tile IDs. You can only work with a loaded map
if it still has its default mapping.*

1. To load a saved map:  
	a. Go to the tab to the right  
	b. Under "load", write the directory of the map relative to the folder containing the tool (`/mapGeneratorCode`)  
	c. Click "load"  

###Inserting New Maps into CS###

To get a new map into the game:

1. Under `Server>maps.js` insert the name of the map (using an editor)
```
// These are the map IDs to use for new games
    var mapInfos = _.map([
        'London.csv',
        'Tokyo.csv',
        'Simple_Single_01.csv',
        'Simple_Single_02.csv',
        'Simple_40.csv',
        'Simple_60_80.csv',
        'Simple_46_60.csv',
        'Simple_56_60.csv'
    ]
```

2. Under `Settings>singleplayer.json` (or which ever setting you want to play under), insert the name of the map
corresponding to "map" (using an editor)
```
{
  "public": {
    "maxPlayers": 1,
    "durationSeconds": 60,
    "countdownSeconds": 5,
    "demolishTimeSeconds": 3,
    "buildTimeSeconds": 6,
    "stunTimeSeconds": 60,
    "map":"Simple_56_60.csv",
    "uniqueness":true,
    "zoom": "SHOW_FULL_MAP"
  }
}
```
