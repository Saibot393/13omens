const DEFAULTROLLOPTIONS = {dicePermut : [], flaws : [], edges : [], strain : false, ignoreStrain : false, targetNumber : null, taskDifficulty : 0, taskRisk : "normal", woundThreshold : null, strainThreshold : null};
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MAXFE = 2; //Max two flaws or edges

const MAXTD = 2;
const MINTD = -2;

const TASKRISKS = ["risky", "normal", "harmless"]

export const DEFAULTDICEBAGCOUNT = {safe : 8, omen : 1, }

export const MAXHOSTOMENDICE = 13;

expandRollData(data) {
	data.flaws = data.flaws.map(flaw => typeof flaw == "string" ? {name : flaw} : flaw)
}

export function randomPermut(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		
		[array[i], array[j]] = [array[j], array[i]];
	}
	
	return array;
}

export function counttobag(count) {
	let bag = [];
	
	for (let key of Object.keys(count)) {
		for (let i = 1; i <= count[key]; i++) {
			bag.push(key);
		}
	}
	
	return bag;
}

export class o13Roll extends Roll {
	constructor(actor, aspect, options = DEFAULTROLLOPTIONS) {
		super("0");
		
		options = 
		
		this._actor = actor;
		this._aspect = aspect;
		
		this._rollData = {...DEFAULTROLLOPTIONS, ...options};
		
		if (!this._dicePermut || this._dicePermut.length == 0) this.drawDice();
		
		this._formula = this.formula;
		this.terms = this.constructor.parse(this.formula, this.data);
	}
	
	get outcome() {
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
		return this._actorName || this.actor.name;
	}
	
	get act() {
		return this._act || this.actor.activeAct;
	}
	
	get woundThreshold() {
		return this._rollData.woundthreshold ?? this.act;
	}
	
	get strainThreshold() {
		return this._rollData.strainthreshold ?? this.act;
	}
	
	get aspect() {
		return this._aspect;
	}
	
	get aspectName() {
		if (this._aspectName) return this._aspectName;
		
		if (this.aspectData.name) return this.aspectData.name;
		
		return game.i18n.localize("13omens.titles." + this.aspect);
	}
	
	get dicePermut() {
		return this._rollData.dicePermut;
	}
	
	get flaws() {
		return this._rollData.flaws.length + (this.strain ? 1 : 0);
	}
	
	get omenflaws() {
		return this._rollData.flaws.filter(flaw => flaw.isomen).length;
	}
	
	get edges() {
		return this._rollData.edges.length;
	}
	
	get FEDifference() {
		return this.edges - this.flaws;
	}
	
	get FENumber() {
		return Math.abs(this.FEDifference);
	}
	
	get FERollMod() {
		return this.FEDifference == 0 ? "" : this.FEDifference > 0 ? "kh2" : "kl2";
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
		return (this._rollData.strain ?? this.aspectData?.strain) && !this.ignoreStrain;
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
		this._rollData.dicePermut = randomPermut(this.diceBag);
	}
	
	get formula() {
		return `${this.totalDice}d6${this.FERollMod}`
	}
	
	get diceResults() {
		if (!this._evaluated) {
			return [];
		}
		
		return this._terms[0].results.map((result, index) => ({face : result.result, type : this.dicePermut[index], crossed : result.discarded}))
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
		return this.actor?.canCheatDeath;
	}
	
	get consequenceTaken() {
		return this._consequenceTaken;
	}
	
	get canTakeConsequence() {
		return (this.actor ?? false) && !this.consequenceTaken;
	}
	
	async render() {
		return foundry.applications.handlebars.renderTemplate("systems/13omens/templates/rolls/chatRoll.hbs", {roll : this});
	}
	
	toJSON() {
        const json = super.toJSON();
		
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
			consequenceTaken: this._consequenceTaken
			
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
		roll._consequenceTaken = o13Data.consequenceTaken;
		
        if (data.terms) {
            roll._terms = data.terms.map(term => foundry.dice.terms.RollTerm.fromData(term));
        }
        
        return roll;
    }
	
	async dataAction(event, target, message) {
		const dataAction = target.getAttribute("data-action");
		if (dataAction) {
			switch (dataAction) {
				case "takeWound" : await this.takeWound(); break;
				case "cheatDeath" : await this.cheatDeath(); break;
				case "takeStrain" : await this.takeStrain(); break;
			}
			
			message.update({
				rolls : [this.toJSON()]
			});
		}
	}
	
	async takeWound() {
		if (this.canTakeConsequence) {
			this._consequenceTaken = true;
			
			await this.actor.takeWound({face : this.firstOmenWoundThresholdDice?.face || this.firstOmenDice});
		}
	}
	
	async cheatDeath() {
		if (this.canTakeConsequence) {
			this._consequenceTaken = true;
			
			await this.actor.takeWound({face : (this.firstSafeDice || this.firstOmenDice)?.face, cheatDeath : true});
		}
	}
	
	async takeStrain() {
		if (this.canTakeConsequence) {
			this._consequenceTaken = true;
			
			await this.actor.takeStrain(this.aspect);
		}
	}
}

export class o13rollConfig extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(actor, data, secondaryView = false) {
		super();
		
		this._actor = actor;
		
		this._data = {
			...DEFAULTROLLOPTIONS,
			...data
		}
		
		this._id = foundry.utils.randomID();
		
		this.expandData();
		
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
		return this.flaws.length + (this.strain ? 1 : 0) < MAXFE;
	}
	
	get canAddEdges() {
		return this.edges.length < MAXFE;
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
			toggleOmenFlaw : o13rollConfig.DAtoggleOmenFlaw,
			removeEdge : o13rollConfig.DAremoveEdge,
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
			taskRisks: TASKRISKS
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
		if (this._data.taskDifficulty > MINTD) this._data.taskDifficulty -= 1;
		
		this._applyUpdate();
	}
	
	static async DAincreaseTaskDifficulty(event, target) {
		if (this._data.taskDifficulty < MAXTD) this._data.taskDifficulty += 1;
		
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
	
	static async DAtoggleOmenFlaw(event, target) {
		const index = target.getAttribute("index");
		
		if (isNaN(index)) return;
		
		this.toggleOmenFlaw(index);
	}
	
	static async DAremoveStrain(event, target) {
		this._data.ignoreStrain = true;
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
		roll.toMessage();
		
		return roll;
	}
}

Hooks.on("renderChatMessageHTML", (message, html) => {
	const o13Buttons = html.querySelectorAll(".o13-button");
	
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