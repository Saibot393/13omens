import {o13uiHandlerMixin} from "../components/uiHandler.js";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class o13houseRuleSettings extends o13uiHandlerMixin(HandlebarsApplicationMixin(ApplicationV2)) {
    constructor (baseStory) {
        super();

        this._ruleSettings = o13houseRuleSettings.currentHouseRuleSettingsCopy;
    }

    static DEFAULT_OPTIONS = {
        window: {
            resizable: false,
        },
        form: {
            handler: o13houseRuleSettings._onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false
        }
    };

    _configureRenderParts(options) {
        return {
            main: {
                template: `systems/13omens/templates/${"dialogues"}/${"houseRuleSettings"}.hbs`
            }
        };
    }

    get title() {
        return game.i18n.localize("13omens.settings.houseRules.name");
    }

    get ruleSettings() {
        return this._ruleSettings;
    }

    async applySettings() {
        const settings = this.ruleSettings;

        for (const key of Object.keys(settings)) {
            await game.settings.set(key.split(".")[0], key.split(".")[1], settings[key].value);
        }
    }

    static get currentHouseRuleSettingsCopy()  {
        const keys = [...game.settings.settings.keys()].filter(key => key.includes("13omens.HR"));

        const settings = {};

        for (const key of keys) {
            settings[key] = foundry.utils.deepClone(game.settings.settings.get(key));
            settings[key].value = game.settings.get(key.split(".")[0], key.split(".")[1]);
            settings[key].type = settings[key].type.name;
        }

        return settings;
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.ruleSettings = this.ruleSettings;

        return context;
    }

    static async _onSubmitForm(event, form, formData) {
        for (const key of Object.keys(formData.object)) {
            this._ruleSettings[key].value = formData.object[key];
        }

        this.render(true);
    }

    async accept(event, target) {
        await await this.applySettings();

        this.close(true);
    }

    async cancel(event, target) {
        this.close(true);
    }
}