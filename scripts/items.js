const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
import {o13SheetMixin} from "./components/sheet.js";

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

export class o13ItemSheet extends o13SheetMixin(HandlebarsApplicationMixin(ItemSheetV2)) {
	static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
		classes: ["13omens", "item-sheet"],		position: {
			width: 600,
			height: 600
		},
		actions: {
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
	
	async _onDrop(event) {
		event.preventDefault();
		
		var handled = false;
		
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		
		if (!data) return;
		
		const object = await fromUuid(data.uuid);
		
		const dropZone = event.target.closest("[drop-zone]");
		
		if (dropZone) {
			if (this.item.type == "archetype") {
				if (data.parentArchetype == this.item.uuid) {
					switch(dropZone.getAttribute("drop-zone")) {
						case "guaranteedGear":
							this.item.markAsGuaranteedGear(data.gearID);
							handled = true;
							break;
						case "selectableGear":
							this.item.removeFromGuaranteedGear(data.gearID);
							handled = true;
							break;
					}
				}
			}
		}
		
		if (!handled) {
			//Default sheet drop
			if (!object) return;

			if (this.item.type == "archetype") {
				if(data.type == "Item") {
					this.item.addSubItem(object);
					handled = true;
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