// local state variables
// Start sequence stuff
let isStartSeq = true;
let startSeqCount = 0;
const startSequence = ['SAIL', 'RUDDER', 'HATCH', 'WICK'];

let shipsSunk = 0;
let treasureCount = 0;

let sharedData;

function init(sharedSource) {
  sharedData = sharedSource;
}

function begin() {

}

function update(dt) {
  player.update(dt, rocks, !isStartSeq); // only collide rocks when not start seq
  cannonballPool.forEach(c => c.update(dt));

  switch (startSeqCount) {
    case 0:
      if (player.velocityTarget > 0.000001) {
        startSeqCount += 1;
      }

      cycleInstructions(startSeqCount);
      break;
    case 1:
      if (player.turnRate > 0.00001 || player.turnRate < -0.00001) {
        startSeqCount += 1;
      }

      cycleInstructions(startSeqCount);
      break;
    case 4:
      hideStartScreen();
      isStartSeq = false;
      break;
    default: break;
  }
}

// naming?
function exit() {
  enemyPool.forEach(e => e.hide());
  treasurePool.forEach(t => t.hide());
}

export default { init, begin, update };
