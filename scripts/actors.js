const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

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
		superPD : ["update", "_preCreate", "_preUpdate", "_onUpdate", "_onCreateDescendantDocuments"]
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

export class o13ActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
		classes: ["13omens", "actor-sheet"],
		tag: "form",
		position: {
			width: 600,
			height: 800
		},
		form: {
			closeOnSubmit: false,
			submitOnChange: true
		},
		window: {
			resizable: true
		},
		actions: {
			choosePortrait : o13ActorSheet.choosePortrait,
			viewStory : o13ActorSheet.viewStory,
			rollAspect : o13ActorSheet.rollAspect,
			createNewArchetype : o13ActorSheet.createNewArchetype,
			openArchetype : o13ActorSheet.openArchetype,
			deleteArchetype : o13ActorSheet.deleteArchetype,
			openPC : o13ActorSheet.openPC,
			removePC : o13ActorSheet.removePC,
			removePerk : o13ActorSheet.removePerk,
			removeGear : o13ActorSheet.removeGear,
			addOmenDice : o13ActorSheet.addOmenDice,
			removeOmenDice : o13ActorSheet.removeOmenDice,
			openGear : o13ActorSheet.openGear,
			breakGear : o13ActorSheet.breakGear,
			repairGear : o13ActorSheet.repairGear,
			toggleSelectGear : o13ActorSheet.toggleSelectGear,
			takeWound : o13ActorSheet.takeWound,
			cheatDeath : o13ActorSheet.cheatDeath,
			clearWound : o13ActorSheet.clearWound,
			advanceAct : o13ActorSheet.advanceAct,
			resettoPrologue : o13ActorSheet.resettoPrologue,
			usePerk : o13ActorSheet.usePerk,
			autoPopulatePCs : o13ActorSheet.autoPopulatePCs
		}
	});

	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/actors/${this.actor.type}.hbs`
			}
		};
	}
  
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.actor = this.actor;
		
		context.editable = true;

        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.actor.system.description ?? "",
            {
                secrets: this.actor.isOwner,
                async: true,
                relativeTo: this.actor
            }
        );
		
		return context;
	}
	
	async _onDrop(event) {
		event.preventDefault();
		
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		
		if (!data) return;
		
		const object = await fromUuid(data.uuid);
		
		if (!object) return;

		switch (this.actor.type) {
			case "story":
				switch(data.type) {
					case "Actor" : 
						if (object.isPC) {
							this.actor.addPC(object);
						}
						break;
					case "Item" :
						if (object.type == "archetype") {
							const archetype = await this.actor.createEmbeddedDocuments("Item", [object.toObject()]);
							this.actor.registerArchetype(archetype);
						}
				}
				break;
			case "pc":
				if (data.type == "Item") {
					if (object.type == "perk" || object.type == "gear") {
						return this.actor.createEmbeddedDocuments("Item", [object.toObject()]);
					}
				}
				break;
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
		if (this.actor.isOwner) {
			const picker = new foundry.applications.apps.FilePicker.implementation({
				type: "image",
				current: this.actor.img,
				callback: async (path) => {
					await this.actor.update({img : path})
				}
			}).render(true);
		}
	}
	
	static async viewStory(event, target) {
		if (this.actor.type == "pc") {
			this.actor.storyActor?.sheet.render(true);
		}
	}
	
	static async rollAspect(event, target) {
		if (this.actor.type == "pc") {
			const aspectName = target.getAttribute("aspect-name");
			if (aspectName) {
				this.actor.rollAspect(aspectName, true, true);
			}
		}
	}
	
	static async createNewArchetype(event, target) {
		if (this.actor.type == "story") {
			this.actor.createNewArchetype();
		}
	}
	
	static async openArchetype(event, target) {
		if (this.actor.type == "story") {
			const archetypeID = target.getAttribute("archetype-id");
			
			const archetype = this.actor.items.get(archetypeID);
			
			if (archetype && archetype.type == "archetype") {
				archetype.sheet.render(true);
			}
		}
	}
	
	static async deleteArchetype(event, target) {
		if (this.actor.type == "story") {
			const archetypeID = target.getAttribute("archetype-id");
			this.actor.deleteArchetype(archetypeID);
		}
	}
	
	static async openPC(event, target) {
		if (this.actor.type == "story") {
			const pcID = target.getAttribute("pc-id");
			
			const pc = this.actor.pcActors.find(actor => actor.id == pcID);
			
			if (pc && pc.type == "pc") {
				pc.sheet.render(true);
			}
		}
	}
	
	static async removePC(event, target) {
		if (this.actor.type == "story") {
			const pcID = target.getAttribute("pc-id");
			return this.actor.removePC(pcID);
		}
	}
	
	static async removePerk(event, target) {
		if (this.actor.type == "pc") {
			const perkID = target.getAttribute("perk-id");
			
			return this.actor.removePerk(perkID);
		}
	}
	
	static async removeGear(event, target) {
		if (this.actor.type == "pc") {
			const gearID = target.getAttribute("gear-id");
			
			return this.actor.removeGear(gearID);
		}
	}
	
	static async addOmenDice(event, target) {
		if (this.actor.type == "story") {
			return this.actor.addOmenDice();
		}
	}
	
	static async removeOmenDice(event, target) {
		if (this.actor.type == "story") {
			return this.actor.removeOmenDice();
		}
	}
	
	static async openGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			const gear = this.actor.items.get(gearid);
			
			if (gear?.isGear) {
				gear.sheet.render(true);
			}
		}
	}
	
	static async breakGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			const gear = this.actor.items.get(gearid);
			
			if (gear?.isGear) {
				gear.breakGear();
			}
		}
	}
	
	static async repairGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			const gear = this.actor.items.get(gearid);
			
			if (gear?.isGear) {
				gear.repairGear();
			}
		}
	}
	
	static async toggleSelectGear(event, target) {
		if (this.actor.type == "pc") {
			const gearid = target.getAttribute("gear-id");
			
			this.actor.toggleSelectGear(gearid);
		}
	}
	
	static async takeWound(event, target) {
		if (this.actor.type == "pc") {
			this.actor.takeWound({face : 6, cheatDeath : false})
		}
	}
	
	static async cheatDeath(event, target) {
		if (this.actor.type == "pc") {
			this.actor.takeWound({face : 6, cheatDeath : true})
		}
	}
	
	static async clearWound(event, target) {
		if (this.actor.type == "pc") {
			this.actor.clearWound();
		}
	}
	
	static async advanceAct(event, target) {
		if (this.actor.type == "story") {
			this.actor.advanceAct(null, event.shiftKey);
		}
	}
	
	static async resettoPrologue(event, target) {
		if (this.actor.type == "story") {
			this.actor.resettoPrologue(event.shiftKey);
		}
	}
	
	static async usePerk(event, target) {
		if (this.actor.type == "pc") {
			const perkID = target.getAttribute("perk-id");
			
			
			this.actor.usePerk(perkID);
		}
	}
	
	static async autoPopulatePCs(event, target) {
		console.log(this.actor);
		if (this.actor.type == "story") {
			this.actor.autoPopulatePCs();
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
							if (changes.system.wounds || changes.system.hasOwnProperty("archetype")) {
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
						if (changes.system.storyaspects) {
							rerender = true;
						}
						if (changes.system.hasOwnProperty("activeact")) {
							rerender = true;
						}
					}
				}
			}
			
			if (rerender) {
				this.render(true);
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