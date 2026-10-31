import {o13uiHandlerMixin} from "../components/uiHandler.js";
import {o13WaitMixIn} from "../components/wait.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13selectQuery extends o13WaitMixIn(o13uiHandlerMixin(HandlebarsApplicationMixin(ApplicationV2))) {
	constructor (options = {query : null, options : {}, startSelection : null, emptyOptions : true}) {
		super(options);
		
		this._closeResolve = options.startSelection;
		
		this._selectoptions = options.options;
		this._query = options.query;
		this._selection = options.startSelection;
		this._emptyOption = options.emptyOption;

		if (!options.emptyOption) {
			this._selection = Object.keys(this.selectOptions)[0];
		}
	}
	
	static DEFAULT_OPTIONS = {
		window: {
			resizable: false,
		},
		form: {
			handler: o13selectQuery._onSubmitForm,
			submitOnChange: true,
			closeOnSubmit: false
		}
	};
	
	get selectOptions() {
		return this._selectoptions;
	}

	get emptyOption() {
		return this._emptyOption;
	}

	get selection() {
		return this._selection;
	}
	
	get query() {
		return this._query;
	}
	
	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/${"dialogues"}/${"selectQuery"}.hbs`
			}
		};
	}
	
	static async _onSubmitForm(event, form, formData) {
		for (let key of Object.keys(formData.object)) {
			foundry.utils.setProperty(this, "_" + key, formData.object[key]);
		}
		
		this.render(true);
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		
		context.selectQuery = this;
		
		return context;
	}
	
	async accept(event, target) {
		this._resolveWait(this.selection, true);
	}	
	
	async cancel(event, target) {
		this._resolveWait(this._closeResolve, true);
	}
}