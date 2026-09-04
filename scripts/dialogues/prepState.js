import {o13SheetMixin} from "../components/sheet.js";
import {o13WaitMixIn} from "../components/wait.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13prepState extends o13WaitMixIn(o13SheetMixin(HandlebarsApplicationMixin(ApplicationV2))) {
	constructor (baseStory) {
		super();
		
		if (baseStory.isStory) {
			this._baseStory = baseStory;
		}
	}
	
	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/${"dialogues"}/${"prepState"}.hbs`
			}
		};
	}
	
	get baseStory() {
		return this._baseStory;
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		
		context.baseStory = this.baseStory;
		
		return context;
	}
	
	async _onUpdateActor(actor, changes, options, userId) {
		if (actor == this.baseStory) return true;
		
		if (actor.isPC) {
			if (actor.storyActor == this.baseStory) {
				//here a filter for the actors changes could be applied, but this window will only be open for a few minutes max. and is not particularly interactive, so this should suffice
				return true;
			}
		}
	}
	
	async _onUpdateItem(item, changes, options, userId) {
		if (item.isGear && item.parent?.isPC) {
			if (item.parent.storyActor == this.baseStory) {
				return true;
			}
		}
	}
	
	async openPC(event, target) {
		const pcID = target.getAttribute("pc-id");
		
		const pc = this.baseStory?.pcActors.find(actor => actor.id == pcID);
		
		if (pc && pc.isPC) {
			pc.sheet.render(true);
		}
	}
	
	async startStory(event, target) {
		this._resolveWait(true, true);
	}	
	
	async returnToPrep(event, target) {
		this._resolveWait(false, true);
	}
}