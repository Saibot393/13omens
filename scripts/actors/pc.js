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
				
				if (changed.system.background?.relations) {
					const currentRelations = this.system.background.relations;
					
					const newRelations = changed.system.background.relations;
					
					const siblingArchetypes = this.siblingArchetypes;
					
					//updates might mess with relations archetypel links
					for (let i = 0; i < newRelations.length; i++) {
						newRelations[i].archetype = newRelations[i].archetype || currentRelations[i]?.archetype || siblingArchetypes[i]?.id;
					}
				}
			}
		}
		
		await this.superPD._preUpdate(changed, options, user);
	}
	
	async _onUpdate(changed, options, userId) {
		await this.superPD._onUpdate(changed, options, userId);
		
		if (game.user.id == userId) {
			if (changed.system) {
				if (changed.system.hasOwnProperty("archetype")) {
					await this.updateArchetypeItems();
					await this.synctoArchetypeBackground();
				}
			}
		}
		
		if (game.user.isActiveGM) {
			if (changed.system?.death) {
				await this.storyActor?.updateMaxWounds();
			}
		}
	}
	
	_onAROverrideChange(adddiff, remdiff) {
		if (adddiff.system?.hasOwnProperty("maxwounds") || remdiff.system?.hasOwnProperty("maxwounds")) {
			this.updateMaxWounds();
		}
	}
	
	async _onCreateDescendantDocuments(parent, collection, documents, data, options, usedId) {
		await this.superPD._onCreateDescendantDocuments(parent, collection, documents, data, options, usedId);

		if (game.user.id == usedId) {
			for (const item of documents) {
				if (item.isPerk) {
					await item.resetUses();
				}
			}
		}
	}
	
	//State
	get prepStateDetailed() {
		return {
			archetype: this.archetypePrepState,
			aspects: this.aspectPrepState, 
			perks: this.perkPrepState,
			gear: this.gearPrepState
		};
	}
	
	get prepState() {
		const states = Object.values(this.prepStateDetailed);
		
		if (states.some(state => state == "problem")) return "problem";
		
		if (states.some(state => state == "pending")) return "pending";
		
		return "ready";
	}
	
	//Story
	get storyActor() {
		return [...game.actors].find(actor => actor.isStory && actor.hasPC(this))
	}
	
	//Acts
	async resettoPrologue() {
		for (const perk of Object.values(this.getPerks())) {
			await perk.resetUses();
		}
		
		const strainlessAspects = {core : {}, story : {}};
		
		for (const key of Object.keys(this.system.aspects.core)) {
			strainlessAspects.core[key] = {strain : false};
		}
		
		for (const key of Object.keys(this.system.aspects.story)) {
			strainlessAspects.story[key] = {strain : false};
		}
		
		await this.update({
			system : {
				wounds : Array.from({length : this.system.wounds.length}, () => (EMPTYWOUND)),
				death : {isdead : false},
				aspects : strainlessAspects
			}
		});
		
		this.prepareData();
	}
	
	async prepareNewAct() {
		for (const perk of Object.values(this.getPerks())) {
			await perk.newAct();
		}
		
		this.prepareData();
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
	
	get siblingArchetypes() {
		return this.storyActor?.archetypes.filter(archetype => archetype != this.archetype) ?? [];
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
	
	get archetypePrepState() {
		if (this.archetype) return "ready";
		
		return "pending";
	}
	
	//Perks
	getPerks(filterpicked = false) {
		let perks = this.items.filter(item => item.isPerk).sort((a,b) => a.sort - b.sort);
		
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
	
	hasPickedPerk(id) {
		return this.system.pickedperks[id];
	}
	
	get choosablePerksCount() {
		return this.archetype?.choosablePerks;
	}
	
	usePerk(id) {
		if (this.hasPickedPerk(id)) {
			this.pickedPerks[id]?.use();
		}
	}
	
	get perkPrepState() {
		if (isNaN(this.choosablePerksCount)) return "ready";
		
		const pickerPerksLength = Object.values(this.pickedPerks).length;
		
		if (pickerPerksLength < this.choosablePerksCount) return "pending";
		
		if (pickerPerksLength == this.choosablePerksCount) return "ready";
		
		if (pickerPerksLength > this.choosablePerksCount) return "problem";
	}
	
	async checkPerkEffectActivation(localonly = false) {
		let change = false;
		
		for (const perk of Object.values(this.perks)) {
			change = await perk.checkEffectActivation(localonly) || change;
		}
		
		return change;
	}
	
	async perktoChatMessage(id, messageData = {}) {
		const perk = this.items.get(id);
		if (perk?.isPerk) {
			perk.toChatMessage(messageData);
		}
	}
	
	//Gear
	async removeGear(id) {
		let gear = this.items.get(id);
		
		if (gear?.isGear) {
			return this.deleteEmbeddedDocuments("Item", [id]);
		}
	}
	
	get gear() {
		let gear = this.items.filter(item => item.isGear).sort((a,b) => a.sort - b.sort);
		
		return Object.fromEntries(gear.map(item => [item.id, item]));
	}
	
	async createNewGear(data) {
		const gear = {name : game.i18n.localize("13omens.titles.gear"), ...data, type : "gear"};
		
		return this.createEmbeddedDocuments("Item", [gear]);
	}
	
	async geartoChatMessage(id, messageData = {}) {
		const gear = this.items.get(id);
		
		if (gear?.isGear) {
			gear.toChatMessage(messageData);
		}
	}
	
	//Select gear (from archetype)
	get selectableGearCount() {
		return this.system.selectablegearcount;//this.archetype?.selectableGearCount;
	}
	
	hasGearSelected(originid) {
		return this.inventory.some(gear => gear.isFromOrigin(originid));
	}
	
	get selectableGearInfo() {
		const selectableGear = this.archetype?.unguaranteedGear;
		
		if (selectableGear) {
			return Object.fromEntries(Object.keys(selectableGear).map(id => [id, {
				name : selectableGear[id].name, 
				selected : this.hasGearSelected(id), 
				id : id, 
				sort : selectableGear[id].sort
			}]).sort((entrya, entryb) => entrya[1].sort - entryb[1].sort));
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
	
	get gearPrepState() {
		if (isNaN(this.selectableGearCount)) return "ready";
		
		const selectedGearLength = Object.values(this.selectableGearInfo).filter(gear => gear.selected).length;
		
		if (selectedGearLength < this.selectableGearCount) return "pending";
		
		if (selectedGearLength == this.selectableGearCount) return "ready";
		
		if (selectedGearLength > this.selectableGearCount) return "problem";
	}
	
	//Aspects
	getArchetypeAspect(archetype) {
		return this.storyActor?.getArchetypeAspect(archetype);
	}
	
	get archetypeAspect() {
		return this.getArchetypeAspect(this.archetype);
	}
	
	aspectkey(aspect) {
		if (CONFIG["13OMENS"].COREASPECTSIDS.includes(aspect)) return aspect;
		
		if (!isNaN(aspect)) return aspect;
		
		if (typeof aspect == "string") {
			const minaspect = aspect.toLowerCase().replaceAll(" ", "_");

			const key = this.storyAspectNames.map(name => name.toLowerCase().replaceAll(" ", "_")).indexOf(minaspect);
			
			if (key >= 0) return key;
		}
	}
	
	getAspectData(aspect, includeTN = false) {
		const correctedAspect = this.aspectkey(aspect);

		if (CONFIG["13OMENS"].COREASPECTSIDS.includes(correctedAspect)) {
			const add = includeTN ? {targetNumber : this.system.targetNumbers.core[correctedAspect]} : {};
			
			return {...add, ...this.system.aspects.core[correctedAspect], name : game.i18n.localize(`13omens.titles.${correctedAspect}`)};
		}
		
		if (!isNaN(correctedAspect)) {
			const add = includeTN ? {targetNumber : this.system.targetNumbers.story[correctedAspect]} : {};
			
			return {...add, ...this.system.aspects.story[correctedAspect], name : this.storyAspectNames[correctedAspect]};
		}
	}
	
	getAspectRollModifiers(aspect, combined = true) {
		const correctedAspect = this.aspectkey(aspect);
		
		const RMs = [this.system.aspectrollmodifiers.general];
		
		let groupkey = "";
		
		if (CONFIG["13OMENS"].COREASPECTSIDS.includes(correctedAspect)) groupkey = "core";
		
		if (!isNaN(correctedAspect)) groupkey = "story";

		if (groupkey) {
			RMs.push(this.system.aspectrollmodifiers[groupkey].general);
			
			if (this.system.aspectrollmodifiers[groupkey][correctedAspect]) {
				RMs.push(this.system.aspectrollmodifiers[groupkey][correctedAspect]);
			}
		}
		
		if (combined) return utils.combineRollModifiers(RMs)
		else return RMs;
	}
	
	get storyAspectNames() {
		return this.storyActor?.storyAspectNames || Array.from({length : 5}, () => "");
	}
	
	canRollAspect(aspect) {
		return !isNaN(this.getAspectData(aspect,true)?.targetNumber);
	}
	
	async rollAspect(aspectName, options = {}, quickRoll = false) {
		if (this.canRollAspect(aspectName)) {
			const aspectData = this.getAspectData(aspectName, true);
			const aspectModifiers = this.getAspectRollModifiers(aspectName);

			if (aspectData) {
				const config = utils.combineRollOptions([aspectData, utils.rollOptionsFromModifiers(aspectModifiers), utils.expandRollData(options)]);

				new o13rollConfig(this, {...config, aspect : aspectName}, quickRoll);
			}
		}
		else {
			ui.notifications.warn(game.i18n.localize("13omens.warnings.selectRating"), {console : false});
		}
	}
	
	get aspectPrepState() {
		const aspects = [...Object.values(this.system.aspects.core), ...Object.values(this.system.aspects.story)];
		
		if (aspects.some(aspect => aspect.rating < 0)) return "pending";
		
		return "ready";
	}
	
	//Wounds
	getmaxWounds(actor = undefined) {
		return this.system.maxwounds;//return this.storyActor?.getmaxWounds(this) || CONFIG["13OMENS"].DEFAULTMAXWOUNDS;
	}
	
	get maxWounds() {
		return this.getmaxWounds();
	}
	
	get isDead() {
		if (this.isPC) {
			return this.system.death.isdead;
		}
	}
	
	get woundsFilled() { //sounds worse than it is
		return !this.system.wounds.find(wound => !wound.omen.filled);
	}
	
	async revive() {
		if (this.isDead) {
			return this.update({system : {death : {isdead : false}}})
		}
	}
	
	async kill(checkWoundsFilled = true) {
		if (this.woundsFilled || !checkWoundsFilled) {
			return this.update({system : {death : {isdead : true, act : this.activeAct}}})
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
			
			die.skulled = this.isDead;
			
			return die;
		});
	}
	
	async updateMaxWounds(forceupdate = false) {
		if (!this.isDead || forceupdate) {
			queueMicrotask(async () => {//scedule after current update cycle 
				this.prepareData();
				
				const maxWounds = this.maxWounds;
				
				let currentWounds = this.system.wounds;

				if (maxWounds != currentWounds.length) {
					while (currentWounds.length > maxWounds) {
						currentWounds.pop();
					}
					
					while (currentWounds.length < maxWounds) {
						currentWounds.push(EMPTYWOUND);
					}
					
					this.update({system : {wounds : currentWounds}});
				}
			})
		}
	}
	
	async takeWound(options = {face : 6, cheatDeath : false}, checkDeath = true) {
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
			
			const update = {system : {wounds : wounds}};
			
			if (checkDeath) {
				if (!wounds.find(wound => !wound.omen.filled)) update.system.death = {isdead : true, act : this.activeAct};
			}

			return this.update(update);
		}
	}
	
	async clearWound() {
		const wounds = this.system.wounds;
		
		const nextEmpty = wounds.indexOf([...wounds].reverse().find(wound => {
			return wound.omen.filled || wound.safe.filled;
		}));
		
		if (nextEmpty >= 0 && nextEmpty < wounds.length) {
			wounds[nextEmpty] = EMPTYWOUND;
			
			return this.update({system : {wounds : wounds, death : {isdead : false}}});
		}
	}
	
	async checkDeath() {
		const isDead = this.woundsFilled;
		
		if (isDead && !this.system.death.isdead) {
			await this.update({system : {death : {isdead : true, act : this.activeAct}}})
		}
		
		return isDead;
	}
	
	get canValiantSacrifice() {
		return this.woundDiceCount.omen == this.maxWounds - 1; //rules are a bit unclear here, but this seems right
	}
	
	//Cheat death
	cheatedDeathCount(act = null) {
		if (act != null) return Object.values(this.system.wounds).filter(wound => wound.safe?.filled && wound.safe?.act == act).length
		else return Object.values(this.system.wounds).filter(wound => wound.safe?.filled).length
	}
	
	hasCheatedDeath(act = null) {
		return this.cheatedDeathCount(act) > 0;
	}
	
	get canCheatDeath() {
		const canCheatinStory = this.cheatedDeathCount() < this.system.cheatdeathamount.perstory;
		const canCheatinAct = (this.storyActor?.canCheatDeath && this.system.cheatdeathamount.peract > 0) || (!this.storyActor?.canCheatDeath && this.cheatedDeathCount(this.activeAct) < this.system.cheatdeathamount.peract - 1);
		
		return canCheatinStory && canCheatinAct;
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
	
	//background
	getArchetypeSyncedBackground(syncto) {
		const syncArchetype = typeof syncto == "object" ? syncto : this.storyActor?.items.get(syncto);
		
		const currentBackground = this.system.background;
		
		const updateBackground = syncArchetype?.type == "archetype" ? (syncArchetype.system?.background || {}) : currentBackground;
		
		const newBackground = {};
		
		for (const key of ["description", "goal", "traits"]) {
			newBackground[key] = updateBackground[key] || currentBackground[key] || "";
		}

		newBackground.relations = this.siblingArchetypes?.map(sibling => ({
			archetype : sibling.id, 
			relation : updateBackground.relations.find(r => r.archetype == sibling.id)?.relation || currentBackground.relations.find(r => r.archetype == sibling.id)?.relation || ""
		})) ?? [];
		
		return newBackground;
	}
	
	get archetypeSyncedBackground() {
		return this.getArchetypeSyncedBackground(this.archetype);
	}
	
	async synctoArchetypeBackground() {
		return this.update({system : {background : this.archetypeSyncedBackground}});
	}
	
	//Data prep/handling
	get enrichables() {
		return {
			background: {
				description : this.system.background.description,
				goal: this.system.background.goal,
				traits: this.system.background.traits,
				relations: Object.fromEntries(this.system.background.relations.map(r => ([r.archetype, r.relation])))
			},
			perks : Object.fromEntries(Object.entries(this.perks).map(([id, perk]) => ([id, {description : perk.system?.description}])))
		}
	}
	
	async handleDrop(data, event, prepared) {
		let handled = false;
		
		const object = prepared.object;
		if (!object || prepared.selfOrigin) return handled;
		
		if (object.isPerk || object.isGear) {
			await this.createEmbeddedDocuments("Item", [object.toObject()]);
			handled = true;
		}
		
		return handled;
	}
	
	prepareDragData(data, event) {
		if (data.gearID || data.perkID) {
			const item = this.items.get(data.gearID || data.perkID);
			
			if (item.isGear || item.isPerk) {
				data.type = "Item",
				data.uuid = item.uuid;
			}
		}
	}
	
	prepareBaseData() { //pre AE
		this.superPD.prepareBaseData();
		
		this.system.maxwounds = this.storyActor?.getmaxWounds(this) || CONFIG["13OMENS"].DEFAULTMAXWOUNDS;
		
		this.system._activeact = this.activeAct;
							
		this.system.selectablegearcount = this.archetype?.selectableGearCount ?? 0;
			
		this.system.cheatdeathamount = { //these give the maximum
			perstory: 1,
			peract: 1
		};
		
		const defaultRollModifiers = CONFIG["13OMENS"].DEFAULTROLLMODIFIERS;
		
		this.system.aspectrollmodifiers = {general : foundry.utils.deepClone(defaultRollModifiers)};
		
		for (const groupkey of Object.keys(this.system.aspects)) {
			this.system.aspectrollmodifiers[groupkey] = {general : foundry.utils.deepClone(defaultRollModifiers)};
			
			for (const subkey of Object.keys(this.system.aspects[groupkey])) {
				this.system.aspectrollmodifiers[groupkey][subkey] = foundry.utils.deepClone(defaultRollModifiers);
			}
		}
	}
	
	prepareEmbeddedDocuments() {
		this.checkPerkEffectActivation(true);
		this.superPD.prepareEmbeddedDocuments();
	}
}

export class pcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			//story : new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}),
			
			traits : new StringField({ required: true, initial: ""}),
			
			archetype : new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}),
			
			notes : new StringField({ required: true, blank: true, initial: "" }),
			
			background : new SchemaField({
				description: new HTMLField({ required: true, initial: ""}),
				goal: new HTMLField({ required: true, initial: ""}),
				traits: new HTMLField({ required: true, initial: ""}),
				relations: new ArrayField(
					new SchemaField({
						archetype: new DocumentIdField({required: true, blank: true, nullable: true}),
						relation: new HTMLField({ required: true, initial: ""})
					})
				)
			}),
			
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