const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
import {o13SheetMixin} from "./components/sheet.js";

import { o13pcActor, pcDataModel } from "./actors/pc.js";
import { o13storyActor, storyDataModel } from "./actors/story.js";
import { o13npcActor, npcDataModel } from "./actors/npc.js";

export const actorDMs = {story : storyDataModel, pc : pcDataModel, npc : npcDataModel}

export class o13Actor extends Actor {
	static _disPatchInfo = {
		typePatches : {
			pc : o13pcActor,
			story : o13storyActor,
			npc : o13npcActor
		},
		superPD : ["update", "_preCreate", "_preUpdate", "_onUpdate", "_onCreateDescendantDocuments", "prepareBaseData", "prepareEmbeddedDocuments", "prepareDerivedData"]
	}
	
	prepareDerivedData() {
        super.prepareDerivedData();
		
		const currentAEOverrides = foundry.utils.deepClone(this.overrides ?? {});
		
		if (!this._lastAROverrides) {
			this._lastAROverrides = {};
		}
		
		const adddiff = foundry.utils.diffObject(this._lastAROverrides, currentAEOverrides);
		const remdiff = foundry.utils.diffObject(currentAEOverrides, this._lastAROverrides);

		this._lastAROverrides = currentAEOverrides;
		
		if (!foundry.utils.isEmpty(adddiff) || !foundry.utils.isEmpty(remdiff)) {
			this._onAROverrideChange(adddiff, remdiff);
		}
	}
	
	_onAROverrideChange(adddiff, remdiff) {

	}
	
	get isPC() {
		return this.type == "pc";
	}
	
	get isStory() {
		return this.type == "story";
	}
	
	get isNPC() {
		return this.type == "npc";
	}
	
	get isHostView() {
		return game.user.isGM;
	}
	
	get isPlayerView() {
		return !game.user.isGM;
	}
  
	get inventory() {
		return [...this.items].filter(item => item.type == "gear");
	}
}

export class o13ActorSheet extends o13SheetMixin(HandlebarsApplicationMixin(ActorSheetV2)) {
	static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
		classes: ["13omens", "actor-sheet"],
		position: {
			width: 600,
			height: 800
		},
		actions: {
		}
	});
	
	async viewStory(event, target) {
		this.actor.storyActor?.sheet.render(true);
	}
	
	async rollAspect(event, target) {
		if (this.actor.type == "pc") {
			const aspectName = target.getAttribute("aspect-name");
			if (aspectName) {
				this.actor.rollAspect(aspectName, {}, event.shiftKey);
			}
		}
	}
	
	async openArchetype(event, target) {
		if (this.actor.type == "story") {
			const archetypeID = target.getAttribute("archetype-id");
			
			const archetype = this.actor.items.get(archetypeID);
			
			if (archetype && archetype.type == "archetype") {
				archetype.sheet.render(true);
			}
		}
	}
	
	async deleteArchetype(event, target) {
		if (this.actor.type == "story") {
			const archetypeID = target.getAttribute("archetype-id");
			this.actor.deleteArchetype(archetypeID);
		}
	}
	
	async openPC(event, target) {
		if (this.actor.type == "story") {
			const pcID = target.getAttribute("pc-id");
			
			const pc = this.actor.pcActors.find(actor => actor.id == pcID);
			
			if (pc && pc.type == "pc") {
				pc.sheet.render(true);
			}
		}
	}
	
	async removePC(event, target) {
		if (this.actor.type == "story") {
			const pcID = target.getAttribute("pc-id");
			return this.actor.removePC(pcID);
		}
	}
	
	async removePerk(event, target) {
		if (this.actor.type == "pc") {
			const perkID = target.getAttribute("perk-id");
			
			return this.actor.removePerk(perkID);
		}
	}
	
	async openPerk(event, target) {
		if (this.actor.type == "pc") {
			const perkid = target.getAttribute("perk-id");
			
			const perk = this.actor.items.get(perkid);
			
			if (perk?.isPerk) {
				perk.sheet.render(true);
			}
		}
	}
	
	async removeGear(event, target) {
		if (this.actor.type == "pc") {
			const gearID = target.getAttribute("gear-id");
			
			return this.actor.removeGear(gearID);
		}
	}
	
	async openGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			const gear = this.actor.items.get(gearid);
			
			if (gear?.isGear) {
				gear.sheet.render(true);
			}
		}
	}
	
	async breakGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			const gear = this.actor.items.get(gearid);
			
			if (gear?.isGear) {
				gear.breakGear();
			}
		}
	}
	
	async repairGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			const gear = this.actor.items.get(gearid);
			
			if (gear?.isGear) {
				gear.repairGear();
			}
		}
	}
	
	async toggleSelectGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			this.actor.toggleSelectGear(gearid);
		}
	}
	
	async takeWound(event, target) {
		if (this.actor.type == "pc") {
			this.actor.takeWound({face : 6, cheatDeath : false})
		}
	}
	
	async cheatDeath(event, target) {
		if (this.actor.type == "pc") {
			this.actor.takeWound({face : 6, cheatDeath : true})
		}
	}
	
	async advanceAct(event, target) {
		if (this.actor.type == "story") {
			this.actor.advanceAct(null, event.shiftKey);
		}
	}
	
	async resettoPrologue(event, target) {
		if (this.actor.type == "story") {
			this.actor.resettoPrologue(event.shiftKey);
		}
	}
	
	async usePerk(event, target) {
		if (this.actor.type == "pc") {
			const perkID = target.getAttribute("perk-id");
			
			
			this.actor.usePerk(perkID);
		}
	}
	
	async posttoChat(event, target) {
		if (this.actor.type == "pc") {
			const perkID = target.getAttribute("perk-id");
			const gearID = target.getAttribute("gear-id");
			
			if (perkID) {
				
			}
			
			if (gearID) {
				this.actor.geartoChatMessage(gearID);
			}
		}
	}
	
	async _onRender(context, options) {
		await super._onRender(context, options);
		
		this._disableExternalRenderHooks();

		this._externalItemUpdateRender = Hooks.on("updateItem", (item, changes, options, userId) => {
			
		});
		
		this._externalActorUpdateRender = Hooks.on("updateActor", (actor, changes, options, userId) => {
			let rerender = false;
			
			//decide if actor update is relevant for this sheet
			if (this.actor.isStory) {
				if (actor?.isPC) {
					if (actor.storyActor == this.actor) {
						if (changes.hasOwnProperty("name")) {
							rerender = true;
						}
						
						if (changes.system) {
							if (changes.system.wounds || changes.system.hasOwnProperty("archetype") || changes.system.death) {
								rerender = true;
							}
							
							if (this.actor.isPrologue) {
								if (changes.system.hasOwnProperty("archetype") || changes.system.hasOwnProperty("aspects") || changes.system.hasOwnProperty("pickedperks")) {
									//rerender for characters for ready check mark
								}
							}
						}
					}
				}
			}
			
			if (this.actor.isPC) {
				if (actor.isStory) {
					if (this.actor.storyActor == actor) {
						if (changes.system) {
							if (changes.system.storyaspects) {
								rerender = true;
							}
							if (changes.system.hasOwnProperty("activeact")) {
								rerender = true;
							}
						}
					}
				}
			}
			
			if (rerender) {
				this.render({force : false, window : {focus : false}});
			}
		});
	}
	
	async _onClose(options) {
		await super._onClose(options);
	
		this._disableExternalRenderHooks();
	}
	
	_disableExternalRenderHooks() {
		Hooks.off("updateItem", this._externalItemUpdateRender);
		this._externalItemUpdateRender = null;
		Hooks.off("updateActor", this._externalActorUpdateRender);
		this._externalActorUpdateRender = null;
	}
}