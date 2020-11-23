'use strict';
class Entity extends Phaser.Sprite {
  constructor(game, x, y, grid, index = 0) {
    super(game, x, y, 'sprites', index);
    this.anchor.setTo(.5);
    this.game.physics.arcade.enable(this);
    this.grid = grid;
    this.grid.add(this);
    if (this.gridPos) {
      this.grid.screenToGrid(this.x, this.y, this.gridPos);
    }
   
  }

  destroy() {
    this.grid.remove(this);
    super.destroy();
  }

  kill() {
    super.kill();
      var element = document.querySelector("#over");
      var element1 = document.querySelector("#screen");
      element.style.display = "block";
      element1.style.display = "none";
  }
}

class Wall extends Entity {
  constructor(game, x, y, grid) {
    super(game, x, y, grid, 0);
    this.body.moves = false;
    this.body.immovable = true;
    this.slack = 0.5;
    this.body.setSize(32 - this.slack, 32 - this.slack, this.slack * 0.5, this.slack * 0.5)
  }

  kill() {
    // cannot be killed
  }
}

class Bricks extends Wall {
  constructor(game, x, y, grid) {
    super(game, x, y, grid);
    this.frame = 1;
  }

  kill() {
    const pickupChance = this.game.rnd.frac();
    const tween = this.game.add.tween(this).to({ alpha: 0 }, 300, Phaser.Easing.Linear.None, true);

    tween.onComplete.add(() => {
      this.destroy();
    }, this);

    // 1/4 chance of dropping a power-up feels about right to me...
    if (pickupChance < 0.25) {
      this.dropPickup();
    }
  }

  dropPickup() {
    const place = this.gridPos.clone();
    const screenPos = this.grid.gridToScreen(place.x, place.y);

    const pickupClasses = [PickupBomb, PickupFire];
    const pickupClass = this.game.rnd.pick(pickupClasses);

    const pickup = new (pickupClass)(this.game, screenPos.x, screenPos.y, this.grid);

    this.parent.add(pickup);
  }
}

class Player extends Entity {
  constructor(game, x, y, grid) {
    super(game, x, y, grid, 1);

    this.controls = this.game.input.keyboard.createCursorKeys();
    this.speed = 150;

    this.totalBombs = 1;
    this.currentBombs = 0;
    this.bombSize = 2;

    this.body.setCircle(16);
    this.body.drag.set(768);

    this.lastGridPos = this.gridPos.clone();

    //this.blastThrough = true;

  }
  update() {
    super.update();
    if (!this.alive) {
      return;
    }
    if (this.controls.up.isDown) {
      this.body.velocity.y = this.speed * -1;
    }
    else if (this.controls.down.isDown) {
      this.body.velocity.y = this.speed;
    }

    if (this.controls.left.isDown) {
      this.body.velocity.x = this.speed * -1;
    }
    else if (this.controls.right.isDown) {
      this.body.velocity.x = this.speed;
    }

    if (this.game.input.keyboard.justPressed(Phaser.Keyboard.SPACEBAR)) {
      this.dropBomb();
    }
    if (this.gridPos) {
      this.grid.screenToGrid(this.x, this.y, this.gridPos);
    }

    if (!this.gridPos.equals(this.lastGridPos)) {
      this.lastGridPos.copyFrom(this.gridPos);
      this.checkGrid();
    }
  }

  kill() {
    this.body.moves = false;
    super.kill();
  }

  canPlaceBomb(place) {
    const item = this.grid.getAt(place.x, place.y, this);
    if (!item) {
      return true;
    }
    return false;
  }

  dropBomb() {
    const place = this.gridPos.clone();
    const screenPos = this.grid.gridToScreen(place.x, place.y);
    if (this.currentBombs < this.totalBombs && this.canPlaceBomb(place)) {
      const bomb = new Bomb(this.game, screenPos.x, screenPos.y, this.grid, this);
      this.parent.add(bomb);
    }
  }

  checkGrid() {
    const item = this.grid.getAt(this.gridPos.x, this.gridPos.y, this);
    if (item && item instanceof Pickup) {
      item.collect(this);
    }
  }
}

class Bot extends Entity {
  constructor(game, x, y, grid) {
    super(game, x, y, grid, 5);

    //this.speed = 96;

    this.body.setCircle(16);
    this.body.drag.set(0);
    this.lastGridPos = this.gridPos.clone();
  }

  update() {
    //super.update();
    super.update();
  }
  kill() {
    this.destroy();
  }
}

class Pickup extends Entity {
  constructor(game, x, y, grid, index) {
    if (new.target === Pickup) {
      throw new TypeError("Cannot construct Abstract instances directly");
    }
    super(game, x, y, grid, index);
    this.body.enable = false;
    this.body.moves = false;
  }

  collect() {
    this.destroy();
  }
}

class PickupBomb extends Pickup {
  constructor(game, x, y, grid) {
    super(game, x, y, grid, 8);
  }

  collect(player) {
    super.collect(player);
    player.totalBombs += 1;
  }
}

class PickupFire extends Pickup {
  constructor(game, x, y, grid) {
    super(game, x, y, grid, 9);
  }

  collect(player) {
    super.collect(player);
    player.bombSize += 1;
  }
}

class Bomb extends Entity {
  constructor(game, x, y, grid, owner) {
    super(game, x, y, grid, 2);

    this.owner = owner;

    this.body.immovable = true;
    this.body.moves = false;

    if (this.owner) {
      this.owner.currentBombs += 1;
    }

    this.size = this.owner.bombSize || 3;

    this.duration = Phaser.Timer.SECOND * 3;
    this.explodeTimer = this.game.time.events.add(this.duration, this.explode, this);

    const tween1 = this.game.add.tween(this.scale).to({ x: 1.1, y: 0.9 }, this.duration / 9, Phaser.Easing.Circular.InOut, true, 0, -1);
    tween1.yoyo(true, 0);
    const tween2 = this.game.add.tween(this.anchor).to({ y: 0.45 }, this.duration / 9, Phaser.Easing.Circular.InOut, true, 0, -1);
    tween2.yoyo(true, 0);
  }

  explode() {
    this.game.time.events.remove(this.explodeTimer);
    if (this.owner) {
      this.owner.currentBombs -= 1;
    }
    this.grid.remove(this);

    const explosion = new Explosion(this.game, this.x, this.y, this.grid, this.owner, this.size, this.parent);

    this.destroy();
  }

  kill() {
    this.explode();
  }
}

class Explosion extends Entity {
  constructor(game, x, y, grid, owner, size = 3, parent = null) {
    super(game, x, y, grid, 5);
    this.size = size;
    this.owner = owner;
    this.body.immovable = true;
    this.body.moves = false;

    this.game.camera.shake(0.0075, 500);

    this.duration = Phaser.Timer.SECOND * .5;
    this.decayTimer = this.game.time.events.add(this.duration, this.destroy, this);

    parent.add(this);

    this.locs = this.getExplosionLocations();
    this.doExplosion();
  }

  doExplosion() {
    this.blast = [];

    // Urgh. Improve plz.
    for (let i = 0; i < this.locs.left.length; i++) {
      const blastPos = this.grid.gridToScreen(this.locs.left[i].x, this.locs.left[i].y);
      const blast = new Blast(this.game, blastPos.x, blastPos.y, this.grid, this.owner);
      blast.angle = -90;
      if (i === this.size - 2) {
        blast.frame = 3;
      }
      this.blast.push(blast);
      this.parent.add(blast);
    }

    for (let i = 0; i < this.locs.right.length; i++) {
      const blastPos = this.grid.gridToScreen(this.locs.right[i].x, this.locs.right[i].y);
      const blast = new Blast(this.game, blastPos.x, blastPos.y, this.grid, this.owner);
      blast.angle = 90;
      if (i === this.size - 2) {
        blast.frame = 3;
      }
      this.blast.push(blast);
      this.parent.add(blast);
    }

    for (let i = 0; i < this.locs.up.length; i++) {
      const blastPos = this.grid.gridToScreen(this.locs.up[i].x, this.locs.up[i].y);
      const blast = new Blast(this.game, blastPos.x, blastPos.y, this.grid, this.owner);
      blast.angle = 0;
      if (i === this.size - 2) {
        blast.frame = 3;
      }
      this.blast.push(blast);
      this.parent.add(blast);
    }

    for (let i = 0; i < this.locs.down.length; i++) {
      const blastPos = this.grid.gridToScreen(this.locs.down[i].x, this.locs.down[i].y);
      const blast = new Blast(this.game, blastPos.x, blastPos.y, this.grid, this.owner);
      blast.angle = 180;
      if (i === this.size - 2) {
        blast.frame = 3;
      }
      this.blast.push(blast);
      this.parent.add(blast);
    }
  }

  getExplosionLocations() {
    const x = this.gridPos.x;
    const y = this.gridPos.y;
    const points = {
      left: [],
      right: [],
      up: [],
      down: []
    };
    const obstructed = {
      left: false,
      right: false,
      up: false,
      down: false
    }

    // Jesus, these explosion routines... gotta fix these :(
    for (let w = 1; w < this.size; w++) {
      let entity;
      if (!obstructed.right) {
        entity = this.grid.getAt(x + w, y);
        if (!entity || entity.blastThrough) {
          points.right.push(new Phaser.Point(x + w, y));
        }
        else {
          obstructed.right = true;
          if (entity && entity instanceof Entity) {
            entity.kill();
          }
        }
      }

      if (!obstructed.left) {
        entity = this.grid.getAt(x - w, y);
        if (!entity || entity.blastThrough) {
          points.left.push(new Phaser.Point(x - w, y));
        }
        else {
          obstructed.left = true;
          if (entity && entity instanceof Entity) {
            entity.kill();
          }
        }
      }

      if (!obstructed.down) {
        entity = this.grid.getAt(x, y + w);
        if (!entity || entity.blastThrough) {
          points.down.push(new Phaser.Point(x, y + w));
        }
        else {
          obstructed.down = true;
          if (entity && entity instanceof Entity) {
            entity.kill();
          }
        }
      }

      if (!obstructed.up) {
        entity = this.grid.getAt(x, y - w);
        if (!entity || entity.blastThrough) {
          points.up.push(new Phaser.Point(x, y - w));
        }
        else {
          obstructed.up = true;
          if (entity && entity instanceof Entity) {
            entity.kill();
          }
        }
      }
    }
    return points;
  }

  destroy() {
    this.game.time.events.remove(this.decayTimer);
    for (let i = 0; i < this.blast.length; i++) {
      this.blast[i].destroy();
    }
    const tween = this.game.add.tween(this).to({ alpha: 0 }, 300, Phaser.Easing.Linear.None, true);
    tween.onComplete.add(() => {
      super.destroy();
    }, this);
  }

  kill() {
    // cannot be killed
  }
}

class Blast extends Entity {
  constructor(game, x, y, grid, owner) {
    super(game, x, y, grid, 4);
    this.body.moves = false;
    this.body.immovable = true;
    this.slack = 18;
    this.body.setSize(32 - this.slack, 32 - this.slack, this.slack * 0.5, this.slack * 0.5)

    this.blastThrough = true;
  }

  kill() {
    // cannot be killed
  }

  destroy() {
    this.body.enable = false;
    const tween = this.game.add.tween(this).to({ alpha: 0 }, 300, Phaser.Easing.Linear.None, true);
    tween.onComplete.add(() => {
      super.destroy();
    }, this);
  }
}

class Grid {
  constructor(width, height, size = 32) {
    this.width = width;
    this.height = height;
    this.size = size;
    this.items = [];
  }

  add(item) {
    this.items.push(item);
    item.gridPos = this.screenToGrid(item.x, item.y);
  }

  remove(item) {
    if (this.items.indexOf(item) !== -1) {
      this.items.splice(this.items.indexOf(item), 1);
    }
  }

  getAt(x, y, ignore) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      for (let i = 0; i < this.items.length; i++) {
        let item = this.items[i];
        if (item !== ignore && item.gridPos.x === x && item.gridPos.y === y) {
          return item;
        }
      }
      return null;
    }
    return -1;
  }

  screenToGrid(x, y, point) {
    if (point) {
      point.x = Math.round(x / this.size);
      point.y = Math.round(y / this.size);
      return point;
    }
    return new Phaser.Point(Math.round(x / this.size), Math.round(y / this.size));
  }

  gridToScreen(x, y, point) {
    if (point) {
      point.x = x * this.size;
      point.y = y * this.size;
      return point;
    }
    return new Phaser.Point(x * this.size, y * this.size);
  }
}

class Level extends Phaser.State {
  preload() {
    this.stage.disableVisibilityChange = true;
    this.game.load.spritesheet('sprites', 'sprites/image.png', 32, 32);
    this.game.load.image('wall', 'sprites/wall.png', 32, 32);
    this.game.load.image('grass', 'sprites/grass.png', 32, 32);
    this.game.load.image('balloom', 'sprites/balloom.png', 32, 32);
    
  }

  create() {
    this.game.renderer.renderSession.roundPixels = true;
    this.game.physics.startSystem(Phaser.Physics.ARCADE);

    this.game.input.keyboard.addKeyCapture([Phaser.Keyboard.UP, Phaser.Keyboard.DOWN,
    Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.SPACEBAR]);

    this.grid = new Grid(31, 13);

    this.background = this.game.add.group();
    this.items = this.game.add.physicsGroup();
    this.items.x = this.background.x = 16;
    this.items.y = this.background.y = 16;

    var gameMap = [
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
      1,0,0,0,0,0,0,2,2,0,2,0,0,1,0,2,0,2,0,2,0,0,2,0,2,0,2,0,0,0,1,
      1,0,1,0,1,0,1,2,1,0,1,0,1,2,1,2,1,0,1,0,1,0,1,2,1,2,1,2,1,0,1,
      1,0,0,3,2,0,0,0,0,0,2,2,2,0,0,2,0,0,1,0,0,0,2,0,2,0,2,0,2,0,1,
      1,0,1,0,1,0,1,0,1,0,1,2,1,0,2,0,1,2,1,2,1,0,1,0,1,0,1,0,1,2,1,
      1,7,0,0,0,0,0,0,0,0,0,3,0,2,2,0,0,2,0,0,2,0,0,0,1,0,0,0,0,0,1,
      1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,2,1,0,1,2,1,0,1,0,1,0,1,
      1,2,0,0,2,0,0,0,0,0,0,2,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1,
      1,0,1,0,1,0,1,0,1,2,1,0,1,0,1,0,1,2,1,2,1,0,1,0,1,0,1,0,1,0,1,
      1,2,0,0,0,0,2,2,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,
      1,0,1,2,1,0,1,0,1,0,1,0,1,0,1,0,1,2,1,0,1,0,1,0,1,0,1,0,1,0,1,
      1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,1,
      1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
      ];
    var mapW = 31, mapH = 13;

    for(let y = 0; y < mapH; ++y) {
		  for(var x = 0; x < mapW; ++x) {
        if(gameMap[((y*mapW)+x)]==1) {
          const wall = new Wall(this.game, x * this.grid.size, y * this.grid.size, this.grid);
          this.items.add(wall);
        }
        if(gameMap[((y*mapW)+x)]==2) {
          const bricks = new Bricks(this.game, x * this.grid.size, y * this.grid.size, this.grid);
          this.items.add(bricks);
        }
			  if(gameMap[((y*mapW)+x)]!=1){
          this.background.create((x * this.grid.size), (y * this.grid.size), 'grass').anchor.set(0.5);
        }
	  	}
	  }
 
    this.player = new Player(this.game, this.grid.size, this.grid.size, this.grid);
    this.items.add(this.player);
    //Vẽ bot

    this.bot = new Bot(this.game, this.grid.size, 5 * this.grid.size, this.grid);
    this.items.add(this.bot);

  };
  update() {
    this.game.physics.arcade.collide(this.bot, this.items, (a, b) => {
      if (a instanceof Bot && (b instanceof Blast || b instanceof Explosion)) {
        a.kill();
      }
    });
  };
  update() {
    this.game.physics.arcade.collide(this.player, this.items, (a, b) => {
      if (a instanceof Player && (b instanceof Blast || b instanceof Explosion)) {
        a.kill();
      }
    });
    this.game.physics.arcade.collide(this.player, this.bot, ()=>{
      this.player.kill();
      // var element = document.querySelector("#over");
      // var element1 = document.querySelector("#screen");
      // element.style.display = "block";
      // element1.style.display = "none";

    });
    

  };

  // render() {

  //   this.game.debug.start();
  //   this.items.forEach((i) => {
  //     if (i.alive) {
  //       this.game.debug.context.fillStyle = 'rgba(255, 0, 0, 0.4)';
  //       const gridPos = this.grid.gridToScreen(i.gridPos.x, i.gridPos.y);
  //       this.game.debug.context.fillRect(gridPos.x, gridPos.y, this.grid.size, this.grid.size);
  //     }
  //   });
  //   this.game.debug.stop();
  //   this.items.forEach((i) => {
  //     if (i.alive) {
  //       this.game.debug.body(i);
  //     }
  //   })

  // };
};

class Game extends Phaser.Game {
  constructor() {
    super(992, 416, Phaser.AUTO, 'screen', null);
    this.state.add('Level', Level, false);
    this.state.start('Level');
  };
};

new Game();