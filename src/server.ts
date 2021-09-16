import { API, Logging, PlatformAccessory, PlatformAccessoryEvent } from 'homebridge';

import express from 'express';

import * as parts from './accessories';
import { getHeapStatistics } from 'v8';
import * as constants from "./constants";
import { access } from 'fs';

const PORT = 18081;

export class Server {
    private readonly log: Logging;
    private readonly api: API;
    private readonly accessories: parts.Switch[] = [];
    private readonly app = express();

    constructor(log: Logging, api: API) {
        this.log = log;
        this.api = api;
    }

    public configureAccessory(accessory: parts.Switch) {
        this.log("Configuring accessory %s", accessory.getAccessory().displayName);

        accessory.getAccessory().on(PlatformAccessoryEvent.IDENTIFY, () => {
            this.log("Accessory identified %s", accessory.getAccessory().displayName);
        });

        this.accessories.push(accessory);

        this.log.info("After configure: ", this.accessories.map((a) => a.context()))
    }

    public start() {
        this.app.use(express.json());

        this.app.get("/health", this.handleHealth.bind(this));

        this.app.post("/accessory", this.createAccessory.bind(this));
        this.app.get("/accessory", this.listAccessories.bind(this));

        this.app.get("/accessory/:accessoryId", this.getAccessory.bind(this));
        this.app.delete("/accessory/:accessoryId", this.deleteAccessory.bind(this));

        this.app.get("/accessory/:accessoryId/state", this.getState.bind(this));
        this.app.put("/accessory/:accessoryId/state", this.changeState.bind(this));

        this.app.listen(PORT, () => {
            this.log.info("HTTPKit Server Running");
        });
    }

    private findAccessory(id: string): [number, parts.Switch] | undefined {
        for (let i = 0; i < this.accessories.length; ++i) {
            const accessory = this.accessories[i];
            if (accessory.id() == id) {
                return [i, accessory];
            }
        }

        return undefined;
    }

    private handleHealth(request: express.Request, response: express.Response) {
        this.log.info("GET /health");
        response.send('OK');
    }

    private createAccessory(request: express.Request, response: express.Response) {
        let config: parts.SwitchConfig = request.body;

        this.log.info("Got config: ", config);

        const myswitch = new parts.Switch(this.log, this.api, config);
        this.configureAccessory(myswitch);

        this.api.registerPlatformAccessories(constants.PLUGIN_NAME, constants.PLATFORM_NAME, [myswitch.getAccessory()]);

        response.json({ message: "OK" });
    }

    private listAccessories(request: express.Request, response: express.Response) {
        return response.json({ 'accessories': this.accessories.map((a) => a.context()) })
    }

    private getAccessory(request: express.Request, response: express.Response) {
        const id = request.params.accessoryId;
        const accessoryMaybe = this.findAccessory(id);
        if (accessoryMaybe) {
            return response.json(accessoryMaybe[1].context());
        }

        return response.status(404).json({ message: "not found" });
    }

    private deleteAccessory(request: express.Request, response: express.Response) {
        const id = request.params.accessoryId;
        const accessoryMaybe = this.findAccessory(id);
        if (accessoryMaybe) {
            this.api.unregisterPlatformAccessories(constants.PLUGIN_NAME, constants.PLATFORM_NAME, [accessoryMaybe[1].getAccessory()]);
            this.accessories.splice(accessoryMaybe[0]);
            this.log.info("removed accessory %s", id);
        }
        response.json({ message: "OK" });
        return;
    }

    private getState(request: express.Request, response: express.Response) {
        const id = request.params.accessoryId;
        const accessoryMaybe = this.findAccessory(id);
        if (accessoryMaybe) {
            return response.json({ "state": accessoryMaybe[1].context().state });
        }

        return response.status(404).json({ "message": "not found" });
    }

    private changeState(request: express.Request, response: express.Response) {
        const state: any = request.body;

        const id = request.params.accessoryId;
        const accessoryMaybe = this.findAccessory(id);
        if (accessoryMaybe) {
            accessoryMaybe[1].setState(state as parts.SwitchState);
            response.json({ message: "OK" });
        } else {
            response.status(404).json({ message: "not found" });
        }
    }
}
