'use strict';

const index = require('./index-ae99cbcc.js');

const Label = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
    this.for = undefined;
  }
  render() {
    return (index.h("label", { htmlFor: this.for }, index.h("slot", null)));
  }
};

exports.Label = Label;
