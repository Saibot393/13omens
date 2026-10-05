import {o13SheetMixin} from "../components/sheet.js";
import {o13WaitMixIn} from "../components/wait.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13confirmQuery extends o13WaitMixIn(o13SheetMixin(HandlebarsApplicationMixin(ApplicationV2))) {
	constructor (options = {query : null, confirmName : "", cancelName : "", default : false}) {
		super(options);
		
		this._closeResolve = options.default ?? false;
		
		this._query = options.query;
		
		this._confirmName = options.confirmName;
		this._cancelName = options.cancelName;
	}
	
	static DEFAULT_OPTIONS = {
		window: {
			resizable: false,
		}
	};
	
	get query() {
		return this._query;
	}
	
	get confirmName() {
		return this._confirmName || game.i18n.localize("13omens.actions.confirm");
	}
	
	get cancelName() {
		return this._cancelName || game.i18n.localize("13omens.actions.cancel");
	}
	
	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/${"dialogues"}/${"confirmQuery"}.hbs`
			}
		};
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		
		context.confirmQuery = this;
		
		return context;
	}
	
	async confirm(event, target) {
		this._resolveWait(true, true);
	}	
	
	async cancel(event, target) {
		this._resolveWait(false, true);
	}
}