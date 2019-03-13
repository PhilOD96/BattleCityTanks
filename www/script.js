const config = {
    type: Phaser.AUTO, // Which renderer to use
    width: 256, // Canvas width in pixels
    height: 256, // Canvas height in pixels
    parent: "game-container", // ID of the DOM element to add the canvas to
    physics: {
      default: 'arcade',
      arcade: {
        gravity : { y: 0 },
        debug: false
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update,
      extend: {
                player: null,
                healthpoints: null,
                reticle: null,
                moveKeys: null,
                playerBullets: null,
                enemyBullets: null,
                time: 0
              }
    }
  };

var game = new Phaser.Game(config);

var Bullet = new Phaser.Class({

  Extends: Phaser.GameObjects.Image,

  initialize:

  // Bullet Constructor
  function Bullet (scene)
  {
      Phaser.GameObjects.Image.call(this, scene, 0, 0, 'bullet');
      this.speed = 1;
      this.born = 0;
      this.direction = 0;
      this.xSpeed = 0;
      this.ySpeed = 0;
      this.setSize(12, 12, true);
  },

  // Fires a bullet from the player to the reticle
  fire: function (shooter, target)
  {
      this.setPosition(shooter.x, shooter.y); // Initial position
      this.direction = Math.atan( (target.x-this.x) / (target.y-this.y));

      // Calculate X and y velocity of bullet to moves it from shooter to target
      if (target.y >= this.y)
      {
          this.xSpeed = this.speed*Math.sin(this.direction);
          this.ySpeed = this.speed*Math.cos(this.direction);
      }
      else
      {
          this.xSpeed = -this.speed*Math.sin(this.direction);
          this.ySpeed = -this.speed*Math.cos(this.direction);
      }

      this.rotation = shooter.rotation; // angle bullet with shooters rotation
      this.born = 0; // Time since new bullet spawned
  },

  // Updates the position of the bullet each cycle
  update: function (time, delta)
  {
      this.x += this.xSpeed * delta;
      this.y += this.ySpeed * delta;
      this.born += delta;
      if (this.born > 1800)
      {
          this.setActive(false);
          this.setVisible(false);
      }
  }
});

function preload() {

    this.load.image('Sprites', '../assets/BattleCitySprites.png');
    this.load.spritesheet('player', '../assets/PlayerTank.PNG', {frameWidth: 16, frameHeight: 15});
    this.load.tilemapTiledJSON('map', '../assets/TileMaps/map.json');
    this.load.spritesheet('enemy', '../assets/GreenTank.PNG', {frameWidth: 15, frameHeight: 15});
    this.load.image('bullet', '../assets/bullets.png', {frameWidth: 16, frameHeight: 15});
    this.load.audio('move', '../assets/sounds/move.wav');
}

function create() {

  const map = this.make.tilemap({key: 'map'});
  const tileset = map.addTilesetImage('tiledSprites', 'Sprites');

  // Add 2 groups for Bullet objects
  playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
  enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });

  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const blackBaseLayer = map.createDynamicLayer('base', tileset, 0, 0);
  const greyBoarderLayer = map.createDynamicLayer('border', tileset, 0, 0);
  const steelLayer = map.createDynamicLayer('steel', tileset, 0, 0);
  const bricksLayer = map.createDynamicLayer('bricks', tileset, 0, 0);
  const totemLayer = map.createDynamicLayer('totem', tileset, 0, 0);

  greyBoarderLayer.setCollisionByExclusion([-1]);
  steelLayer.setCollisionByExclusion([-1]);
  bricksLayer.setCollisionByExclusion([-1]);

  player = this.physics.add.sprite(120, 200, 'player');
  enemy = this.physics.add.sprite(25, 25, 'enemy');
  reticle = this.physics.add.sprite(100,100,'bullets');

  enemy.setCollideWorldBounds(true);
  player.setCollideWorldBounds(true);

      // Set sprite variables
      player.health = 3;
      enemy.health = 3;
      enemy.lastFired = 0;

  this.physics.world.bounds.width = blackBaseLayer.width;
  this.physics.world.bounds.height = blackBaseLayer.height;

  //Tank move
  this.sound.add('playerMove');

  //Animations
  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('player', {start: 2, end: 3}),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('player', {start: 6, end: 7}),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: 'up',
    frames: this.anims.generateFrameNumbers('player', {start: 0, end: 1}),
    frameRate: 10,
    repeat: -1
  });

  this.anims.create({
    key: 'down',
    frames: this.anims.generateFrameNumbers('player', {start: 4, end: 5}),
    frameRate: 10,
    repeat: -1
  });
  
  this.cursors = this.input.keyboard.createCursorKeys();
  
  this.physics.add.collider(player, greyBoarderLayer);
  this.physics.add.collider(player, steelLayer);
  this.physics.add.collider(player, bricksLayer);




    // Fires bullet from player on left click of mouse
    this.input.on('pointerdown', function (pointer, time, lastFired) {
      if (player.active === false)
          return;

      // Get bullet from bullets group
      var bullet = playerBullets.get().setActive(true).setVisible(true);
      
      if (bullet)
      {
          bullet.fire(player, reticle);
          this.physics.add.collider(enemy, bullet, enemyHitCallback);
          this.physics.add.collider(bricksLayer, bullet, brickHitCallback);
      }
  }, this);



      // Pointer lock will only work after mousedown
      game.canvas.addEventListener('mousedown', function () {
        game.input.mouse.requestPointerLock();
    });

    // Exit pointer lock when Q or escape (by default) is pressed.
    this.input.keyboard.on('keydown_Q', function (event) {
        if (game.input.mouse.locked)
            game.input.mouse.releasePointerLock();
    }, 0, this);

    // Move reticle upon locked pointer move
    this.input.on('pointermove', function (pointer) {
        if (this.input.mouse.locked)
        {
            reticle.x += pointer.movementX;
            reticle.y += pointer.movementY;
        }
    }, this);



function enemyHitCallback(enemyHit, bulletHit)
{
    // Reduce health of enemy
    if (bulletHit.active === true && enemyHit.active === true)
    {
        enemyHit.health = enemyHit.health - 1;
        console.log("Enemy hp: ", enemyHit.health);

        // Kill enemy if health <= 0
        if (enemyHit.health <= 0)
        {
           enemyHit.setActive(false).setVisible(false);
        }

        // Destroy bullet
        bulletHit.setActive(false).setVisible(false);
    }
}

function brickHitCallback(brickHit, bulletHit)
{
   // Reduce health of enemy
   if (bulletHit.active === true && enemyHit.active === true)
   {
       brickHit.health = brickHit.health - 1;
       console.log("Brick hp: ", brickHit.health);

       // Kill enemy if health <= 0
       if (brickHit.health <= 0)
       {
          brickHit.setActive(false).setVisible(false);
       }

       // Destroy bullet
       bulletHit.setActive(false).setVisible(false);
   }
}

function playerHitCallback(playerHit, bulletHit)
{
    // Reduce health of player
    if (bulletHit.active === true && playerHit.active === true)
    {
        playerHit.health = playerHit.health - 1;
        console.log("Player hp: ", playerHit.health);

        // Kill hp sprites and kill player if health <= 0
        if (playerHit.health == 2)
        {
            hp3.destroy();
        }
        else if (playerHit.health == 1)
        {
            hp2.destroy();
        }
        else
        {
            hp1.destroy();
            // Game over state should execute here
        }

        // Destroy bullet
        bulletHit.setActive(false).setVisible(false);
    }
}

function enemyFire(enemy, player, time, gameObject)
{
    if (enemy.active === false)
    {
        return;
    }

    if ((time - enemy.lastFired) > 1000)
    {
        enemy.lastFired = time;

        // Get bullet from bullets group
        var bullet = enemyBullets.get().setActive(true).setVisible(true);

        if (bullet)
        {
            bullet.fire(enemy, player);
            // Add collider between bullet and player
            gameObject.physics.add.collider(player, bullet, playerHitCallback);
        }
    }
}



}


function update(time, delta) {

  // Make enemy fire
  //enemyFire(enemy, player, time, this);

  player.body.setVelocity(0);

  if(this.cursors.left.isDown){
    player.body.setVelocityX(-50);
  }
  else if (this.cursors.right.isDown){
    player.body.setVelocityX(50);
  }

  if(this.cursors.up.isDown){
    player.body.setVelocityY(-50);
  }
  else if(this.cursors.down.isDown){
    player.body.setVelocityY(50);
  }

  if(this.cursors.left.isDown){
    player.anims.play('left', true);
    this.sound.playAudioSprite('move');
  }

  else if(this.cursors.right.isDown){
    player.anims.play('right', true);
   // this.sound.play('playerMove');
  }

  else if(this.cursors.up.isDown){
    player.anims.play('up', true);
   // this.sound.play('playerMove');
  }

  else if(this.cursors.down.isDown){
    player.anims.play('down', true);
   // this.sound.play('playerMove');
  }

  else{
    player.anims.stop();
    this.sound.setMute(true);
  }

}
