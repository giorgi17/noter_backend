const NodeCache = require('node-cache');

let cache;

module.exports = {
  init: () => {
    cache = new NodeCache();
    return cache;
  },
  getCache: () => {
    if (!cache) {
      throw new Error('Cache not initialized!');
    }
    return cache;
  },
};
