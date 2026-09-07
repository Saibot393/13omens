import {o13SheetMixin} from "../components/sheet.js";
import {o13WaitMixIn} from "../components/wait.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13quantityQuery extends o13WaitMixIn(o13SheetMixin(HandlebarsApplicationMixin(ApplicationV2))) {
	constructor (options = {max : null, min : 0, query : null, default : null}) {
		super();
		
		this._closeResolve = undefined;
		
		this._max = options.max;
		this._min = options.min ?? 0;
		this._query = options.query;
		this._value = options.value ?? this._max;
	}
	
	static DEFAULT_OPTIONS = {
		window: {
			resizable: false,
		},
		form: {
			handler: o13quantityQuery._onSubmitForm,
			submitOnChange: true,
			closeOnSubmit: false
		}
	};
	
	get max() {
		return this._max;
	}
	
	get query() {
		return this._query;
	}
	
	get value() {
		return this._value;
	}
	
	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/${"dialogues"}/${"quantityQuery"}.hbs`
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
		
		context.quantityQuery = this;
		
		return context;
	}
	
	async accept(event, target) {
		this._resolveWait(this.value, true);
	}	
	
	async cancel(event, target) {
		this._resolveWait(undefined, true);
	}
}