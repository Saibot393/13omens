import {utils} from '../utils.js';

import {o13SheetMixin} from "../components/sheet.js";

import {o13BasicDragDropMixin} from "../components/basicDragDrop.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13GearTrade extends o13SheetMixin(o13BasicDragDropMixin(HandlebarsApplicationMixin(ApplicationV2))) {
    constructor(sourceActor, options = {targetOptions : [], targetActor : undefined, receiveMode : false}) {
        super();

        this._sourceActor = sourceActor;
        this._options = options;
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

    get sourceActor() {
        return this._sourceActor;
    }

    get targetOptions() {
        return this._options.targetOptions;
    }

    get targetActor() {
        return this._options.targetActor;
    }

    get isReceiveMode() {
        return this._options.isReceiveMode;
    }
}