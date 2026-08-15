const DEFAULTROLLOPTIONS = {dicePermut : [], flaws : [], omenflaws : [], edges : [], taskDifficulty : 0, taskRisk : "normal"};
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MAXFE = 2; //Max two flaws or edges

const MAXTD = 2;
const MINTD = -2;

const TASKRISKS = ["risky", "normal", "harmless"]

export const DEFAULTDICEBAGCOUNT = {safe : 8, omen : 1, }

export const MAXHOSTOMENDICE = 13;

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
		
		options = {...DEFAULTROLLOPTIONS, ...options};
		
		this._actor = actor;
		this._aspect = aspect;
		
		this._dicePermut = options.dicePermut;
		this._flaws = options.flaws;
		this._omenflaws = options.omenflaws;
		this._edges = options.edges;
		this._taskDifficulty = options.taskDifficulty;
		this._taskRisk = options.taskRisk;
		this._targetNumber = this.aspectData.targetNumber;
		this._strain = this.aspectData.strain;
		
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
	
	get aspect() {
		return this._aspect;
	}
	
	get aspectName() {
		if (this.aspectData.name) return this.aspectData.name;
		
		return game.i18n.localize("13omens.titles." + this.aspect);
	}
	
	get dicePermut() {
		return this._dicePermut;
	}
	
	get flaws() {
		return this._flaws.length + this._omenflaws.length + (this.strain ? 1 : 0);
	}
	
	get omenflaws() {
		return this._omenflaws.length;
	}
	
	get edges() {
		return this._edges.length;
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
		return this._taskDifficulty;
	}
	
	get taskRisk() {
		return this._taskRisk;
	}
	
	get targetNumber() {
		return this._targetNumber || this.aspectData.targetNumber;
	}
	
	get strain() {
		return this._strain || this.aspectData.strain;
	}
	
	get aspectData() {
		return this.actor.system.getAspectData(this.aspect, true);
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
		this._dicePermut = randomPermut(this.diceBag);
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
	
	async render() {
		return foundry.applications.handlebars.renderTemplate("systems/13omens/templates/rolls/chatRoll.hbs", {roll : this});
	}
	
	toJSON() {
        const json = super.toJSON();
        json.o13Data = {
            actorId: this._actor?.id,
            aspect: this._aspect,
            options: {
                dicePermut: this._dicePermut,
                flaws: this._flaws,
                omenflaws: this._omenflaws,
                edges: this._edges,
                taskDifficulty: this._taskDifficulty,
                taskRisk: this._taskRisk,
				targetNumber: this._targetNumber,
				strain: this._strain
            }
        };
        return json;
    }
	
    static fromData(data) {
        const o13Data = data.o13Data ?? {};
        const actor = game.actors.get(o13Data.actorId);
        
        const roll = new this(actor, o13Data.aspect, o13Data.options);
        
        roll._formula = data.formula;
        roll._evaluated = data.evaluated ?? true;
        roll._total = data.total;
        if (data.terms) {
            roll._terms = data.terms.map(t => foundry.dice.terms.RollTerm.fromData(t));
        }
        
        return roll;
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
		return this.actor.system.getAspectData(this.aspect, true);		
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
		return this.aspectData.strain;
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
			reduceTaskDifficulty : o13rollConfig.reduceTaskDifficulty,
			increaseTaskDifficulty : o13rollConfig.increaseTaskDifficulty,
			addEmptyFlaw : o13rollConfig.addEmptyFlaw,
			addEmptyEdge : o13rollConfig.addEmptyEdge,
			removeFlaw : o13rollConfig.removeFlaw,
			removeEdge : o13rollConfig.removeEdge,
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
	
	static async reduceTaskDifficulty(event, target) {
		if (this._data.taskDifficulty > MINTD) this._data.taskDifficulty -= 1;
		
		this._applyUpdate();
	}
	
	static async increaseTaskDifficulty(event, target) {
		if (this._data.taskDifficulty < MAXTD) this._data.taskDifficulty += 1;
		
		this._applyUpdate();
	}
	
	static async addEmptyFlaw(event, target) {
		if (this.canAddFlaws) {
			this.addFlaw();
		}
	}
	
	static async addEmptyEdge(event, target) {
		if (this.canAddEdges) {
			this.addEdge();
		}
	}
	
	static async removeFlaw(event, target) {
		const index = target.getAttribute("index");
		this._data.flaws.splice(index, 1);
		
		this._applyUpdate();
	}
	
	static async removeEdge(event, target) {
		const index = target.getAttribute("index");
		this._data.edges.splice(index, 1);
		
		this._applyUpdate();
	}
	
	static async roll(event, target) {
		const roll = new o13Roll(this.actor, this.aspect, this._data);

		await roll.evaluate();
		roll.toMessage();
		
		return roll;
	}
}