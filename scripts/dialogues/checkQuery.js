import {o13SheetMixin} from "../components/sheet.js";
import {o13WaitMixIn} from "../components/wait.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13checkQuery extends o13WaitMixIn(o13SheetMixin(HandlebarsApplicationMixin(ApplicationV2))) {
	constructor (checks = {}, options = {query : null}) {
		super();
		
		this._closeResolve = checks;
		
		this._checks = foundry.utils.deepClone(checks);
		this._query = options.query;
	}
	
	static DEFAULT_OPTIONS = {
		window: {
			resizable: false,
		},
		form: {
			handler: o13checkQuery._onSubmitForm,
			submitOnChange: true,
			closeOnSubmit: false
		}
	};
	
	get checks() {
		return this._checks;
	}
	
	get query() {
		return this._query;
	}
	
	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/${"dialogues"}/${"checkQuery"}.hbs`
			}
		};
	}
	
	static async _onSubmitForm(event, form, formData) {
		for (let key of Object.keys(formData.object)) {
			foundry.utils.setProperty(this._checks, key, formData.object[key]);
		}
		
		this.render(true);
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		
		context.checkQuery = this;
		
		return context;
	}
	
	async accept(event, target) {
		this._resolveWait(this.checks, true);
	}	
	
	async cancel(event, target) {
		this._resolveWait(this._closeResolve, true);
	}
}