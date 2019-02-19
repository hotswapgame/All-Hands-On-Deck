import {
  __, add, append, divide, find, isNil, not, reduce, pipe, takeLast, zipWith
} from 'ramda';
import xs from 'xstream';

import { INPUT_TYPES } from './Constants';

const notNil = pipe(isNil, not);

const isSail = data => (data[1] > 310 && data[1] < 340);
const isRudder = data => (data[1] > 167 && data[1] < 197);
const isHatch = data => (data[1] > 498 && data[1] < 528);
const isWick = data => (data[1] > 389 && data[1] < 419);
const isFlame = data => (data[1] > 690 && data[1] < 724);

// all of the ids are hardcoded, we should create a function check and look at
// a file elseware
// Input Data protocol : [CONTROLLER_ID, INPUT_ID, VAL, VAL, VAL]

function parseKnobData(input$) {
  const smoothSampleSize = 10;
  return input$
    // gather last values
    .fold(
      (acc, newData) => {
        const newSample = [newData[1], newData[2]];
        const sampleLen = acc.samples.length;
        const samples = sampleLen < 0 ? append(newSample, acc.samples)
          : append(newSample, takeLast(smoothSampleSize, acc.samples));
        return {
          id: newData[0],
          samples,
        };
      },
      { id: 0, samples: [] }
    )
    // smooth output
    .map(data => ({
      id: data.id,
      value: reduce(zipWith(add), [0, 0])(data.samples).map(divide(__, smoothSampleSize)),
    }))
    .map(data => ({
      id: data.id,
      value: Math.atan2(data.value[0], data.value[1]),
    }));
}

const sailCal = [511, 509];
export function getSailKnob(input$) {
  const sail$ = input$
    .map(find(isSail))
    .filter(notNil)
    .map(data => [data[0], data[2] - sailCal[0], data[3] - sailCal[1]]);
  return parseKnobData(sail$);
}

const rudderCal = [514, 511];
export function getRudderKnob(input$) {
  const rudder$ = input$
    .map(find(isRudder))
    .filter(notNil)
    .map(data => [data[0], data[2] - rudderCal[0], data[3] - rudderCal[1]]);
  return parseKnobData(rudder$);
}

export function getHatch(input$) {
  return input$
    .map(find(isHatch))
    .filter(notNil)
    .map(data => ({ id: data[0], isOpen: data[2] > 450 }));
}

export function getWick(input$) {
  return input$
    .map(find(isWick))
    .filter(notNil)
    .map(data => ({ id: data[0], isLit: data[2] > 575 }));
}

export function getFlame(input$) {
  return input$
    .map(find(isFlame))
    .filter(notNil)
    .map(data => ({ id: data[0], isPressed: data[2] > 800 }));
}

function getInputChange(input$, idFunc, type) {
  return input$
    .map(find(idFunc))
    .fold(
      (acc, curr) => ({
        prev: curr,
        val: (notNil(curr) && isNil(acc.prev) ? [curr[0], type] : undefined),
      }),
      { prev: undefined, val: undefined }
    )
    .filter(data => notNil(data.val))
    .map(data => data.val);
}


export function getAllInputSwap(input$) {
  return xs.merge(
    // DO FIRE INPUT
    getInputChange(input$, isSail, INPUT_TYPES.SAIL),
    getInputChange(input$, isRudder, INPUT_TYPES.RUDDER),
    getInputChange(input$, isHatch, INPUT_TYPES.HATCH),
    getInputChange(input$, isWick, INPUT_TYPES.WICK),
    getInputChange(input$, isFlame, INPUT_TYPES.FLAME)
  );
}
