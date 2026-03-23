'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const Camera = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('Camera', this);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.Camera = Camera;
