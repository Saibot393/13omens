const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

export class o13archetypeItem {
	//Story
	get storyActor() {
		if (this.parent?.type == "story") {
			return this.parent;
		}
	}
	
	get archetypeAspect() {
		return this.storyActor?.getArchetypeAspect(this);
	}
	
	//Subitems
	async addSubItem(item) {
		if (item.isPerk || item.isGear) {
			const data = item.toObject();
			
			data._id = foundry.utils.randomID();
			
			foundry.utils.setProperty(data, "flags.core.sourceId", item.uuid);
			data.system.origin.parentArchetype = this.uuid;
			data.system.origin.id = data._id;
			
			if (item?.isPerk) {
				return this.update({system : {perks : {[data._id] : data}}});
			}
			
			if (item?.isGear) {
				return this.update({system : {gear : {[data._id] : data}}});
			}
		}
	}
	
	async removeSubItem(id) {
		if (this.system.perks[id]) {
			//return this.update({[`system.perks.-=${id}`] : null})
			return this.update({system : {perks : {[id] : _del}}})
		}
		if (this.system.gear[id]) {
			//return this.update({[`system.gear.-=${id}`] : null})
			return this.update({system : {gear : {[id] : _del}}})
		}
	}
	
	async updateSubItem(itemid, data) {
		const currentData = this.system.perks[itemid] || this.system.gear[itemid];
		
		if (currentData && ((currentData.type == data.type) || !data.hasOwnProperty("type"))) {
			const cleanedData = {...data, _id : currentData._id}; //make sure update doesnt change _id
			foundry.utils.setProperty(cleanedData, "system.origin.parentArchetype", this.uuid);
			foundry.utils.setProperty(cleanedData, "system.origin.id", currentData._id);
			
			switch (currentData.type) {
				case "perk" : return this.update({system : {perks : {[itemid] : cleanedData}}}); break;
				case "gear" : return this.update({system : {gear : {[itemid] : cleanedData}}}); break;
			}
		}
	}
	
	//Gear
	async createNewPerk(data = {}) {
		const perk = new this.constructor({name : game.i18n.localize("13omens.titles.perk"), ...data, type : "perk"});

		return this.addSubItem(perk);
	}
	
	async createNewGear(data = {}) {
		const gear = new this.constructor({name : game.i18n.localize("13omens.titles.gear"), ...data, type : "gear"});
		
		return this.addSubItem(gear);
	}
	
	get gearData() {
		return this.system.gear;
	}
	
	getGearItem(id) {
		const data = this.system.gear[id];
		
		if (data && data.type == "gear") {
			const gear = new this.constructor(data);
			
			if (gear.isGear) {
				return gear;
			}
		}
	}
	
	hasGear(id) {
		return Boolean(this.system.gear[id]);
	}
	
	//Gear Management
	async markAsGuaranteedGear(id) {
		if (this.hasGear(id)) {
			return this.update({system : {guaranteedgear : {[id] : true}}})
		}
	}
	
	async removeFromGuaranteedGear(id) {
		if (this.hasGear(id)) {
			return this.update({system : {guaranteedgear : {[id] : _del}}})
		}
	}
	
	isGuaranteedGear(id) {
		if (this.hasGear(id)) {
			return this.system.guaranteedgear[id];
		}
	}
	
	async toggleGuaranteedGear(id) {
		if (this.hasGear(id)) {
			if (this.isGuaranteedGear(id)) {
				return this.removeFromGuaranteedGear(id);
			}
			else {
				return this.markAsGuaranteedGear(id);
			}
		}
	}
	
	get guaranteedGear() {
		return Object.fromEntries(Object.keys(this.system.gear).filter(id => this.isGuaranteedGear(id)).map(id => [id, this.system.gear[id]]));
	}
	
	get unguaranteedGear() {
		return Object.fromEntries(Object.keys(this.system.gear).filter(id => !this.isGuaranteedGear(id)).map(id => [id, this.system.gear[id]]));
	}
	
	get selectableGearCount() {
		return this.system.selectablegearcount
	}
	
	//Perks
	get perksData() {
		return this.system.perks;
	}
	
	getPerkItem(id) {
		const data = this.system.perks[id];
		
		if (data && data.type == "perk") {
			const perk = new this.constructor(data);
			
			if (perk.isPerk) {
				return perk;
			}
		}
	}
	
	hasPerk(id) {
		return Boolean(this.system.perks[id]);
	}
	
	get choosablePerks() {
		return this.system.choosableperks;
	}
	
	//data preperation
	get enrichables() {
		return {
			background: {
				description : this.system.background.description,
				goal: this.system.background.goal,
				traits: this.system.background.traits,
				relations: this.system.background.map(r => ({relation : r.relation}))
			}
		}
	}
}

export class archetypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			background : new SchemaField({
				description: new HTMLField({ required: true, initial: ""}),
				goal: new HTMLField({ required: true, initial: ""}),
				traits: new HTMLField({ required: true, initial: ""}),
				relations: new ArrayField(
					new SchemaField({
						archetype: new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}),
						relation: new HTMLField({ required: true, initial: ""})
					})
				)
			}),
			
			perks: new ObjectField({}),
			
			choosableperks : new NumberField({ required: true, integer: true, nullable: true, min: 1, initial: 2 }),
			
			gear: new ObjectField({}),
			
			guaranteedgear: new ObjectField({}), //only refer to id
			
			selectablegearcount: new NumberField({ required: true, integer: true, nullable: true, min: 1, initial: 4 })
		};
	}
	
	prepareDerivedData() {
		return {
			
		}
	}
}