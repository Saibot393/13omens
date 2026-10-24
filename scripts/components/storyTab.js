const { HandlebarsApplicationMixin} = foundry.applications.api;

const { AbstractSidebarTab } = foundry.applications.sidebar;

export class o13StoryTab extends HandlebarsApplicationMixin(AbstractSidebarTab) {
    static DEFAULT_OPTIONS = {
        id : "o13-story-tab",
        classes : ["o13-sheet"]
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

    get activeStory() {
        return game.actors.find(actor => actor.isStory && actor.isActiveStory)
    }

    get hostOmenDice() {
        return this.activeStory?.hostOmenDice || [];
    }

    get hostOmenDice() {
        return this.activeStory?.diceBagDice || game.system.api.utils.counttobag(CONFIG["13OMENS"].DEFAULTDICEBAGCOUNT);
    }

    static tabName = "REPLACEME"

    static registerTab() {
        ui.o13StoryTab = new o13StoryTab();

        CONFIG.ui.sidebar.TABS.o13StoryTab = {
            tooltip: "ReplACEME",
            icon: "fa-solid fa-dice"
        }
    }
}