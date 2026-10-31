const { HandlebarsApplicationMixin} = foundry.applications.api;

const { AbstractSidebarTab } = foundry.applications.sidebar;

import {o13uiHandlerMixin} from "./uiHandler.js"

export class o13StoryTab extends o13uiHandlerMixin(HandlebarsApplicationMixin(AbstractSidebarTab)) {
    static tabName = "o13story";

    static DEFAULT_OPTIONS = {
        id : o13StoryTab.tabName,
        classes : [""]
    }

    static PARTS = {
        main : {
            template : "systems/13omens/templates/tabs/storyTab.hbs"
        }
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.tab = this;

        return context;
    }

    get isHostView() {
        return game.user.isGM;
    }

    get activeStory() {
        return game.actors.find(actor => actor.isStory && actor.isActiveStory)
    }

    get hostOmenDice() {
        return this.activeStory?.hostOmenDice || [];
    }

    get diceBagDice() {
        return this.activeStory?.diceBagDice || game.system.api.utils.counttobag(CONFIG["13OMENS"].DEFAULTDICEBAGCOUNT);
    }

    get canAddOmenDice() {
        return this.activeStory?.canAddOmenDice;
    }

    get canRemoveOmenDice() {
        return this.activeStory?.canRemoveOmenDice;
    }

    async viewStory() {
        this.activeStory?.sheet.render(true);
    }

    async addOmenDice() {
        await this.activeStory?.addOmenDice()
    }

    async removeOmenDice() {
        await this.activeStory?.removeOmenDice()
    }

    static registerTab() {
        CONFIG.ui[o13StoryTab.tabName] = o13StoryTab;

        foundry.applications.sidebar.Sidebar.TABS[o13StoryTab.tabName] = {
            tooltip : game.i18n.localize("13omens.titles.activeStory"),
            icon : "fa-solid fa-dice",
            gmOnly : false
        }
    }
}