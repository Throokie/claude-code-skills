'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const ChannelLive = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('ChannelLive', this);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.ChannelLive = ChannelLive;
