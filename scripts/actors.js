const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField } = foundry.data.fields;
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

import { o13Roll, o13rollConfig, MAXHOSTOMENDICE, DEFAULTDICEBAGCOUNT, counttobag } from "./roll.js";

const COREASPECTS_IDS = ["courage", "evade", "fight", "luck", "perception"];
const ASPECTRATINGS = [-1, 0,1,2,3,4];
const ASPECTTN = [10, 9, 7, 5, 4];

const DEFAULTMAXWOUNDS = 4;

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
	
	get isStory() {
		return this.type == "story";
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
	
	get archetypes() {
		if (this.isStory) {
			return [...this.items].filter(item => item.type == "archetype");
		}
	}
	
	get pcActors() {
		if (this.isStory) {
			return this.system.pcs.map(pc => game.actors.get(pc.id)).filter(actor => actor?.isPC);
		}
	}
	
	get pcCount() {
		if (this.isStory) {
			return this.pcActors.length;
		}
	}
	
	get pcliveCount() {
		if (this.isStory) {
			return this.pcActors.filter(actor => !actor.isDead).length;
		}
	}
	
	getmaxWounds(actor = undefined) {
		if (this.isStory) {
			const pcCount = this.pcCount;
			const pcliveCount = this.pcliveCount;
			const pcdeadCount = pcCount - pcliveCount;
			
			if (pcCount == 1) return DEFAULTMAXWOUNDS + 2;
			if (pcCount == 2) return DEFAULTMAXWOUNDS + 1;
			if (pcCount == 3) return DEFAULTMAXWOUNDS;
			if (pcCount == 4) return DEFAULTMAXWOUNDS;
			if (pcCount == 5) return DEFAULTMAXWOUNDS - 1;
			if (pcCount >= 6) {
				if (pcdeadCount < 2 || actor?.isDead) return DEFAULTMAXWOUNDS - 2
				else return DEFAULTMAXWOUNDS - 1;
			}
		}
		
		if (this.isPC) {
			return this.storyActor?.getmaxWounds(this);
		}
	}
	
	get maxWounds() {
		return this.getmaxWounds();
	}
	
	get pickedPerks() {
		return this.getPerks(true);
	}
	
	get isDead() {
		if (this.isPC) {
			return this.system.death.isdead;
		}
	}
	
	get storyActor() {
		if (this.isPC) {
			return [...game.actors].find(actor => actor.isStory && actor.hasPC(this))
		}
	}
	
	get hostOmenDice() {
		if (this.isStory) {
			const current = this.system.hostomendice;
			const max = MAXHOSTOMENDICE;
			
			return Array.from(Array(max).keys()).map(i => i+1).map(i => ({type : i <= current ? "omen" : "blank", face : 6}))
		}
		
		if (this.isPC) {
			return this.storyActor?.omendice;
		}
	}
	
	get diceBagCount() {
		if (this.isStory) {
			const wounddice = this.woundDiceCount;
			let bag = {};
			
			bag.safe = DEFAULTDICEBAGCOUNT.safe - wounddice.safe;
			bag.omen = DEFAULTDICEBAGCOUNT.omen + (MAXHOSTOMENDICE - this.system.hostomendice) - wounddice.omen;
			
			return bag;
		}
		
		if (this.isPC) {
			return this.storyActor?.diceBagCount || DEFAULTDICEBAGCOUNT;
		}
	}
	
	get diceBag() {
		if (this.isStory || this.isPC) {
			return counttobag(this.diceBagCount);
		}
	}
	
	get diceBagDice() {
		if (this.isStory || this.isPC) {
			return this.diceBag.map(die => ({type : die, face : 6}));
		}
	}
	
	get woundDiceCount() {
		if (this.isStory) {
			const pcwoundcounts = this.pcActors.map(actor => actor.woundDiceCount);
			
			return {safe : pcwoundcounts.reduce((acc, cur) => acc + cur.safe, 0), omen : pcwoundcounts.reduce((acc, cur) => acc + cur.omen, 0)}
		}
		
		if (this.isPC) {
			return {safe : this.system.wounds.filter(wound => wound.safe.filled), omen : this.system.wounds.filter(wound => wound.omen.filled)};
		}
	}
	
	hasPC(actor) {
		if (this.isStory && actor.isPC) {
			return this.pcActors.includes(actor);
		}
	}
		
	async rollAspect(aspectName, rollDialogue = false, toChat = false) {
		if (this.isPC) {
			const cAspectData = this.system.getAspectData(aspectName, true);
			
			if (cAspectData) {
				new o13rollConfig(this, {aspect : aspectName}).render(true);
			}
		}
	}
	
	async createNewArchetype() {
		if (this.isStory) {
			const archetype = await this.createEmbeddedDocuments("Item", [{
				name: game.i18n.localize("13omens.titles.archetype"),
				type: "archetype"
			}]);
		}
	}
	
	async deletArchetype(id) {
		if (this.isStory && this.items.get(id)?.type == "archetype") {
			this.deleteEmbeddedDocuments("Item", [id]);
		}
	}
	
	async addPC(actor) {
		if (this.isStory) {
			if (actor.isPC && !actor.storyActor) {
				this.update({system : {pcs : [...this.system.pcs, {id : actor.id}]}})
			}
		}
	}
	
	async removePC(id) {
		if (this.isStory) {
			this.update({system : {pcs : this.system.pcs.filter(pc => pc.id != id)}})
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
			rollAspect : o13ActorSheet.rollAspect,
			createNewArchetype : o13ActorSheet.createNewArchetype,
			openArchetype : o13ActorSheet.openArchetype,
			deleteArchetype : o13ActorSheet.deleteArchetype,
			removePC : o13ActorSheet.removePC
		},
		dragDrop: [{
			dragSelector: ".draggable-item",
			dropSelector: ".drop-zone"
		}]
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
	
	async _onDrop(event) {
		event.preventDefault();
		
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		
		if (!data) return;
		
		const object = await fromUuid(data.uuid);
		
		if (!object) return;

		if (this.actor.type == "story") {
			switch(data.type) {
				case "Actor" : 
					if (object.isPC) {
						this.actor.addPC(object);
					}
					break;
				case "Item" :
					if (object.type == "archetype") {
						await this.actor.createEmbeddedDocuments("Item", [object.toObject()])
					}
			}
		}
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
			this.actor.deletArchetype(archetypeID);
		}
	}
	
	static async removePC(event, target) {
		if (this.actor.type == "story") {
			const pcID = target.getAttribute("pc-id");
			this.actor.removePC(pcID);
		}
	}
	
	async _onRender(context, options) {
		await super._onRender(context, options);
		
		this._disableExternalRenderHooks();

		this._externalItemUpdateRender = Hooks.on("updateItem", (item, changes, options, userId) => {
		});
		
		this._externalActorUpdateRender = Hooks.on("updateActor", (actor, changes, options, userId) => {
		});
	}
	
	async _onClose(options) {
		await super._onClose(options);
	
		this._disableExternalRenderHooks();
	}
	
	_disableExternalRenderHooks() {
		Hooks.off(this._externalItemUpdateRender);
		Hooks.off(this._externalActorUpdateRender);
	}
}

class storyDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			activeact: new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 3, initial: 1 }),
			
			/*
			dicebag: new SchemaField({
				omen: new NumberField({ required: true, integer: true, nullable: true, initial: 1 }),
				safe: new NumberField({ required: true, integer: true, nullable: true, initial: 8 })
			}),
			*/
			
			hostomendice: new NumberField({ required: true, integer: true, nullable: true, initial: MAXHOSTOMENDICE }),
			
			storyaspects: new ArrayField(new SchemaField({
				name: new StringField({ required: true, initial: ""})
			}), {initial: () => Array.from({length : 5}, () => ({name : ""}))}),
			
			pcs: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			}), {initial: []}),
			
			npcs: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			}), {initial: []}),
			
			/*
			archetypeaspects: new ArrayField(new SchemaField({
				archetypeid: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}),
				greatstoryaspect: new NumberField({ required: true, integer: true, nullable: true, initial: null })
			}), {initial: []})
			*/
			archetypeaspects: new ObjectField({ initial : {}})
		};
	}
	
	prepareDerivedData() {
		const actor = this.parent;
		
		this.archetypes = actor ? actor.archetypes : [];
		
		this.pcActors = actor ? actor.pcActors : [];
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
					name: new StringField({ required: true, initial: ""}),
					archetypelock : new BooleanField({ required: true, initial: false})
				}), {initial: () => Array.from({length : 5}, () => ({rating : ASPECTRATINGS[0], strain : false, name : "", archetypelock : false}))})
			}),
			
			death : new SchemaField({
				isdead : new BooleanField({ required: true, initial: false}),
				act : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 6, initial: null })
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