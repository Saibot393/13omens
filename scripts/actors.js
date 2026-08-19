const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField } = foundry.data.fields;
const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

import { o13Roll, o13rollConfig, MAXHOSTOMENDICE, DEFAULTDICEBAGCOUNT, counttobag } from "./roll.js";

const COREASPECTS_IDS = ["courage", "evade", "fight", "luck", "perception"];
const ASPECTRATINGS = [-1, 0,1,2,3,4];
const ASPECTTN = [10, 9, 7, 5, 4];

const ARCHETYPEASPECTRATING = 4;

const DEFAULTMAXWOUNDS = 4;

const DEFAULTACTOMENDCIETHRESHOLD = {
	0 : 0,
	1 : 1,
	2 : 4,
	3 : 8
}

const EMPTYWOUND = {safe : {filled : false, face : null, act : null}, omen : {filled : false, face : null, act : null}};

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
	
	async _preUpdate(changed, options, user) {
		if (this.isPC && changed) {
			if (changed.system) {
				if (changed.system.archetype) {
					//story aspect auto
					const archetypeAspect = this.getArchetypeAspect(changed.system.archetype);
					const storyAspects = {...this.system.aspects.story, ...changed.system.aspects?.story};
					if (archetypeAspect >= 0 && archetypeAspect <= Math.max(...Object.keys(storyAspects))) {
						for (let i in Object.keys(storyAspects)) {
							if (i == archetypeAspect) storyAspects[i].rating = Math.max(...ASPECTRATINGS)
							else if (storyAspects[i].rating == Math.max(...ASPECTRATINGS)) storyAspects[i].rating = -1;
						
							storyAspects[i].archetypelock = i == archetypeAspect;
						}
						
						if (!changed.system.aspects) changed.system.aspects = {};
						
						changed.system.aspects.story = {...changed.system.aspects.story, ...storyAspects};
					}
				}
				if (changed.system.aspects) {
					//rating is Number
					if (changed.system.aspects.story) {
						for (let entry of Object.values(changed.system.aspects.story)) {
							if (entry && "rating" in entry) {
								entry.rating = !isNaN(entry.rating) ? Number(entry.rating) : ASPECTRATINGS[0];
							}
						}
					}
				}
			}
		}
		
		await super._preUpdate(changed, options, user);
	}
	
	async _onUpdate(changed, options, userId) {
		await super._onUpdate(changed, options, userId);
		
		if (game.user.id != userId) return;
		
		if (this.isPC) {
			if (changed.system) {
				if (changed.system.hasOwnProperty("archetype")) {
					await this.updateArchetypeItems();
				}
			}
		}
	}
	
	get isPC() {
		return this.type == "pc";
	}
	
	get isStory() {
		return this.type == "story";
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
	
	getPerks(filterpicked = false) {
		if (this.isPC) {
			let perks = this.items.filter(item => item.isPerk);
			
			if (filterpicked) {
				perks = perks.filter(perk => this.system.pickedperks[perk.id]);
			}
			
			return Object.fromEntries(perks.map(perk => [perk.id, perk]));
		}
		
		return {};
	}
	
	async removePerk(id) {
		if (this.isPC) {
			const perk = this.items.get(id);
			
			if (perk?.isPerk) {
				return this.deleteEmbeddedDocuments("Item", [id]);
			}
		}
	}
	
	get perks() {
		return this.getPerks();
	}
	
	async removeGear(id) {
		if (this.isPC) {
			let gear = this.items.get(id);
			
			if (gear?.isGear) {
				return this.deleteEmbeddedDocuments("Item", [id]);
			}
		}
	}
	
	get gear() {
		if (this.isPC) {
			let gear = this.items.filter(item => item.isGear);
			
			return Object.fromEntries(gear.map(item => [item.id, item]));
		}
		
		return {};
	}
	
	get archetypes() {
		if (this.isStory) {
			return [...this.items].filter(item => item.type == "archetype");
		}
		
		if (this.isPC) {
			return this.storyActor?.archetypes;
		}
	}
	
	get availableArchetype() {
		if (this.isStory) {
			return this.archetypes.filter(archetype => !this.pcActors.find(pc => pc.archetype == archetype));
		}
		
		if (this.isPC) {
			return this.storyActor ? (this.archetype ? [this.archetype, ...this.storyActor.availableArchetype] : this.storyActor.availableArchetype) : [];
		}
	}
	
	get archetype() {
		if (this.isPC) {
			const archetype = this.storyActor?.items.get(this.system.archetype);
			
			return archetype?.type == "archetype" ? archetype : undefined;
		}
	}
	
	get selectableGearCount() {
		if (this.isPC) {
			return this.archetype?.selectableGearCount ?? 0;
		}
	}
	
	hasGearSelected(originid) {
		if (this.isPC) {
			return this.inventory.some(gear => gear.isFromOrigin(originid));
		}
	}
	
	get selectableGearInfo() {
		if (this.isPC) {
			const selectableGear = this.archetype?.unguaranteedGear;
			
			if (selectableGear) {
				return Object.fromEntries(Object.keys(selectableGear).map(id => [id, {name : selectableGear[id].name, selected : this.hasGearSelected(id), id : id}]));
			}
			
			return {};
		}
	}
	
	toggleSelectGear(originid) {
		console.log(originid);
		if (this.isPC) {
			console.log(this.hasGearSelected(originid));
			if (this.hasGearSelected(originid)) {
				const matchingGear = this.inventory.find(gear => gear.isFromOrigin(originid));
				console.log(matchingGear);
				if (matchingGear) {
					this.deleteEmbeddedDocuments("Item", [matchingGear.id])
				}
			}
			else {
				const gearData = this.archetype?.unguaranteedGear[originid];
				console.log(gearData);
				if (gearData) {
					this.createEmbeddedDocuments("Item", [gearData]);
				}
			}
		}
	}
	
	getArchetypeAspect(archetype) {
		if (this.isStory) {
			archetype = archetype instanceof Item ? archetype : this.items.get(archetype);

			if (this.archetypes?.includes(archetype)) {
				return this.system.archetypeaspects[archetype.id];
			}
		}
		
		if (this.isPC) {
			return this.storyActor?.getArchetypeAspect(archetype);
		}
	}
	
	get archetypeAspect() {
		if (this.isPC) {
			return this.getArchetypeAspect(this.archetype);
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
			return this.storyActor?.getmaxWounds(this) || DEFAULTMAXWOUNDS;
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
			
			return Array.from({length : max}).map((v, i) => i + 1).map(i => ({type : i <= current ? "omen" : "blank", face : 6}))
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
	
	async addOmenDice() {
		if (this.isStory) {
			if (this.system.hostomendice > 0) {
				this.update({system : {hostomendice : this.system.hostomendice - 1}});
			}
		}
	}
	
	async removeOmenDice() {
		if (this.isStory) {
			if (this.diceBagCount.omen > 0) {
				this.update({system : {hostomendice : this.system.hostomendice + 1}});
			}
		}
	}
	
	get woundDiceCount() {
		if (this.isStory) {
			const pcwoundcounts = this.pcActors.map(actor => actor.woundDiceCount);
			
			return {safe : pcwoundcounts.reduce((acc, cur) => acc + cur.safe, 0), omen : pcwoundcounts.reduce((acc, cur) => acc + cur.omen, 0)}
		}
		
		if (this.isPC) {
			return {safe : this.system.wounds.filter(wound => wound.safe.filled).length, omen : this.isDead ? 0 : this.system.wounds.filter(wound => wound.omen.filled).length};
		}
	}
	
	get woundDice() {
		if (this.isPC) {
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
	}
	
	getAspectData(aspect, includeTN = false) {
		if (this.isPC) {
			if (COREASPECTS_IDS.includes(aspect)) {
				const add = includeTN ? {targetNumber : this.system.targetNumbers.core[aspect]} : {};
				
				return {...add, ...this.system.aspects.core[aspect], name : game.i18n.localize(`13omens.titles.${aspect}`)};
			}
			
			if (!isNaN(aspect)) {
				const add = includeTN ? {targetNumber : this.system.targetNumbers.story[aspect]} : {};
				
				return {...add, ...this.system.aspects.story[aspect], name : this.storyAspectNames[aspect]};
			}
		}
	}
	
	get storyAspectNames() {
		if (this.isPC) {
			return this.storyActor?.storyAspectNames || Array.from({length : 5}, () => "");
		}
		
		if (this.isStory) {
			return this.system.storyaspects.map(aspect => aspect.name);
		}
	}
	
	get activeAct() {
		if (this.isPC) {
			return this.storyActor?.activeAct || 0;
		}
		
		if (this.isStory) {
			return this.system.activeact;
		}
	}
	
	get autoProgressActs() {
		if (this.isStory) {
			return this.system.autoprogressacts;
		}
	}	
	
	get addOmenDiceonActStart() {
		if (this.isStory) {
			return this.system.addomendiceonactstart;
		}
	}	
	
	cheatedDeathCount(act = null) {
		if (this.isPC) {
			const lookupact = act ?? this.activeAct;
			
			return Object.values(this.system.wounds).filter(wound => wound.safe?.filled && wound.safe?.act == lookupact).length;
		}	
	}
	
	hasCheatedDeath(act = null) {
		if (this.isPC) {
			return this.cheatedDeathCount(act) > 0
		}	
	}
	
	get canCheatDeath() {
		if (this.isPC) {
			return this.storyActor?.canCheatDeath;
		}
		
		if (this.isStory) {
			return !this.pcActors.some(actor => actor.hasCheatedDeath());
		}
	}
	
	hasPC(actor) {
		if (this.isStory && actor.isPC) {
			return this.pcActors.includes(actor);
		}
	}
	
	canRollAspect(aspect) {
		if (this.isPC) {
			return !isNaN(this.getAspectData(aspect,true).targetNumber);
		}
	}
	
	async updateMaxWounds(forceupdate = false) {
		if (this.isPC) {
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
		
		if (this.isStory) {
			for (const pc of this.pcActors) {
				await pc.updateMaxWounds();
			}
		}
	}
	
	async takeWound(options = {face : 6, cheatDeath : false}) {
		if (this.isPC) {
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
	}
	
	async clearWound() {
		if (this.isPC) {
			const wounds = this.system.wounds;
			
			const nextEmpty = wounds.indexOf([...wounds].reverse().find(wound => {
				return wound.omen.filled || wound.safe.filled;
			}));
			
			if (nextEmpty >= 0 && nextEmpty < wounds.length) {
				wounds[nextEmpty] = EMPTYWOUND;
				
				return this.update({system : {wounds : wounds}});
			}
		}
	}
	
	async takeStrain(aspect) {
		if (COREASPECTS_IDS.includes(aspect)) {
			return this.update({system : {aspects : {core : {[aspect] : {strain : true}}}}});
		}
		
		if (!isNaN(aspect)) {
			const storyAspects = this.system.aspects.story;
			
			if (aspect >= 0 && aspect < Math.max(...Object.keys(storyAspects))) {
				/*
				storyAspects[aspect].strain = true;
				
				return this.update({system : {aspects : {story : storyAspects}}});
				*/
				return this.update({system : {aspects : {story : {[aspect] : {strain : true}}}}});
			}
		}
	}
	
	async checkDeath() {
		if (this.isPC) {
			const isDead = !this.system.wounds.find(wound => !wound.omen.filled);
			
			if (isDead) {
				await this.update({system : {death : {isdead : true, act : this.activeAct}}})
			}
			
			return isDead;
		}
		
		if (this.isStory) {
			for (const pc of this.pcActors) {
				await pc.checkDeath();
			}
		}
	}
		
	async rollAspect(aspectName, rollDialogue = false, toChat = false) {
		if (this.isPC) {
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
	}
	
	async createNewArchetype() {
		if (this.isStory) {
			const archetype = await this.createEmbeddedDocuments("Item", [{
				name: game.i18n.localize("13omens.titles.archetype"),
				type: "archetype"
			}]);
			this.registerArchetype(archetype[0]);
		}
	}
	
	async registerArchetype(archetype) {
		if (this.isStory && archetype) {
			await this.update({system : {archetypeaspects : {[archetype.id] : -1}}})
		}
	}
	
	async deleteArchetype(id) {
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
	
	async removeArchetypeItems() {
		if (this.isPC) {
			console.log(Array.from(this.items).filter(item => item.isArchetypeOrigin));
			return this.deleteEmbeddedDocuments("Item", Array.from(this.items).filter(item => item.isArchetypeOrigin).map(item => item.id))
		}
	}
	
	async updateArchetypeItems(removeold = true) {
		if (this.isPC) {
			if (removeold) await this.removeArchetypeItems();
			
			const archetype = this.archetype;
			
			if (archetype) {
				return this.createEmbeddedDocuments("Item", [...Object.values(archetype.perksData), ...Object.values(archetype.guaranteedGear)]);
			}
		}
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
			clearWound : o13ActorSheet.clearWound
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
		Hooks.off("updateItem", this._externalItemUpdateRender);
		this._externalItemUpdateRender = null;
		Hooks.off("updateActor", this._externalActorUpdateRender);
		this._externalActorUpdateRender = null;
	}
}

class storyDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			activeact: new NumberField({ required: true, integer: true, nullable: true, min: 0, max : 3, initial: 0 }),
			
			acts: new ArrayField(new SchemaField({
				omenDiceThreshold : new NumberField({ required: true, integer: true, nullable: true, min: 0, max : 14, initial: null })
			}), { initial : () => Array.from({length : 4}, (_, index) => ({omenDiceThreshold : DEFAULTACTOMENDCIETHRESHOLD[index]}))}),
			
			autoprogressacts : new BooleanField({ required : true, initial : true}),
			
			addomendiceonactstart : new BooleanField({ required : true, initial : true}),
			
			hostomendice: new NumberField({ required: true, integer: true, nullable: true, initial: MAXHOSTOMENDICE }),
			
			storyaspects: new ArrayField(new SchemaField({
				name: new StringField({ required: true, initial: ""})
			}), {initial: () => Array.from({length : 5}, () => ({name : ""}))}),
			
			archetypeaspects: new ObjectField({}),
			
			pcs: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			}), {initial: []}),
			
			npcs: new ArrayField(new SchemaField({
				id: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false})
			}), {initial: []})
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
				core: new SchemaField(Object.fromEntries(COREASPECTS_IDS.map(str => [str, new SchemaField({
					rating : newRating(),
					strain : new BooleanField({ required: true, initial: false})
				})]))),
				
				story: new ObjectField({
					initial: () => Object.fromEntries(Array.from({length : 5}, (val, i) => ([i, {
						rating: ASPECTRATINGS[0],
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
			core : ASPECTRATINGS.filter(rating => rating < 0 || !Object.values(this.aspects.core).find(value => value.rating == rating)),
			story : ASPECTRATINGS.filter(rating => rating < 0 || !Object.values(this.aspects.story).find(value => value.rating == rating))
		}
		
		this.targetNumbers = {
			core : Object.fromEntries(Object.keys(this.aspects.core).map(key => [key, ASPECTTN[this.aspects.core[key].rating]])),
			story : Object.fromEntries(Object.keys(this.aspects.story).map(key => [key, ASPECTTN[this.aspects.story[key].rating]]))
		}
	}
}

class npcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, blank: true, initial: "" })
		};
	}
}

export const actorDMs = {story : storyDataModel, pc : pcDataModel, npc : npcDataModel}