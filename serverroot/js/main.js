"use strict";
let canvas,context;
window.onload = init;

/*
    My spaced repetition implementation
*/

// The srs object functions as a namespace for data related to the srs
var srs = {
    // Slime forest variables saved elsewhere for reference

    // Stores the user's srs data sorted by card. Temporary implementation, only used for the kanji srs and not card decks
    data:[],

    // Temporary implementation
    nextKanjiToIntro:0,

    // Stores deck information. Objects here contain:
    // deckName: string. indicates deck name.
    // daysStudied: num that indiates the total number of days that at least 1 card was studied. when this number is 0 it indicates a clean deck
    // fileName: string. indicates path of the deck's source file
    // cards: array. card objects contain a front and back field, and are stored independant of progrss
    // cardData: array. contains objects with user progress data that correspond to the index in cards
    // progressData: object. null if no data. contains all data about the user's progress that is not associated with a specfic card
    // studySession: object. null if not currently studying, otherwise contains information about the current study session
    decks:[],

    /*loadDeck: function(fileName){
        // First, check if deck is already loaded
        for(const d of decks){
            if(d.fileName === fileName){
                return "already loaded or failed loading idk"
            }
        }
    }*/
    studyingDeck: -1,
    servingCard: -1,
    beginDeckStudySession: function(deckNum){
        let studySession = {
            startTime: new Date(),

            // array of objects with:
            // index: int, index of the card from cardData
            // failed: boolean, whether this card has been failed yet this session or not
            cardsToStudy: [],

            // array of objects with:
            // index: int, index of the card from cardData
            // success: boolean, whether this card was passed on the first try or not
            studiedCards: [],
        };

        for (let i in this.decks[deckNum].cardData){
            const cd = this.decks[deckNum].cardData[i];

            if(cd.dateLastStudied === null){
                studySession.cardsToStudy.push({index: i, failed: false});
            } else if(new Date() - new Date(cd.dateLastStudied) >= cd.interval){
                studySession.cardsToStudy.push({index: i, failed: false});
            }
        }
        this.decks[deckNum].studySession = studySession;
        this.studyingDeck = deckNum;
    },

    finishDeckStudySession: function(){

    },

    // only to be called while a deck is currently being studied
    serveNextCard: function(){
        if(this.decks[this.studyingDeck].studySession.cardsToStudy.length === 0){
            return null;
        } else {
            this.servingCard = this.decks[this.studyingDeck].studySession.cardsToStudy[0];
            return this.decks[this.studyingDeck].cards[this.servingCard.index];
        }

    },

    // only to be called while a deck is currently being studied. takes true or false for whether the served card was a success or fail
    submitCardResult: function(success){
        let cardsToStudy = this.decks[this.studyingDeck].studySession.cardsToStudy;
        if(!success){
            cardsToStudy.push({index: cardsToStudy[0].index, failed: true});
        } else {
            this.decks[this.studyingDeck].studySession.studiedCards.push({index: cardsToStudy[0].index, success: !cardsToStudy[0].failed});
        }
        cardsToStudy.splice(0,1);
    }
};

/*
    Load important data  !!
*/

// When levels are loaded it will give us (relative) paths of all the images we need for them
var tilesetPaths = [];

// Contains Images of each tileset we need, the index corresponds with the layer that the tileset corrosponbds to
var tilesets = {
    tilesetImages: [],

    // Each element is an object that corresponds to the tileset
    // Those objects contain arrays of information that corresponds to each tile in the tileset
    tilesetTileInfo: [],
};

function loadTilesets(){
    for (let i in tilesetPaths){
        tilesets.tilesetImages.push(new Image());
        tilesets.tilesetImages[i].src = tilesetPaths[i].replace("..","/assets");
    }
}

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

// Contains all dialogue data directly from the file. Not to be modified after load.
var dialogueFileData = {
    andro: {},
    gladius: {},
    world: {},
    scenes: {},
};

// Loads the data !!!
let dialogueLoaded = false;
function processDialogueData(data) {
    const dialogueData = JSON.parse(data);

    dialogueFileData.scenes = dialogueData.scenes;
    dialogueFileData.world = dialogueData.worldDialogue;
    dialogueFileData.gladius = dialogueData.characterDialogue.Gladius;
    dialogueFileData.andro = dialogueData.characterDialogue.Andro;
    /*
    const splitLines = str => str.split(/\r?\n/);
    let splitData = splitLines(data);

    for(let i in splitData){
        const dialogueData = splitData[i].split('+');
        if(dialogueData.length < 2){
            break;
        }
        const category = dialogueData[0];
        const scenario = dialogueData[1];
        const dialogueLinesAndFaces = dialogueData.slice(2);

        let faceData = [];
        let dialogueLineData = [];
        // Split dialogue and faces
        for(let j in dialogueLinesAndFaces){
            faceData.push(dialogueLinesAndFaces[j].substring(0,2));
            dialogueLineData.push(dialogueLinesAndFaces[j].substring(3));
        }
        //console.log(character);
        dialogueFileData[category].push({
            scenario: scenario,
            faces: faceData,
            lines: dialogueLineData,
        });
    }*/
    dialogueLoaded = true;
}

function handleDialogueData() {
    if(this.status == 200) {
        processDialogueData(this.responseText);
    } else {
        alert("Handling dialogue data: Status " + this.status + ". We have failed and (chou redacted).");
    }
}

// Levels isnt the most amazing word for it technically but it is the terminology that ldtk uses so thats the terms we are using
var levels = [];

let levelsLoaded = false;
function processLevelData(data) {
    //console.log(data);
    const worldData = JSON.parse(data);
    const levelsData = worldData.levels;

    // Takes the length of the layers and takes off 2 for the entities and collisions layer
    const numTileLayers = worldData.defs.layers.length -2;

    // Load in tileset information
    for (let i=0;i<numTileLayers;i++){
        let tsetData = worldData.defs.tilesets[i];
        tilesetPaths.push(tsetData.relPath);
        tilesets.tilesetTileInfo.push({});

        const amountOfTiles = (tsetData.pxWid/tsetData.tileGridSize) * (tsetData.pxHei/tsetData.tileGridSize);
        for (let j=0;j<tsetData.enumTags.length;j++){
            tilesets.tilesetTileInfo[i][tsetData.enumTags[j].enumValueId] = Array(amountOfTiles).fill(false);
            //console.log(tsetData.enumTags[j].enumValueId);
            for (const id of tsetData.enumTags[j].tileIds){
                tilesets.tilesetTileInfo[i][tsetData.enumTags[j].enumValueId][id] = true;
            }
        }
    }

    for (let i in levelsData){
        levels[i] = {
            gridWidth: -1,
            gridHeight: -1,
            entities: [],
            collisions: [],

            // tileLayers is populated with objects with fields:
            // name - layer name
            // tiles - array of tile
            tileLayers: [],
        };
        const levelData = levelsData[i];
        const entityLayerData = levelData.layerInstances[0];
        const collisionLayerData = levelData.layerInstances[levelData.layerInstances.length-1];

        levels[i].gridWidth = collisionLayerData.__cWid;
        levels[i].gridHeight = collisionLayerData.__cHei;
        for (let j in entityLayerData.entityInstances){
            const e = entityLayerData.entityInstances[j];
            let entityData = {id: e.__identifier, px: e.px, src: [32,0], type: e.__tags[0]};
            for (let k in e.fieldInstances){
                const field = e.fieldInstances[k];
                entityData[field.__identifier] = field.__value;
            }
            levels[i].entities.push(entityData);
        }

        for(let j=0;j<numTileLayers;j++){
            let tileLayerData = levelData.layerInstances[j+1];
            let tileLayer = {
                name: tileLayerData.__identifier,
                tiles: [],
            }
            for (const t of tileLayerData.gridTiles){
                tileLayer.tiles.push({src: t.src, px: t.px, t: t.t});
            }
            levels[i].tileLayers.push(tileLayer);
        }
        levels[i].collisions = collisionLayerData.intGridCsv;
        levels[i].iid = levelData.iid;
        levels[i].neighbours = levelData.__neighbours;
        /*if(levels[i].water.length < 2){
            throw "You have no water and no hot boyfriend";
        }*/
    }
    levelsLoaded = true;

    loadTilesets();
}

function handleLevelData() {
    if(this.status == 200) {
        processLevelData(this.responseText);
    } else {
        alert("Handling level data: Status " + this.status + ". We have failed and you have negative hot men");
    }
}

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
let dictLoaded = false;
function processDict(data) {
    const splitLines = str => str.split(/\r?\n/);
    let splitData = splitLines(data);

    for(let i in splitData){
        const wordData = splitData[i].split('+');
        if(wordData.length === 2){
            dictionary.entries[wordData[0]] = wordData[1]
        }
    }

    dictLoaded = true;
}

let deckLoaded = false;
function processDeckData(data,fileName){
    // see srs object for information about this data structure
    var deck = {
        deckName: "nikka",
        daysStudied: 0,
        fileName: fileName,
        cards: [],
        cardData: [],
        studySession: null,
    };
    const splitLines = str => str.split(/\r?\n/);
    let splitData = splitLines(data);

    for(const line of splitData){
        const lineData = line.split('+');
        if(lineData.length < 2 || lineData[0] === "disable" || (lineData.length > 2 && lineData[2] === "disable")){
            continue;
        }
        if(lineData[0] === "days_studied"){
            deck.progressData = {daysStudied: lineData[1]};
        } else {
            var card = {};
            var cardData = {};
            card.front = lineData[0];
            if(dictionary.entries.hasOwnProperty(lineData[1])){
                card.back = dictionary.entries[lineData[1]];
            } else {
                card.back = "unknown"
            }
            if(dictionary.entries.hasOwnProperty(lineData[2])){
                cardData.progress = lineData[2];
            } else {
                cardData.progress = 0;
            }
            if(dictionary.entries.hasOwnProperty(lineData[3])){
                cardData.dateLastStudied = lineData[3];
            } else {
                cardData.dateLastStudied = null;
            }
            deck.cards.push(card);
            deck.cardData.push(cardData);
        }
    }
    srs.decks.push(deck);
    deckLoaded = true;
}

function handleDeckData() {
    if(this.status == 200) {
        processDeckData(this.responseText,"assets/srs decks/daily_deck.txt");
    } else {
        alert("Handling deck data: Status " + this.status + ". We have failed and you have negative hot men");
    }
}

var kanjiClient = new XMLHttpRequest();
kanjiClient.onload = handleKanjiData;
kanjiClient.open("GET", "assets/kanji.txt");
kanjiClient.send();

var dialogueClient = new XMLHttpRequest();
dialogueClient.onload = handleDialogueData;
dialogueClient.open("GET", "assets/dialogue.txt");
dialogueClient.send();

var levelClient = new XMLHttpRequest();
levelClient.onload = handleLevelData;
levelClient.open("GET", "assets/ldtk/testy.ldtk");
levelClient.send();

var deckClient = new XMLHttpRequest();
deckClient.onload = handleDeckData;

function handleDict() {
    if(this.status == 200) {
        processDict(this.responseText);
        deckClient.open("GET", "assets/srs decks/daily_deck.txt");
        deckClient.send();
    } else {
        alert("Handling dict data: Status " + this.status + ". We have failed and you have negative hot men");
    }
}

var dictClient = new XMLHttpRequest();
dictClient.onload = handleDict;
dictClient.open("GET", "assets/compiled_dictionary_data.txt");
dictClient.send();

/*
    Load our assets before doing anything else !!
*/

var uiThingImage = new Image();
uiThingImage.src = "assets/some ui/thing.png";

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

const characterList = ["witch","andro","gladius"];

var characterSpritesheets={},characterFaces={},characterBitrates={};
const faceBitrate = 96;

// Constants to indicate tile type
const WATER = 4;
const DIRT = 1;
const GRASS = 3;
const HILL = 2;
const GRASSBIOMETHINGS = 0;

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
    for(let i in tilesets.tilesetImages){
        if(!tilesets.tilesetImages[i].complete){
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

// Variables and constants related to graphics below
let textColor = "white";
let bgColor = "black";
const screenWidth = 1200, screenHeight = 950;

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
    text: "好き", font: '13px zenMaruRegular', fontSize: 13, jp: true,
    onClick: function() {
        randomColor = Math.random() > 0.5? '#ff80b0' : '#80ffb0';
        love+=1;
        note = "<3";
        localStorage.setItem('love', love.toString());
        if(scene.name === "adventure"){
            if(scene.sizeMod === 1.4){
                scene.sizeMod = 1;
            } else {
                scene.sizeMod = 1.4;
            }
        }
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
let cardCreationSceneButton = {
    x:-1000, y:-1000, width:150, height:100,
    neutralColor: '#b3b3ff', hoverColor: '#e6e6ff', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "カード=作成", font: '24px zenMaruLight', fontSize: 24, jp: true,
    onClick: function() {
        this.color = this.neutralColor;
        scene.switchScene = "card creation";
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
let nikkaSceneButton = {
    x:500, y:60, width:100, height:100,
    neutralColor: '#fffe15', hoverColor: '#ffff81', pressedColor: '#21f100', color: '#fffe15',
    text: "日課", font: '24px zenMaruLight', fontSize: 28, jp: true,
    onClick: function() {
        this.color = this.neutralColor;
        scene.switchScene = "nikka";
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
            throw "images arent loaded yet stupid";
        }
    }
};
let backToHomeButton = {
    x:20, y:screenHeight-100, width:60, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#c8c8fa', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Back", font: '14px zenMaruMedium', fontSize: 14,
    onClick: function() {
        this.color = this.neutralColor;
        scene.switchScene = "home";
    }
}

/* nikka buttons */

let studyDeckButton = {
    x:screenWidth/2 - 60 , y:420, width:120, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#c8c8fa', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Study Deck", font: '14px zenMaruMedium', fontSize: 14,
    onClick: function() {
        this.color = this.neutralColor;
        srs.beginDeckStudySession(0);
        scene.switchScene = "study deck";
    }
}

/* card study buttons */

let failButton = {
    x:screenWidth/2 + 25, y:600, width:75, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#c8c8fa', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Fail", font: '14px zenMaruMedium', fontSize: 14,
    onClick: function() {
        scene.cardResult = "fail";
    }
}

let passButton = {
    x:screenWidth/2 - 100 , y:600, width:75, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#c8c8fa', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Pass", font: '14px zenMaruMedium', fontSize: 14,
    onClick: function() {
        scene.cardResult = "pass";
    }
}
let pauseStudyButton = {
    x:screenWidth/2 - 125 , y:700, width:250, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#c8c8fa', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Finish Session and Generate File", font: '14px zenMaruMedium', fontSize: 14,
    onClick: function() {
        const file = new File(['fook u'], 'note.txt', {
            type: 'text/plain',
        })
        const link = document.createElement('a');
        const url = URL.createObjectURL(file);

        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}

let continueButton = {
    x:screenWidth/2 - 60, y:540, width:120, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#c8c8fa', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "See Back", font: '14px zenMaruMedium', fontSize: 14,
    onClick: function() {
        scene.showBack = true;
        failButton.enabled = true;
        passButton.enabled = true;
    }
}

let homeButtons = [loveButton,clearDataButton,tatakauSceneButton,cardCreationSceneButton,introductionButton,adventureButton,nikkaSceneButton];
let tatakauButtons = [loveButton,backToHomeButton];
let nikkaButtons = [loveButton,backToHomeButton,studyDeckButton];
let cardCreationButtons = [loveButton,backToHomeButton];
let adventureButtons = [loveButton,backToHomeButton];
let deckStudyButtons = [loveButton,backToHomeButton,continueButton,failButton,passButton,pauseStudyButton];

// Initializes an array of buttons during scene switch
function initializeButtons(buttons){
    for(const b of buttons){
        if(!b.hasOwnProperty("color")){
            b.color = b.neutralColor;
        }
        if(!b.hasOwnProperty("enabled")){
            b.enabled = true;
        }
    }
}

/*
    User input section (mouse + keyboard)

     scene.inputting is set to true when input needs to be collected and set false by the same source when
the text is finished being processed

    scene.finishedInputting is set to false at the same time inputting is set to true and set true the moment
the player pressed enter

    scene.textEntered is a string that is modified when inputting and represents the actual entered text
*/

// keyPressed variables only to be changed by input event listeners
let downPressed=false,upPressed=false,leftPressed=false,rightPressed=false;

// variables set to be true by input event listeners and set back to false after being handled by scene update
let zClicked=false,xClicked=false;

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
       case 'x': xClicked=true;
       case 'z': zClicked=true;
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
        if(!b.enabled){
            continue;
        }

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

// Code stolen and modified from https://fjolt.com/article/html-canvas-how-to-wrap-text
// Japanese text doesnt have spaces so we just split it anywhere, rough but easy solution
const wrapText = function(ctx, text, y, maxWidth, lineHeight, parseFileText = false, japanese = false) {
    // @description: wrapText wraps HTML canvas text onto a canvas of fixed width
    // @param ctx - the context for the canvas we want to wrap text on
    // @param text - the text we want to wrap.
    // @param y - the Y starting point of the text on the canvas.
    // @param maxWidth - the width at which we want line breaks to begin - i.e. the maximum width of the canvas.
    // @param lineHeight - the height of each line, so we can space them below each other.
    // @returns an array of [ lineText, x, y ] for all lines

    // Not by original author: Added parseFileText, which parses certain things out before using the text
    if(parseFileText){
        text = text.replace(/playerName/g,scene.player.name)
    }

    // First, start by splitting all of our text into words, but splitting it into an array split by spaces
    let wordBreak = ' ';
    if(japanese){
        wordBreak = '';
    }
    let words = text.split(wordBreak);
    let line = ''; // This will store the text of the current line
    let testLine = ''; // This will store the text when we add a word, to test if it's too long
    let lineArray = []; // This is an array of lines, which the function will return
    // Lets iterate over each word
    for(var n = 0; n < words.length; n++) {
        // Create a test line, and measure it..
        if(japanese){
            testLine += `${words[n]}`;
        } else {
            testLine += `${words[n]} `;
        }
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        // If the width of this test line is more than the max width
        if (testWidth > maxWidth && n > 0) {
            // Then the line is finished, push the current line into "lineArray"
            lineArray.push([line, y]);
            // Increase the line height, so a new line is started
            y += lineHeight;
            // Update line and test line to use this word as the first word on the next line
            if(japanese){
                line = `${words[n]}`;
                testLine = `${words[n]}`;
            } else {
                line = `${words[n]} `;
                testLine = `${words[n]} `;
            }

        }
        else {
            // If the test line is still less than the max width, then add the word to the current line
            if(japanese){
                line += `${words[n]}`;
            } else {
                line += `${words[n]} `;
            }
        }
        // If we never reach the full max width, then there is only one line.. so push it into the lineArray so we return something
        if(n === words.length - 1) {
            lineArray.push([line, y]);
        }
    }
    // Return the line array
    return lineArray;
}

// Tooltip to show reading and meaning of jp words. Probably will be other types of tooltips much later
function drawTooltip() {
    const word = scene.tooltipBoxes[scene.currentTooltip.index].word;
    let wrappedText = wrapText(context, dictionary.entries[word], mouseY+74, 360, 16);

    const boxX = mouseX+12;
    const boxY = mouseY+12;
    const boxWidth = 250;
    const boxHeight = wrappedText[wrappedText.length-1][1]-mouseY+12;

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
        // item[1] is the y coordinate to fill the text at
        context.fillText(item[0], mouseX+12+10+offsetX, item[1]+offsetY);
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

// Called when dialogue begins
function initializeDialogue(category, scenario, timeStamp){
    scene.dialogue = {
        startTime: timeStamp,
        currentLine: 0,
        textLines: dialogueFileData[category][scenario].textLines,
        lineInfo: dialogueFileData[category][scenario].lineInfo,
        playerDirection: currentDirection,
    };
}

// Draws a tile
function drawTile(type, src, x, y){
    const size = 16;
    context.drawImage(tilesets.tilesetImages[type], src[0], src[1], tileBitrate, tileBitrate, x, y, size*2*scene.sizeMod+1, size*2*scene.sizeMod+1);
}

// Draws a character
function drawCharacter(character, src, x, y){
    context.imageSmoothingEnabled = true;
    let size = characterBitrates[character]*scene.sizeMod;
    let image = characterSpritesheets[character];
    if(typeof image === "object"){
        context.drawImage(image, src[0], src[1], characterBitrates[character], characterBitrates[character], x, y, size, size);
    } else {
        console.warn("drawCharacter: Expected object got " + typeof image + ", also you have negative hot men.");
    }
    context.imageSmoothingEnabled = false;
}

// Draws an inanimate object
function drawInanimate(inanimate, x, y) {
    let size = 16*scene.sizeMod;
    let image = null;
    let srcX = 0;
    let srcY = 0;
    let bitrate = 16;
    if(inanimate.id === "Door"){
        image = houseTileset;
        srcX = 16*3;
        if(inanimate.state === "closed"){
            srcY = 16*1;
        } else if (inanimate.state === "half-closed"){
            srcY = 16*3;
        } else if (inanimate.state === "half-open"){
            srcY = 16*2;
        } else if (inanimate.state === "open"){
            srcY = 16*0;
        } else {
            console.alert("drawInanimate: Got unexpected door state: "+ inanimate.state);
        }
    } else {
        throw "Unknown inanimate type: " + inanimate.id;
    }

    if(typeof image === "object"){
        context.drawImage(image, srcX*scene.sizeMod, srcY*scene.sizeMod, bitrate, bitrate, x, y, size*2, size*2);
    } else {
        console.warn("drawInanimate: Expected object got " + typeof image + ", also you have negative hot men.");
    }
}

// Checks if a tile is marked for collision or not. Scene must be adventure scene.
// checkAdjacent to be set to "up" "left" "right" or "down" or to be left undefined
// - if defined, checks that adjacent tile instead of the one directly indicated by the x and y
// Returns:
// null for no collision, "bounds" for level boundary collision, returns the num of the collision tile if collision tile, or
//returns the reference to the entity object that was collided for entity collision
function isCollidingOnTile(x, y, checkAdjacent = false){
    let lev = levels[scene.levelNum];
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
    if (x < 0 || y < 0 || x > (lev.gridWidth-1)*32 || y > (lev.gridHeight-1)*32){
        return "bounds";
    }


    // Currently this local function does not need to exist, but I thought it might have needed to
    const getTileNum = function(x,y){return ((x/32) % lev.gridWidth) + (y/32)*lev.gridWidth;}
    let tileNum = getTileNum(x,y);
    if(tileNum>lev.collisions.length || tileNum<0){
        throw "Something is wrong with tile collision dumb bitch";
    } else if (lev.collisions[tileNum]!==0){
        return lev.collisions[tileNum];
    } else {
        for(let i in lev.entities) {

            if (lev.entities[i].px[0]*2===x && lev.entities[i].px[1]*2===y){
                return lev.entities[i];
            }
        }
    }
    return null;
}

// Changes the area (level) in adventure mode
// Takes the Iid of the area to be changed to because thats what the level neighbours are identified by (TODO: also allow change by level name or index)
function changeArea(iid){
    for(let i in levels){
        if(levels[i].iid === iid){
            scene.levelNum = i;
            return;
        }
    }
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

    bgColor = 'Black';
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
        scene.levelNum = 0;
        scene.sizeMod = 1.4;
        //showDevInfo = false;

        // Stores all player and progress info for adventure (as long as its information that would be worth saving between sessions)
        scene.player = {
            location: [64*2,112*2],
            graphicLocation: [64*2,112*2],
            src: [32,0],
            name: name==="" ? "Mari" : name,
            finishedWaterScene: false,
            finishedFruitScene: false,
            numFinishedTutorialScenes: 0,
        }

        scene.worldX = 80;
        scene.worldY = 20;

        // Counts the minutes elapsed from 0:00 in the day, for now it goes up 1 every second
        scene.currentGameClock = 900;

        // True when the player is currently moving to the tile they are "at" and the walking animation is playing
        scene.moving = false;

        // Direction player is currently moving in, if they are moving
        scene.movingDirection = null;

        // Switch foots each step taken
        scene.whichFoot = 0;

        // Object that holds dialogue data
        scene.dialogue = null;
        /* scene.dialogue is null when there is no current dialogue, or an object with these properties:
            startTime (number)
            currentLine (number of the current index for faces and lines to be displayed)
            faces (array)
            lines (array)
            playerDirection (string) for maintaining currentDirection regardless of fiding with controls
        */

        bgColor = 'rgb(103,131,92)';
        initializeDialogue("scenes","opening scene",scene.timeOfSceneChange);
    } else if (sceneName === "card creation"){
        scene.buttons = cardCreationButtons;
    } else if (sceneName === "nikka"){
        scene.buttons = nikkaButtons;
    } else if (sceneName === "study deck"){
        scene.buttons = deckStudyButtons;
        scene.currentCard = srs.serveNextCard();
        scene.showBack = false;
        scene.cardResult = "pending";
    }

    initializeButtons(scene.buttons);

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
    xClicked = zClicked = false;
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
    if(scene.dialogue !== null){
        if(scene.movingDirection!==null && movingAnimationDuration + scene.startedMovingTime < timeStamp){
            scene.movingDirection = null;
            scene.player.graphicLocation = scene.player.location;
            scene.player.src[0]=32;
            scene.whichFoot = (scene.whichFoot+1)%2;
        }
        //Something maybe
    } else {
        if(currentDirection === "down"){
            scene.player.src = [32,0];
        } else if (currentDirection === "left") {
            scene.player.src = [32,32];
        } else if(currentDirection === "right"){
            scene.player.src = [32,32*2];
        } else if(currentDirection === "up"){
            scene.player.src = [32,32*3];
        }
        if(scene.movingDirection===null && scene.dialogue === null){
            if(currentDirection === "down" && downPressed){
                let collision = isCollidingOnTile(scene.player.location[0],scene.player.location[1],"down");
                if(collision===null){
                    scene.player.location[1]+=32;
                    scene.movingDirection = "down";
                    scene.startedMovingTime = timeStamp;
                } else if (collision === "bounds"){
                    for(const n of levels[scene.levelNum].neighbours){
                        if(n.dir === "s"){
                            changeArea(n.levelIid);
                            scene.player.location[1]=-32;
                        }
                    }
                }
            } else if(currentDirection === "left" && leftPressed){
                let collision = isCollidingOnTile(scene.player.location[0],scene.player.location[1],"left");
                if(collision===null){
                    scene.player.location[0]-=32;
                    scene.movingDirection = "left";
                    scene.startedMovingTime = timeStamp;
                } else if (collision === "bounds"){
                    for(const n of levels[scene.levelNum].neighbours){
                        if(n.dir === "w"){
                            changeArea(n.levelIid);
                            scene.player.location[0]=18*32;
                        }
                    }
                }
            } else if(currentDirection === "right" && rightPressed){
                let collision = isCollidingOnTile(scene.player.location[0],scene.player.location[1],"right");
                if(collision===null){
                    scene.player.location[0]+=32;
                    scene.movingDirection = "right";
                    scene.startedMovingTime = timeStamp;
                } else if (collision === "bounds"){
                    for(const n of levels[scene.levelNum].neighbours){
                        if(n.dir === "e"){
                            changeArea(n.levelIid);
                            scene.player.location[0]=-32;
                        }
                    }
                }
            } else if(currentDirection === "up" && upPressed){
                let collision = isCollidingOnTile(scene.player.location[0],scene.player.location[1],"up");
                if(collision===null){
                    scene.player.location[1]-=32;
                    scene.movingDirection = "up";
                    scene.startedMovingTime = timeStamp;
                } else if (collision === "bounds"){
                    for(const n of levels[scene.levelNum].neighbours){
                        if(n.dir === "n"){
                            changeArea(n.levelIid);
                            scene.player.location[1]=18*32;
                        }
                    }
                }
            }
        } else if(movingAnimationDuration + scene.startedMovingTime < timeStamp){
            scene.movingDirection = null;
            scene.player.graphicLocation = scene.player.location;
            scene.player.src[0]=32;
            scene.whichFoot = (scene.whichFoot+1)%2;
        }
    }
    if(xClicked){
        if(scene.dialogue !== null){
            if(scene.dialogue.lines.length > scene.dialogue.currentLine+1){
                scene.dialogue.currentLine++;
            } else {
                currentDirection = scene.dialogue.playerDirection;
                scene.dialogue = null;
            }
        }
        xClicked = false;
    }
    if(zClicked){
        if(scene.dialogue !== null){
            if(scene.dialogue.textLines.length > scene.dialogue.currentLine+1){
                scene.dialogue.currentLine++;
            } else {
                currentDirection = scene.dialogue.playerDirection;
                scene.dialogue = null;
            }
        } else {
            let collision = isCollidingOnTile(scene.player.location[0],scene.player.location[1],currentDirection);
            if(collision !== null && typeof collision === "object"){
                note = `Talking with ${collision.id}!`;
                if(currentDirection === "down"){
                    collision.src[1] = spritesheetOrientationPosition.up * 32;
                } else if (currentDirection === "right"){
                    collision.src[1] = spritesheetOrientationPosition.left * 32;
                } else if (currentDirection === "left"){
                    collision.src[1] = spritesheetOrientationPosition.right * 32;
                } else {
                    collision.src[1] = spritesheetOrientationPosition.down * 32;
                }
                if(collision.type==="character"){
                    initializeDialogue(collision.id.toLowerCase(),"initial",timeStamp);
                }
            } else if(collision === 1){
                note = `Talking with the water instead of hot guy...`;
            } else {
                note = `Stop being lonely and talk to a hot guy already...`;
            }
        }
        zClicked = false;
    }

    // Update in-game time
    scene.currentGameClock = (280+Math.floor((timeStamp-scene.timeOfSceneChange)/1000))%1440;
}

function updateCardCreation(timeStamp){
    note = `dict loaded: ${dictLoaded}`;
}

function updateNikka(timeStamp){
    // ok
}

function updateDeckStudy(timeStamp){
    if(scene.cardResult === "pass"){
        srs.submitCardResult(true);
        scene.currentCard = srs.serveNextCard();
        scene.showBack = false;
        scene.cardResult = "pending";
    } else if(scene.cardResult === "fail"){
        srs.submitCardResult(false);
        scene.currentCard = srs.serveNextCard();
        scene.showBack = false;
        scene.cardResult = "pending";
    }
    if(scene.currentCard === null){
        srs.finishDeckStudySession();
        scene.cardResult = "no card";
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
        context.fillText("なら、君の実力見せてもらおっか", screenWidth/2, 150);
    } else if (timeElapsed < animationSpeed*6){
        let alpha = Math.max(0,(animationSpeed*5-timeElapsed)/animationSpeed);

        context.fillStyle = 'hsla(0,0%,100%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("なら、君の実力見せてもらおっか", screenWidth/2, 150);
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
        throw("Loading took wayyyyy too long also ur a stupid bitch");
    }
}

function drawAdventure(timeStamp){
    let lev = levels[scene.levelNum];

    // world width and height
    let w = lev.gridWidth*scene.tileSize+1;
    let h = lev.gridHeight*scene.tileSize+1;

    // Draw tile layers
    let deferredTiles = [];
    for (let i=lev.tileLayers.length-1;i>=0;i--) {
        let layer = lev.tileLayers[i];
        if(layer.name === "Grass_Biome_Things_Tiles"){
            for (let t of layer.tiles){
                if(tilesets.tilesetTileInfo[i].Front[t.t]){
                    deferredTiles.push({tilesetNum: i, tile: t});
                } else {
                    drawTile(i, t.src, scene.worldX+t.px[0]*2*scene.sizeMod, scene.worldY+t.px[1]*2*scene.sizeMod);
                }
            }
        } else if(layer.name === "Water_Tiles") {
            for (let t of layer.tiles){
                drawTile(i, [16*Math.floor( (timeStamp/400) % 4),0], scene.worldX+lev.water[i].px[0]*2*scene.sizeMod, scene.worldY+lev.water[i].px[1]*2*scene.sizeMod);
            }
        } else {
            for (let t of layer.tiles){
                drawTile(i, t.src, scene.worldX+t.px[0]*2*scene.sizeMod, scene.worldY+t.px[1]*2*scene.sizeMod);
            }
        }
    }

    context.font = '16px zenMaruRegular';
    context.fillStyle = textColor;
    context.fillText("Press Z to interact",scene.worldX+100, scene.worldY+30+h*scene.sizeMod);
    context.font = '20px zenMaruMedium';
    context.fillStyle = 'black';
    let hours = Math.floor(scene.currentGameClock/60);
    let minutes = Math.floor(scene.currentGameClock%60);
    if(hours === 0){hours = 24;}
    if(hours>12){
        if(minutes<10){
            context.fillText(`${hours-12}:0${minutes} PM`,scene.worldX+15, scene.worldY+30);
        } else {
            context.fillText(`${hours-12}:${minutes} PM`,scene.worldX+15, scene.worldY+30);
        }
    } else {
        if(minutes<10){
            context.fillText(`${hours}:0${minutes} AM`,scene.worldX+15, scene.worldY+30);
        } else {
            context.fillText(`${hours}:${minutes} AM`,scene.worldX+15, scene.worldY+30);
        }
    }

    // Draw player
    if(scene.movingDirection !== null){
        // Between 0 and 1 where 0 is the very beginning and 1 is finished
        let animationCompletion = (timeStamp - scene.startedMovingTime)/movingAnimationDuration;

        if(animationCompletion > 0.25 && animationCompletion < 0.75){
            scene.player.src = [scene.whichFoot*2*32,spritesheetOrientationPosition[scene.movingDirection]*32];
        } else {
            scene.player.src = [32,spritesheetOrientationPosition[scene.movingDirection]*32];
        }

        if(scene.movingDirection === "up"){
            scene.player.graphicLocation = [scene.player.location[0],scene.player.location[1]+scene.tileSize*(1-animationCompletion)];
        } else if(scene.movingDirection === "left"){
            scene.player.graphicLocation = [scene.player.location[0]+scene.tileSize*(1-animationCompletion),scene.player.location[1]];
        } else if(scene.movingDirection === "right"){
            scene.player.graphicLocation = [scene.player.location[0]-scene.tileSize*(1-animationCompletion),scene.player.location[1]];
        } else if(scene.movingDirection === "down"){
            scene.player.graphicLocation = [scene.player.location[0],scene.player.location[1]-scene.tileSize*(1-animationCompletion)];
        }
    }

    for (let i in lev.entities){
        const e = lev.entities[i];
        if(e.type === "character"){
            drawCharacter(e.id.toLowerCase(),e.src,e.px[0]*scene.sizeMod*2+scene.worldX,e.px[1]*scene.sizeMod*2+scene.worldY);
        } else {
            drawInanimate(e,e.px[0]*2+scene.worldX,e.px[1]*2+scene.worldY)
        }

    }
    drawCharacter("witch",scene.player.src,scene.worldX+scene.player.graphicLocation[0]*scene.sizeMod,scene.worldY+scene.player.graphicLocation[1]*scene.sizeMod);
    //context.restore();

    // Draw foreground elements
    for (const dt of deferredTiles){
        drawTile(dt.tilesetNum, dt.tile.src, scene.worldX+dt.tile.px[0]*2*scene.sizeMod, scene.worldY+dt.tile.px[1]*2*scene.sizeMod);
    }

    // Apply time of day brightness effect
    let maximumDarkness = 0.4
    if(hours >= 19 || hours < 5){
        context.fillStyle = `hsla(0, 0%, 0%, ${maximumDarkness})`;
    } else if(hours >= 7 && hours < 17){
        context.fillStyle = `hsla(0, 0%, 0%, 0)`;
    } else if(hours < 7){
        // Sunrise. Starts at 5 AM (game clock 300) finishes at 7 AM (game clock 420)
        let phase = 0.5 + (scene.currentGameClock-300)/120
        let a = ((maximumDarkness/2) * Math.sin(Math.PI*phase))+maximumDarkness/2;
        context.fillStyle = `hsla(0, 0%, 0%, ${a})`;
    } else if(hours >= 17){
        // Sunrise. Starts at 5 PM (game clock 1020) finishes at 7 PM (game clock 1140)
        let phase = 1.5 + (scene.currentGameClock-300)/120
        let a = ((maximumDarkness/2) * Math.sin(Math.PI*phase))+maximumDarkness/2;
        context.fillStyle = `hsla(0, 0%, 0%, ${a})`;
    }
    context.fillRect(scene.worldX, scene.worldY, w*scene.sizeMod, h*scene.sizeMod);


    // Draw dialogue box
    if(scene.dialogue !== null){
        context.fillStyle = 'hsl(0, 100%, 0%, 78%)';
        context.beginPath();
        context.roundRect(scene.worldX, scene.worldY+(h*scene.sizeMod)-96*scene.sizeMod, w*scene.sizeMod, scene.sizeMod*96);
        context.fill();

        const faceCharacter = scene.dialogue.lineInfo[scene.dialogue.currentLine].face;
        const faceNum = scene.dialogue.lineInfo[scene.dialogue.currentLine].faceNum;
        context.fillStyle = textColor;
        context.font = `${Math.floor(16*scene.sizeMod)}px zenMaruRegular`;

        // Draw differently depending on player vs non-player vs no image
        const drawDialogueForPlayer = function(facesImage){
            let wrappedText = wrapText(context, scene.dialogue.textLines[scene.dialogue.currentLine], (scene.worldY+h*scene.sizeMod-72*scene.sizeMod), (w*scene.sizeMod-124*scene.sizeMod), 20*scene.sizeMod, true);
            wrappedText.forEach(function(item) {
                // item[0] is the text
                // item[1] is the y coordinate to fill the text at
                context.fillText(item[0], (96+lev.gridWidth)*scene.sizeMod+scene.worldX, item[1]);
            });
            context.drawImage(facesImage, (faceNum%4)*faceBitrate, Math.floor(faceNum/4)*faceBitrate, faceBitrate, faceBitrate, scene.worldX, scene.worldY+(h*scene.sizeMod)-96*scene.sizeMod, 96*scene.sizeMod, 96*scene.sizeMod);
        };
        const drawDialogueForNonPlayer = function(facesImage){
            let wrappedText = wrapText(context, scene.dialogue.textLines[scene.dialogue.currentLine], scene.worldY+h*scene.sizeMod-72*scene.sizeMod, w*scene.sizeMod-144*scene.sizeMod, 20*scene.sizeMod, true);
            wrappedText.forEach(function(item) {
                // item[0] is the text
                // item[1] is the y coordinate to fill the text at
                context.fillText(item[0], (16+lev.gridWidth)*scene.sizeMod+scene.worldX, item[1]);
            });
            context.save();
            context.scale(-1,1);
            context.drawImage(facesImage, (faceNum%4)*faceBitrate, Math.floor(faceNum/4)*faceBitrate, faceBitrate, faceBitrate, -1*(scene.worldX+w*scene.sizeMod), scene.worldY+h*scene.sizeMod-96*scene.sizeMod, 96*scene.sizeMod, 96*scene.sizeMod);
            context.restore();
        };
        const drawDialogueForNobody = function(){
            let wrappedText = wrapText(context, scene.dialogue.textLines[scene.dialogue.currentLine], scene.worldY+h*scene.sizeMod-72*scene.sizeMod, w*scene.sizeMod-40*scene.sizeMod, 20*scene.sizeMod, true);
            wrappedText.forEach(function(item) {
                // item[0] is the text
                // item[1] is the y coordinate to fill the text at
                context.fillText(item[0], (16+lev.gridWidth)*scene.sizeMod+scene.worldX, item[1]);
            });
        };
        context.imageSmoothingEnabled = true;
        if(faceCharacter==="Gladius"){
            drawDialogueForNonPlayer(characterFaces.gladius);
        } else if (faceCharacter==="Andro"){
            drawDialogueForNonPlayer(characterFaces.andro);
        } else if (faceCharacter==="player"){
            drawDialogueForPlayer(characterFaces.witch);
        } else {
            drawDialogueForNobody();
        }
        context.imageSmoothingEnabled = false;
    }

    // Draw the right part of the screen
    context.fillStyle = 'hsl(0, 100%, 0%, 55%)';
    context.beginPath();
    context.roundRect(scene.worldX+18*16*scene.sizeMod*2+30, scene.worldY, 300, 805, 30);
    context.fill();

    context.font = '32px zenMaruMedium';
    context.textAlign = 'center';
    context.fillStyle = 'white';
    context.fillText("Status", scene.worldX+18*16*scene.sizeMod*2+30 + 150, scene.worldY+50);
    drawCharacter("witch",[32,0],scene.worldX+18*16*scene.sizeMod*2+30 + 225,scene.worldY+120);

    context.fillStyle = 'hsl(0, 100%, 100%, 40%)';
    context.fillRect(scene.worldX+18*16*scene.sizeMod*2+30 + 80, scene.worldY+65, 300-160, 2)

    context.font = '24px zenMaruRegular';
    context.textAlign = 'center';
    context.fillStyle = "#d5a6ff";
    context.fillText("Mari", scene.worldX+18*16*scene.sizeMod*2+30 + 150, scene.worldY+100);

    context.font = '18px zenMaruRegular';
    context.textAlign = 'left';
    context.fillStyle = "white";
    context.fillText("HP: ", scene.worldX+18*16*scene.sizeMod*2+30 + 150, scene.worldY+100);
}

function drawCardCreation(timeStamp){
    context.fillStyle = 'white';
    context.font = '20px zenMaruRegular';
    context.textAlign = 'center';
    context.fillText("You can't actually make new cards here yet (just manually make the deck txt file right now)", screenWidth/2, 100);
    context.fillText("But this is where you can do deck editing and viewing i guess?", screenWidth/2, 128);
}

function drawNikka(timeStamp){
    context.fillStyle = 'white';
    context.font = '20px zenMaruRegular';
    context.textAlign = 'center';
    context.fillText("Remember to come here when you have added 10 new sentence cards!", screenWidth/2, 100);
    context.fillText("Deck loaded: " + deckLoaded, screenWidth/2, 128);
    if(deckLoaded){
        let d = srs.decks[0];
        if(d.progressData === null){
            context.fillText("No progress data for the daily deck! Go ahead and start making progress by studying!", screenWidth/2, 156);
        } else {
            context.fillText("Studied daily deck for "+progressData.daysStudied, screenWidth/2, 156);
        }
    }
    if(srs.decks[0])
    context.fillText("Deck loaded: " + deckLoaded, screenWidth/2, 128);
}

function drawDeckStudy(timeStamp){
    let d = srs.decks[srs.studyingDeck];
    context.fillStyle = '#dedede';
    context.font = '16px zenMaruRegular';
    context.textAlign = 'left';
    context.fillText("Deck name: "+d.deckName, 20, 40);
    context.fillText("Number of cards: "+d.cards.length, 20, 60);
    context.fillText("Cards to study: "+d.studySession.cardsToStudy.length, 20, 80);

    context.fillStyle = 'white';
    context.font = '20px zenMaruRegular';
    context.textAlign = 'center';
    context.fillText("Studying deck. Front of card:", screenWidth/2, 100);
    let wrappedText = wrapText(context, scene.currentCard.front, 150, screenWidth*2/3, 25, false, true);
    wrappedText.forEach(function(item) {
        // item[0] is the text
        // item[1] is the y coordinate to fill the text at
        context.fillText(item[0], screenWidth/2, item[1]);
    });
    //context.fillText(scene.currentCard.front, screenWidth/2, 150);
    if(scene.showBack){
        context.fillText("Back of card:", screenWidth/2, 250);
        let wrappedText = wrapText(context, scene.currentCard.back, 300, screenWidth*2/3, 25);
        wrappedText.forEach(function(item) {
            // item[0] is the text
            // item[1] is the y coordinate to fill the text at
            context.fillText(item[0], screenWidth/2, item[1]);
        });
        //context.fillText(scene.currentCard.back, screenWidth/2, 300);
    }
    /*if(scene.cardResult === "fail"){

    }*/

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
       case "card creation": updateCardCreation(timeStamp); break;
       case "nikka": updateNikka(timeStamp); break;
       case "study deck" : updateDeckStudy(timeStamp); break;
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
    context.fillStyle = bgColor;
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
        if(!b.enabled){
            continue;
        }
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
       case "card creation": drawCardCreation(timeStamp); break;
       case "nikka": drawNikka(timeStamp); break;
       case "study deck": drawDeckStudy(timeStamp); break;
       default: throw "Unknown Scene (draw): "+scene.name; break;
    }

    // Draw constant elements
    context.fillStyle = textColor;
    if(showDevInfo && scene.name !== "adventure"){
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
Player Src: ${scene.player.src}
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
