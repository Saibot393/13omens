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
		if (!this.isPrologue) {
			const hostOmenDice = CONFIG["13OMENS"].DEFAULTMAXHOSTOMENDICE - this.system.hostomendice;

			const targetAct = Math.max(...Object.keys(CONFIG["13OMENS"].DEFAULTACTOMENDCIETHRESHOLD).filter(id => CONFIG["13OMENS"].DEFAULTACTOMENDCIETHRESHOLD[id] <= hostOmenDice));

			return this.advanceAct(targetAct);
		}
	}
	
	async advanceAct(target) {
		const targetAct = target ?? this.activeAct + 1;
		
		if (targetAct > this.activeAct && targetAct <= 3 && targetAct >= 0) {
			return this.update({system : {activeact : targetAct}});
		}
	}
	
	async resettoPrologue() {
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
		if (actor.isPC && !actor.storyActor) {
			this.update({system : {pcs : [...this.system.pcs, {id : actor.id}]}});
		}
	}
	
	async removePC(id) {
		this.update({system : {pcs : this.system.pcs.filter(pc => pc.id != id)}});
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
		const pcwoundcounts = this.pcActors.map(actor => actor.woundDiceCount);
		
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
		return this.registerArchetype(archetype[0]);
	}
	
	async registerArchetype(archetype) {
		if (archetype) {
			await this.update({system : {archetypeaspects : {[archetype.id] : -1}}})
		}
	}
	
	async deleteArchetype(id) {
		if (this.items.get(id)?.type == "archetype") {
			this.deleteEmbeddedDocuments("Item", [id]);
			
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
		return this.system.hostomendice > 1;
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