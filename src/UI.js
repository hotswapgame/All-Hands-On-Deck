export function cycleInstructions(instructionCounter) {
  const elements = document.getElementsByClassName('instruction-text');
  for (let i = 0; i < 4; i += 1) {
    elements[i].classList.remove('active');
  }
  elements[instructionCounter].classList.add('active');
}

export function hideStartScreen() {
  document.getElementById('start-screen').classList.remove('active');
}

/* e key: game over sequence */
// if (e.key === 'e' && start_game_bool) {
//     end_game_bool = true;
//     gameOverSequence(
//         Math.floor(10 + Math.random() * 40), //ships sunk
//         Math.floor(50 + Math.random() * 200), //cannon balls fired
//         Math.floor(300000 + Math.random() * 500000), //total time (ms)
//         Math.floor(Math.random() * 300000) //total duration on fire (ms)
//     );
// }

/* r key: restart game */
// if (e.key === 'r') {
//   start_game_bool = false;
//   end_game_bool = false;
//   instruction_counter = 0;
//   var element = document.getElementById('game_over');

//   element.classList.remove('active');
//   element = document.getElementsByClassName('stat');
//   for (var i=0; i<5; i++) {
//       var item = element[i];
//       item.classList.remove('active');
//   }

//   var element = document.getElementById('start_screen');
//   element.classList.add('active');
//   var element = document.getElementsByClassName('instruction_text');
//   for (var i=0; i<4; i++) {
//       element[i].classList.remove('active');
//   }
//   element[instruction_counter].classList.add('active');
// }

function revealStat(i) {
  const element = document.getElementsByClassName('stat-box')[i];
  element.classList.add('active');
  console.log(element);
}

export function runGameOverSequence(shipSunk, cannonsFired, timeTotal, timeFire) {
  const element = document.getElementById('game-over'); // clement you should be more specifc than just 'element'
  element.classList.add('active');

  document.getElementById('sunk').getElementsByClassName('stat')[0].innerHTML = shipSunk;
  document.getElementById('cannon').getElementsByClassName('stat')[0].innerHTML = cannonsFired;

  let secA = Math.floor((timeTotal % 60000) / 1000);
  secA = ('0' + secA).slice(-2);
  const minA = Math.floor(timeTotal / 60000);
  document.getElementById('time').getElementsByClassName('stat')[0].innerHTML = minA + ':' + secA;

  let secB = Math.floor((timeFire % 60000) / 1000);
  secB = ('0' + secB).slice(-2);
  const minB = Math.floor(timeFire / 60000);
  document.getElementById('fire').getElementsByClassName('stat')[0].innerHTML = minB + ':' + secB;

  const ratio = timeFire / timeTotal * 100;
  document.getElementById('fire-proportion').innerHTML = '<div id=\'ship-ok\' style=\'width:' + (100 - ratio) + '%;\'></div><div id=\'ship-fire\' style=\'width:' + ratio + '%;\'></div>';

  const elements = document.getElementsByClassName('stat-box');
  // why did you use just five, and how did it work?
  for (let i = 0; i < elements.length; i += 1) {
    const item = elements[i];
    item.classList.remove('active');
    setTimeout(() => revealStat(i), 750 + 500 * i);
  }
}

export default {
  runGameOverSequence,
  cycleInstructions,
  hideStartScreen,
};
