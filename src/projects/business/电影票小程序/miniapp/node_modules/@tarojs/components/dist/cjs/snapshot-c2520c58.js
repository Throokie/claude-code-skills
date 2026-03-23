'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const Snapshot = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('Snapshot', this);
  }
  render() {
    return index.h(index.Host, null);
  }
};

exports.Snapshot = Snapshot;
