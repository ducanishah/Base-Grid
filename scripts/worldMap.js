//needed for hooking onto the world table when world table is updated
import { clickHandler, doubleClickHandler } from "./helperScripts/inputsHandlers.js"
import {selectedCell, myWorldMap, selectedActor} from "./index.js"
import { ActorHolder } from "./actors.js";
import { MoveQueue } from "./moves.js";
import { RoundLog } from "./helperScripts/logging.js"

/**
 * The largest object, holding the map, ActorHolder, MoveQueue, and RoundLog
 * @see initializeWorldMapMap The function to create the map
 * @see RoundLog the class used for logging everything
 * @see MoveQueue the class used for holding and executing moves from actors
 * @see ActorHolder the holder of all actors on the world
 * @see Actor for understanding WHY any of this stuff is here
 * @see updateWorldTable You want to display the map? Use this.
 * 
 * @constructor
 * @param {number} length The length of a side of the map
 * 
 * @property {number} nextId The next id, to be given to the next actor created.
 * @property {Array[Array[WorldLocation]]} map The actual map component.
 * Base zero, counts from top left.
 * @property {ActorHolder} actorHolder the ActorHolder of the WorldMap
 * @property {MoveQueue} moveQueue the moveQueue of the worldMap
 * @property {RoundLog} roundLog the RoundLog used to manage all logging behavior
 * 
 * 
 * NOTE: runRound is the function you should be using
 * @method autoQueueMoves loops over all actors in the actorHolders and calls their autoQueue function.
 * @method executeMoveQueue loops over all moves in the queue and executes them
 * NOTE: There is no priority system in place, all execution is assumed simultaneous despite being ordered, be very careful about moves that would invalidate other moves.
 * @method runRound The function you SHOULD be using. Starts the new round, autoQueues, executes, cleans up destroyed actors, logs the round.
 * @method logToRound(Obj) pushes the given object to the end of the current round's log
 * @method getNextId Increments id then returns that value (used in Actor instantiation so each has a unique _id)
 */
export class WorldMap{
    /**
     * @param {number} length The length of one side of the map
     * NOTE: Coords are zero-based and count from top left
     */
    constructor(length){
        this.nextId=-1;
        this.map=initializeWorldMapMap(this,length);
        this.actorHolder=new ActorHolder();
        this.moveQueue=new MoveQueue(this);
        this.roundLog=new RoundLog();
    }
    /**
     * @method autoQueueMoves Empties the moveQueue just in case
     * calls autoQueueMoves on actorHolder
     */
    autoQueueMoves(){
        //just passes on the commands lol
        this.moveQueue.emptyQueue()
        this.actorHolder.autoQueueMoves();
    }
    /**
     * @method executeMoveQueue calls execute on the moveQueue
     */
    executeMoveQueue(){
        //same as above lol
        this.moveQueue.execute();
    }
    /**
     * @method runRound calls roundLog for a new round, queues moves, executes moves, cleans up actors slated for destruction, logs the round
     */
    runRound(){
        this.roundLog.newRound();
        this.autoQueueMoves();
        this.executeMoveQueue()
        this.actorHolder.destroyActors();
        this.logToRound("Round ended")
        console.log(this.roundLog.currentRound);
    }
    /**
     * @method logToRound Logs a given object to the end of the present round's roundLog
     * @param {Object} obj The object to be added, often a string.
     */
    logToRound(obj){
        this.roundLog.logToCurrentRound(obj);
    }
    /**
     * @method getNextId Increments id, then returns the next id. Used for giving each actor a unique id
     */
    getNextId(){
        this.nextId=this.nextId+1;
        return this.nextId;
    }
}

/**
 * The object for every location on a worldMap
 * @see WorldMap
 * @see Actor
 * 
 * @constructor
 * This should only be initialized on creation of a Worldmap!!!
 * @param {WorldMap} worldMap The WorldMap the location belongs to
 * @param {number} setX The x coord of the location
 * @param {number} setY The y coord of the location
 * Note: The coordinates are base-zero and count from the top left
 * 
 * @property {Actor[]} presentActors The array of all actors present on the tile
 * @property {WorldMap} mapParent The WorldMap that this is on
 * @property {number} x The x coordinate of the location
 * @property {number} y The y coordinate of the location
 * Note: The coordinates are base-zero and count from the top left
 * @property {WorldLocation} cameFrom The tile that was last pathed from; used specifically for pathfinding. 
 * Here only to help you remember it; I recommend you don't touch it.
 * @property {Actor} currentDisplayedActor The actor presently displayed on top of the tile; used for rendering.
 */
export class WorldLocation {
    /**
     * @param {WorldMap} worldMap The WorldMap the location belongs to
     * @param {number} setX The x coord of the location
     * @param {number} setY The y coord of the location
     * Note: The coordinates are base-zero and count from the top left
     */
    constructor(worldMap,setX, setY) {
        this.presentActors = [];
        this.mapParent=worldMap;
        this.x = setX;
        this.y = setY;
        this.cameFrom;
        this.currentDisplayedActor;
    }
    
}

/**
 * @function initializeWorldMapMap The function for initializing the .map property of a worldmap:
 * An array of arrays containing WorldLocations
 * @returns {Array[Array[WorldLocation]]} Returns an array of arrays of WorldLocations, for a map for a WorldMap
 * 
 * @see WorldMap
 * @see WorldLocation
 * 
 * @param {WorldMap} parentWorldMap The WorldMap that the WorldLocations should list as parent
 * @param {number} length The length (assumed square) of a side of the map to be generated
 * NOTE: Coordinates are base-zero and count from the top left
 */
export function initializeWorldMapMap(parentWorldMap,length) {
    let worldMap=[]
    for (let i = 0; i < length; i++) {
        worldMap[i] = new Array(length);
        for (let ind = 0; ind < worldMap[i].length; ind++) {
            worldMap[i][ind] = new WorldLocation(parentWorldMap,i, ind);
        }
    }
    return worldMap;
}

/**
 * @function updateWorldTable The function that updates the displayed table and redisplays the selected cell's contents.
 * Slight misnomer, also updates cell displays
 * @see createWorldTable The function that takes the WorldMap 
 * @see displayCellContents The function that redisplays the cell contents
 * @see selectedCell the x and y coords of the selected cell
 * 
 * @param {WorldMap} worldMap The WorldMap to be displayed.
 * 
 * What it does: clears the first child of the tableWrapper div (Should just be the table)
 * Adds the table from the function createWorldTable
 * Adds event listeners for single and double click
 * Redisplays the cell contents if a selected cell exists 
 */
export function updateWorldTable(worldMap) {
    if (document.getElementById("tableWrapper").children[0]) {
        document.getElementById("tableWrapper").children[0].remove();
    }

    document.getElementById("tableWrapper").append(createWorldTable(worldMap));
    //for displaying cell contents
    document.getElementById("tableWrapper").children[0].addEventListener("click", clickHandler);
    //for selecting actor by doubleclick
    document.getElementById("tableWrapper").children[0].addEventListener("dblclick", doubleClickHandler)
    if(selectedCell.length){
        displayCellContents(myWorldMap,...selectedCell);
    }
}

/**
 * @function createWorldTable The function that creates the html table from the worldMap 
 * Generates the table to be displayed from the map component of the WorldMap
 * @returns {table} returns the html table generated
 * 
 * NOTE: Should only ever be called from here.
 * @see updateWorldTable 
 * 
 * @param {WorldMap} worldMap The worldMap to create the table based on 
 * 
 * @property {td} newtd The td element being created and modified.
 */
export function createWorldTable(worldMap) {
    let myTable = document.createElement("table");
    let myRows = new Array(worldMap.map.length);
    for (let i = 0; i < myRows.length; i++) {
        myRows[i] = document.createElement("tr");
    }
    //create the tds
    worldMap.map.forEach((subArray, subArrayIndex) => {
        subArray.forEach((item, itemIndex) => {
            let newtd = document.createElement("td");
            //CODE CREATING THE TD

            if (item.presentActors.length) {
                let topActor;
                for (let i = 0; i < item.presentActors.length; i++) {
                    
                    if(item.presentActors[i]===selectedActor[0]){
                        newtd.classList.add("containsSelectedActor")
                    }

                    if (!topActor || item.presentActors[i].displayPriority > topActor.displayPriority) {
                        topActor = item.presentActors[i];
                    }
                }
                item.currentDisplayedActor=topActor;
                //display symbol of whichever actor has highest displayPriority
                newtd.innerHTML = topActor.mapSymbol;
                
            } else {
                item.currentDisplayedActor=undefined;
            }
            
            //TD IS CREATED PUT IT IN
            myRows[itemIndex].append(newtd);
        });
    });
    myTable.append(...myRows);
    return myTable;
}

//Defunct generateRandomCoordinates
//accepts an array input with minx, maxx, miny, maxy
//returns in form [x,y]
// export function generateRandomCoordinates(arr) {
//     let x;
//     let y;
//     //if there is an array, generate coords within the bounds
//     if (arr) {
//         if (arr[0] < 0 || arr[2] < 0 || arr[1] > worldMap.map.length - 1 || arr[3] > worldMap.map.length - 1) {
//             console.log("These bounds are out of this world!");
//         }
//         if (arr[0] > arr[1] || arr[2] > arr[3]) {
//             console.log("min needs to be smaller than max")
//         }
//         x = Math.floor(Math.random() * (arr[1] - arr[0])) + arr[0];
//         y = Math.floor(Math.random() * (arr[3] - arr[2])) + arr[2];
//     } 
//     //if there isn't an array, then generate within worldMap.map.length
//     else {
//         x = Math.floor(Math.random() * worldMap.map.length);
//         y = Math.floor(Math.random() * worldMap.map.length);
//     }
//     return [x, y];
// }

//call this to move an actor from its present spot (or non-spot) to another spot

/**
 * @function actorPlace Places an actor in a given x y coordinate
 * DOES NOT UPDATE THE WORLDTABLE
 * @returns {boolean} Returns true if actor is successfully placed, false otherwise
 * 
 * @see WorldLocation for understanding the location interaction
 * @see Actor for understanding the structure and interaction with the actor
 * 
 * @param {WorldMap} worldMap The worldMap to place the actor on
 * @param {Actor} actor The actor to place
 * @param {number} x x  coordinate to place out 
 * @param {number} y y coordinate to place at
 */
export function actorPlace(worldMap, actor, x, y) {
    //test out of bounds
    if (x < 0 || x > worldMap.map.length - 1 || y < 0 || y > worldMap.map.length - 1) {
        console.log(`Failed to place the following actor out of bounds at [${x},${y}]:`);
        console.log(actor)
        return false;
    }
    //if the actor is somewhere, remove the actor from the listed location
    if (actor.location) {
        actor.location.presentActors.splice(actor.location.presentActors.indexOf(actor), 1);
    }
    //add the actor to the listed location
    worldMap.map[x][y].presentActors.push(actor);
    //set the actors listed location properly
    actor.location = worldMap.map[x][y];
    actor.mapParent=worldMap;
    return true;
}

/**
 * @function displayCellContents displays the contents of a given cell
 * Takes class off of old cell (if any) and adds it to new cell
 * @see updateWorldTable another function involving displays and updating
 * @var {Array[number]} selectedCell The global var that holds the coords
 * ALSO CALLS THIS FUNCTION
 * @param {WorldMap} worldMap the WorldMap to look on for the map and cell 
 * @param {number} cellX the cellX coord
 * @param {number} cellY the cellY coord
 * REMEMBER: coordinates are base-zero and count from top left
 */
export function displayCellContents(worldMap, cellX, cellY) {
    //clear tint from last selected cell (if one exists)
    if (selectedCell.length) {
        let td = document.getElementById("tableWrapper").children[0].children[selectedCell[1]].children[selectedCell[0]];
        td.classList.remove("selectedCell");
    }
    selectedCell.length = 0;
    selectedCell.push(cellX, cellY);

    //adds class to selected cell for color
    let td=document.getElementById("tableWrapper").children[0].children[cellY].children[cellX]
    td.classList.add("selectedCell");
    
    //list for cell contents
    let contentList = document.getElementById("cellContents");
    let liList = [];
    //clear all child nodes
    while (contentList.firstChild) { contentList.removeChild(contentList.firstChild); }
    //make new nodes
    for (let i = 0; i < worldMap.map[cellX][cellY].presentActors.length; i++) {
        let li = document.createElement("p");
        li.innerText = worldMap.map[cellX][cellY].presentActors[i].displayString;
        if(worldMap.map[cellX][cellY].presentActors[i]===selectedActor[0]){
            li.classList.add("selected");
        }
        liList.push(li);
    }
    //add new nodes
    contentList.append(...liList);
    //change the x,y display
    document.getElementById("selectedCellCoordinates").innerHTML = `(${cellX},${cellY})`;
    
}

/**
 * @function testIsPassable tests if a WorldLocation is passable
 * @returns {boolean} true if no actor has isPassable set to false, false otherwise
 * @see WorldLocation For understanding what is being accessed (presentActors)
 * @see Actor Want to make something impassable? Give it isPassable=false
 * @param {WorldLocation} location The WorldLocation to test at
 */
export function testIsPassable(location){
    
    let targetLocationActors=location.presentActors;
    for (let i=0; i<targetLocationActors.length;i++){
        if (targetLocationActors[i].isPassable===false){
            return false;
        }
    }
    return true;
}

/**
 * @function getNeighborLocations Gets the neighboring locations of a location, used for pathfinding
 * NOTE: Cardinal only
 * @returns {Array[WorldLocation]} Array of neighboring WorldLocations
 * @see WorldLocation for understanding the locations
 * @param {WorldLocation} location The worldLocation to get the neighbors of
 */
export function getNeighborLocations(location) {
    let coordsToTest = [
        [location.x + 1, location.y],
        [location.x - 1, location.y],
        [location.x, location.y + 1],
        [location.x, location.y - 1]
    ]
    let neighbors = [];
    for (let i = 0; i < coordsToTest.length; i++) {
        if (location.mapParent.map[coordsToTest[i][0]] && location.mapParent.map[coordsToTest[i][0]][coordsToTest[i][1]]) {
            neighbors.push(location.mapParent.map[coordsToTest[i][0]][coordsToTest[i][1]]);
        }
    }
    return neighbors;
}
