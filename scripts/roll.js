const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

import { utils } from "./utils.js";

export class o13Roll extends Roll {
	constructor(actor, aspect, options = CONFIG["13OMENS"].DEFAULTROLLOPTIONS) {
		super("0");
		
		this._actor = actor;
		this._aspect = aspect;
		
		this._rollData = ({...CONFIG["13OMENS"].DEFAULTROLLOPTIONS, ...foundry.utils.deepClone(options)});

		utils.expandRollData(this._rollData);
		
		this._rollData.targetNumber = this.targetNumber;
		this._rollData.strain = this.strain;
		
		this._actorName = this.actorName;
		this._act = this.act;
		this._storyID = this.storyID;
		
		if (!this._rollData.dicePermut || this._rollData.dicePermut.length == 0) this.drawDice();
		
		this._canvaliantsacrifice = this.actor?.canValiantSacrifice;
		this._hasvaliantlysacrificed = false;
		
		this._formula = this.formula;
		this.terms = this.constructor.parse(this.formula, this.data);
	}
	
	get outcome() {
		if (this.hasValiantlySacrificed) {
			return 2;
		}
		
		if (this.total > this.totalDifficulty) {
			return 1;
		}
		if (this.total == this.totalDifficulty) {
			return 0;
		}
		if (this.total < this.totalDifficulty) {
			return -1;
		}
	}
	
	get actor() {
		return this._actor;
	}
	
	get isOwner() {
		return this.actor?.isOwner;
	}
	
	get actorName() {
		return this._actorName || this.actor?.name;
	}
	
	get canValiantSacrifice() {
		return (this.actor?.isOwner ?? false) && this._canvaliantsacrifice && this.rollsOmenDice;
	}
	
	get hasValiantlySacrificed() {
		return this._hasvaliantlysacrificed;
	}
	
	get act() {
		return this._act || this.actor?.activeAct;
	}
	
	get storyID() {
		return this._storyID || this.actor?.storyActor?.id;
	}
	
	get woundThreshold() {
		return this._rollData.woundThreshold ?? this.act;
	}
	
	get strainThreshold() {
		return this._rollData.strainThreshold ?? this.act;
	}
	
	get aspect() {
		return this._aspect;
	}
	
	get aspectName() {
		if (this._aspectName) return this._aspectName;
		
		if (this.aspectData?.name) return this.aspectData.name;
		
		return game.i18n.localize("13omens.titles." + this.aspect);
	}
	
	get dicePermut() {
		return this._rollData.dicePermut;
	}
	
	get dicePermutOmenApplied() {
		const dicePermut =  [...this.dicePermut];
		
		const flaws = this.flaws;
		
		if (this.FEDifference < 0) {
			for (let i = 0; i < flaws.length; i++) {
				if (flaws[i].isomen) {
					const removedDice = dicePermut[i+2]; //leave first two dice alone
					dicePermut[i+2] = "omen";
					dicePermut.push(removedDice); //make sure no dice ist lost, probably irrelevant, better save than sorry
				}
			}
		}
		
		return dicePermut;
	}
	
	get flaws() {
		return this._rollData.flaws;
	}
	
	get flawsCount() {
		return this._rollData.flaws.length + (this.useStrain ? 1 : 0);
	}
	
	get omenflaws() {
		return this._rollData.flaws.filter(flaw => flaw.isomen).length;
	}
	
	get edges() {
		return this._rollData.edges;
	}
	
	get edgesCount() {
		return this._rollData.edges.length;
	}
	
	get FEDifference() {
		return this.edgesCount - this.flawsCount;
	}
	
	get FENumber() {
		return Math.abs(this.FEDifference);
	}
	
	get rollBehaviour() {
		return this._rollData.rollbehaviour ?? {};
	}
	
	get hasRerolls() {
		return this.rollBehaviour.rerolls > 0;
	}
	
	get hasOmenRedraws() {
		return this.rollBehaviour.redrawomendice > 0;
	}
	
	get canOmenRedraw() {
		return this.hasOmenRedraws && this.diceResults.filter(result => result.type == "omen").length > this.omenflaws;
	}
	
	get FERollMod() {
		return this.FEDifference == 0 ? "" : this.FEDifference > 0 ? "kh2" : (this.rollBehaviour.flawhnl ? "klh" : "kl2");
	}	
	
	get FEDescription() {
		return this.FEDifference == 0 ? "" : this.FEDifference > 0 ? this.FENumber == 1 ? game.i18n.format("13omens.titles.withEdge", {}) : game.i18n.format("13omens.titles.withEdges", {n : this.FENumber}) : this.FENumber == 1 ? game.i18n.format("13omens.titles.withFlaw", {}) : game.i18n.format("13omens.titles.withFlaws", {n : this.FENumber});
	}	
	
	get taskDifficulty() {
		return this._rollData.taskDifficulty;
	}
	
	get taskRisk() {
		return this._rollData.taskRisk;
	}
	
	get targetNumber() {
		return this._rollData.targetNumber ?? this.aspectData?.targetNumber;
	}
	
	get strain() {
		return this._rollData.strain ?? this.aspectData?.strain
	}
	
	get useStrain() {
		return this.strain && !this.ignoreStrain;
	}
	
	get ignoreStrain() {
		return this._rollData.ignoreStrain;
	}
	
	get aspectData() {
		return this.actor?.getAspectData(this.aspect, true);
	}
	
	get totalDifficulty() {
		return this.targetNumber + this.taskDifficulty;
	}	
	
	get totalDice() {
		return 2 + this.FENumber;
	}
	
	get diceBag() {
		return this.actor.diceBag;
	}
	
	drawDice() {
		this._rollData.dicePermut = utils.randomPermut(this.diceBag);
	}
	
	get formula() {
		return `${this.totalDice}d6`
	}
	
	get diceResults() {
		if (!this._evaluated) {
			return [];
		}
		
		const dicePermutOmenApplied = this.dicePermutOmenApplied;
		
		return this.terms[0].results.map((result, index) => ({face : result.result, type : dicePermutOmenApplied[index], crossed : result.discarded, mystery : this.canValiantSacrifice}))
	}
	
	get rollsOmenDice() {
		const dicePermutOmenApplied = this.dicePermutOmenApplied;
		return this.terms[0]?.results?.some((result, index) => dicePermutOmenApplied[index] == "omen");
	}
	
	get rollsSafeDice() {
		const dicePermutOmenApplied = this.dicePermutOmenApplied;
		return this.terms[0]?.results?.some((result, index) => dicePermutOmenApplied[index] == "safe");
	}
	
	rerollDiceSelection(indices) {
		if (this.terms[0]?.results) {
			for (const index of indices) {
				if (this.terms[0].results[index]?.result) {
					this.terms[0].results[index].result = Math.floor(Math.random() * 6) + 1
				}
			}
		}
	}
	
	get firstOmenDice() {
		return this.diceResults.find(result => result.type == "omen");
	}
	
	get firstOmenWoundThresholdDice() {
		return this.diceResults.find(result => result.face <= this.woundThreshold && result.type == "omen");
	}
	
	get firstSafeDice() {
		return this.diceResults.find(result => result.type == "safe");
	}
	
	get hasWound() {
		return this.actor && this.taskRisk != "harmless" && this.diceResults.find(dice => dice.face <= this.woundThreshold && dice.type == "omen");
	}
	
	get hasStrain() {
		return this.actor && this.taskRisk == "harmless" && this.diceResults.find(dice => dice.face <= this.strainThreshold && dice.type == "omen");
	}
	
	get canCheatDeath() {
		return this.rollsSafeDice && this.actor?.canCheatDeath;
	}
	
	get consequenceTaken() {
		return this._consequenceTaken;
	}
	
	get canTakeConsequence() {
		return (this.actor?.isOwner ?? false) && !this.consequenceTaken && !this.hasValiantlySacrificed;
	}
	
	applyDiceSelection() {
		const termResults = this.terms[0].results;
		
		const numbers = termResults.map(r => r.result);

		if (termResults && termResults.length > 2) {
			let selectors = [...numbers];
			
			switch (this.FERollMod) {
				case "kl2":
					selectors = utils.lowest(numbers, 2);
					break;
				case "kh2":
					selectors = utils.highest(numbers, 2);
					break;
				case "klh":
					selectors = [...utils.lowest(numbers, 1), ...utils.highest(numbers, 1)];
					break;
			}
			
			const selectIndexes = utils.indexesof(numbers, selectors);
			
			for (let i = 0; i < termResults.length; i++) {
				termResults[i].active = selectIndexes.includes(i);
				termResults[i].discarded = !termResults[i].active;
			}
		}
	}
	
	async _evaluate(options = {}) {
		await super._evaluate(options);
		
		this.applyDiceSelection();

		this._total = this._evaluateTotal();
		
		return this;
	}

	_evaluateTotal() {
		this.applyDiceSelection();
		
		return super._evaluateTotal();
	}
	
	async render() {
		return foundry.applications.handlebars.renderTemplate("systems/13omens/templates/rolls/chatRoll.hbs", {roll : this});
	}
	
	toJSON() {
        const json = super.toJSON();
		
		json.evaluated = this._evaluated;
		json.total = this._total;
		
		if (this._terms) {
			json.terms = this._terms.map(term => term.toJSON());
		}
		
        json.o13Data = {
            actorId: this._actor?.id,
            aspect: this._aspect,
			
            rollData: this._rollData,
			
			aspectName: this._aspectName,
			actorName: this._actorName,
			act: this._act,
			storyID : this._storyID,
			consequenceTaken: this._consequenceTaken,
			canvaliantsacrifice: this._canvaliantsacrifice,
			hasvaliantlysacrificed : this._hasvaliantlysacrificed
        };
		
        return json;
    }
	
    static fromData(data) {
        const o13Data = data.o13Data ?? {};
        const actor = game.actors.get(o13Data.actorId);
        
        const roll = new this(actor, o13Data.aspect, o13Data.rollData);
        
		roll._aspectName = o13Data.aspectName;
		roll._actorName = o13Data.actorName;
		roll._act = o13Data.act;
		roll._storyID = o13Data.storyID;
		roll._consequenceTaken = o13Data.consequenceTaken;
		roll._canvaliantsacrifice = o13Data.canvaliantsacrifice;
		roll._hasvaliantlysacrificed = o13Data.hasvaliantlysacrificed;
		
        if (data.terms) {
            roll.terms = data.terms.map(term => foundry.dice.terms.RollTerm.fromData(term));
        }
		
		roll._evaluated = data.evaluated;
		roll._total = data.total;
        
        return roll;
    }
	
	async dataAction(event, target, message) {
		const dataAction = target.getAttribute("data-action");
		if (dataAction) {
			switch (dataAction) {
				case "takeWound" : await this.takeWound(); break;
				case "cheatDeath" : await this.cheatDeath(); break;
				case "takeStrain" : await this.takeStrain(); break;
				case "rerollDice" : await this.rerollDice(); break;
				case "redrawOmenDice" : await this.redrawOmenDice(); break;
				case "valiantlysacrifice" : await this.valiantlySacrifice(); break;
				case "refusevaliantsacrifice" : await this.refuseValiantSacrifice(); break;
			}
			
			message.update({
				rolls : [this.toJSON()]
			});
		}
	}
	
	async takeWound() {
		if (this.canTakeConsequence && this.hasWound) {
			this._consequenceTaken = true;
			
			await this.actor.takeWound({face : (this.firstOmenWoundThresholdDice || this.firstOmenDice)?.face});
		}
	}
	
	async cheatDeath() {
		if (this.canTakeConsequence && this.hasWound && this.canCheatDeath) {
			this._consequenceTaken = true;
			
			await this.actor.takeWound({face : (this.firstSafeDice || this.firstOmenDice)?.face, cheatDeath : true});
		}
	}
	
	async takeStrain() {
		if (this.canTakeConsequence && this.hasStrain) {
			this._consequenceTaken = true;
			
			await this.actor.takeStrain(this.aspect);
		}
	}
	
	async rerollDice() {
		if (this.hasRerolls) {
			this._rollData.rollbehaviour.rerolls -= 1;
			
			const rollcopy = new o13Roll(this.actor, this.aspect, this._rollData);

			await rollcopy.evaluate();
			await rollcopy.toMessage();
		}
	}
	
	async redrawOmenDice() {
		if (this.canOmenRedraw) {
			this._rollData.rollbehaviour.redrawomendice -= 1;
			
			const drawndice = this.totalDice;
			
			const currentPermut = [...this._rollData.dicePermut];
			
			const usedDice = currentPermut.slice(0, drawndice);
			const unusedDice = utils.randomPermut(currentPermut.slice(drawndice));
			
			let redrawndice = 0;
			
			const redrawn = [];
			
			for (let i = 0; i < usedDice.length; i++) {
				if (usedDice[i] == "omen" && redrawndice < unusedDice.length) {
					redrawn.push(i);
					usedDice[i] = unusedDice[redrawndice];
					unusedDice[redrawndice] = "omen";
					
					redrawndice = redrawndice + 1;
				}
			}
			
			this.rerollDiceSelection(redrawn);
			
			this._rollData.dicePermut = [...usedDice, ...unusedDice];
			
			this._evaluateTotal();
		}
	}
	
	async valiantlySacrifice() {
		if (this.canValiantSacrifice) {
			this._canvaliantsacrifice = false;
			this._hasvaliantlysacrificed = true;
			
			await this.actor.takeWound({face : 6});
		}
	}
	
	async refuseValiantSacrifice() {
		if (this.canValiantSacrifice) {
			this._canvaliantsacrifice = false;
		}
	}
}

export class o13rollConfig extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(actor, data, secondaryView = false) {
		super();
		
		this._actor = actor;
		
		this._data = {
			...CONFIG["13OMENS"].DEFAULTROLLOPTIONS,
			...data
		}
		
		utils.expandRollData(this._data);
		
		this._id = foundry.utils.randomID();
		
		this._secondaryView = secondaryView;
	}
	
	static newSecondary(socketData) {
		return new o13rollConfig(actor, data, true);
	}
	
	updateData(data) {
		this._data = {
			...this._data,
			...data
		}
		
		this.render();
	}
	
	get actor() {
		return this._actor;
	}
	
	get aspect() {
		return this._data.aspect;
	}
	
	get secondaryView() {
		return this._secondaryView;
	}
	
	get aspectData() {
		return this.actor.getAspectData(this.aspect, true);		
	}
	
	get actorName() {
		return this.actor.name;
	}
	
	get aspectName() {
		return this.aspectData.name;
	}
	
	get aspectRating() {
		return this.aspectData.rating;
	}
	
	get strain() {
		return this.aspectData.strain && !this._data.ignoreStrain;
	}
	
	get targetNumber() {
		return this.aspectData.targetNumber;
	}
	
	get taskRisk() {
		return this._data.taskRisk;
	}
	
	get taskDifficulty() {
		return this._data.taskDifficulty;
	}
	
	get flaws() {
		return this._data.flaws;
	}
	
	get omenflaws() {
		return this._data.flaws.filter(flaw => flaw.isomen);
	}
	
	get edges() {
		return this._data.edges;
	}
	
	get hostView() {
		return game.user.isGM;
	}
	
	get canAddFlaws() {
		return this.flaws.length + (this.strain ? 1 : 0) < CONFIG["13OMENS"].MAXFE;
	}
	
	get canAddEdges() {
		return this.edges.length < CONFIG["13OMENS"].MAXFE;
	}
	
	addFlaw(flawName = "", omen = false) {
		this._data.flaws = [...this._data.flaws, {name : flawName || game.i18n.localize("13omens.titles.flaw"), isomen : omen}];
		
		this._applyUpdate();
	}
	
	addEdge(edgeName = "") {
		this._data.edges = [...this._data.edges, {name : edgeName || game.i18n.localize("13omens.titles.edge")}];
		
		this._applyUpdate();
	}
	
	toggleOmenFlaw(index) {
		if (this._data.flaw[index]) this._data.flaw[index].isomen = !this._data.flaw[index].isomen;
	}
	
	static DEFAULT_OPTIONS = {
		tag: "form",
		window: {
			resizable: false,
		},
		position: {
			width: 400,
			height: "auto",
		},
		form: {
			handler: o13rollConfig._onSubmitForm,
			submitOnChange: true,
			closeOnSubmit: false
		},
		actions: {
			reduceTaskDifficulty : o13rollConfig.DAreduceTaskDifficulty,
			increaseTaskDifficulty : o13rollConfig.DAincreaseTaskDifficulty,
			addEmptyFlaw : o13rollConfig.DAaddEmptyFlaw,
			addEmptyEdge : o13rollConfig.DAaddEmptyEdge,
			removeFlaw : o13rollConfig.DAremoveFlaw,
			toggleFlawOmen : o13rollConfig.DAtoggleFlawOmen,
			toggleOmenFlaw : o13rollConfig.DAtoggleOmenFlaw,
			removeEdge : o13rollConfig.DAremoveEdge,
			removeStrain : o13rollConfig.DAremoveStrain,
			roll : o13rollConfig.roll
		}
	};

	static PARTS = {
		main: {
			template: "systems/13omens/templates/rolls/rollConfig.hbs",
		}
	};

	async _prepareContext(options) {
		return {
			config: this,
			taskRisks: CONFIG["13OMENS"].TASKRISKS
		}
    };
	
	static async _onSubmitForm(event, form, formData) {
		for (let key of Object.keys(formData.object)) {
			foundry.utils.setProperty(this._data, key, formData.object[key]);
		}
		
		this.render(true);
	}
	
	_applyUpdate() {
		this.render(true);
	}
	
	static async DAreduceTaskDifficulty(event, target) {
		if (this._data.taskDifficulty > CONFIG["13OMENS"].MINTD) this._data.taskDifficulty -= 1;
		
		this._applyUpdate();
	}
	
	static async DAincreaseTaskDifficulty(event, target) {
		if (this._data.taskDifficulty < CONFIG["13OMENS"].MAXTD) this._data.taskDifficulty += 1;
		
		this._applyUpdate();
	}
	
	static async DAaddEmptyFlaw(event, target) {
		if (this.canAddFlaws) {
			this.addFlaw();
		}
	}
	
	static async DAaddEmptyEdge(event, target) {
		if (this.canAddEdges) {
			this.addEdge();
		}
	}
	
	static async DAremoveFlaw(event, target) {
		const index = target.getAttribute("index");
		
		if (isNaN(index)) return;
		
		this._data.flaws.splice(index, 1);
		
		this._applyUpdate();
	}
	
	static async DAtoggleFlawOmen(event, target) {
		const index = target.getAttribute("index");
		
		if (isNaN(index)) return;
		
		this._data.flaws[index].isomen = !this._data.flaws[index].isomen;
		
		this._applyUpdate();
	}
	
	static async DAtoggleOmenFlaw(event, target) {
		const index = target.getAttribute("index");
		
		if (isNaN(index)) return;
		
		this.toggleOmenFlaw(index);
	}
	
	static async DAremoveStrain(event, target) {
		this._data.ignoreStrain = true;
		
		this._applyUpdate();
	}
	
	static async DAremoveEdge(event, target) {
		const index = target.getAttribute("index");
		
		if (isNaN(index)) return;
		
		this._data.edges.splice(index, 1);
		
		this._applyUpdate();
	}
	
	static async roll() {
		const roll = new o13Roll(this.actor, this.aspect, this._data);

		await roll.evaluate();
		await roll.toMessage();
		
		this.close();
		
		return roll;
	}
}

Hooks.on("renderChatMessageHTML", (message, html) => {
	const o13Buttons = html.querySelectorAll("[data-action]");
	
	const roll = message.rolls[0];

	if (roll instanceof o13Roll) {

		o13Buttons.forEach((button) => {
			const dataAction = button.getAttribute("data-action");

			if (dataAction) {
				button.addEventListener("click", async (event) => {
					roll.dataAction(event, button, message);
				})
			}
		});
	}
})