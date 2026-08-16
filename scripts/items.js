const { HTMLField } = foundry.data.fields;

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class o13Item extends Item {
	get isArchetype() {
		return this.type == "archetype";
	}
	
	get storyActor() {
		if (this.isArchetype) {
			if (this.parent?.type == "story") {
				return this.parent;
			}
		}
	}
	
	get archetypeAspect() {
		if (this.isArchetype) {
			return this.storyActor?.getArchetypeAspect(this);
		}
	}
}

export class o13ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: ["13omens", "item-sheet"],
		tag: "form",
		form: {
			closeOnSubmit: false,
			submitOnChange: true
		},
		window: {
			resizable: true
		},
		actions: {
		},
		dragDrop: [{
			dragSelector: ".draggable-item",
			dropSelector: ".drop-zone"
		}]
	};

	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/items/${this.item.type}.hbs`
			}
		};
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.item = this.item;
		
		context.editable = true;

        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.item.system.description ?? "",
            {
                secrets: this.item.isOwner,
                async: true,
                relativeTo: this.item
            }
        );
		
		console.log(context.enrichedDescription);
		
		return context;
	}
}

class perkDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
		};
	}
	
	prepareDerivedData() {
		
	}
}

export const itemDMs = {perk : perkDataModel}