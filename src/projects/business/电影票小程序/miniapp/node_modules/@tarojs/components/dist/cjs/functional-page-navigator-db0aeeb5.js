'use strict';

const index = require('./index-ae99cbcc.js');
const helper = require('./helper-ad6306f6.js');

const FunctionalPageNavigator = class {
  constructor(hostRef) {
    index.registerInstance(this, hostRef);
  }
  componentDidLoad() {
    helper.notSupport('FunctionalPageNavigator', this);
  }
  render() {
    return (index.h(index.Host, null));
  }
};

exports.FunctionalPageNavigator = FunctionalPageNavigator;
