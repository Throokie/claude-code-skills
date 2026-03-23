'use strict';

const index = require('./index-ae99cbcc.js');

const CustomWrapper = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.CustomWrapper = CustomWrapper;
