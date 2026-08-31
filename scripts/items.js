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
		}
	});

	async _processSubmitData(event, form, formData) {
        if (this.item.hasParentAchetype && !this.item.parent) {
			await this.item.update(formData);
			
            return;
        }
		
		return super._processSubmitData(event, form, formData);
    }
	
	async removePerk(event, target) {
		if (this.item.type == "archetype") {
			const perkID = target.getAttribute("perk-id");

			if (perkID) {
				this.item.removeSubItem(perkID);
			}
		}
	}
	
	async openPerk(event, target) {
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
	
	async removeGear(event, target) {
		if (this.item.type == "archetype") {
			const gearID = target.getAttribute("gear-id");

			if (gearID) {
				this.item.removeSubItem(gearID);
			}
		}
	}
	
	async openGear(event, target) {
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
	
	static removeEffect(event, target) {
		if (this.item.type == "perk") {
			const effectid = target.getAttribute("effect-id");
			
			this.item.removeEffect(effectid);
		}
	}
	
	static openEffect(event, target) {
		if (this.item.type == "perk") {
			const effectid = target.getAttribute("effect-id");
			
			const effect = this.item.effects.get(effectid);
			
			if (effect) {
				effect.sheet.render(true);
			}
		}
	}
}