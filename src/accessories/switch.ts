import { API, Logging, PlatformAccessory, UnknownContext, CharacteristicValue, Service } from 'homebridge';

import * as constants from "../constants";

export interface SwitchConfig {
    id: string;
    name: string;
    on_url: string;
    off_url: string;
}

export interface SwitchState {
    on: boolean
}

export class Switch {
    private readonly log: Logging;
    private readonly api: API;
    private readonly accessory: PlatformAccessory;

    constructor(log: Logging, api: API, config?: SwitchConfig, accessory?: PlatformAccessory) {
        this.log = log;
        this.api = api;

        const svc = this.api.hap.Service;
        const Characteristic = this.api.hap.Characteristic;

        if (accessory) {
            this.accessory = accessory;
            const service = this.accessory.getService(svc.Switch);
            service!.getCharacteristic(Characteristic.On) // TODO: Check for undefined
                .onGet(this.handleGet.bind(this))
                .onSet(this.handleSet.bind(this));

            this.accessory.getService(svc.AccessoryInformation)!
                .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "HTTPKit")
                .setCharacteristic(this.api.hap.Characteristic.Model, "HTTPKit Switch");
        } else {
            // TODO: Validate config is not null.
            const uuid = api.hap.uuid.generate(config!.id); // TODO: Hash??
            this.accessory = new this.api.platformAccessory(config!.name, uuid);
            const service = this.accessory.addService(svc.Switch, config!.name);

            service.getCharacteristic(Characteristic.On)
                .onGet(this.handleGet.bind(this))
                .onSet(this.handleSet.bind(this));

            this.accessory.getService(svc.AccessoryInformation)!
                .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "HTTPKit")
                .setCharacteristic(this.api.hap.Characteristic.Model, "HTTPKit Switch");

            this.accessory.context.state = { on: false };
            this.accessory.context.config = config!;

            this.log.info("Creating switch: ", config!.name);
        }

    }

    public id(): string {
        return this.accessory.context.config.id;
    }

    public context(): any {
        return this.accessory.context;
    }

    public getAccessory(): PlatformAccessory {
        return this.accessory;
    }

    public setState(state: SwitchState) {
        const service = this.accessory.getService(this.api.hap.Service.Switch);
        service!.getCharacteristic(this.api.hap.Characteristic.On) // TODO: Check for undefined
            .updateValue(state.on);
        this.accessory.context.state = state;
    }

    private handleGet(): boolean {
        return this.accessory.context.state.on;
    }

    private handleSet(value: CharacteristicValue) {
        this.accessory.context.state.on = value as boolean;
    }
}
