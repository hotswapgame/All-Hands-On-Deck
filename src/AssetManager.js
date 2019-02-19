import { isNil } from 'ramda';

import STLLoader from '../lib/STLLoader';

const stlLoader = new STLLoader();
const modelStore = {};

export function getModel(path) {
  // Memoized
  if (!isNil(modelStore[path])) {
    return new Promise(resolve => resolve(modelStore[path]));
  }

  return new Promise((resolve) => {
    stlLoader.load(path, (data) => {
      modelStore[path] = data;
      resolve(data);
    });
    // add error handling when model don't exist
  });
}

export default getModel;
