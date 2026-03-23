'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const LivePlayer = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('LivePlayer', this);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.LivePlayer = LivePlayer;
