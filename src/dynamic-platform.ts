import {
    API,
    APIEvent,
    DynamicPlatformPlugin,
    HAP,
    Logging,
    PlatformAccessory,
    PlatformConfig,
} from "homebridge";

import { Server } from './server';

import * as parts from "./accessories";

import * as constants from './constants';

let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (api: API) => {
    hap = api.hap;
    Accessory = api.platformAccessory;

    api.registerPlatform(constants.PLATFORM_NAME, HttpKit);
};

class HttpKit implements DynamicPlatformPlugin {

    private readonly log: Logging;
    private readonly api: API;

    private requestServer: Server;

    private readonly accessories: PlatformAccessory[] = [];

    constructor(log: Logging, config: PlatformConfig, api: API) {
        this.log = log;
        this.api = api;

        // TODO: probably parse config or something here

        log.info("HTTPKit Initialized");
        this.requestServer = new Server(log, api);

        api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
            this.requestServer.start();
        });
    }

    configureAccessory(accessory: PlatformAccessory): void {
        // TODO: Review this when making multi-devices
        const p = new parts.Switch(this.log, this.api, undefined, accessory);
        this.requestServer.configureAccessory(p);
    }

}
