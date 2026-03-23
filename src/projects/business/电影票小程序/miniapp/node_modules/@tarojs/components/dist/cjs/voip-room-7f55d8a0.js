'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const VoipRoom = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('VoipRoom', this);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.VoipRoom = VoipRoom;
