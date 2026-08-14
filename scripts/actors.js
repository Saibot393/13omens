const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField } = foundry.data.fields;
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

import { o13Roll } from "./roll.js";

const COREASPECTS_IDS = ["courage", "evade", "fight", "luck", "perception"];
const ASPECTRATINGS = [-1, 0,1,2,3,4];
const ASPECTTN = [10, 9, 7, 5, 4];

function newRating() {
	return new NumberField({ required: true, integer: true, nullable : true, min: Math.min(...ASPECTRATINGS), max : Math.max(...ASPECTRATINGS), initial: ASPECTRATINGS[0] });
} 

export class o13Actor extends Actor {
	async _preCreate(data, options, user) {
		await super._preCreate(data, options, user);

		if (!data.prototypeToken) {
			if (this.type == "pc" || this.type == "story") {
				this.updateSource({
					prototypeToken: {
						actorLink: true,
						disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
					}
				});
			}
		}
	}
	
	get isPC() {
		return this.type == "pc";
	}
  
	get inventory() {
		return [...this.items].filter(item => item.type == "gear");
	}
	
	getPerks(filterpicked = false) {
		if (this.isPC) {
			const perks = [...this.items].filter(item => item.type == "perk");
			
			if (filterpicked) {
				return perks.filter(item => this.system.pickedperks.find(pickedperk => pickedperk.id == item.id));
			}
			
			return perks;
		}
		
		return [];
	}
	
	get perks() {
		return this.getPerks();
	}
	
	get pickedPerks() {
		return this.getPerks(true);
	}
	
	get isDead() {
		
	}
		
	async rollAspect(aspectName, rollDialogue = false, toChat = false) {
		const cAspectData = this.system.getAspectData(aspectName, true);
		
		if (cAspectData) {
			const roll = new o13Roll(this, aspectName);
			
			await roll.roll();
			
			if (toChat) {
				roll.toMessage();
			}
			
			return roll;
		}
	}
}

export class o13ActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: ["13omens", "actor-sheet"],
		tag: "form",
		form: {
			closeOnSubmit: false,
			submitOnChange: true
		},
		window: {
			resizable: true
		},
		actions: {
			choosePortrait : o13ActorSheet.choosePortrait,
			rollAspect : o13ActorSheet.rollAspect
		}
	};

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
		return context;
	}

	static async choosePortrait(event, target) {
		const picker = new foundry.applications.apps.FilePicker.implementation({
			type: "image",
			current: this.actor.img,
			callback: async (path) => {
				await this.actor.update({img : path})
			}
		}).render(true);
	}
	
	static async rollAspect(event, target) {
		const aspectName = target.getAttribute("aspect-name");
		if (aspectName) {
			this.actor.rollAspect(aspectName, true, true);
		}
	}
}

class storyDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			activeact: new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 3, initial: 1 }),
			
			dicebag: new SchemaField({
				omen: new NumberField({ required: true, integer: true, nullable: true, initial: 1 }),
				safe: new NumberField({ required: true, integer: true, nullable: true, initial: 8 })
			}),
			
			hostomendice: new NumberField({ required: true, integer: true, nullable: true, initial: 13 }),
			
			storyaspects: new ArrayField(new SchemaField({
				name: new StringField({ required: true, initial: ""})
			}), {initial: () => Array.from({length : 5}, () => ({name : ""}))}),
			
			pcs: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			})),
			
			npcs: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			})),
			
			archetypes: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			}))
		};
	}
}

class pcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			//story : new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}),
			
			traits : new StringField({ required: true, initial: ""}),
			
			goal : new HTMLField({ required: true, blank: true, initial: "" }),
			
			notes : new HTMLField({ required: true, blank: true, initial: "" }),
			
			wounds : new ArrayField(new SchemaField({
				safe : new SchemaField({
					filled : new BooleanField({ required: true, initial: false}),
					side : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 6, initial: null }),
					act : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 3, initial: null })
				}),
				omen : new SchemaField({
					filled : new BooleanField({ required: true, initial: false}),
					side : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 6, initial: null }),
					act : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 3, initial: null })
				})
			}), {initial: () => Array.from({length : 4}, () => ({safe : {filled : false, side : null, act : null}, omen : {filled : false, side : null, act : null}}))}),
			
			aspects: new SchemaField({
				core: new SchemaField(Object.fromEntries(COREASPECTS_IDS.map(str => [str, new SchemaField({
					rating : newRating(),
					strain : new BooleanField({ required: true, initial: false})
				})]))),
				
				story: new ArrayField(new SchemaField({
					rating: newRating(),
					strain : new BooleanField({ required: true, initial: false}),
					name: new StringField({ required: true, initial: ""})
				}), {initial: () => Array.from({length : 5}, () => ({rating : ASPECTRATINGS[0], strain : false, name : ""}))})
			}),
			
			pickedperks: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			}))
		};
	}
	
	prepareDerivedData() {
		this.availableRatings = {
			core : ASPECTRATINGS.filter(rating => rating < 0 || !Object.values(this.aspects.core).find(value => value.rating == rating)),
			story : ASPECTRATINGS.filter(rating => rating < 0 || !this.aspects.story.find(value => value.rating == rating))
		}
		
		this.targetNumbers = {
			core : Object.fromEntries(Object.keys(this.aspects.core).map(key => [key, ASPECTTN[this.aspects.core[key].rating]])),
			story : this.aspects.story.map(value => ASPECTTN[value.rating])
		}
		
		this.wounddice = this.wounds.map((wound, index) => {
			var die = {};
			
			if (!wound.omen.filled && !wound.safe.filled) {
				die.face = (index+1 == this.wounds.length) ? 6 : index+1;
				die.type = "blank";
			}
			else {
				if (wound.omen.filled) {
					die.face = wound.omen.side;
					die.type = "omen";
					die.act = wound.omen.act;
				}
				else {
					if (wound.safe.filled) {
						die.face = wound.safe.side;
						die.type = "safe";
						die.act = wound.safe.act;
					}
				}
			}
			
			return die;
		})
	}
	
	getAspectData(aspectName, includeTN = false) {
		if (COREASPECTS_IDS.includes(aspectName)) {
			const add = includeTN ? {targetNumber : this.targetNumbers.core[aspectName]} : {};
			
			return {...add, ...this.aspects.core[aspectName]};
		}
		
		if (!isNaN(aspectName)) {
			const add = includeTN ? {targetNumber : this.targetNumbers.story[aspectName]} : {};
			
			return {...add, ...this.aspects.story[aspectName]};
		}
	}
}

class npcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			story: new HTMLField({ required: true, blank: true, initial: "" })
		};
	}
}

export const actorDMs = {story : storyDataModel, pc : pcDataModel, npc : npcDataModel}

/*
class MySlider extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <input
    const input = document.createElement("input");

    input.type = "range";
    input.min = this.getAttribute("min") ?? 0;
    input.max = this.getAttribute("max") ?? 100;
    input.value = this.getAttribute("value") ?? 0;

    this.appendChild(input);
      >
    `;
	
this.input.addEventListener("input", (event) => {
      this.dispatchEvent(new CustomEvent("stat-change", {
        bubbles: true,
        detail: {
          id: this.dataset.id,
          value: Number(event.target.value)
        }
      }));
    });
  }
  
  
}

customElements.define("my-slider", MySlider);
*/