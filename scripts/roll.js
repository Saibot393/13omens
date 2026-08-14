const DEFAULTROLLOPTIONS = {dicePermut : [], flaws : 0, omenflaws : 0, edges : 0, taskDifficulty : 0, taskRisk : "normal"};

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
		return this._flaws + this._omenflaws + this.aspectData.strain ? 1 : 0;
	}
	
	get omenflaws() {
		return this._omenflaws;
	}
	
	get edges() {
		return this._edges;
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
		console.log(this.actor.system.getAspectData(this.aspect, true));
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