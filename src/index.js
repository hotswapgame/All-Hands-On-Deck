import { pipe, map, split } from 'ramda';
import xs from 'xstream';

import SerialProducer from './SerialProducer';
import { init, resize } from './GameManager';

// create serial port and open connection
const serial = new SerialProducer();

// Parse the input protocol from arduino
const input$ = xs.create(serial)
  .map(d => d.toString())
  .map(split(':'))
  .map(map(pipe(split(' '), map(parseInt))));

// Using set timeout here because there is a race condition
window.onload = () => { setTimeout(() => init(input$), 500); };
window.onresize = resize;
