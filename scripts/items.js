const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

import { o13archetypeItem, archetypeDataModel } from "./items/archetype.js";
import { o13perkItem, perkDataModel } from "./items/perk.js";
import { o13gearItem, gearDataModel } from "./items/gear.js";

export const itemDMs = {archetype : archetypeDataModel, perk : perkDataModel, gear : gearDataModel}

export class o13Item extends Item {
	static _disPatchInfo = {
		typePatches : {
			archetype : o13archetypeItem,
			perk : o13perkItem,
			gear : o13gearItem
		},
		superPD : ["update", "_preCreate", "_preUpdate", "_onUpdate"]
	}
	
	get isArchetype() {
		return this.type == "archetype";
	}
	
	get isPerk() {
		return this.type == "perk";
	}
	
	get isGear() {
		return this.type == "gear";
	}
}

export class o13ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
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
			choosePortrait: o13ItemSheet.choosePortrait,
			createNewPerk : o13ItemSheet.createNewPerk,
			removePerk : o13ItemSheet.removePerk,
			openPerk : o13ItemSheet.openPerk,
			createNewGear : o13ItemSheet.createNewGear,
			removeGear : o13ItemSheet.removeGear,
			openGear : o13ItemSheet.openGear
		}
	});

	async _processSubmitData(event, form, formData) {
        if (this.item.hasParentAchetype && !this.item.parent) {
			await this.item.update(formData);
			
            return;
        }
		
		return super._processSubmitData(event, form, formData);
    }

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
		
		return context;
	}
	
	async _onDrop(event) {
		event.preventDefault();
		
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		
		if (!data) return;
		
		const object = await fromUuid(data.uuid);
		
		const dropZone = event.target.closest("[drop-zone]");
		
		if (dropZone) {
			if (this.item.type == "archetype") {
				if (data.parentArchetype == this.item.uuid) {
					switch(dropZone.getAttribute("drop-zone")) {
						case "guaranteedGear":
							return this.item.markAsGuaranteedGear(data.gearID);
							break;
						case "selectableGear":
							return this.item.removeFromGuaranteedGear(data.gearID);
							break;
					}
				}
			}
		}
		else {
			//Default sheet drop
			if (!object) return;

			if (this.item.type == "archetype") {
				if(data.type == "Item") {
					this.item.addSubItem(object);
				}
			}
		}
	}
	
	_onDragStart(event) {
		const element = event.currentTarget;

		if (this.item.type == "archetype") {
			if (element.hasAttribute("gear-id")) {
				const dragData = {
					parentArchetype : this.item.uuid,
					gearID : element.getAttribute("gear-id")
				};
				
				event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
				
				return;
			}
		}
	}
	
	async _replaceHTML(result, content, options) {
		//scrollables persistance
		const scrollCache = {};
		if (this.element) {
			const scrollables = this.element.querySelectorAll("[scroll-id]");
			for (const el of scrollables) {
				const id = el.getAttribute("scroll-id");
				if (id) {
					scrollCache[id] = { top: el.scrollTop, left: el.scrollLeft };
				}
			}
		}
		
		await super._replaceHTML(result, content, options);
		
		if (this.element) {
			const newScrollables = this.element.querySelectorAll("[scroll-id]");
			for (const el of newScrollables) {
				const id = el.getAttribute("scroll-id");
				const saved = scrollCache[id];
				if (saved) {
					el.scrollTop = saved.top;
					el.scrollLeft = saved.left;
				}
			}
		}
	}
	
	static async choosePortrait(event, target) {
		const picker = new foundry.applications.apps.FilePicker.implementation({
			type: "image",
			current: this.item.img,
			callback: async (path) => {
				await this.item.update({img : path})
			}
		}).render(true);
	}
	
	static async createNewPerk(event, target) {
		if (this.item.type == "archetype") {
			this.item.createNewPerk();
		}
	}
	
	static async removePerk(event, target) {
		if (this.item.type == "archetype") {
			const perkID = target.getAttribute("perk-id");

			if (perkID) {
				this.item.removeSubItem(perkID);
			}
		}
	}
	
	static async openPerk(event, target) {
		if (this.item.type == "archetype") {
			const perkID = target.getAttribute("perk-id");
			
			if (perkID) {
				const perk = await this.item.getPerkItem(perkID);
				
				if (perk) {
					perk.sheet.render(true);
				}
			}
		}
	}
	
	static async createNewGear(event, target) {
		if (this.item.type == "archetype") {
			this.item.createNewGear();
		}
	}
	
	static async removeGear(event, target) {
		if (this.item.type == "archetype") {
			const gearID = target.getAttribute("gear-id");

			if (gearID) {
				this.item.removeSubItem(gearID);
			}
		}
	}
	
	static async openGear(event, target) {
		if (this.item.type == "archetype") {
			const gearID = target.getAttribute("gear-id");
			
			if (gearID) {
				if (event.shiftKey) return this.item.toggleGuaranteedGear(gearID)
				else {
					const gear = await this.item.getGearItem(gearID);
					
					if (gear) {
						gear.sheet.render(true);
					}
				}
			}
		}
	}
}