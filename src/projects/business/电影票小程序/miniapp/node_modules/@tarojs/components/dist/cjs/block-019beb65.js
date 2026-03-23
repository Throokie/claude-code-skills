'use strict';

const index = require('./index-ae99cbcc.js');

const Block = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.Block = Block;
