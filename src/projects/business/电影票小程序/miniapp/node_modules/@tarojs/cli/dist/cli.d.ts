export default class CLI {
    appPath: string;
    constructor(appPath?: string);
    run(): Promise<void>;
    parseArgs(): Promise<void>;
}
