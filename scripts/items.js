const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField } = foundry.data.fields;

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class o13Item extends Item {
	get isArchetype() {
		return this.type == "archetype";
	}
	
	get isPerk() {
		return this.type == "perk";
	}
	
	get isGear() {
		return this.type == "gear";
	}
	
	async addSubItem(item) {
		if (this.isArchetype && (item instanceof o13Item)) {
			const data = item.toObject();
			
			foundry.utils.setProperty(data, "flags.core.sourceId", item.uuid);
			foundry.utils.setProperty(data, "flags.13omens.parentArchetype", this.uuid);
			
			if (item?.isPerk) {
				this.update({system : {perks : {[foundry.utils.randomID()] : data}}});
			}
			
			if (item?.isGear) {
				return this.update({system : {gear : {[foundry.utils.randomID()] : data}}});
			}
		}
	}
	
	async removeSubItem(id) {
		if (this.isArchetype) {
			if (this.system.perks[id]) {
				return this.update({`system.perks.-=${id}`: null})
			}
			if (this.system.gear[id]) {
				return this.update({`system.gear.-=${id}`: null})
			}
		}
	}
	
	async updateSubItem(itemid, data) {
		if (this.isArchetype) {
			const currentData = this.system.perks[itemid] || this.system.gear[itemid];
			
			if (currentData && ((currentData.type == data.type) || !data.hasOwnProperty("type"))) {
				switch (currentData.type) {
					case "perk" : return this.update({system : {perks : {[itemid] : data}}}); break;
					case "gear" : return this.update({system : {gear : {[itemid] : data}}}); break;
				}
			}
		}
	}
	
	getPerkItem(id) {
		if (this.isArchetype) {
			const data = this.system.perks[id];
			
			if (data && data.type == "perk") {
				const perk = new o13Item(data);
				
				if (perk.isPerk) {
					return perk;
				}
			}
		}
	}
	
	get perksData() {
		if (this.isArchetype) {
			return this.system.perks;
		}
	}
	
	get gearData() {
		if (this.isArchetype) {
			return this.system.gear;
		}
	}
	
	getGearItem(id) {
		if (this.isArchetype) {
			const data = this.system.gear[id];
			
			if (data && data.type == "gear") {
				const gear = new o13Item(data);
				
				if (gear.isGear) {
					return gear;
				}
			}
		}
	}
	
	get parentArchetype() {
		if (this.isPerk || this.isGear) {
			const uuid = this?.flags?.["13omens"]?.parentArchetype;
			
			if (uuid) {
				const archetype = fromUuidSync(uuid);
				
				if (archetype.isArchetype) {
					return archetype;
				}
			}
		}
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
	
	async _onDrop(event) {
		event.preventDefault();
		
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		
		if (!data) return;
		
		const object = await fromUuid(data.uuid);
		
		if (!object) return;

		if (this.item.type == "archetype") {
			if(data.type == "Item") {
				this.item.addSubItem(object);
			}
		}
	}
}

class archetypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			perks: new ObjectField({}),
			
			gear: new ObjectField({})
		};
	}
	
	prepareDerivedData() {
		return {
			
		}
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

export const itemDMs = {archetype : archetypeDataModel, perk : perkDataModel}