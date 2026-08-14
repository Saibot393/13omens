const DEFAULTROLLOPTIONS = {dicePermut : [], flaws : [], omenflaws : [], edges : [], taskDifficulty : 0, taskRisk : "normal"};
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MAXFE = 2; //Max two flaws or edges

const MAXTD = 2;
const MINTD = -2;

const TASKRISKS = ["risky", "normal", "harmless"]

export class o13Roll {
	constructor(actor, aspect, options = DEFAULTROLLOPTIONS) {
		console.log(this);
		console.log(actor);
		
		options = {...DEFAULTROLLOPTIONS, ...options};
		
		this._actor = actor;
		this._aspect = aspect;
		
		this._dicePermut = options.dicePermut;
		this._flaws = options.flaws;
		this._omenflaws = options.omenflaws;
		this._edges = options.edges;
		this._taskDifficulty = options.taskDifficulty;
		this._taskRisk = options.taskRisk;
		
		this._roll = new Roll(this.rollFormula);
	}
	
	async roll(){
		return await this._roll.roll();
	}

	get dice() {
		return this._roll.dice;
	}
	
	get total() {
		return this._roll.roll;
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
	
	async toMessage() {
		return await this._roll.toMessage();
	}
	
	get actor() {
		return this._actor;
	}
	
	get aspect() {
		return this._aspect;
	}
	
	get dicePermut() {
		return this._dicePermut;
	}
	
	get flaws() {
		return this._flaws.length + this._omenflaws.length + this.aspectData.strain ? 1 : 0;
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
	
	get taskDifficulty() {
		return this._taskDifficulty;
	}
	
	get taskRisk() {
		return this._taskRisk;
	}
	
	get aspectData() {
		return this.actor.system.getAspectData(this.aspect, true);
	}
	
	get totalDifficulty() {
		return this.aspectData.targetNumber + this.taskDifficulty;
	}	
	
	get totalDice() {
		return 2 + this.FENumber;
	}
	
	get rollFormula() {
		return `${this.totalDice}d6${this.FERollMod}`
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
		
		console.log(this);
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
	
	get gmView() {
		return game.user.isGM;
	}
	
	get canAddFlaws() {
		return this.flaws.length < MAXFE;
	}
	
	get canAddEdges() {
		return this.edges.length < MAXFE;
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
			removeEdge : o13rollConfig.removeEdge
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
		console.log(formData.object);
		
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
			this._data.flaws = [...this._data.flaws, {name : "", isomen : false}];
			
			this._applyUpdate();
		}
	}
	
	static async addEmptyEdge(event, target) {
		console.log(event);
		if (this.canAddEdges) {
			this._data.edges = [...this._data.edges, {name : ""}];
			
			this._applyUpdate();
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
}