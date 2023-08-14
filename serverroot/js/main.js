"use strict";
let canvas,context;
window.onload = init;

/*
    My spaced repetition implementation
*/

// The srs object functions as a namespace for data related to the srs
var srs = {
    // Variables managing the parameters of how the srs works.
    // The extremely helpful customization options in slime forest help me with these and names are stolen from there
    // In slime forest, reinforcement refers to the second or later appearance of an item in the same session of play,
    //we will probably use what they do here as a default until we see a reason to change

    // The descriptions taken from slime forest. How it will work in my game will certainly be significantly different but this is a good
    //point of reference to draw from when designing my own system. I want to make the best srs possible for this game's needs and improve on lrnj in the end.

    // This is a measure of how important the trainer will consider it when it shows you something that is supposed to be new
    //but you get it right somehow anyway
    // At 1, it treats even a correct responce as wrong when it's the first in-game encounter.
    // At 10, if you get anything right on the first try, the trainer will never bring it up again.
    firstHitSignificance:9,

    // This is a measure of how frequently the trainer repreats new items.
    // More precisely, it controls how slowly the interval increases between repetitions of a new item.
    // At 1, the length of time between repetitions will increase tenfold every time you get a right answer. (least intense reinforcement)
    // At 10, the length of time between reptitions won't increase at all. (most intense)
    introductionReinforcementIntensity:6,

    // At a certain point, you just know something well enough to remember it until the next session. THis is a measure of how quickly the trainer assumes
    //you've reached that limit where further reptition would waste your time.
    // At 1, there is no limit, so reinforcement of new items will continue for the whole mession.
    // At 10, the limit is as tight as possible; reinforcement stops after one right answer.
    introductionReinforcementLimit:4,

    // This is a measure of how important the trainer will consider it when you get a wrong answer on the second or later appearance of an tiem in a session.
    // At 1, it will treat wrong answers as if they were right answers.
    // At 10, it will treat one wrong answer as proof that you don't know the item at all, and reintroduces it as if it was a new item.
    reinforcementMissSignificance:10,

    // This is a measure of how important the trainer will consider it when you get a wrong answer on the second or later appearance of an item in a session.
    // At 1, it will treat wrong answers as if they were right answers.
    // At 10, it will treat one wrong answer as proof that you don't know the item at all, and reintroduce it as if it was a new item.
    correctionReinforcementIntensity:6,
    correctionReinforcementLimit:4,
    reviewMissSignificance:10,
    reviewIntensity:6,

    // Stores the user's srs data sorted by card.
    data:[],

    // Temporary implementation
    nextKanjiToIntro:0,
};

/*
    Load important data  !!
*/

// Contains pairs of each kanji with it's data
var kanjiKeyPairs = [];

// Contains a list of all the kanji ordered by its position in the file
//aka by its position in the proper learning order
var kanjiList = [];

// Loads the data !!!
let kanjiLoaded = false;
function processKanjiData(data) {
    const splitLines = str => str.split(/\r?\n/);
    let splitData = splitLines(data);

    for(let i in splitData){
        const kanji = splitData[i].substring(0,1);
        const kanjiData = splitData[i].substring(2).split('+');
        kanjiKeyPairs[kanji] = {
            meaning: kanjiData[0].toLowerCase(),
            story: kanjiData[1],
        };
        kanjiList.push(kanji);
    }
    kanjiLoaded = true;
}

function handleKanjiData() {
    if(this.status == 200) {
        processKanjiData(this.responseText);
    } else {
        alert("Handling kanji data: Status " + this.status + ". We have failed and (redacted).");
    }
}

var kanjiClient = new XMLHttpRequest();
kanjiClient.onload = handleKanjiData;
kanjiClient.open("GET", "assets/kanji.txt");
kanjiClient.send();

var level0 = {
    gridWidth: -1,
    gridHeight: -1,
    entities: [],
    dirt: [],
    water: [],
    grass: [],
    collisions: [],
};


function processLevelData(data) {
    //console.log(data);
    const levelData = JSON.parse(data).levels[0];
    const entityLayerData = levelData.layerInstances[0];
    const dirtLayerData = levelData.layerInstances[1];
    const waterLayerData = levelData.layerInstances[3];
    const grassLayerData = levelData.layerInstances[2];
    const collisionLayerData = levelData.layerInstances[4];

    level0.gridWidth = collisionLayerData.__cWid;
    level0.gridHeight = collisionLayerData.__cHei;
    for (let i in entityLayerData.entityInstances){
        const e = entityLayerData.entityInstances[i];
        level0.entities.push({id: e.__identifier, px: e.px});
    }
    for (let i in dirtLayerData.gridTiles){
        const t = dirtLayerData.gridTiles[i];
        level0.dirt.push({src: t.src, px: t.px});
    }
    for (let i in waterLayerData.gridTiles){
        const t = waterLayerData.gridTiles[i];
        level0.water.push({src: t.src, px: t.px});
    }
    for (let i in grassLayerData.gridTiles){
        const t = grassLayerData.gridTiles[i];
        level0.grass.push({src: t.src, px: t.px});
    }
    level0.collisions = collisionLayerData.intGridCsv;
    if(level0.water.length < 2){
        throw "You have no water and no hot guys";
    }
}

function handleLevelData() {
    if(this.status == 200) {
        processLevelData(this.responseText);
    } else {
        alert("Handling level data: Status " + this.status + ". We have failed and you have negative hot men");
    }
}
var levelClient = new XMLHttpRequest();
levelClient.onload = handleLevelData;
levelClient.open("GET", "assets/ldtk/testy.ldtk");
levelClient.send();

/*
    Load our assets before doing anything else !!
*/

var zenMaruRegular = new FontFace('zenMaruRegular', 'url(assets/ZenMaruGothic-Regular.ttf)');
zenMaruRegular.load().then(function(font){document.fonts.add(font);});

var zenMaruMedium = new FontFace('zenMaruMedium', 'url(assets/ZenMaruGothic-Medium.ttf)');
zenMaruMedium.load().then(function(font){document.fonts.add(font);});

var zenMaruLight = new FontFace('zenMaruLight', 'url(assets/ZenMaruGothic-Light.ttf)');
zenMaruLight.load().then(function(font){document.fonts.add(font);});

var zenMaruBold = new FontFace('zenMaruBold', 'url(assets/ZenMaruGothic-Bold.ttf)');
zenMaruBold.load().then(function(font){document.fonts.add(font);});

var zenMaruBlack = new FontFace('zenMaruBlack', 'url(assets/ZenMaruGothic-Black.ttf)');
zenMaruBlack.load().then(function(font){document.fonts.add(font);});


var waterTileset = new Image();
waterTileset.src = "/assets/Sprout Lands - Sprites - Basic pack/Tilesets/Water.png";

var dirtTileset = new Image();
dirtTileset.src = "/assets/Sprout Lands - Sprites - Basic pack/Tilesets/Tilled Dirt.png";

var grassTileset = new Image();
grassTileset.src = "/assets/Sprout Lands - Sprites - Basic pack/Tilesets/Grass.png";
/*grassTileset.onload = () => {
    // Something something idk dont need this rn
};*/
const tilesets = [waterTileset, dirtTileset, grassTileset];

const characterList = ["witch","andro","gladius"];

/*
var gloria64bit = new Image();
gloria64bit.src = "/assets/3x4charactersheets/pokemon_sword_gloria__female_player__gen_4_ow_v2_by_boonzeet_ddxoofo-fullview.png";

var witch32bit = new Image();
witch32bit.src = "/assets/3x4charactersheets/witch_spritesheet.png";

var witchfaces = new Image();
witchfaces.src = "/assets/faces/witch_faces_brown.png";

var andro32bit = new Image();
andro32bit.src = "/assets/3x4charactersheets/andro_spritesheet.png";

var androfaces = new Image();
androfaces.src = "/assets/faces/andro_faces.png";


var characterSpritesheets = {gloria: gloria64bit, witch: witch32bit, andro: andro32bit};
var characterFaces = {witch: witchfaces, andro: androfaces};
var characterBitrates = {gloria: 64 ,andro: 32, witch: 32};*/

var characterSpritesheets={},characterFaces={},characterBitrates={};

// Constants to indicate tile type
const WATER = 0;
const DIRT = 1;
const GRASS = 2;

// Constants to indicate character location in sprite sheets
const PROTAGONIST = 1;
const GLORIA = 0;
const WITCH = 1;
const ANDRO = 2;

// Constants to indicate position of orientation on spritesheets
var spritesheetOrientationPosition = {};
Object.defineProperty( spritesheetOrientationPosition, "down", {value: 0});
Object.defineProperty( spritesheetOrientationPosition, "left", {value: 1});
Object.defineProperty( spritesheetOrientationPosition, "right", {value: 2});
Object.defineProperty( spritesheetOrientationPosition, "up", {value: 3});


// Simple function that returns true when all images are indicated complete, false otherwise
function areImageAssetsLoaded() {
    for(let i in tilesets){
        if(!tilesets[i].complete){
            return false;
        }
    }
    for (const [key, value] of Object.entries(characterSpritesheets)) {
        if(!value.complete){
            return false;
        }
    }
    for (const [key, value] of Object.entries(characterFaces)) {
        if(!value.complete){
            return false;
        }
    }
    return true;
}

const tileBitrate = 16;

/*
    Important variables  !!!!
*/

// Hardcoded dictionary data, future reworks of the system to be done
var dictionary = {
    entries: {
        戦う: "たたか・う‾ (0) - Intransitive verb 1. to make war (on); to wage war (against); to go to war (with); to fight (with); to do battle (against)​",
        ホーム: "",
        自己紹介: "じこしょ\\うかい (3) - Noun, Intransitive suru verb 1. self-introduction​",
        冒険: "ぼうけん‾ (0) - Noun, Intransitive suru verb 1. adventure; venture",
        始める: "はじ・める‾ (0) - Transitive verb 1. to start; to begin; to commence; to initiate; to originate",
        大好き: "だ\いす・き (1) - Na-Adjective 1. liking very much; loving (something or someone); adoring; being very fond of​"
    }
};

// The scene is the screen the player is engaging with and the scene object stores information specfic to the scene
// All state in this object is wiped upon scene change, which hopefully someyhwat mitigates that it is basically a god object containing glorified global state
var scene = {
    name: "home", buttons: [], particleSystems: [], timeOfSceneChange: -1,
    inputting: false, finishedInputting: true, textEntered:"",

    // Contains the 'hitboxes' for the areas where tooltips need to appear when hovered
    // Is an array of objects with the following members:
    // x, y, width, height
    // type - "dictionary" for dictionary definitions of words (thats it right now)
    // word - the word thats definition needs to be defined
    tooltipBoxes: [],

    // Contains information about the tooltip box that is being hovered over if one is
    // Becomes an object with property timeStamp (when hovering began) and index (index in tooltipBoxes)
    currentTooltip: null,

    // Functions called in responce to user input change this to the name of the scene that needs to be changed to instead of directly calling
    //initializeScene. The reason for this is concurrency safety - otherwise the chance that the scene is changed during the middle of
    //one run of the game loop *may* be non-zero which would cause extremely unpredictable behavior
    //im not sure if that would actually be possible or not but this is to be safe
    switchScene: null,
};


// Important variables for managing passing time
let fps=0;
let frameCount=1;

// Variables used between frames solely to measure fps
let secondsPassed=0;
let oldTimeStamp=performance.now();

// Constants related to graphics below
const textColor = "white";
const screenWidth = 950, screenHeight = 800;

// Complex shapes like this can be created with tools, although it may be better to use an image instead
const heartPath = new Path2D('M24.85,10.126c2.018-4.783,6.628-8.125,11.99-8.125c7.223,0,12.425,6.179,13.079,13.543 c0,0,0.353,1.828-0.424,5.119c-1.058,4.482-3.545,8.464-6.898,11.503L24.85,48L7.402,32.165c-3.353-3.038-5.84-7.021-6.898-11.503 c-0.777-3.291-0.424-5.119-0.424-5.119C0.734,8.179,5.936,2,13.159,2C18.522,2,22.832,5.343,24.85,10.126z');

// Approxmimate base width and height (they are the same) of the heartPath
//to be able to get a good approximization of what scale to use to get the size we want
const heartSize = 48;

// Basically just means movement speed, var name could use improvement?
const movingAnimationDuration = 200;

/*
    Extremely insignificant and puny variables !!
*/

// These constants could be scene variables but they dont need to be variable so it saves a bit of the work to just have them be global constants
const playerSpeed=400, bulletSpeed=2500;
const bulletRadius = 10;

// Turned on for one frame when the logging key is pressed to alert/print some stuff
let isLoggingFrame = false;

let showDevInfo = true;

// Various variables that should be scene variables but havent gotten to changing them yet (maybe not ever)
let shaking = false, shakeIntensity = 4, timeOfLastShake = 0;
const shakeFrequency = 2;
let love = 0, note = "無";
let name = "nameless", nameRecentlyLearned = false;
let randomColor = Math.random() > 0.5? '#ff8080' : '#0099b0';

/*
    Buttons !!!
*/

let loveButton = {　　
    x:20, y:screenHeight-50, width:60, height:30,
    neutralColor: '#ed78ed', hoverColor: '#f3a5f3', pressedColor: '#7070db', color: '#ed78ed',
    text: "大好き", font: '13px zenMaruRegular', fontSize: 13, jp: true,
    onClick: function() {
        randomColor = Math.random() > 0.5? '#ff80b0' : '#80ffb0';
        love+=1;
        note = "<3";
        localStorage.setItem('love', love.toString());
    }
};
let clearDataButton = {
    x:screenWidth-100, y:screenHeight-50, width:80, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#e6e6ff', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Reset data", font: '13px zenMaruRegular', fontSize: 13,
    onClick: function() {
        localStorage.clear();
        love=0;
        name="";
        alert("No more love :(");
    }
};
let tatakauSceneButton = {
    x:500, y:300, width:100, height:100,
    neutralColor: '#ff3333', hoverColor: '#ff6666', pressedColor: '#cc33ff', color: '#ff3333',
    text: "戦う", font: '24px zenMaruLight', fontSize: 24, jp: true,
    onClick: function() {
        this.color = this.neutralColor;
        scene.switchScene = "tatakau";
    }
};
let introductionButton = {
    x:620, y:300, width:150, height:100,
    neutralColor: '#b3b3ff', hoverColor: '#e6e6ff', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "自己紹介", font: '24px zenMaruLight', fontSize: 24, jp: true,
    onClick: function() {
        scene.inputting = true;
        scene.finishedInputting = false;
    }
};
let adventureButton = {
    x:500, y:180, width:270, height:100,
    neutralColor: '#9c79ec', hoverColor: '#bda6f2', pressedColor: '#f0d800', color: '#9c79ec',
    text: "冒険=を=始める", font: '28px zenMaruLight', fontSize: 28, jp: true,
    onClick: function() {
        if(areImageAssetsLoaded()){
            this.color = this.neutralColor;
            scene.switchScene = "adventure";
        } else {
            throw "images arent loaded yet and you have negative bitches";
        }

    }
};
let backToHomeButton = {
    x:20, y:screenHeight-100, width:60, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#ff66ff', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Back", font: '14px zenMaruMedium', fontSize: 14,
    onClick: function() {
        this.color = this.neutralColor;
        scene.switchScene = "home";
    }
}

let homeButtons = [loveButton,clearDataButton,tatakauSceneButton,introductionButton,adventureButton];
let tatakauButtons = [loveButton,backToHomeButton];
let adventureButtons = [loveButton,backToHomeButton];

/*
    User input (mouse + keyboard)

    Text input solution #1 is to implement it myself with just canvas. Comes with many downsides but
the plus is that it is simple and easy to understand the modify the behavior. Has been working better than
I thought it would so will probably stick with it for a while. The other two methods are using a dom element and
importing someone else's more intracate solution.

     scene.inputting is set to true when input needs to be collected and set false by the same source when
the text is finished being processed

    scene.finishedInputting is set to false at the same time inputting is set to true and set true the moment
the player pressed enter

    scene.textEntered is a string that is modified when inputting and represents the actual entered text
*/

// keyPressed variables only to be changed by input event listeners
let downPressed=false,upPressed=false,leftPressed=false,rightPressed=false;

// variables set to be true by input event listeners and set back to false after being handled by scene update
let zReleased=false,xReleased=false;

// for player movement
let currentDirection = null;

// Global state for tracking mouse. Global state = good
let mouseDown=false, mouseX=0, mouseY=0;

// Used to know the x and y of the last mousedown, mostly for determining if the mouseup or mouse click occured in the same place as it
//so that we know whether a button was actually fully clicked or not
let mouseDownX=-1, mouseDownY=-1;

window.addEventListener('keydown',function(e) {
    switch (e.key) {
       case 'ArrowLeft': leftPressed=true; currentDirection="left"; break;
       case 'ArrowUp': upPressed=true; currentDirection="up"; break;
       case 'ArrowRight': rightPressed=true; currentDirection="right"; break;
       case 'ArrowDown': downPressed=true; currentDirection="down"; break;
       case 'Enter': scene.finishedInputting=true; break;
       default: if(!scene.finishedInputting){
           switch (e.key) {
              case 'Backspace': if(scene.textEntered.length>0){
                  scene.textEntered = scene.textEntered.substring(0,scene.textEntered.length-1);
              } break;
              default: if(e.key.length===1){
                  scene.textEntered = scene.textEntered+e.key;
              }
          }
       } break;
   }
},false);

function reassignCurrentDirection(){
    upPressed ? currentDirection="up" :
    rightPressed ? currentDirection="right" :
    leftPressed ? currentDirection="left" :
    downPressed ? currentDirection="down" : null;
    /* Does the exact same thing as the above code but readable, the below code is probably preferred but i wanted to try something different
    if(upPressed){
        currentDirection="up";
    } else if(rightPressed) {
        currentDirection="right";
    } else if(leftPressed) {
        currentDirection="left";
    } else if(downPressed) {
        currentDirection="down";
    }*/
}

window.addEventListener('keyup',function(e) {
    switch (e.key) {
       case 'ArrowLeft': leftPressed=false; if (currentDirection==="left") reassignCurrentDirection(); break;
       case 'ArrowUp': upPressed=false; if (currentDirection==="up") reassignCurrentDirection(); break;
       case 'ArrowRight': rightPressed=false; if (currentDirection==="right") reassignCurrentDirection(); break;
       case 'ArrowDown': downPressed=false; if (currentDirection==="down") reassignCurrentDirection(); break;
       case '=': isLoggingFrame=true; break;
       case '~': showDevInfo=!showDevInfo; break;
       case 'x': xReleased=true; break;
       case 'z': zReleased=true; break;
       default: break;
   }
},false);

window.addEventListener('mousemove',function(e) {
    let rect = canvas.getBoundingClientRect();

    // mouse x and y relative to the canvas
    mouseX = Math.floor(e.x - rect.x);
    mouseY = Math.floor(e.y - rect.y);

    //check if was hovered on button so we can change color!
    for (let x in scene.buttons) {
        let b = scene.buttons[x];
        if(!mouseDown){
            if (mouseX >= b.x &&         // right of the left edge AND
            mouseX <= b.x + b.width &&    // left of the right edge AND
            mouseY >= b.y &&         // below the top AND
            mouseY <= b.y + b.height) {    // above the bottom
                b.color = b.hoverColor;
            } else {
                b.color = b.neutralColor;
            }
        }
    }


    if(scene.currentTooltip === null){
        //check if we hovered over a tooltip
        for (let i in scene.tooltipBoxes) {
            let t = scene.tooltipBoxes[i];
            if (mouseX >= t.x &&         // right of the left edge AND
            mouseX <= t.x + t.width &&    // left of the right edge AND
            mouseY >= t.y &&         // below the top AND
            mouseY <= t.y + t.height) {    // above the bottom
                scene.currentTooltip = {timeStamp: performance.now(), index: i};
            }
        }
    } else {
        let t = scene.tooltipBoxes[scene.currentTooltip.index];
        //check if we are still hovering
        if (mouseX >= t.x &&         // right of the left edge AND
        mouseX <= t.x + t.width &&    // left of the right edge AND
        mouseY >= t.y &&         // below the top AND
        mouseY <= t.y + t.height) {
            //pass
        } else {
            scene.currentTooltip = null
        }
    }
},false);

window.addEventListener('mousedown',function(e) {
    mouseDown=true;
    let rect = canvas.getBoundingClientRect();

    // mouse x and y relative to the canvas
    mouseX = mouseDownX = Math.floor(e.x - rect.x);
    mouseY = mouseDownY = Math.floor(e.y - rect.y);

    //check if was pressed on button so we can change color!
    for (let x in scene.buttons) {
        let b = scene.buttons[x];
        if (mouseX >= b.x &&         // right of the left edge AND
            mouseX <= b.x + b.width &&    // left of the right edge AND
            mouseY >= b.y &&         // below the top AND
            mouseY <= b.y + b.height) {    // above the bottom
                b.color = b.pressedColor;
            }
    }

},false);

window.addEventListener('mouseup',function(e) {
    mouseDown=false;
},false);

window.addEventListener('click',function(e) {
    let rect = canvas.getBoundingClientRect();

    // Click x and y relative to the canvas
    mouseX = Math.floor(e.x - rect.x);
    mouseY = Math.floor(e.y - rect.y);

    if(scene.name === "home"){
        // Get distance between player and the click which is the magnitude of the vector
        let a = mouseX-scene.playerX;
        let b = mouseY-scene.playerY;
        let distance = Math.sqrt(a**2 + b**2);

        // Make bullet going at a velocity of the unit vector times the bullet speed
        scene.bullets.push({bulletX: scene.playerX,bulletY: scene.playerY,
        bulletVelocityX: a*bulletSpeed/distance,bulletVelocityY: b*bulletSpeed/distance});
    }

    for (let x in scene.buttons) {
        let b = scene.buttons[x];

        if (mouseX >= b.x && mouseX <= b.x + b.width && mouseY >= b.y && mouseY <= b.y + b.height) {
            b.color = b.hoverColor;

            //only register as a click if when the mouse was pressed down it was also within the button.
            //note that this implementation does not work for a moving button so if that is needed this would need to change
            if (mouseDownX >= b.x &&         // right of the left edge AND
                mouseDownX <= b.x + b.width &&    // left of the right edge AND
                mouseDownY >= b.y &&         // below the top AND
                mouseDownY <= b.y + b.height) {b.onClick();}
        } else {
            b.color = b.neutralColor;
        }
    }
    scene.particleSystems.push(createParticleSystem({x:mouseX, y:mouseY, temporary:true, particlesLeft:10, particleSpeed: 150, particleAcceleration: -150, particleLifespan: 1000}));
},false);

// Code baldfacedly stolen https://fjolt.com/article/html-canvas-how-to-wrap-text
const wrapText = function(ctx, text, x, y, maxWidth, lineHeight) {
    // @description: wrapText wraps HTML canvas text onto a canvas of fixed width
    // @param ctx - the context for the canvas we want to wrap text on
    // @param text - the text we want to wrap.
    // @param x - the X starting point of the text on the canvas.
    // @param y - the Y starting point of the text on the canvas.
    // @param maxWidth - the width at which we want line breaks to begin - i.e. the maximum width of the canvas.
    // @param lineHeight - the height of each line, so we can space them below each other.
    // @returns an array of [ lineText, x, y ] for all lines

    // First, start by splitting all of our text into words, but splitting it into an array split by spaces
    let words = text.split(' ');
    let line = ''; // This will store the text of the current line
    let testLine = ''; // This will store the text when we add a word, to test if it's too long
    let lineArray = []; // This is an array of lines, which the function will return
    // Lets iterate over each word
    for(var n = 0; n < words.length; n++) {
        // Create a test line, and measure it..
        testLine += `${words[n]} `;
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        // If the width of this test line is more than the max width
        if (testWidth > maxWidth && n > 0) {
            // Then the line is finished, push the current line into "lineArray"
            lineArray.push([line, x, y]);
            // Increase the line height, so a new line is started
            y += lineHeight;
            // Update line and test line to use this word as the first word on the next line
            line = `${words[n]} `;
            testLine = `${words[n]} `;
        }
        else {
            // If the test line is still less than the max width, then add the word to the current line
            line += `${words[n]} `;
        }
        // If we never reach the full max width, then there is only one line.. so push it into the lineArray so we return something
        if(n === words.length - 1) {
            lineArray.push([line, x, y]);
        }
    }
    // Return the line array
    return lineArray;
}

// Tooltip to show reading and meaning of jp words. Probably will be other types of tooltips much later
function drawTooltip() {
    const word = scene.tooltipBoxes[scene.currentTooltip.index].word;
    let wrappedText = wrapText(context, dictionary.entries[word], mouseX+12+10, mouseY+74, 360, 16);

    const boxX = mouseX+12;
    const boxY = mouseY+12;
    const boxWidth = 250;
    const boxHeight = wrappedText[wrappedText.length-1][2]-mouseY+12;

    let offsetX = 0;
    let offsetY = 0;
    if(boxX+boxWidth > screenWidth){
        offsetX = -boxWidth-24;
    }
    if(boxY+boxHeight > screenHeight){
        offsetY = -boxHeight-24;
    }

    context.fillStyle = 'hsl(0, 0%, 90%)';
    context.beginPath();
    context.roundRect(boxX+offsetX, boxY+offsetY, boxWidth, boxHeight, 5);
    context.fill();

    context.font = '20px zenMaruRegular';
    context.textAlign = 'center';
    context.fillStyle = 'black';
    context.fillText("Definition of " + word, boxX+offsetX+125, boxY+offsetY+32);
    //context.font = '20px Arial';
    context.font = '13px Arial';
    context.textAlign = 'start';

    wrappedText.forEach(function(item) {
        // item[0] is the text
        // item[1] is the x coordinate to fill the text at
        // item[2] is the y coordinate to fill the text at
        context.fillText(item[0], item[1]+offsetX, item[2]+offsetY);
    });

    //context.fillText(dictionary.entries[word], mouseX+12+10, mouseY+74);
}

// Useful function for particle generation, returns unit vector of random direction
// Mod and shift are optional arguments that allows the random angles generated to be changed
function randomUnitVector(mod=1,shift=0) {
    let randomAngle = Math.random()*2*Math.PI*mod+shift*Math.PI;
    return [Math.cos(randomAngle),Math.sin(randomAngle),randomAngle];
}

/*
    Particle system code !!!

    I have made a bunch of stuff here, some of it useful some of it less useful, but all in a vacuum to improve my programming
and hopefully be able to implement better eye candy into my projects. The way we handle draw particle/new particle functions
needs to be reworked
*/

// Composites a draw function for a particle system, returns a function that draws particles
//when inside a particleSystem object, with the following options:
//
// particleShape: "round" "square"
// distributionShape: "round" "square"
/*function createParticlesFunctions(particleShape, particleDistribution){

}*/

// Particle systems functions, only to be called when inside a particle system!
let drawParticlesTypeZero = function(timeStamp){
    for (let x in this.particles) {
        let p = this.particles[x];

        context.fillStyle = 'hsla('+p.hue+','+p.saturation+'%,'+p.lightness+'%,'+(p.createTime-timeStamp+this.particleLifespan)/this.particleLifespan+')';
        context.beginPath();
        context.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        context.fill();
    }
} //Draw particles round

let drawParticlesTypeOne = function(timeStamp){
    for (let x in this.particles) {
        let p = this.particles[x];

        context.fillStyle = 'hsla('+p.hue+','+p.saturation+'%,'+p.lightness+'%,'+(p.createTime-timeStamp+this.particleLifespan)/this.particleLifespan+')';
        //context.beginPath();
        context.fillRect(p.x, p.y, p.size, p.size);
        //context.fill();
    }
} // Draw particles square

let drawParticlesTypeTwo = function(timeStamp){
    context.save();
    for (let x in this.particles) {
        let p = this.particles[x];
        let size = p.size/heartSize;

        context.fillStyle = 'hsla('+p.hue+','+p.saturation+'%,'+p.lightness+'%,'+(p.createTime-timeStamp+this.particleLifespan)/this.particleLifespan+')';
        context.save();
        context.translate(p.x,p.y);
        context.scale(size,size);
        //context.rotate(p.angle+0.5*Math.PI);
        context.beginPath();
        context.fill(heartPath);
        context.restore();
    }
    context.restore();
} // Draw particles heart

// Particle creation functions, returns a particle object
let newParticleTypeZero = function(timeStamp){
    // If hue is array get a random color from there
    let h=this.hue,s=this.saturation,l=this.lightness;

    let velX = (Math.random()-0.5)*this.particleSpeed*2;
    let velY = (Math.random()-0.5)*this.particleSpeed*2;

    let magnitude = Math.sqrt(velX**2 + velY**2);
    //alert(magnitude);
    let adjustedMagnitude = magnitude/this.particleSpeed;

    // Take the unit vector and multiply it by the acceleration for the proper acceleration vector
    let accX = (velX/magnitude)*this.particleAcceleration*adjustedMagnitude;
    let accY = (velY/magnitude)*this.particleAcceleration*adjustedMagnitude;
    //alert(accX + " " + accY + " " + velX + " " + velY);

    // Get random color from array
    if(typeof this.hue === "object"){
        let randomIndex = Math.floor(Math.random()*this.hue.length);

        h = this.hue[randomIndex];
        s = this.saturation[randomIndex];
        l = this.lightness[randomIndex];
    }
    return {x: this.x, y: this.y, hue: h, saturation: s, lightness: l, size: this.particleSize,
            createTime: timeStamp, destroyTime: timeStamp+this.particleLifespan,
            velX: velX, velY: velY, speed: magnitude,
            accX: accX, accY: accY};
} // Distributes particles in square with random magnitude

let newParticleTypeOne = function(timeStamp){
    let v = randomUnitVector(this.mod, this.shift);
    // If hue is array get a random color from there
    let h=this.hue,s=this.saturation,l=this.lightness;

    // Get random color from array
    if(typeof this.hue === "object"){
        let randomIndex = Math.floor(Math.random()*this.hue.length);

        h = this.hue[randomIndex];
        s = this.saturation[randomIndex];
        l = this.lightness[randomIndex];
    }
    return {x: this.x, y: this.y, hue: h, saturation: s, lightness: l, size: this.particleSize,
            createTime: timeStamp, destroyTime: timeStamp+this.particleLifespan,
            velX: v[0]*this.particleSpeed, velY: v[1]*this.particleSpeed, angle: v[2],
            accX: 0, accY: 0};
} // Distributes particles in circle with uniform magnitude

let newParticleTypeTwo = function(timeStamp){
    let v = randomUnitVector(this.mod, this.shift);
    // If hue is array get a random color from there
    let h=this.hue,s=this.saturation,l=this.lightness;

    // Get random color from array
    if(typeof this.hue === "object"){
        let randomIndex = Math.floor(Math.random()*this.hue.length);

        h = this.hue[randomIndex];
        s = this.saturation[randomIndex];
        l = this.lightness[randomIndex];
    }
    return {x: this.x, y: this.y, hue: h, saturation: s, lightness: l, size: this.particleSize,
            createTime: timeStamp, destroyTime: timeStamp+this.particleLifespan,
            velX: v[0]*this.particleSpeed*Math.random(), velY: v[1]*this.particleSpeed*Math.random(),
            accX: 0, accY: 0};
} // Distributes particles in circle with random magnitude

let newParticleTypeThree = function(timeStamp){
    let v = randomUnitVector(this.mod, this.shift);
    let h=this.hue,s=this.saturation,l=this.lightness;

    // Get random color from array
    if(typeof this.hue === "object"){
        let randomIndex = Math.floor(Math.random()*this.hue.length);

        h = this.hue[randomIndex];
        s = this.saturation[randomIndex];
        l = this.lightness[randomIndex];
    }
    return {x: this.x, y: this.y, hue: h, saturation: s, lightness: l, size: this.particleSize,
            createTime: timeStamp, destroyTime: timeStamp+this.particleLifespan,
            velX: v[0]*this.particleSpeed, velY: v[1]*this.particleSpeed, angle: v[2],
            accX: (Math.random()-0.5)*this.particleSpeed*2, accY: (Math.random()-0.5)*this.particleSpeed*2};
} // Distributes particles in circle with uniform magnitude and random acceleration

// Takes in an object to be able to make use of named parameters, returns a particle system object
function createParticleSystem(
    {x=600, y=600, hue=0, saturation=100, lightness=50, particlesPerSec=50, drawParticles=drawParticlesTypeOne,
    newParticle=newParticleTypeZero, temporary=false,
    particleSize=7, particleLifespan=1000, mod=1, shift=0, systemLifespan=Infinity, createTime=0,
    gravity=0, particleSpeed=50, particlesLeft=Infinity, particleAcceleration=0} = {}) {
    let sys = {
        x: x, y: y, hue: hue, saturation: saturation, lightness: lightness,
        particlesPerSec: particlesPerSec, drawParticles: drawParticles, newParticle: newParticle, particleAcceleration: particleAcceleration,
        particleSize: particleSize, particleLifespan: particleLifespan, systemLifespan: systemLifespan, mod: mod, shift: shift,
        createTime: createTime, particles: [], timeOfLastCreate: -1, createNewParticles: true, temporary: temporary,
        particleSpeed: particleSpeed, gravity: gravity, particlesLeft: particlesLeft,
    }

    return sys;
}

let bestParticleSystem = createParticleSystem({
    x: 600, y:500, hue: [0,240,0], saturation: [100,100,100], lightness: [50,50,100],
     particlesPerSec: 10, drawParticles: drawParticlesTypeTwo, newParticle: newParticleTypeThree,
    particleSize: 18, particleLifespan: 1200,
    particles: [], timeOfLastCreate: -1,
});
/*let worstParticleSystem = {
    x: 600, y:600, hue: 0, particlesPerSec: 50, drawParticles: drawParticlesTypeOne, newParticle: newParticleTypeZero,
    particleSize: 7, particleLifespan: 1000,
    particles: [], timeOfLastCreate: -1,
};*/
let worstParticleSystem = createParticleSystem();
/*let silliestParticleSystem = {
    x: 600, y:700, hue: 290, particlesPerSec: 160, drawParticles: drawParticlesTypeZero, newParticle: newParticleTypeOne,
    particleSize: 3, particleLifespan: 1700,
    particles: [], timeOfLastCreate: -1,
};*/
let silliestParticleSystem = createParticleSystem({
    x: 600, y:700, hue: [60,290], saturation: [100,100], lightness: [60,50],
    particlesPerSec: 160, drawParticles: drawParticlesTypeZero, newParticle: newParticleTypeOne,
    particleSize: 3, particleLifespan: 1700,
});
let wonkiestParticleSystem = createParticleSystem({
    x: 400, y:700, hue: [186,300,0], saturation: [100,100,100], lightness: [70,75,100],
    particlesPerSec: 60, drawParticles: drawParticlesTypeTwo, newParticle: newParticleTypeTwo,
    particleSize: 12, particleLifespan: 3500, mod: 0.1, shift: 1.4, particleSpeed: 250, gravity: 100
});
let playerParticleSystem = createParticleSystem({
    x: -1000, y: -1000, hue: 205, particlesPerSec: 80, drawParticles: drawParticlesTypeOne, newParticle: newParticleTypeOne,
    particleSize: 5, particleLifespan: 1500,
    particles: [], timeOfLastCreate: -1,
});

let homeParticleSystems = [bestParticleSystem,worstParticleSystem,silliestParticleSystem,wonkiestParticleSystem,playerParticleSystem];

// for performance testing
/*for (let i=0;i<30;i++){
    scene.particleSystems.push({
            x: 60+i*28, y:100, hue: 290, particlesPerSec: 144,
            particles: [], timeOfLastCreate: -1,
    });
}*/

/*
    Adventure mode specfic functions go here.
*/

// Draws a tile
function drawTile(type, src, x, y){
    const size = 16;
    context.drawImage(tilesets[type], src[0], src[1], tileBitrate, tileBitrate, x, y, size*2, size*2);
}

// Draws a character
function drawCharacter(character, src, x, y){
    let size = characterBitrates[character];
    let image = characterSpritesheets[character];
    if(character==="gloria"){
        size/=1.3;
    }
    if(typeof image === "object"){
        context.drawImage(image, src[0], src[1], characterBitrates[character], characterBitrates[character], x, y, size, size);
    } else {
        console.warn("drawCharacter: Expected object got " + typeof image + ", also you have negative hot men.");
    }
}

// Checks if a tile is marked for collision or not. Scene must be adventure scene.
// checkAdjacent to be set to "up" "left" "right" or "down" or to be left undefined
// - if defined, checks that adjacent tile instead of the one directly indicated by the x and y
// Returns:
// null for no collision, "bounds" for level boundary collision, returns the num of the collision tile if collision tile, or
//returns id of entity if entity
function isCollidingOnTile(x, y, checkAdjacent = false){
    if(checkAdjacent){
        if(checkAdjacent === "down"){
            y+=32;
        } else if(checkAdjacent === "left"){
            x-=32;
        } else if(checkAdjacent === "right"){
            x+=32;
        } else if(checkAdjacent === "up"){
            y-=32;
        }
    }
    // First check world bounds
    if (x < 0 || y < 0 || x > (level0.gridWidth-1)*32 || y > (level0.gridHeight-1)*32){
        //note = `y: ${y}, bound: ${(level0.gridHeight-1)*32}`;
        return "bounds";
    }


    // Currently this local function does not need to exist, but I thought it might have needed to
    const getTileNum = function(x,y){return ((x/32) % level0.gridWidth) + (y/32)*level0.gridWidth;}
    let tileNum = getTileNum(x,y);
    if(tileNum>level0.collisions.length || tileNum<0){
        throw "Something is wrong with tile collision dumb bitch";
    } else if (level0.collisions[tileNum]!==0){
        return level0.collisions[tileNum];
    } else {
        for(let i in level0.entities) {
            //let entityTileNum = getTileNum(level0.entities[i].px[0],level0.entities[i].px[1])

            if (level0.entities[i].px[0]*2===x && level0.entities[i].px[1]*2===y){
                return level0.entities[i].id;
            }
        }
    }
    return null;
}

/*
    The high level control procedures begin here
*/

// Called upon scene change and initializes
function initializeScene(sceneName){
    // First clear the current scene before repopulating it
    scene = {name: sceneName, buttons: [], particleSystems: [], timeOfSceneChange: performance.now(),
            inputting: false, finishedInputting: true, textEntered:"", currentTooltip:null, tooltipBoxes:[],
            switchScene: null};

    if (sceneName === "tatakau"){
        scene.buttons = tatakauButtons;
    } else if (sceneName === "home"){
        scene.buttons = homeButtons;
        scene.particleSystems = homeParticleSystems;

        // Variables specfic to home
        scene.ballX=50, scene.ballY=50, scene.ballVelocityX=400, scene.ballVelocityY=480, scene.ballRadius=30;
        scene.playerX=200, scene.playerY=400, scene.playerRadius=30, scene.playerColor = '#8066ff';

        scene.bullets=[];
    } else if (sceneName === "adventure"){
        scene.buttons = adventureButtons;
        scene.tileSize = 32;
        //showDevInfo = false;

        // Player location is the location used for logic, graphic location is the location to draw them at
        scene.playerLocation = scene.playerGraphicLocation = [128*2,208*2];
        scene.playerSrc = [32,0];
        //scene.playerLastMovedTime = 0;

        scene.worldX = 198;
        scene.worldY = 20;

        // True when the player is currently moving to the tile they are "at" and the walking animation is playing
        scene.moving = false;

        // Direction player is currently moving in, if they are moving
        scene.movingDirection = null;

        // Switch foots each step taken
        scene.whichFoot = 0;

        scene.currentDialogue = `Now, you will die. Very sorry about that. Beautiful madness, Requiem heartless. I dreamed of a mem'ry of before, Something I desired, something I mourned. Now, after the pain, after the tears: Fuel furious void, absence of fear`;
    }

    // Register dictionary lookup tooltip boxes from buttons that are japanese
    for(let i in scene.buttons){
        let b = scene.buttons[i];
        if (b.jp){
            let words = b.text.split("=");
            let characterNumber = 0;
            let text = b.text.replaceAll("=",""); // this is to be able to get an accurate length
            for (let i in words){
                let word = words[i];
                if(dictionary.entries.hasOwnProperty(word)){

                    // Add tooltip box to scene
                    scene.tooltipBoxes.push({
                        x:  b.x+(b.width/2)-(b.fontSize*text.length/2)+(b.fontSize*characterNumber),
                        y: b.y+(b.height/2)-b.fontSize+b.fontSize/4,
                        width: b.fontSize*word.length, height: b.fontSize,
                        type: "dictionary", word: word, spawnTime: 1100,
                    });
                }
                characterNumber += word.length;
            }
        }
    }
    xReleased = zReleased = false;
}

/*
    Update functions called each frame during their scene
*/
function updateHome(timeStamp){
    scene.ballX += scene.ballVelocityX/fps;
    scene.ballY += scene.ballVelocityY/fps;

    //Turn direction on collision with screen edge
    if(scene.ballRadius+scene.ballX>screenWidth){
        scene.ballX=screenWidth-scene.ballRadius;
        scene.ballVelocityX*=-1;
    }
    if(scene.ballRadius+scene.ballY>screenHeight){
        scene.ballY=screenHeight-scene.ballRadius;
        scene.ballVelocityY*=-1;
        //alert("what " + scene.ballRadius + " " + +scene.ballY + " " + screenHeight);
    }
    if(scene.ballX<scene.ballRadius){
        scene.ballX=scene.ballRadius;
        scene.ballVelocityX*=-1;
    }
    if(scene.ballY<scene.ballRadius){
        scene.ballY=scene.ballRadius;
        scene.ballVelocityY*=-1;
    }

    // Update player location
    if(upPressed){
        scene.playerY-=playerSpeed/fps;
    }
    if(downPressed){
        scene.playerY+=playerSpeed/fps;
    }
    if(leftPressed){
        scene.playerX-=playerSpeed/fps;
    }
    if(rightPressed){
        scene.playerX+=playerSpeed/fps;
    }

    playerParticleSystem.x = scene.playerX;
    playerParticleSystem.y = scene.playerY;

    // Update bullets
    for (let x in scene.bullets) {
        let bullet = scene.bullets[x];
        bullet.bulletX+=bullet.bulletVelocityX/fps;
        bullet.bulletY+=bullet.bulletVelocityY/fps;

        // Despawn offscreen bullets
        if(
            (bullet.bulletX > screenWidth || bullet.bulletX < 0) ||
            (bullet.bulletY > screenHeight || bullet.bulletY < 0)
        ){
            scene.bullets.splice(x, 1);
        }

        // If bullet hits ball, point get
        if((Math.sqrt((scene.ballX-bullet.bulletX)**2 + (scene.ballY-bullet.bulletY)**2)) < scene.ballRadius){
            //alert("hitt");
            scene.bullets.splice(x, 1);
        }
    }
}

function updateTatakau(timeStamp){
    // Lol
}

function updateAdventure(timeStamp){
    if(currentDirection === "down"){
        scene.playerSrc = [32,0];
    } else if (currentDirection === "left") {
        scene.playerSrc = [32,32];
    } else if(currentDirection === "right"){
        scene.playerSrc = [32,32*2];
    } else if(currentDirection === "up"){
        scene.playerSrc = [32,32*3];
    }
    if(scene.movingDirection===null){
        if(currentDirection === "down" && downPressed && isCollidingOnTile(scene.playerLocation[0],scene.playerLocation[1],"down")===null){
            scene.playerLocation[1]+=32;
            scene.movingDirection = "down";
            scene.startedMovingTime = timeStamp;
        } else if(currentDirection === "left" && leftPressed && isCollidingOnTile(scene.playerLocation[0],scene.playerLocation[1],"left")===null){
            scene.playerLocation[0]-=32;
            scene.movingDirection = "left";
            scene.startedMovingTime = timeStamp;
        } else if(currentDirection === "right" && rightPressed && isCollidingOnTile(scene.playerLocation[0],scene.playerLocation[1],"right")===null){
            scene.playerLocation[0]+=32;
            scene.movingDirection = "right";
            scene.startedMovingTime = timeStamp;
        } else if(currentDirection === "up" && upPressed && isCollidingOnTile(scene.playerLocation[0],scene.playerLocation[1],"up")===null){
            scene.playerLocation[1]-=32;
            scene.movingDirection = "up";
            scene.startedMovingTime = timeStamp;
        }
        //note = scene.playerLocation;
    } else if(movingAnimationDuration + scene.startedMovingTime < timeStamp){
        scene.movingDirection = null;
        scene.playerGraphicLocation = scene.playerLocation;
        scene.playerSrc[0]=32;
        scene.whichFoot = (scene.whichFoot+1)%2;
    }
    if(xReleased){
        xReleased = false;
    }
    if(zReleased){
        let collision = isCollidingOnTile(scene.playerLocation[0],scene.playerLocation[1],currentDirection);
        note = typeof collision;
        if(typeof collision === "string"){
            note = `Talking with ${collision}!`;
        } else if(typeof collision === "number"){
            note = `Talking with the water instead of hot guy...`;
        }
        zReleased = false;
    }
}

/*
    Draw functions called during their specfic scene
*/

function drawHome(timeStamp){

    // circle
    context.fillStyle = randomColor;
    context.beginPath();
    context.arc(mouseX, mouseY, 10, 0, 2 * Math.PI);
    context.fill();

    // Line
    context.beginPath();
    context.moveTo(500, 500);
    context.lineTo(250, 150);
    context.stroke();

    // triangle
    context.beginPath();
    context.moveTo(300, 200);
    context.lineTo(350, 250);
    context.lineTo(350, 150);
    context.fill();

    // shapes drawn with stroke instead of fill
    context.lineWidth = 5;

    context.beginPath();
    context.arc(400, 100, 50, 0, 2 * Math.PI);
    context.strokeStyle = randomColor;
    context.stroke();

    // to be a full triangle it would have to be 3 lines, it doesnt
    // automatically close it like with fill
    context.beginPath();
    context.moveTo(400, 300);
    context.lineTo(450, 350);
    context.lineTo(350, 150);
    context.stroke();

    context.beginPath();
    context.strokeStyle = '#0099b0';
    context.fillStyle = randomColor;
    context.stroke(heartPath);
    //context.fill(heartPath);

    context.fillStyle = 'hsl(240,100%,50%)';
    context.fillRect(100, 250, 100, 125);

    // and now for what we have all be waiting for: text
    context.fillStyle = 'white';
    context.font = '20px zenMaruRegular';
    context.fillText("Welcome to ホーム! Have a good stay!", 50, 100);

    if(name!==""){
        if(nameRecentlyLearned){
            context.fillText("Your name is "+name+"! Thanks for letting me know!", 50, 130);
        } else {
            context.fillText("Your name is "+name+"! I can't believe I remembered!", 50, 130);
        }
    } else {
        context.fillText("I don't know your name! Please introduce yourself. pien", 50, 130);
    }

    // Turned on by the intoduction button, player is to enter their name.
    if(scene.inputting){
        if(!scene.finishedInputting){
            context.fillStyle = 'white';
            context.font = '16px zenMaruMedium';
            //x:620, y:300
            context.fillText("Hello! My name is Sarracenia!", 600, 250);
            context.fillText("What is your name?", 600, 270);
            context.fillText(scene.textEntered+"_", 600, 290);
        } else {
            name = scene.textEntered;
            localStorage.setItem('name', name);
            scene.inputting = false;
            nameRecentlyLearned = true;
            scene.textEntered = "";
        }
    }

    // Background was drawn; now draw the object(s)

    // Draw the Ball
    context.fillStyle = randomColor;
    context.beginPath();
    context.arc(scene.ballX, scene.ballY, scene.ballRadius, 0, 2 * Math.PI);
    context.fill();

    // Draw the Player (who is also a ball)
    context.fillStyle = scene.playerColor;
    context.beginPath();
    context.arc(scene.playerX, scene.playerY, scene.playerRadius, 0, 2 * Math.PI);
    context.fill();

    // Draw Bullets
    for (let x in scene.bullets) {
        let bullet = scene.bullets[x];
        context.fillStyle = 'white';
        //context.font = '14px Arial';
        //context.fillText("Bullet "+x+" X:"+bullet.bulletX, screenWidth-200, 50+40*x);
        //context.fillText("Bullet "+x+" Y:"+bullet.bulletY, screenWidth-200, 65+40*x);
        context.beginPath();
        context.arc(bullet.bulletX, bullet.bulletY, bulletRadius, 0, 2 * Math.PI);
        context.fill();
    }
}

function drawTatakau(timeStamp){
    // If not enough time has passed, play a cinematic based on time elapsed since scene change
    let timeElapsed = timeStamp - scene.timeOfSceneChange;

    let animationSpeed = 1000;
    if(timeElapsed < animationSpeed*2){
        let alpha = timeElapsed/animationSpeed;

        context.fillStyle = 'hsla(0,0%,100%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("君も戦うのね", screenWidth/2, 100);
    } else if (timeElapsed < animationSpeed*4) {
        let alpha = Math.max(0,(animationSpeed*3-timeElapsed)/animationSpeed);

        context.fillStyle = 'hsla(0,0%,100%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("君も戦うのね", screenWidth/2, 100);

        alpha = (timeElapsed-animationSpeed*2)/animationSpeed;

        context.fillStyle = 'hsla(0,0%,100%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("なら、君の実力見せてもらいます", screenWidth/2, 150);
    } else if (timeElapsed < animationSpeed*6){
        let alpha = Math.max(0,(animationSpeed*5-timeElapsed)/animationSpeed);

        context.fillStyle = 'hsla(0,0%,100%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("なら、君の実力見せてもらいます", screenWidth/2, 150);
    } else if (kanjiLoaded) {
        if(scene.inputting){
            if(!scene.finishedInputting){
                context.font = '20px zenMaruRegular';
                context.fillStyle = 'white';
                context.textAlign = 'center';
                context.fillText(kanjiKeyPairs[scene.srsCard[0]].story, screenWidth/2, 100);
                context.fillText(scene.srsCard[0], screenWidth/2, 200);
                context.fillText(scene.textEntered+"_", screenWidth/2, 250);
            } else {
                if(scene.textEntered.toLowerCase()===kanjiKeyPairs[scene.srsCard[0]].meaning){
                    note = "Correct :)";
                    srs.nextKanjiToIntro++;
                } else {
                    note = "You fail >:(";
                    //console.log(scene.textEntered.toLowerCase() + "+" + kanjiKeyPairs[scene.srsCard[0]])
                }
                scene.inputting = false;
                scene.textEntered = "";
            }
        } else {
            scene.srsCard = [kanjiList[srs.nextKanjiToIntro],"intro"];
            scene.inputting = true;
            scene.finishedInputting = false;
        }
    } else {
        throw("Loading took wayyyyy too long also you have negative bitches");
    }
}

function drawAdventure(timeStamp){
    // Draw tile layers
    for (let i in level0.water){
        drawTile(WATER, [16*Math.floor( (timeStamp/400) % 4),0], scene.worldX+level0.water[i].px[0]*2, scene.worldY+level0.water[i].px[1]*2);
    }
    for (let i in level0.grass){
        drawTile(GRASS, level0.grass[i].src, scene.worldX+level0.grass[i].px[0]*2, scene.worldY+level0.grass[i].px[1]*2);
    }
    for (let i in level0.dirt){
        drawTile(DIRT, level0.dirt[i].src, scene.worldX+level0.dirt[i].px[0]*2, scene.worldY+level0.dirt[i].px[1]*2);
    }

    // Draw dialogue box
    context.fillStyle = 'hsl(0, 0%, 90%, 20%)';
    context.beginPath();
    context.roundRect(scene.worldX+2, scene.worldY+40+scene.tileSize*16, scene.tileSize*16, 105, 5);
    context.fill();

    context.font = '16px zenMaruRegular';
    context.textAlign = 'start';
    context.fillStyle = 'white';
    let wrappedText = wrapText(context, scene.currentDialogue, scene.worldX+15, scene.worldY+67+scene.tileSize*16, scene.tileSize*16-30, 21);
    wrappedText.forEach(function(item) {
        // item[0] is the text
        // item[1] is the x coordinate to fill the text at
        // item[2] is the y coordinate to fill the text at
        context.fillText(item[0], item[1], item[2]);
    });

    // Draw player
    if(scene.movingDirection !== null){
        // Between 0 and 1 where 0 is the very beginning and 1 is finished
        let animationCompletion = (timeStamp - scene.startedMovingTime)/movingAnimationDuration;

        //alert(animationCompletion);
        if(animationCompletion > 0.25 && animationCompletion < 0.75){
            scene.playerSrc = [scene.whichFoot*2*32,spritesheetOrientationPosition[scene.movingDirection]*32];
        } else {
            scene.playerSrc = [32,spritesheetOrientationPosition[scene.movingDirection]*32];
        }

        if(scene.movingDirection === "up"){
            scene.playerGraphicLocation = [scene.playerLocation[0],scene.playerLocation[1]+scene.tileSize*(1-animationCompletion)];
        } else if(scene.movingDirection === "left"){
            scene.playerGraphicLocation = [scene.playerLocation[0]+scene.tileSize*(1-animationCompletion),scene.playerLocation[1]];
        } else if(scene.movingDirection === "right"){
            scene.playerGraphicLocation = [scene.playerLocation[0]-scene.tileSize*(1-animationCompletion),scene.playerLocation[1]];
        } else if(scene.movingDirection === "down"){
            scene.playerGraphicLocation = [scene.playerLocation[0],scene.playerLocation[1]-scene.tileSize*(1-animationCompletion)];
        }
    }

    for (let i in level0.entities){
        const e = level0.entities[i];
        //alert(e.px[1]);
        drawCharacter(e.id.toLowerCase(),[32,0],e.px[0]*2+scene.worldX,e.px[1]*2+scene.worldY);
    }
    drawCharacter("witch",scene.playerSrc,scene.worldX+scene.playerGraphicLocation[0],scene.worldY+scene.playerGraphicLocation[1]);

}

// Loop that requests animation frames for itself, contains update and draw code that is not unique to any scene and everything else really
function gameLoop(timeStamp){
    // ******************************
    // First phase of game loop is updating the logic of the scene
    // ******************************

    // Calculate the number of seconds passed since the last frame
    secondsPassed = (timeStamp - oldTimeStamp) / 1000;
    oldTimeStamp = timeStamp;

    // Calculate fps
    fps = Math.round(1 / secondsPassed);

    // If too much lag here, skip this frame as the fps count being too low will cause unwanted behavior
    if(fps < 3){
        window.requestAnimationFrame(gameLoop);
        console.log("skipping a frame...");
        return;
    }

    if(scene.switchScene !== null){
        initializeScene(scene.switchScene);
    }

    // Call the update function for the scene
    switch (scene.name) {
       case "home": updateHome(timeStamp); break;
       case "tatakau": updateTatakau(timeStamp); break;
       case "adventure": updateAdventure(timeStamp); break;
       default: throw "Unknown Scene (update): "+scene.name; break;
    }

    // Update particle systems
    for (let i=scene.particleSystems.length-1;i>=0;i--) {
        let sys = scene.particleSystems[i];

        // Add all the particles we will keep to this array, to avoid using splice to remove particles
        let newArray = [];
        for (let j in sys.particles) {
            let p = sys.particles[j];

            // Only use the particle if it is not going to be destroyed
            if(timeStamp<p.destroyTime){
                p.x += p.velX/fps;
                p.y += p.velY/fps;
                p.velX += p.accX/fps;
                p.velY += p.accY/fps;
                p.velY += sys.gravity/fps;
                newArray.push(p)
            }
        }

        if(sys.createNewParticles){
            // If enough time has elapsed, create particle!
            while (timeStamp-sys.timeOfLastCreate >= 1000/sys.particlesPerSec && sys.particlesLeft > 0) {

                newArray.push(sys.newParticle(timeStamp));
                sys.timeOfLastCreate = sys.timeOfLastCreate + 1000/sys.particlesPerSec;

                //if the timestamp is way too off the current schedule (because the animation was stalled),
                //shift the schedule even though doing so may lead to a slight inaccuracy (200ms chosen arbitirarily)
                if(sys.timeOfLastCreate+200 < timeStamp){
                    sys.timeOfLastCreate=timeStamp;
                }

                if(sys.systemLifespan+sys.createTime<=timeStamp){
                    sys.createNewParticles = false;
                }
                sys.particlesLeft--;
            }
        } else if(sys.particles.length == 0 && sys.temporary){
            // If system is out of particles, destroy it!
            scene.particleSystems.splice(i,1)
            //alert("Murdering system at index " + i + " D:")
        }
        if(sys.particlesLeft === 0){
            sys.createNewParticles = false;
        }
        sys.particles = newArray;
    }

    if(frameCount%(fps*2) === 0){
        worstParticleSystem.createNewParticles = !worstParticleSystem.createNewParticles;
    }

    // ******************************
    // Updating logic finished, next is the drawing phase
    // ******************************

    // Clear canvas
    context.fillStyle = 'hsl(0,0%,0%)';
    context.fillRect(-1000, -1000, screenWidth+2000, screenHeight+2000);

    let particleCount = 0;

    // Draw particle systems
    for (let x in scene.particleSystems) {
        let sys = scene.particleSystems[x];
        sys.drawParticles(timeStamp);

        particleCount+=sys.particles.length;
    }

    // Draw the active buttons as it is not specifc to scene
    for (let x in scene.buttons) {
        let b = scene.buttons[x];
        let text = b.text.replaceAll("=",""); // i use = as a special delimiter, not to be displayed

        //context.reset();
        context.fillStyle = b.color;
        context.beginPath();
        context.roundRect(b.x, b.y, b.width, b.height, 28);
        context.fill();

        context.fillStyle = 'black';
        context.font = b.font;

        if (b.jp) {
            context.fillText(text, b.x+(b.width/2)-(b.fontSize*text.length/2), b.y+(b.height/2)+b.fontSize/4);
        } else {
            context.textAlign = "center";
            context.fillText(text, b.x+(b.width/2), b.y+(b.height/2)+b.fontSize/4);
        }


        context.textAlign = "start";
    }

    // Call the draw function for the scene
    switch (scene.name) {
       case "home": drawHome(); break;
       case "tatakau": drawTatakau(timeStamp); break;
       case "adventure": drawAdventure(timeStamp); break;
       default: throw "Unknown Scene (draw): "+scene.name; break;
    }

    // Draw constant elements
    context.fillStyle = textColor;
    if(showDevInfo){
        context.font = '18px Arial';
        context.textAlign = "right";
        context.fillText(note, screenWidth-30, screenHeight-110);

        context.textAlign = "start";
        context.fillText("Partcle Count: "+particleCount, screenWidth-200, screenHeight-80);
        context.fillText("Kanji Loaded: "+kanjiLoaded, screenWidth-200, screenHeight-140);
        context.fillText("FPS: "+fps, screenWidth-200, screenHeight-50);
    }

    context.font = '20px zenMaruLight';
    context.fillText(`I love you by a factor of ${love}.`, 120, screenHeight-30);

    // Draw tooltip over everything else
    if(scene.currentTooltip !== null){
        if(timeStamp - scene.currentTooltip.timeStamp > scene.tooltipBoxes[scene.currentTooltip.index].spawnTime){
            drawTooltip();
        }
    }

    if(isLoggingFrame){
        let statement = //"Time Stamp: " +timeStamp+ "\n" + "Scene: " +scene.name+ "\n"+ "Number of tooltips: " +scene.tooltipBoxes.length+ "\n";
`Time Stamp: ${timeStamp}
Scene: ${scene.name}
Number of tooltips: ${scene.tooltipBoxes.length}
Player Src: ${scene.playerSrc}
`;
        console.log(statement);
        alert(statement);
        isLoggingFrame=false;
    }

    // Handle shake effect
    if(shaking && timeStamp > timeOfLastShake+(shakeFrequency*1000)/fps){
        context.restore();
        context.save();
        context.translate((Math.random()-0.5)*shakeIntensity*2,(Math.random()-0.5)*shakeIntensity*2);
        timeOfLastShake = timeStamp;
    }

    // Keep requesting new frames
    frameCount++;
    requestAnimationFrame(gameLoop);

    //TODO: https://stackoverflow.com/questions/19764018/controlling-fps-with-requestanimationframe
}

function init(){
    // Load in images
    for (let i in characterList){
        let c = characterList[i];

        var spritesheet = new Image();
        spritesheet.src = `/assets/3x4charactersheets/${c}_spritesheet.png`
        var faces = new Image();
        faces.src = `/assets/faces/${c}_faces.png`

        characterSpritesheets[c] = spritesheet;
        characterFaces[c] = faces;
        characterBitrates[c] = 32;
    }

    // Get a reference to the canvas
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;

    love = localStorage.getItem('love');
    name = localStorage.getItem('name');
    love = love===null ? 0 : parseInt(love);
    name = name===null ? "" : name;

    initializeScene("home");

    window.requestAnimationFrame(gameLoop);
}
