import {utils} from '../utils.js';

import {o13SheetMixin} from "../components/sheet.js";

import {o13BasicDragDropMixin} from "../components/basicDragDrop.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13GearTrade extends o13SheetMixin(o13BasicDragDropMixin(HandlebarsApplicationMixin(ApplicationV2))) {
    constructor(sourceActor, options = {targetOptions : [], targetActor : undefined, receiveMode : false}) {
        super();

        this._sourceActor = sourceActor;
        this._options = options;

        this._gear = {};

        this._tradeID = foundry.utils.randomID();
    }

    static createTradeConfirm() {

    }

    get title() {
        return game.i18n.localize("13omens.titles.gearTrade");
    }

    _configureRenderParts(options) {
        return {
            main: {
                template: `systems/13omens/templates/${"dialogues"}/${"gearTrade"}.hbs`
            }
        }
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.trade = this;

        return context;
    }

    async _applyUpdate() {
        if (this.rendered) this.render(true);
    }

    get sourceActor() {
        return this._sourceActor;
    }

    get targetOptions() {
        return this._options.targetOptions;
    }

    get preparedTargetOptiosn() {
        return this.targetOptions
    }

    get targetActor() {
        return this._options.targetActor;
    }

    get isReceiveMode() {
        return this._options.isReceiveMode;
    }

    get isOwner() {
        return true;
    }

    get gear() {
        return this._gear;
    }

    async handleDrop(data, event, prepared) {
        let handled = false;

        const object = prepared.object;
        if (!object || !(object.parent == this.sourceActor)) return handled;

        if (object.isGear) {
            await this.addGear(object);
            handled = true;
        }

        return handled;
    }

    static sendTradeRequest() {

    }

    addGear(gear) {
        if (gear.isGear) {
            this._gear[gear.id] = {
                name : gear.name,
                id: gear.id,
                hasQuantityMax : true,
                quantityMax : gear.quantityValue, //we can at maximum transfer gear equal to the currently available maximum
                quantityValue : gear.quantityValue
            }

            this._applyUpdate();
        }
    }

    changeGearQuantity(id, change) {
        if (this._gear[id]) {
            this._gear[id].quantityValue = Math.min(this._gear[id].quantityMax, Math.max(0, this._gear[id].quantityValue + change));

            this._applyUpdate();
        }
    }

    async removeGearbyID(gearID) {
        delete this._gear[gearID];

        this._applyUpdate();
    }

    async removeGear(event, target) {
        const gearid = target.getAttribute("gear-id");

        this.removeGearbyID(gearid);
    }

    async breakGear(event, target) {
        const gearid = target.getAttribute("gear-id");

        this.changeGearQuantity(gearid, -1);
    }

    async repairGear(event, target) {
        const gearid = target.getAttribute("gear-id");

        this.changeGearQuantity(gearid, 1);
    }

    static executeTranser() {

    }
}