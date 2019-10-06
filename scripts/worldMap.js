//needed for hooking onto the world table when world table is updated
import { clickHandler, doubleClickHandler } from "./helperScripts/inputsHandlers.js"
import {selectedCell, myWorldMap, selectedActor} from "./index.js"
import { ActorHolder } from "./actors.js";
import { MoveQueue } from "./moves.js";
import { RoundLog } from "./helperScripts/logging.js"

 
export class WorldMap{
    constructor(length){
        this.nextId=-1;
        this.map=initializeWorldMap(this,length);
        this.actorHolder=new ActorHolder();
        this.moveQueue=new MoveQueue(this);
        this.roundLog=new RoundLog();
    }
    autoQueueMoves(){
        //just passes on the commands lol
        this.moveQueue.emptyQueue()
        this.actorHolder.autoQueueMoves();
    }
    executeMoveQueue(){
        //same as above lol
        this.moveQueue.execute();
    }
    runRound(){
        this.roundLog.newRound();
        this.autoQueueMoves();
        this.executeMoveQueue()
        this.actorHolder.destroyActors();
        this.logToRound("Round ended")
        console.log(this.roundLog.currentRound);
    }
    logToRound(obj){
        this.roundLog.logToCurrentRound(obj);
    }
    getNextId(){
        this.nextId=this.nextId+1;
        return this.nextId;
    }
    RandomLocation(){
        let coords=generateRandomCoordinates(this);
        return this.map[coords[0]][coords[1]];
    }
}

//x,y
//has: presentActor,x,y,cameFrom,currentDisplayedActor
export class WorldLocation {
    constructor(worldMap,setX, setY) {
        
        this.presentActors = [];
        this.mapParent=worldMap;
        this.x = setX;
        this.y = setY;
        this.cameFrom;
        this.currentDisplayedActor;
        this.terrain;
    }
    
}

//initializes an empty worldMap with only the empty WorldLocations
export function initializeWorldMap(parentWorldMap,length) {
    let worldMap=[]
    for (let i = 0; i < length; i++) {
        worldMap[i] = new Array(length);
        for (let ind = 0; ind < worldMap[i].length; ind++) {
            worldMap[i][ind] = new WorldLocation(parentWorldMap,i, ind);
        }
    }
    return worldMap;
}

//updates worldTable AND redisplays selected cell
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


export function createWorldTable(worldMap) {
    let myTable = document.createElement("table");
    let myRows = new Array(worldMap.map.length);
    for (let i = 0; i < myRows.length; i++) {
        myRows[i] = document.createElement("tr")
    }
    //create the tds
    worldMap.map.forEach((subArray, subArrayIndex) => {
        subArray.forEach((item, itemIndex) => {
            let newtd = document.createElement("td");
            //set color of square if terrain exists
            if(item.terrain){
                newtd.style.backgroundColor=item.terrain.color;
            }
            //get top actor if any are present
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
            
            myRows[itemIndex].append(newtd);
        });
    });
    myTable.append(...myRows);
    return myTable;
}

//returns in form [x,y]
export function generateRandomCoordinates(worldMap) {
        let x = Math.floor(Math.random() * worldMap.map.length);
        let y = Math.floor(Math.random() * worldMap.map.length);
    
    return [x, y];
}

//call this to move an actor from its present spot (or non-spot) to another spot
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
//take given cell and display info in the box AND if the cell contains the selected actor, highlights it
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
    //change the name of the terrain
    if(worldMap.map[cellX][cellY].terrain){
        document.getElementById("selectedCellTerrain").innerHTML=`Terrain: ${worldMap.map[cellX][cellY].terrain.name}`;
    } else {
        document.getElementById("selectedCellTerrain").innerHTML="";
    }

    //change the x,y display
    document.getElementById("selectedCellCoordinates").innerHTML = `(${cellX},${cellY})`;
    
}

//checks if a target location contains a non-passable actor (e.g. a wall)
export function testIsPassable(location){
    
    let targetLocationActors=location.presentActors;
    for (let i=0; i<targetLocationActors.length;i++){
        if (targetLocationActors[i].isPassable===false){
            return false;
        }
    }
    return true;
}
//Accepts the location object, returns location objects
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