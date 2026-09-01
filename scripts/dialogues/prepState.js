import {o13SheetMixin} from "../components/sheet.js";

const {ApplicationV2, HandlebarsApplicationMixin} foundry.applications.api;

export class o13prepState extends o13SheetMixin(HandlebarsApplicationMixin(ApplicationV2)) {
	constructor (baseStory) {
		if (!baseStory.isStory) {
			this._baseStory = baseStory;
		}
	}
	
	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/${"dialogues"}/${prepState}.hbs`
			}
		};
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		
		context.baseStory = this._baseStory;
		
		return context;
	}
}