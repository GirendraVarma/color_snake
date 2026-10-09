const canvas =
  document.getElementById("gameCanvas");

const ctx =
  canvas.getContext("2d");

const miniCanvas =
  document.getElementById("minimap");

const miniCtx =
  miniCanvas.getContext("2d");

/* SIZE */

canvas.width = innerWidth;
canvas.height = innerHeight;

/* WORLD */

const WORLD_SIZE = 5000;

/* GAME STATE */

let gameRunning = false;
let paused = false;

/* MULTIPLAYER */

const socket =
  io("http://localhost:3000");

socket.on("connect",()=>{

  console.log(
    "Multiplayer Connected"
  );
});

socket.on("playersUpdate",players=>{

  console.log(players);
});

/* ARRAYS */

const foods = [];
const particles = [];
const snakes = [];

/* JUNK FOODS */

const junkFoods = [

  "🍔",
  "🍕",
  "🍟",
  "🌭",
  "🍩",
  "🍗",
  "🥤",
  "🍪",
  "🍿"
];

/* HUD */

const scoreEl =
  document.getElementById("score");

const highScoreEl =
  document.getElementById("highScore");

const rankText =
  document.getElementById("rankText");

const leaderboardEl =
  document.getElementById("leaderboard");

/* HIGHSCORE */

let highScore =
  localStorage.getItem("snakeHigh")
  || 0;

highScoreEl.innerText =
  "High Score: " + highScore;

/* CAMERA */

const camera = {

  x:0,
  y:0
};

/* MOUSE */

const mouse = {

  x:innerWidth/2,
  y:innerHeight/2
};

/* RESIZE */

window.addEventListener("resize",()=>{

  canvas.width = innerWidth;
  canvas.height = innerHeight;
});

/* RANDOM COLOR */

function randomColor(){

  const colors = [

    "#00ffff",
    "#ff00ff",
    "#00ff00",
    "#ff6600",
    "#ffff00",
    "#ff3333",
    "#00aaff"
  ];

  return colors[
    Math.floor(
      Math.random()*colors.length
    )
  ];
}

/* PARTICLE */

class Particle{

  constructor(x,y,color){

    this.x = x;
    this.y = y;

    this.vx =
      (Math.random()-0.5)*5;

    this.vy =
      (Math.random()-0.5)*5;

    this.life = 50;

    this.color = color;
  }

  update(){

    this.x += this.vx;
    this.y += this.vy;

    this.life--;
  }

  draw(){

    ctx.fillStyle = this.color;

    ctx.beginPath();

    ctx.arc(
      this.x-camera.x,
      this.y-camera.y,
      3,
      0,
      Math.PI*2
    );

    ctx.fill();
  }
}

/* FOOD */

class Food{

  constructor(){

    this.x =
      Math.random()*WORLD_SIZE;

    this.y =
      Math.random()*WORLD_SIZE;

    this.size =
      10 + Math.random()*8;

    this.emoji =
      junkFoods[
        Math.floor(
          Math.random()*junkFoods.length
        )
      ];
  }

  draw(){

    ctx.font =
      `${this.size*2}px Arial`;

    ctx.fillText(

      this.emoji,

      this.x-camera.x,
      this.y-camera.y
    );
  }
}

/* SNAKE */

class Snake{

  constructor(
    x,
    y,
    color,
    ai=false,
    name="Snake"
  ){

    this.x = x;
    this.y = y;

    this.color = color;

    this.ai = ai;

    this.name = name;

    this.speed = 3;

    this.angle =
      Math.random()*Math.PI*2;

    this.size = 18;

    this.score = 0;

    this.segments = [];

    this.targetLength = 25;

    for(let i=0;i<this.targetLength;i++){

      this.segments.push({

        x:this.x,
        y:this.y
      });
    }
  }

  update(){

    /* PLAYER */

    if(!this.ai){

      const dx =
        mouse.x-canvas.width/2;

      const dy =
        mouse.y-canvas.height/2;

      this.angle =
        Math.atan2(dy,dx);

      if(keys["ArrowLeft"])
        this.angle -= 0.08;

      if(keys["ArrowRight"])
        this.angle += 0.08;
    }

    /* AI */

    else{

      let nearestFood = foods[0];

      let minDist = Infinity;

      foods.forEach(food=>{

        const dx =
          food.x - this.x;

        const dy =
          food.y - this.y;

        const dist =
          Math.hypot(dx,dy);

        if(dist < minDist){

          minDist = dist;

          nearestFood = food;
        }
      });

      if(nearestFood){

        const dx =
          nearestFood.x-this.x;

        const dy =
          nearestFood.y-this.y;

        this.angle =
          Math.atan2(dy,dx);
      }
    }

    /* MOVE */

    this.x +=
      Math.cos(this.angle)
      * this.speed;

    this.y +=
      Math.sin(this.angle)
      * this.speed;

    /* BODY */

    this.segments.unshift({

      x:this.x,
      y:this.y
    });

    while(
      this.segments.length >
      this.targetLength
    ){

      this.segments.pop();
    }

    this.checkFood();

    this.checkCollision();
  }

  /* FOOD */

  checkFood(){

    foods.forEach((food,index)=>{

      const dx =
        food.x-this.x;

      const dy =
        food.y-this.y;

      const dist =
        Math.hypot(dx,dy);

      if(
        dist <
        this.size + food.size
      ){

        foods.splice(index,1);

        this.targetLength += 8;

        this.score += 10;

        if(!this.ai){

          scoreEl.innerText =
            "Score: " + this.score;
        }

        /* PARTICLES */

        for(let i=0;i<10;i++){

          particles.push(

            new Particle(

              food.x,
              food.y,
              this.color
            )
          );
        }

        spawnFood();
      }
    });
  }

  /* COLLISION */

  checkCollision(){

    snakes.forEach(other=>{

      if(other===this)
        return;

      for(let seg of other.segments){

        const dx =
          seg.x-this.x;

        const dy =
          seg.y-this.y;

        const dist =
          Math.hypot(dx,dy);

        if(dist < this.size){

          /* PLAYER DEAD */

          if(!this.ai){

            gameOver();
          }

          /* AI DEAD */

          else{

            explodeSnake(this);

            snakes.splice(

              snakes.indexOf(this),
              1
            );
          }

          return;
        }
      }
    });
  }

  /* DRAW */

  draw(){

    ctx.lineWidth = this.size;

    ctx.lineCap = "round";

    ctx.strokeStyle = this.color;

    ctx.shadowBlur = 20;

    ctx.shadowColor = this.color;

    ctx.beginPath();

    this.segments.forEach((seg,i)=>{

      if(i===0){

        ctx.moveTo(

          seg.x-camera.x,
          seg.y-camera.y
        );
      }

      ctx.lineTo(

        seg.x-camera.x,
        seg.y-camera.y
      );
    });

    ctx.stroke();

    /* HEAD */

    ctx.fillStyle = "white";

    ctx.beginPath();

    ctx.arc(

      this.x-camera.x,
      this.y-camera.y,
      this.size/2,
      0,
      Math.PI*2
    );

    ctx.fill();

    /* NAME */

    ctx.fillStyle = "white";

    ctx.font = "14px Arial";

    ctx.fillText(

      this.name,

      this.x-camera.x-20,
      this.y-camera.y-25
    );
  }
}

/* FOOD SPAWN */

function spawnFood(){

  foods.push(new Food());
}

/* MANY FOODS */

for(let i=0;i<500;i++){

  spawnFood();
}

/* PLAYER */

const player = new Snake(

  Math.random()*WORLD_SIZE,
  Math.random()*WORLD_SIZE,

  randomColor(),

  false,

  "YOU"
);

snakes.push(player);

/* MANY AI */

for(let i=0;i<25;i++){

  snakes.push(

    new Snake(

      Math.random()*WORLD_SIZE,
      Math.random()*WORLD_SIZE,

      randomColor(),

      true,

      "BOT-"+i
    )
  );
}

/* EXPLODE */

function explodeSnake(snake){

  snake.segments.forEach(seg=>{

    foods.push({

      x:seg.x,
      y:seg.y,

      size:10,

      emoji:"🍔",

      draw(){

        ctx.font = "20px Arial";

        ctx.fillText(

          this.emoji,

          this.x-camera.x,
          this.y-camera.y
        );
      }
    });
  });
}

/* UPDATE */

function update(){

  if(!gameRunning || paused)
    return;

  ctx.clearRect(

    0,
    0,
    canvas.width,
    canvas.height
  );

  /* CAMERA */

  camera.x += (

    (
      player.x-canvas.width/2
    ) - camera.x

  ) * 0.08;

  camera.y += (

    (
      player.y-canvas.height/2
    ) - camera.y

  ) * 0.08;

  /* FOODS */

  foods.forEach(food=>{

    food.draw();
  });

  /* SNAKES */

  snakes.forEach(snake=>{

    snake.update();

    snake.draw();
  });

  /* PARTICLES */

  particles.forEach((p,index)=>{

    p.update();

    p.draw();

    if(p.life<=0){

      particles.splice(index,1);
    }
  });

  /* MULTIPLAYER */

  sendPlayerData();

  updateLeaderboard();

  drawMinimap();

  requestAnimationFrame(update);
}

/* LEADERBOARD */

function updateLeaderboard(){

  const sorted =
    [...snakes].sort(

      (a,b)=>b.score-a.score
    );

  leaderboardEl.innerHTML = "";

  sorted.slice(0,10).forEach((s,index)=>{

    const li =
      document.createElement("li");

    li.innerText =

      `#${index+1} ${s.name}: ${s.score}`;

    if(s===player){

      li.style.color = "cyan";

      li.style.fontWeight = "bold";
    }

    leaderboardEl.appendChild(li);
  });

  const playerRank =

    sorted.findIndex(
      s=>s===player
    ) + 1;

  rankText.innerText =
    `Rank: #${playerRank}`;
}

/* MINIMAP */

function drawMinimap(){

  miniCtx.clearRect(
    0,
    0,
    180,
    180
  );

  miniCtx.fillStyle = "#111";

  miniCtx.fillRect(
    0,
    0,
    180,
    180
  );

  /* FOODS */

  foods.forEach(food=>{

    miniCtx.fillStyle = "yellow";

    miniCtx.beginPath();

    miniCtx.arc(

      (food.x/WORLD_SIZE)*180,

      (food.y/WORLD_SIZE)*180,

      2,

      0,

      Math.PI*2
    );

    miniCtx.fill();
  });

  /* SNAKES */

  snakes.forEach(snake=>{

    miniCtx.fillStyle =
      snake.color;

    miniCtx.beginPath();

    miniCtx.arc(

      (snake.x/WORLD_SIZE)*180,

      (snake.y/WORLD_SIZE)*180,

      4,

      0,

      Math.PI*2
    );

    miniCtx.fill();
  });
}

/* GAME OVER */

function gameOver(){

  gameRunning = false;

  document
    .getElementById(
      "gameOverScreen"
    )
    .classList.add("active");

  document
    .getElementById(
      "finalScore"
    )
    .innerText =
      "Score: " + player.score;

  if(player.score > highScore){

    highScore = player.score;

    localStorage.setItem(

      "snakeHigh",

      highScore
    );

    highScoreEl.innerText =
      "High Score: " + highScore;
  }
}

/* START */

document
  .getElementById("startBtn")
  .onclick = ()=>{

    document
      .getElementById(
        "menuScreen"
      )
      .classList.remove("active");

    player.name =

      document
      .getElementById("playerName")
      .value || "YOU";

    gameRunning = true;

    update();
};

/* RESTART */

document
  .getElementById("restartBtn")
  .addEventListener("click",()=>{

    document
      .getElementById(
        "gameOverScreen"
      )
      .classList.remove("active");

    foods.length = 0;

    snakes.length = 0;

    particles.length = 0;

    for(let i=0;i<500;i++){

      spawnFood();
    }

    player.x =
      Math.random()*WORLD_SIZE;

    player.y =
      Math.random()*WORLD_SIZE;

    player.score = 0;

    player.targetLength = 25;

    player.segments = [];

    for(let i=0;i<player.targetLength;i++){

      player.segments.push({

        x:player.x,
        y:player.y
      });
    }

    snakes.push(player);

    for(let i=0;i<25;i++){

      snakes.push(

        new Snake(

          Math.random()*WORLD_SIZE,
          Math.random()*WORLD_SIZE,

          randomColor(),

          true,

          "BOT-"+i
        )
      );
    }

    scoreEl.innerText =
      "Score: 0";

    gameRunning = true;

    update();
});

/* PAUSE */

document
  .getElementById("pauseBtn")
  .onclick = ()=>{

    paused = !paused;

    if(!paused)
      update();
};

/* SEND MULTIPLAYER */

function sendPlayerData(){

  socket.emit(

    "playerMove",

    {

      x:player.x,
      y:player.y,

      angle:player.angle,

      score:player.score,

      name:player.name
    }
  );
}

/* MOUSE */

window.addEventListener(

  "mousemove",

  e=>{

    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
);

/* KEYS */

const keys = {};

window.addEventListener(

  "keydown",

  e=>{

    keys[e.key] = true;
  }
);

window.addEventListener(

  "keyup",

  e=>{

    keys[e.key] = false;
  }
);

/* JOYSTICK */

const joystick =
  document.getElementById(
    "joystick"
  );

let dragging = false;

joystick.addEventListener(

  "touchstart",

  ()=>{

    dragging = true;
  }
);

window.addEventListener(

  "touchend",

  ()=>{

    dragging = false;

    joystick.style.left = "30px";
    joystick.style.top = "30px";
  }
);

window.addEventListener(

  "touchmove",

  e=>{

    if(!dragging)
      return;

    const touch =
      e.touches[0];

    const rect =

      document
      .getElementById(
        "joystickContainer"
      )
      .getBoundingClientRect();

    const x =
      touch.clientX
      - rect.left
      - 30;

    const y =
      touch.clientY
      - rect.top
      - 30;

    joystick.style.left =
      x + "px";

    joystick.style.top =
      y + "px";

    const dx = x - 30;
    const dy = y - 30;

    player.angle =
      Math.atan2(dy,dx);
  }
);