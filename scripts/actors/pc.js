const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField } = foundry.data.fields;

import {utils} from "../utils.js";

import { o13rollConfig } from "../roll.js";

const EMPTYWOUND = {safe : {filled : false, face : null, act : null}, omen : {filled : false, face : null, act : null}};

function newRating() {
	return new NumberField({ required: true, integer: true, nullable : true, min: Math.min(...CONFIG["13OMENS"].ASPECTRATINGS), max : Math.max(...CONFIG["13OMENS"].ASPECTRATINGS), initial: CONFIG["13OMENS"].ASPECTRATINGS[0] });
} 

export class o13pcActor {
	//Updates & Create
	async _preCreate(data, options, user) {
		await this.superPD._preCreate(data, options, user);

		if (!data.prototypeToken) {
			this.updateSource({
				prototypeToken: {
					actorLink: true,
					disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
				}
			});
		}
	}
	
	async _preUpdate(changed, options, user) {
		if (changed) {
			if (changed.system) {
				if (changed.system.hasOwnProperty("archetype")) {
					//story aspect auto
					const archetypeAspect = this.getArchetypeAspect(changed.system.archetype);
					const storyAspects = {...this.system.aspects.story, ...changed.system.aspects?.story};
					
					if (!changed.system.aspects) changed.system.aspects = {};
					
					if (changed.system.archetype) {
						if (archetypeAspect >= 0 && archetypeAspect <= Math.max(...Object.keys(storyAspects))) {
							for (let i in Object.keys(storyAspects)) {
								if (i == archetypeAspect) storyAspects[i].rating = Math.max(...CONFIG["13OMENS"].ASPECTRATINGS)
								else if (this.system.aspects.story[i].rating == Math.max(...CONFIG["13OMENS"].ASPECTRATINGS)) storyAspects[i].rating = -1;
							
								storyAspects[i].archetypelock = i == archetypeAspect;
							}
							
							changed.system.aspects.story = {...changed.system.aspects.story, ...storyAspects};
						}
					}
					else {
							for (let i in Object.keys(storyAspects)) {
								storyAspects[i].archetypelock = false;
							}
							
							changed.system.aspects.story = {...changed.system.aspects.story, ...storyAspects};
					}
				}
				if (changed.system.aspects) {
					//rating is Number
					if (changed.system.aspects.story) {
						for (let entry of Object.values(changed.system.aspects.story)) {
							if (entry && "rating" in entry) {
								entry.rating = !isNaN(entry.rating) ? Number(entry.rating) : CONFIG["13OMENS"].ASPECTRATINGS[0];
							}
						}
					}
				}
			}
		}
		
		await this.superPD._preUpdate(changed, options, user);
	}
	
	async _onUpdate(changed, options, userId) {
		await this.superPD._onUpdate(changed, options, userId);
		
		if (game.user.id != userId) return;
		
		if (changed.system) {
			if (changed.system.hasOwnProperty("archetype")) {
				await this.updateArchetypeItems();
			}
		}
	}
	
	//Story
	get storyActor() {
		return [...game.actors].find(actor => actor.isStory && actor.hasPC(this))
	}
	
	//Archetypes
	get archetypes() {
		return this.storyActor?.archetypes;
	}
	
	get availableArchetype() {
		return this.storyActor ? (this.archetype ? [this.archetype, ...this.storyActor.availableArchetype] : this.storyActor.availableArchetype) : [];
	}
	
	get archetype() {
		const archetype = this.storyActor?.items.get(this.system.archetype);
		
		return archetype?.type == "archetype" ? archetype : undefined;
	}
	
	async removeArchetypeItems() {
		return this.deleteEmbeddedDocuments("Item", Array.from(this.items).filter(item => item.isArchetypeOrigin).map(item => item.id))
	}
	
	async updateArchetypeItems(removeold = true) {
		if (removeold) await this.removeArchetypeItems();
		
		const archetype = this.archetype;
		
		if (archetype) {
			return this.createEmbeddedDocuments("Item", [...Object.values(archetype.perksData), ...Object.values(archetype.guaranteedGear)]);
		}
	}
	
	//Perks
	getPerks(filterpicked = false) {
		let perks = this.items.filter(item => item.isPerk);
		
		if (filterpicked) {
			perks = perks.filter(perk => this.system.pickedperks[perk.id]);
		}
		
		return Object.fromEntries(perks.map(perk => [perk.id, perk]));
	}
	
	async removePerk(id) {
		const perk = this.items.get(id);
		
		if (perk?.isPerk) {
			return this.deleteEmbeddedDocuments("Item", [id]);
		}
	}
	
	get perks() {
		return this.getPerks();
	}
	
	get pickedPerks() {
		return this.getPerks(true);
	}
	
	//Gear
	async removeGear(id) {
		let gear = this.items.get(id);
		
		if (gear?.isGear) {
			return this.deleteEmbeddedDocuments("Item", [id]);
		}
	}
	
	get gear() {
		let gear = this.items.filter(item => item.isGear);
		
		return Object.fromEntries(gear.map(item => [item.id, item]));
	}
	
	//Select gear (from archetype)
	get selectableGearCount() {
		if (this.isPC) {
			return this.archetype?.selectableGearCount ?? 0;
		}
	}
	
	hasGearSelected(originid) {
		return this.inventory.some(gear => gear.isFromOrigin(originid));
	}
	
	get selectableGearInfo() {
		const selectableGear = this.archetype?.unguaranteedGear;
		
		if (selectableGear) {
			return Object.fromEntries(Object.keys(selectableGear).map(id => [id, {name : selectableGear[id].name, selected : this.hasGearSelected(id), id : id}]));
		}
		
		return {};
	}
	
	toggleSelectGear(originid) {
		if (this.hasGearSelected(originid)) {
			const matchingGear = this.inventory.find(gear => gear.isFromOrigin(originid));

			if (matchingGear) {
				this.deleteEmbeddedDocuments("Item", [matchingGear.id])
			}
		}
		else {
			const gearData = this.archetype?.unguaranteedGear[originid];

			if (gearData) {
				this.createEmbeddedDocuments("Item", [gearData]);
			}
		}
	}
	
	//Aspects
	getArchetypeAspect(archetype) {
		return this.storyActor?.getArchetypeAspect(archetype);
	}
	
	get archetypeAspect() {
		return this.getArchetypeAspect(this.archetype);
	}
	
	getAspectData(aspect, includeTN = false) {
		if (CONFIG["13OMENS"].COREASPECTSIDS.includes(aspect)) {
			const add = includeTN ? {targetNumber : this.system.targetNumbers.core[aspect]} : {};
			
			return {...add, ...this.system.aspects.core[aspect], name : game.i18n.localize(`13omens.titles.${aspect}`)};
		}
		
		if (!isNaN(aspect)) {
			const add = includeTN ? {targetNumber : this.system.targetNumbers.story[aspect]} : {};
			
			return {...add, ...this.system.aspects.story[aspect], name : this.storyAspectNames[aspect]};
		}
	}
	
	get storyAspectNames() {
		return this.storyActor?.storyAspectNames || Array.from({length : 5}, () => "");
	}
	
	canRollAspect(aspect) {
		return !isNaN(this.getAspectData(aspect,true).targetNumber);
	}
	
	async rollAspect(aspectName, rollDialogue = false, toChat = true) {
		if (this.canRollAspect(aspectName)) {
			const aspectData = this.getAspectData(aspectName, true);
			
			if (aspectData) {
				new o13rollConfig(this, {aspect : aspectName}).render(true);
			}
		}
		else {
			ui.notifications.warn(game.i18n.localize("13omens.warnings.selectRating"), {console : false});
		}
	}
	
	//Wounds
	getmaxWounds(actor = undefined) {
		return this.storyActor?.getmaxWounds(this) || CONFIG["13OMENS"].DEFAULTMAXWOUNDS;
	}
	
	get maxWounds() {
		return this.getmaxWounds();
	}
	
	get isDead() {
		if (this.isPC) {
			return this.system.death.isdead;
		}
	}
	
	get woundDiceCount() {
		return {safe : this.system.wounds.filter(wound => wound.safe.filled).length, omen : this.isDead ? 0 : this.system.wounds.filter(wound => wound.omen.filled).length};
	}
	
	get woundDice() {
		return this.system.wounds.map((wound, index) => {
			var die = {};
			
			if (!wound.omen.filled && !wound.safe.filled) {
				die.face = (index+1 == this.system.wounds.length) ? 6 : index+1;
				die.type = "blank";
			}
			else {
				if (wound.omen.filled) {
					die.face = wound.omen.face;
					die.type = "omen";
					die.act = wound.omen.act;
				}
				else {
					if (wound.safe.filled) {
						die.face = wound.safe.face;
						die.type = "safe";
						die.act = wound.safe.act;
					}
				}
			}
			
			return die;
		});
	}
	
	async updateMaxWounds(forceupdate = false) {
		if (!this.isDead || forceupdate) {
			const maxWounds = this.maxWounds;
			
			let currentWounds = this.system.wounds;
			
			if (currentWounds != currentWounds.length) {
				while (currentWounds.length > maxWounds) {
					currentWounds.pop();
				}
				
				while (currentWounds.length < maxWounds) {
					currentWounds.push(EMPTYWOUND);
				}
				
				return this.update({system : {wounds : currentWounds}});
			}
		}
	}
	
	async takeWound(options = {face : 6, cheatDeath : false}) {
		const wounds = this.system.wounds;
		
		const nextEmpty = wounds.indexOf(wounds.find(wound => {
			return !wound.omen.filled && (!wound.safe.filled || !options.cheatDeath)
		}));
		
		if (nextEmpty >= 0 && nextEmpty < wounds.length) {
			if (options.cheatDeath) {
				wounds[nextEmpty].safe.filled = true;
				wounds[nextEmpty].safe.face = options.face;
				wounds[nextEmpty].safe.act = this.activeAct;
			}
			else {
				wounds[nextEmpty].omen.filled = true;
				wounds[nextEmpty].omen.face = options.face;
				wounds[nextEmpty].omen.act = this.activeAct;
			}
			
			return this.update({system : {wounds : wounds}});
		}
	}
	
	async clearWound() {
		const wounds = this.system.wounds;
		
		const nextEmpty = wounds.indexOf([...wounds].reverse().find(wound => {
			return wound.omen.filled || wound.safe.filled;
		}));
		
		if (nextEmpty >= 0 && nextEmpty < wounds.length) {
			wounds[nextEmpty] = EMPTYWOUND;
			
			return this.update({system : {wounds : wounds}});
		}
	}
	
	async checkDeath() {
		const isDead = !this.system.wounds.find(wound => !wound.omen.filled);
		
		if (isDead && !this.system.death.isdead) {
			await this.update({system : {death : {isdead : true, act : this.activeAct}}})
		}
		
		return isDead;
	}
	
	//Cheat death
	cheatedDeathCount(act = null) {
		const lookupact = act ?? this.activeAct;
			
		return Object.values(this.system.wounds).filter(wound => wound.safe?.filled && wound.safe?.act == lookupact).length;
	}
	
	hasCheatedDeath(act = null) {
		return this.cheatedDeathCount(act) > 0;
	}
	
	get canCheatDeath() {
		return this.storyActor?.canCheatDeath;
	}
	
	//strain
	async takeStrain(aspect) {
		if (CONFIG["13OMENS"].COREASPECTSIDS.includes(aspect)) {
			return this.update({system : {aspects : {core : {[aspect] : {strain : true}}}}});
		}
		
		if (!isNaN(aspect)) {
			const storyAspects = this.system.aspects.story;
			
			if (aspect >= 0 && aspect < Math.max(...Object.keys(storyAspects))) {
				return this.update({system : {aspects : {story : {[aspect] : {strain : true}}}}});
			}
		}
	}
	
	//Dice
	get hostOmenDice() {
		return this.storyActor?.omendice;
	}
	
	get diceBagCount() {
		return this.storyActor?.diceBagCount || CONFIG["13OMENS"].DEFAULTDICEBAGCOUNT;
	}
	
	get diceBag() {
		return utils.counttobag(this.diceBagCount);
	}
	
	get diceBagDice() {
		return this.diceBag.map(die => ({type : die, face : 6}));
	}
	
	//Acts
	async resettoPrologue() {
		const strainlessAspects = {core : {}, story : {}};
		
		for (const key of Object.keys(this.system.aspects.core)) {
			strainlessAspects.core[key] = {strain : false};
		}
		
		for (const key of Object.keys(this.system.aspects.story)) {
			strainlessAspects.story[key] = {strain : false};
		}
		
		return this.update({
			system : {
				wounds : Array.from({length : 4}, () => (EMPTYWOUND)),
				aspects : strainlessAspects
			}
		});
	}
	
	get activeAct() {
		return this.storyActor?.activeAct || 0;
	}
	
	get isPrologue() {
		return this.storyActor?.isPrologue ?? true;
	}
	
	get canPrepare() {
		return this.isPrologue;
	}
}

export class pcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			//story : new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}),
			
			traits : new StringField({ required: true, initial: ""}),
			
			archetype : new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}),
			
			goal : new HTMLField({ required: true, blank: true, initial: "" }),
			
			notes : new HTMLField({ required: true, blank: true, initial: "" }),
			
			wounds : new ArrayField(new SchemaField({
				safe : new SchemaField({
					filled : new BooleanField({ required: true, initial: false}),
					face : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 6, initial: null }),
					act : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 3, initial: null })
				}),
				omen : new SchemaField({
					filled : new BooleanField({ required: true, initial: false}),
					face : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 6, initial: null }),
					act : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 3, initial: null })
				})
			}), {initial: () => Array.from({length : 4}, () => (EMPTYWOUND))}),
			
			aspects: new SchemaField({
				core: new SchemaField(Object.fromEntries(CONFIG["13OMENS"].COREASPECTSIDS.map(str => [str, new SchemaField({
					rating : newRating(),
					strain : new BooleanField({ required: true, initial: false})
				})]))),
				
				story: new ObjectField({
					initial: () => Object.fromEntries(Array.from({length : 5}, (val, i) => ([i, {
						rating: CONFIG["13OMENS"].ASPECTRATINGS[0],
						strain : false,
						archetypelock : false
					}])))
				})
			}),
			
			death : new SchemaField({
				isdead : new BooleanField({ required: true, initial: false}),
				act : new NumberField({ required: true, integer: true, nullable: true, min: 1, max : 6, initial: null })
			}),
			
			pickedperks: new ObjectField({}) //refer to id
			
			//mainly for active affects
			/*
			perks : new SchemaField({
				maxwounds: new NumberField({ required: false, integer: true, nullable: true, min: 1, initial: null }),
				
				maxwoundschange: new NumberField({ required: false, integer: true, nullable: true, min: 1, initial: null }),
				
				omenwoundthreshold : new NumberField({ required: false, integer: true, nullable: true, min: 1, max : 6, initial: null }),
				
				noflawwoundcount: new NumberField({ required: false, integer: true, nullable: true, min: 1, initial: null }),
								
				chooseableitems: new NumberField({ required: false, integer: true, nullable: true, min: 1, initial: null }),
				
				cheatdeathamount: new NumberField({ required: false, integer: true, nullable: true, min: 1, initial: null })
			})
			*/
			
		};
	}
	
	prepareDerivedData() {
		this.availableRatings = {
			core : CONFIG["13OMENS"].ASPECTRATINGS.filter(rating => rating < 0 || !Object.values(this.aspects.core).find(value => value.rating == rating)),
			story : CONFIG["13OMENS"].ASPECTRATINGS.filter(rating => rating < 0 || !Object.values(this.aspects.story).find(value => value.rating == rating))
		}
		
		this.targetNumbers = {
			core : Object.fromEntries(Object.keys(this.aspects.core).map(key => [key, CONFIG["13OMENS"].ASPECTTN[this.aspects.core[key].rating]])),
			story : Object.fromEntries(Object.keys(this.aspects.story).map(key => [key, CONFIG["13OMENS"].ASPECTTN[this.aspects.story[key].rating]]))
		}
	}
}