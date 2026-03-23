import { r as registerInstance, h, H as Host } from './index-0004ce39.js';
import { n as notSupport } from './helper-8a85bb65.js';

const Camera = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
  }
  componentDidLoad() {
    notSupport('Camera', this);
  }
  render() {
    return (h(Host, null));
  }
};

export { Camera as C };
