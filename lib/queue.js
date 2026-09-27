'use strict';

class Queue {
  constructor() {
    this._chain = Promise.resolve();
  }

  run(fn) {
    const result = this._chain.then(() => fn());
    this._chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

const queues = new Map();

function queueFor(key) {
  if (!queues.has(key)) queues.set(key, new Queue());
  return queues.get(key);
}

module.exports = { Queue, queueFor };
