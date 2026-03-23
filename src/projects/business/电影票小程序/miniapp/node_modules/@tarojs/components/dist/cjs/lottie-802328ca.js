'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const Lottie = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('Lottie', this);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.Lottie = Lottie;
