const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField } = foundry.data.fields;

import {utils} from "../utils.js";

export class o13storyActor {
	//Updates % Create
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
		if (changed.system) {
			if (changed.system.acts) {
				//prevent null overrides
				changed.system.acts = changed.system.acts.map((info, index) => ({
					...info,
					omenDiceThreshold : info.omenDiceThreshold ?? this.system.acts[index].omenDiceThreshold ?? CONFIG["13OMENS"].DEFAULTACTOMENDCIETHRESHOLD[index]
				}))
				
				//logic safety
				const min = 0;
				const max = CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE;
				
				for (let i = 0; i < changed.system.acts.length; i++) {
					changed.system.acts[i].omenDiceThreshold = Math.clamp(changed.system.acts[i].omenDiceThreshold, min, max);
				}
				
				let newmin = min;
				let newmax = max;
				
				if (changed.system.acts[0] > newmax - changed.system.acts.length + 1) changed.system.acts[0] = newmax - changed.system.acts.length + 1;
				for (let i = 0; i < changed.system.acts.length - 1; i++) {
					newmax = changed.system.acts[i+1].omenDiceThreshold - 1;
					
					if (changed.system.acts[i].omenDiceThreshold < newmin) changed.system.acts[i].omenDiceThreshold = newmin;
					
					if (changed.system.acts[i].omenDiceThreshold > newmax) {
						if (changed.system.acts[i].omenDiceThreshold - 1 >= newmin) changed.system.acts[i].omenDiceThreshold -= 1
						else changed.system.acts[i+1].omenDiceThreshold += 1;
					}
					
					newmin = changed.system.acts[i].omenDiceThreshold + 1;
				}
			}
		}
		
		await this.superPD._preUpdate(changed, options, user);
	}
	
	async _onUpdate(changed, options, userId) {
		await this.superPD._onUpdate(changed, options, userId);
		
		if (game.user.id != userId) return;
		
		if (changed.system) {
			if (changed.system.pcs) {
				this.updateMaxWounds();
			}
		}
	}
	
	//Acts
	async checkAct() {
		if (!this.isPrologue && this.autoProgressActs) {
			const hostOmenDice = CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE - this.system.hostomendice + CONFIG["13OMENS"].DEFAULTDICEBAGCOUNT.omen;

			const thresholds = this.actOmenDiceThresholds;

			const targetAct = Math.max(...thresholds.filter(thresh => thresh <= hostOmenDice).map((thresh, index) => index));

			return this.advanceAct(targetAct);
		}
		if (this.isPrologue) {
			return this.advanceAct(1);
		}
	}
	
	async advanceAct(target = null, force = false) {
		const targetAct = target ?? this.activeAct + 1;
		
		if (targetAct > this.activeAct && targetAct <= 3 && targetAct >= 0) {
			if (!force) {
				const advance = await foundry.applications.api.DialogV2.confirm({
					window: { title: game.i18n.localize("13omens.titles.confirmAdvanceAct") },
					content: await foundry.applications.handlebars.renderTemplate("systems/13omens/templates/dialogues/general.hbs", {
						content : {
							text : game.i18n.format("13omens.dialogues.confirmAdvanceAct", {act : game.i18n.localize("13omens.titles.actNames." + targetAct)})
						}
					}),
					rejectClose: false
				});
				
				if (!advance) return;
			}
			
			const omenDicetoAdd = Math.max(targetAct - Math.max(this.activeAct, 1), 0); //prologue->act1 does not add dice

			await this.update({system : {activeact : targetAct}});

			if (omenDicetoAdd != 0 && this.addOmenDiceonActStart) {
				await this.addOmenDice(omenDicetoAdd);
			}
			
			for (const pc of this.pcActors) {
				await pc.prepareNewAct();
			}
		}
	}
	
	async resettoPrologue(force = false) {
		if (!force) {
			const resetTo = await foundry.applications.api.DialogV2.confirm({
				window: { title: game.i18n.localize("13omens.titles.confirmResettoPrologue") },
				content: await foundry.applications.handlebars.renderTemplate("systems/13omens/templates/dialogues/general.hbs", {
					content : {
						text : game.i18n.format("13omens.dialogues.confirmResettoPrologue")
					}
				}),
				rejectClose: false // Returns false instead of rejecting the promise on window close (X or ESC)
			});
			
			if (!resetTo) return;
		}
		
		await this.update({
			system : {
				activeact : 0,
				hostomendice : CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE
			}
		});
		
		for (const pc of this.pcActors) {
			await pc.resettoPrologue();
		}
	}
	
	get activeAct() {
		return this.system.activeact;
	}
	
	get isPrologue() {
		return this.activeAct == 0;
	}
	
	get autoProgressActs() {
		return this.system.autoprogressacts;
	}	
	
	get addOmenDiceonActStart() {
		return this.system.addomendiceonactstart;
	}
	
	get actOmenDiceThresholds() {
		return this.system.acts.map(act => act.omenDiceThreshold);
	}
	
	getActOmenDiceThreshold(act) {
		if (act >= 0 && act <= this.system.acts.length) {
			return this.system.acts[act].omenDiceThreshold;
		}
	}
	
	get actOmenDiceThreshold() {
		return this.getActOmenDiceThreshold(this.activeAct);
	}
	
	//PCs
	get pcActors() {
		return this.system.pcs.map(pc => game.actors.get(pc.id)).filter(actor => actor?.isPC);
	}
	
	get pcCount() {
		return this.pcActors.length;
	}
	
	get pcliveCount() {
		return this.pcActors.filter(actor => !actor.isDead).length;
	}
	
	hasPC(actor) {
		return this.pcActors.includes(actor);
	}
	
	async addPC(actor) {
		if (Array.isArray(actor)) {
			const actors = actor.filter(a => a.isPC);
			
			if (actors.length) {
				this.update({system : {pcs : [...this.system.pcs, ...actors.map(a => ({id : a.id}))]}});
			}
		}
		else {
			if (actor.isPC && !actor.storyActor) {
				this.update({system : {pcs : [...this.system.pcs, {id : actor.id}]}});
			}
		}
	}
	
	async removePC(id) {
		this.update({system : {pcs : this.system.pcs.filter(pc => pc.id != id)}});
	}
	
	async autoPopulatePCs() {
		const tagetFolder = this.folder.id;
		
		const currentActors = this.pcActors;
		
		const currentUsers = [...game.users].filter(user => currentActors.some(actor => actor.testUserPermission(user, "OWNER")));
		
		const targetUsers = [...game.users].filter(user => !currentUsers.includes(user)).filter(user => !user.isGM);
		
		const actors = [];
		
		for (const user of targetUsers) {
			const newActor = await Actor.create({
				name : game.i18n.format("13omens.titles.newActor", {user : user.name}),
				type : "pc",
				ownership : {
					default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
					[user.id] : CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
				},
				folder : tagetFolder
			});
			actors.push(newActor)
		}
		
		return this.addPC(actors);
	}
	
	//Wounds
	getmaxWounds(actor = undefined) {
		const pcCount = this.pcCount;
		const pcliveCount = this.pcliveCount;
		const pcdeadCount = pcCount - pcliveCount;
		
		if (pcCount == 1) return CONFIG["13OMENS"].DEFAULTMAXWOUNDS + 2;
		if (pcCount == 2) return CONFIG["13OMENS"].DEFAULTMAXWOUNDS + 1;
		if (pcCount == 3) return CONFIG["13OMENS"].DEFAULTMAXWOUNDS;
		if (pcCount == 4) return CONFIG["13OMENS"].DEFAULTMAXWOUNDS;
		if (pcCount == 5) return CONFIG["13OMENS"].DEFAULTMAXWOUNDS - 1;
		if (pcCount >= 6) {
			if (pcdeadCount < 2 || actor?.isDead) return CONFIG["13OMENS"].DEFAULTMAXWOUNDS - 2
			else return CONFIG["13OMENS"].DEFAULTMAXWOUNDS - 1;
		}
	}
	
	get woundDiceCount() {
		const pcwoundcounts = this.pcActors.filter(actor => !actor.isDead).map(actor => actor.woundDiceCount);
		
		return {safe : pcwoundcounts.reduce((acc, cur) => acc + cur.safe, 0), omen : pcwoundcounts.reduce((acc, cur) => acc + cur.omen, 0)}
	}
	
	async updateMaxWounds(forceupdate = false) {
		for (const pc of this.pcActors) {
			await pc.updateMaxWounds();
		}
	}
	
	async checkDeath() {
		for (const pc of this.pcActors) {
			return  pc.checkDeath();
		}
	}
	
	//Cheat death
	get canCheatDeath() {
		return !this.pcActors.some(actor => actor.hasCheatedDeath());
	}
	
	//Archetypes
	get archetypes() {
		return [...this.items].filter(item => item.type == "archetype");
	}
	
	get availableArchetype() {
		return this.archetypes.filter(archetype => !this.pcActors.find(pc => pc.archetype == archetype));
	}
	
	async createNewArchetype() {
		const archetype = await this.createEmbeddedDocuments("Item", [{
			name: game.i18n.localize("13omens.titles.archetype"),
			type: "archetype"
		}]);
		await this.registerArchetype(archetype[0]);
		
		this.updateArchetypeRelations();
	}
	
	async registerArchetype(archetype) {
		if (archetype) {
			await this.update({system : {archetypeaspects : {[archetype.id] : -1}}})
			
			this.updateArchetypeRelations();
		}
	}
	
	async deleteArchetype(id) {
		if (this.items.get(id)?.type == "archetype") {
			await this.deleteEmbeddedDocuments("Item", [id]);
			
			this.updateArchetypeRelations();
		}
	}
	
	async updateArchetypeRelations() {
		for (const archetype of this.archetypes) {
			await archetype.reorganiseRelations();
		}
	}
	
	//Aspects
	getArchetypeAspect(archetype) {
		archetype = archetype instanceof Item ? archetype : this.items.get(archetype);

		if (this.archetypes?.includes(archetype)) {
			return this.system.archetypeaspects[archetype.id];
		}
	}
	
	get storyAspectNames() {
		return this.system.storyaspects.map(aspect => aspect.name);
	}
	
	//Dice
	get hostOmenDice() {
		const current = this.system.hostomendice;
		const max = CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE;
		
		return Array.from({length : max}).map((v, i) => i + 1).map(i => ({type : i <= current ? "omen" : "blank", face : 6}));
	}
	
	get diceBagCount() {
		const wounddice = this.woundDiceCount;
		let bag = {};
		
		bag.safe = CONFIG["13OMENS"].DEFAULTDICEBAGCOUNT.safe - wounddice.safe;
		bag.omen = CONFIG["13OMENS"].DEFAULTDICEBAGCOUNT.omen + (CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE - this.system.hostomendice) - wounddice.omen;
		
		return bag;
	}
	
	get diceBag() {
		return utils.counttobag(this.diceBagCount);
	}
	
	get diceBagDice() {
		return this.diceBag.map(die => ({type : die, face : 6}));
	}
	
	get canAddOmenDice() {
		return this.system.hostomendice >= 1;
	}
	
	async addOmenDice(add = 1) {
		const diceAdd = Math.min(Math.max(add, 0), this.system.hostomendice);
		
		if (diceAdd > 0) {
			await this.update({system : {hostomendice : this.system.hostomendice - diceAdd}});
			
			return await this.checkAct();
		}
	}
	
	get canRemoveOmenDice() {
		return this.system.hostomendice <= CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE;
	}
	
	async removeOmenDice(remove = 1) {
		const diceRemove = Math.min(Math.max(remove, 0), CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE - this.system.hostomendice);
		
		if (diceRemove > 0) {
			return this.update({system : {hostomendice : this.system.hostomendice + diceRemove}});
		}
	}
}

export class storyDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			activeact: new NumberField({ required: true, integer: true, nullable: false, min: 0, max : 3, initial: 0 }),
			
			acts: new ArrayField(new SchemaField({
				omenDiceThreshold : new NumberField({ required: true, integer: true, nullable: false, min: 0, max : 14, initial: null })
			}), { initial : () => Array.from({length : 4}, (_, index) => ({omenDiceThreshold : CONFIG["13OMENS"].DEFAULTACTOMENDCIETHRESHOLD[index]}))}),
			
			autoprogressacts : new BooleanField({ required : true, initial : true}),
			
			addomendiceonactstart : new BooleanField({ required : true, initial : true}),
			
			hostomendice: new NumberField({ required: true, integer: true, nullable: false, initial: CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE }),
			
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