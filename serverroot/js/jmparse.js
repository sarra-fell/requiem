
// A clone of an older version of main.js, in this i will experiment with parsing and ajax
// https://www.w3schools.com/js/js_ajax_intro.asp

"use strict";
let canvas,context;
let screenWidth = 950,
    screenHeight = 800;

// Load our fonts before doing anything else !!
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

/*
// load our text file!!!
function loadFile(filePath) {
      var result = null;
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.open("GET", filePath, false);
      xmlhttp.send();
      if (xmlhttp.status==200) {
        result = xmlhttp.responseText;
      }
      alert("Success " + filePath + result.length);
      return result;
}
//alert(loadFile("assets/smol_test_file.txt"))

let jmdictPromise = new Promise(function(resolve, reject){
    jmdict = loadFile("assets/JMdict_e");
    if(jmdict.length > 100){
        resolve("1.5 million line dictionary get :)");
    } else {
        reject(new Error("uhhhhhhhhhhh lets not talk about it"));
    }
}).then(function(font){jmdictLoaded=true;},alert);
*/

var jmdict = "", jmdictLoaded = false;

function processData(data) {
    jmdictLoaded = true;
    jmdict = data;
    //alert(data);
}

function handler() {
  if(this.status == 200) {
    processData(this.responseText);
  } else {
    alert(this.status + ": we have failed and you have negative bitches");
  }
}

var client = new XMLHttpRequest();
client.onload = handler;
client.open("GET", "assets/JMdict_e");
client.send();


let ballX=50, ballY=50, ballRadius=30;
let playerX=200,playerY=400, playerRadius=30, playerColor = '#000000';

//speed and velocity numbers are in pixels per second
let ballVelocityX=500, ballVelocityY=500;
let playerSpeed=400, bulletSpeed=2500;

let bulletRadius = 10;
let bullets=[{bulletX: playerX,bulletY: playerY,bulletVelocityX: bulletSpeed,bulletVelocityY: bulletSpeed}];

// Controls the state of the game
let scene = "home";

// Now() of when the scene was last changed, used to control cinematic elements
let timeOfSceneChange = 0;

let love = 0, note = "無";
let name = "nameless", nameRecentlyLearned=false;
let logFrame = false; //this becomes true when we click the log button
let loggingBegin = false; //this becomes true if logframe is true at the beginning of a frame, turning on logs for a frame before they both become false

let loveButton = {　　
    x:20, y:screenHeight-50, width:80, height:30,
    neutralColor: '#ed78ed', hoverColor: '#f3a5f3', pressedColor: '#7070db', color: '#ed78ed',
    text: "<333333", font: '13px zenMaruRegular',
    onClick: function() {
        randomColor = Math.random() > 0.5? '#ff80b0' : '#80ffb0';
        love+=1;
        localStorage.setItem('love', love.toString());
    }
};
let clearDataButton = {
    x:screenWidth-100, y:screenHeight-50, width:80, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#e6e6ff', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Reset data", font: '13px zenMaruRegular',
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
    text: "戦う", font: '24px zenMaruRegular',
    onClick: function() {
        scene = "tatakau";
        activeButtons = tatakauButtons;
        particleSystems = [];
        timeOfSceneChange = performance.now();
        this.color = this.neutralColor;
        inputting = false;
        finishedInputting = true;
    }
};
let introductionButton = {
    x:620, y:300, width:150, height:100,
    neutralColor: '#b3b3ff', hoverColor: '#e6e6ff', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "自己紹介", font: '24px zenMaruRegular',
    onClick: function() {
        inputting = true;
        finishedInputting = false;
    }
};
let tatakauBackButton = {
    x:20, y:screenHeight-100, width:60, height:30,
    neutralColor: '#b3b3ff', hoverColor: '#ff66ff', pressedColor: '#ff66ff', color: '#b3b3ff',
    text: "Back", font: '14px zenMaruMedium',
    onClick: function() {
        scene = "home";
        activeButtons = homeButtons;
        particleSystems = homeParticleSystems;
        timeOfSceneChange = performance.now();
        this.color = this.neutralColor;
        inputting = false;
        finishedInputting = true;
    }
}

let homeButtons = [loveButton,clearDataButton,tatakauSceneButton,introductionButton];
let tatakauButtons = [loveButton,tatakauBackButton];
let activeButtons = homeButtons;

let secondsPassed=0,oldTimeStamp=performance.now(),fps=0; //all used to measure fps

// complex shapes like this can be created with tools
// although it may be better to use an image instead
const heartPath = new Path2D('M24.85,10.126c2.018-4.783,6.628-8.125,11.99-8.125c7.223,0,12.425,6.179,13.079,13.543 c0,0,0.353,1.828-0.424,5.119c-1.058,4.482-3.545,8.464-6.898,11.503L24.85,48L7.402,32.165c-3.353-3.038-5.84-7.021-6.898-11.503 c-0.777-3.291-0.424-5.119-0.424-5.119C0.734,8.179,5.936,2,13.159,2C18.522,2,22.832,5.343,24.85,10.126z');

// Get a random color, red or blue
let randomColor = Math.random() > 0.5? '#ff8080' : '#0099b0';

window.onload = init;

//handle keypress events
/*
window.addEventListener('keypress',function(e) {
    alert(String.fromCharCode(e.keyCode));
},false);
*/

//user movement buttons
let downPressed=false,upPressed=false,leftPressed=false,rightPressed=false;

//basic mouse tracking
let mouseDown=false,mouseX=0,mouseY=0;

//used to know the x and y of the last mousedown, mostly for determining if the mouseup or mouse click occured in the same place as it
//so that we know whether a button was actually fully clicked or not
let mousedownX=-1,mousedownY=-1;


/*
    Text input solution #1 is to implement it myself with just canvas. Comes with many downsides but
the plus is that it is simple and easy to understand the modify the behavior.


     Inputting is set to true when input needs to be collected and set false by the same source when
the text is finished being processed

    finishedInputting is set to false at the same time inputting is set to true and set true the moment
the player pressed enter

    textEntered is a string that is modified when inputting and represents the actual entered text
*/
let inputting = false, finishedInputting = true, textEntered = "";

//handle keydown events
window.addEventListener('keydown',function(e) {
    switch (e.key) {
       case 'ArrowLeft': leftPressed=true; break; //Left key
       case 'ArrowUp': upPressed=true; break; //Up key
       case 'ArrowRight': rightPressed=true; break; //Right key
       case 'ArrowDown': downPressed=true; break; //Down key
       case 'Enter': finishedInputting=true; break; //Down key
       default: if(!finishedInputting){
           switch (e.key) {
              case 'Backspace': if(textEntered.length>0){
                  textEntered = textEntered.substring(0,textEntered.length-1);
              } break;
              default: if(e.key.length===1){
                  textEntered = textEntered+e.key;
              }
          }
       } break;
   }
},false);

//handle keyup events
window.addEventListener('keyup',function(e) {
    switch (e.key) {
       case 'ArrowLeft': leftPressed=false; break; //Left key
       case 'ArrowUp': upPressed=false; break; //Up key
       case 'ArrowRight': rightPressed=false; break; //Right key
       case 'ArrowDown': downPressed=false; break; //Down key
       case 'L': logFrame=true; break; //L key
       default: break; //Everything else
   }
},false);

window.addEventListener('mousemove',function(e) {
    let rect = canvas.getBoundingClientRect();

    // mouse x and y relative to the canvas
    mouseX = Math.floor(e.x - rect.x);
    mouseY = Math.floor(e.y - rect.y);

    //check if was hovered on button so we can change color!
    for (let x in activeButtons) {
        let b = activeButtons[x];
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
},false);

window.addEventListener('mousedown',function(e) {
    mouseDown=true;
    let rect = canvas.getBoundingClientRect();

    // mouse x and y relative to the canvas
    mouseX = mousedownX = Math.floor(e.x - rect.x);
    mouseY = mousedownY = Math.floor(e.y - rect.y);

    //check if was pressed on button so we can change color!
    for (let x in activeButtons) {
        let b = activeButtons[x];
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
    activeButtons;

    // Click x and y relative to the canvas
    let x = Math.floor(e.x - rect.x);
    let y = Math.floor(e.y - rect.y);

    // Get distance between player and the click which is the magnitude of the vector
    let a = x-playerX;
    let b = y-playerY;
    let distance = Math.sqrt(a**2 + b**2);

    // Make bullet going at a velocity of the unit vector times the bullet speed
    bullets.push({bulletX: playerX,bulletY: playerY,
    bulletVelocityX: a*bulletSpeed/distance,bulletVelocityY: b*bulletSpeed/distance});

    for (let x in activeButtons) {
        let b = activeButtons[x];

        if (mouseX >= b.x && mouseX <= b.x + b.width && mouseY >= b.y && mouseY <= b.y + b.height) {
            b.color = b.hoverColor;

            //only register as a click if when the mouse was pressed down it was also within the button.
            //note that this implementation does not work for a moving button so if that is needed this would need to change
            if (mousedownX >= b.x &&         // right of the left edge AND
                mousedownX <= b.x + b.width &&    // left of the right edge AND
                mousedownY >= b.y &&         // below the top AND
                mousedownY <= b.y + b.height) {b.onClick();}
        } else {
            b.color = b.neutralColor;
        }
    }

},false);

// Tooltip to show reading and meaning of jp words
function drawTooltip() {
    context.fillStyle = 'hsl(300, 17%, 71%)';
    context.beginPath();
    context.roundRect(mouseX, mouseY, 100, 200, 28);
    context.fill();
}

// Useful function for particle generation, returns unit vector of random direction
// Mod and shift are optional arguments that allows the random angles generated to be changed
function randomUnitVector(mod=1,shift=0) {
    let randomAngle = Math.random()*2*Math.PI*mod+shift*Math.PI;
    return [Math.cos(randomAngle),Math.sin(randomAngle)];
}

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

        context.fillStyle = 'hsla('+p.hue+',100%,50%,'+(p.createTime-timeStamp+this.particleLifespan)/this.particleLifespan+')';
        context.beginPath();
        context.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        context.fill();
    }
} //Draw particles round

let drawParticlesTypeOne = function(timeStamp){
    for (let x in this.particles) {
        let p = this.particles[x];

        context.fillStyle = 'hsla('+p.hue+',100%,50%,'+(p.createTime-timeStamp+this.particleLifespan)/this.particleLifespan+')';
        //context.beginPath();
        context.fillRect(p.x, p.y, p.size, p.size);
        //context.fill();
    }
} // Draw particles square

// Particle creation functions, returns a particle object
let newParticleTypeZero = function(timeStamp){
    return {x: this.x, y: this.y, hue: this.hue, size: this.particleSize,
            createTime: timeStamp, destroyTime: timeStamp+this.particleLifespan,
            velX: (Math.random()-0.5)*100, velY: (Math.random()-0.5)*100};
} // Distributes particles in square with random magnitude

let newParticleTypeOne = function(timeStamp){
    let v = randomUnitVector();
    return {x: this.x, y: this.y, hue: this.hue, size: this.particleSize,
            createTime: timeStamp, destroyTime: timeStamp+this.particleLifespan,
            velX: v[0]*50, velY: v[1]*50};
} // Distributes particles in circle with uniform magnitude

let newParticleTypeTwo = function(timeStamp){
    let v = randomUnitVector();
    return {x: this.x, y: this.y, hue: this.hue, size: this.particleSize,
            createTime: timeStamp, destroyTime: timeStamp+this.particleLifespan,
            velX: v[0]*50*Math.random(), velY: v[1]*50*Math.random()};
} // Distributes particles in circle with random magnitude

// Returns a particle system object, takes in an object to be able to make use of named parameters
function createParticleSystem({x=600, y=600, hue=0, particlesPerSec=50, drawParticles=drawParticlesTypeOne,
    newParticle=newParticleTypeZero,
particleSize=7, particleLifespan=1000} = {}) {
    return {
        x: x, y: y, hue: hue, particlesPerSec: particlesPerSec, drawParticles: drawParticles, newParticle: newParticle,
        particleSize: particleSize, particleLifespan: particleLifespan,
        particles: [], timeOfLastCreate: -1,
    };
}

let bestParticleSystem = {
    x: 600, y:500, hue: 240, particlesPerSec: 70, drawParticles: drawParticlesTypeZero, newParticle: newParticleTypeOne,
    particleSize: 6, particleLifespan: 1200,
    particles: [], timeOfLastCreate: -1,
};
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
    x: 600, y:700, hue: 290, particlesPerSec: 160, drawParticles: drawParticlesTypeZero, newParticle: newParticleTypeOne,
    particleSize: 3, particleLifespan: 1700,
});
let wonkiestParticleSystem = {
    x: 400, y:700, hue: 330, particlesPerSec: 160, drawParticles: drawParticlesTypeZero, newParticle: newParticleTypeTwo,
    particleSize: 3, particleLifespan: 1700,
    particles: [], timeOfLastCreate: -1,
};
let playerParticleSystem = {
    x: playerX, y: playerX, hue: 120, particlesPerSec: 80, drawParticles: drawParticlesTypeOne, newParticle: newParticleTypeOne,
    particleSize: 5, particleLifespan: 1500,
    particles: [], timeOfLastCreate: -1,
};
let homeParticleSystems = [bestParticleSystem,worstParticleSystem,silliestParticleSystem,,wonkiestParticleSystem,playerParticleSystem];

// The array of particle systems to be drawn
let particleSystems = homeParticleSystems;

// for performance testing
/*for (let i=0;i<30;i++){
    particleSystems.push({
            x: 60+i*28, y:100, hue: 290, particlesPerSec: 144,
            particles: [], timeOfLastCreate: -1,
    });
}*/

//function createParticleSystem(x,y,color){}

// Draw function called during home scene
function drawHome(){
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
    context.fillStyle = 'black';
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
    if(inputting){
        if(!finishedInputting){
            context.fillStyle = 'black';
            context.font = '16px zenMaruMedium';
            //x:620, y:300
            context.fillText("Hello! My name is Sarracenia!", 600, 250);
            context.fillText("What is your name?", 600, 270);
            context.fillText(textEntered+"_", 600, 290);
        } else {
            name = textEntered;
            localStorage.setItem('name', name);
            inputting = false;
            nameRecentlyLearned = true;
            textEntered = "";
        }
    }

    // Background was drawn; now draw the object(s)

    // Draw the Ball
    context.fillStyle = randomColor;
    context.beginPath();
    context.arc(ballX, ballY, ballRadius, 0, 2 * Math.PI);
    context.fill();

    // Draw the Player (who is also a ball)
    context.fillStyle = playerColor;
    context.beginPath();
    context.arc(playerX, playerY, playerRadius, 0, 2 * Math.PI);
    context.fill();

    // Draw Bullets
    for (let x in bullets) {
        let bullet = bullets[x];
        //context.fillStyle = 'black';
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
    let timeElapsed = timeStamp - timeOfSceneChange;

    let animationSpeed = 1000;
    if(timeElapsed < animationSpeed*2){
        let alpha = timeElapsed/animationSpeed;

        context.fillStyle = 'hsla(0,0%,0%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("君も戦うのね", screenWidth/2, 100);
    } else if (timeElapsed < animationSpeed*4) {
        let alpha = Math.max(0,(animationSpeed*3-timeElapsed)/animationSpeed);

        context.fillStyle = 'hsla(0,0%,0%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("君も戦うのね", screenWidth/2, 100);

        alpha = (timeElapsed-animationSpeed*2)/animationSpeed;

        context.fillStyle = 'hsla(0,0%,0%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("なら、君の実力見せてもらいます", screenWidth/2, 150);
    } else if (timeElapsed < animationSpeed*6){
        let alpha = Math.max(0,(animationSpeed*5-timeElapsed)/animationSpeed);

        context.fillStyle = 'hsla(0,0%,0%,'+alpha+')';
        context.font = '20px zenMaruRegular';
        context.textAlign = 'center';
        context.fillText("なら、君の実力見せてもらいます", screenWidth/2, 150);
    } else {
        if(inputting){
            if(!finishedInputting){
                context.font = '20px zenMaruRegular';
                context.fillStyle = 'black';
                context.textAlign = 'center';
                context.fillText("火", screenWidth/2, 200);
                context.fillText(textEntered+"_", screenWidth/2, 250);
            } else {
                note = textEntered;
                inputting = false;
                textEntered = "";
            }
        } else {
            inputting = true;
            finishedInputting = false;
        }
    }
}

function gameLoop(timeStamp){

    // ******************************
    // First phase of game loop is updating the logic of the scene
    // ******************************
    loggingBegin=logFrame;

    // Calculate the number of seconds passed since the last frame
    secondsPassed = (timeStamp - oldTimeStamp) / 1000;
    oldTimeStamp = timeStamp;

    // Calculate fps
    fps = Math.round(1 / secondsPassed);

    // If too much lag here, skip this frame
    if(fps < 3){
        window.requestAnimationFrame(gameLoop);
        //alert("skipping a frame...");
        return;
    }

    // Update ball and player
    {
    // Update ball location
    ballX += ballVelocityX/fps;
    ballY += ballVelocityY/fps;

    //Turn direction on collision with screen edge
    if(ballRadius+ballX>screenWidth){
        ballX=screenWidth-ballRadius;
        ballVelocityX*=-1;
    }
    if(ballRadius+ballY>screenHeight){
        ballY=screenHeight-ballRadius;
        ballVelocityY*=-1;
    }
    if(ballX<ballRadius){
        ballX=ballRadius;
        ballVelocityX*=-1;
    }
    if(ballY<ballRadius){
        ballY=ballRadius;
        ballVelocityY*=-1;
    }

    // Update player location
    if(upPressed){
        playerY-=playerSpeed/fps;
    }
    if(downPressed){
        playerY+=playerSpeed/fps;
    }
    if(leftPressed){
        playerX-=playerSpeed/fps;
    }
    if(rightPressed){
        playerX+=playerSpeed/fps;
    }

    playerParticleSystem.x = playerX;
    playerParticleSystem.y = playerY;
    }

    // Update bullets
    for (let x in bullets) {
        let bullet = bullets[x];
        bullet.bulletX+=bullet.bulletVelocityX/fps;
        bullet.bulletY+=bullet.bulletVelocityY/fps;

        // Despawn offscreen bullets
        if(
            (bullet.bulletX > screenWidth || bullet.bulletX < 0) ||
            (bullet.bulletY > screenHeight || bullet.bulletY < 0)
        ){
            bullets.splice(x, 1);
        }

        // If bullet hits ball, point get
        if((Math.sqrt((ballX-bullet.bulletX)**2 + (ballY-bullet.bulletY)**2)) < ballRadius){
            bullets.splice(x, 1);
        }
    }

    // Update particle systems
    for (let x in particleSystems) {
        let sys = particleSystems[x];

        // Add all the particles we will keep to this array, to avoid using splice to remove particles
        let newArray = [];
        for (let x in sys.particles) {
            let p = sys.particles[x];

            // Only use the particle if it is not going to be destroyed
            if(timeStamp<p.destroyTime){
                p.x += p.velX/fps;
                p.y += p.velY/fps;
                newArray.push(p)
            }
        }

        // If enough time has elapsed, create particle!
        while (timeStamp-sys.timeOfLastCreate >= 1000/sys.particlesPerSec) {

            newArray.push(sys.newParticle(timeStamp));
            sys.timeOfLastCreate = sys.timeOfLastCreate + 1000/sys.particlesPerSec;

            //if the timestamp is way too off the current schedule (because the animation was stalled),
            //shift the schedule even though doing so may lead to a slight inaccuracy (300ms chosen arbitirarily)
            if(sys.timeOfLastCreate+200 < timeStamp){
                sys.timeOfLastCreate=timeStamp;
            }
        }
        sys.particles = newArray;
    }

    // ******************************
    // Updating logic finished, next is the drawing phase
    // ******************************

    // Clear canvas
    context.fillStyle = 'White';
    context.fillRect(0, 0, screenWidth, screenHeight);

    let particleCount = 0;

    // Draw particle systems
    for (let x in particleSystems) {
        let sys = particleSystems[x];
        sys.drawParticles(timeStamp);

        // Draw particles
        /*for (let x in sys.particles) {
            let p = sys.particles[x];

            context.fillStyle = 'hsla('+p.hue+',100%,50%,'+(p.createTime-timeStamp+1000)/1000+')';
            context.beginPath();
            context.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
            context.fill();
        }*/

        particleCount+=sys.particles.length;
    }

    // Call the draw function for the scene
    switch (scene) {
       case "home": drawHome(); break;
       case "tatakau": drawTatakau(timeStamp); break;
       default: break;
    }

    // Draw the active buttons, program designed so that we do this regardless of scene
    for (let x in activeButtons) {
        let b = activeButtons[x];

        //context.reset();
        context.fillStyle = b.color;
        //if(loggingBegin){alert(context.fillStyle);};
        context.beginPath();
        context.roundRect(b.x, b.y, b.width, b.height,28);
        context.fill();

        context.fillStyle = 'black';
        context.textAlign = "center";
        context.font = b.font;
        context.fillText(b.text, b.x+(b.width/2), b.y+(b.height/2)+4);

        context.textAlign = "start";
    }

    // Draw constant elements
    context.font = '20px Arial';
    context.textAlign = "center";
    context.fillText(note, screenWidth-120, screenHeight-110);

    context.textAlign = "start";
    context.fillText("Partcle Count: "+particleCount, screenWidth-200, screenHeight-80);
    context.fillText("FPS: "+fps, screenWidth-200, screenHeight-50);
    context.fillText("Jmdict Loaded: "+jmdictLoaded, screenWidth-200, screenHeight-140);

    context.font = '20px zenMaruLight';
    context.fillText("I love you by a factor of " + love + ".", 120, screenHeight-30);

    if(loggingBegin){loggingBegin=logFrame=false;}

    // Keep requesting new frames
    //setTimeout(() => { https://stackoverflow.com/questions/19764018/controlling-fps-with-requestanimationframe
        requestAnimationFrame(gameLoop);
    //}, 1000 / 60);
}

function init(){
    // Get a reference to the canvas
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');

    love = localStorage.getItem('love');
    name = localStorage.getItem('name');
    love = love===null ? 0 : parseInt(love);
    name = name===null ? "" : name;

    window.requestAnimationFrame(gameLoop);
}
