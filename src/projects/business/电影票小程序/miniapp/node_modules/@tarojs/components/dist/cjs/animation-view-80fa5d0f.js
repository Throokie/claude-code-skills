'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const AnimationView = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('AnimationView', this);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.AnimationView = AnimationView;
