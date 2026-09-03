const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

export class o13archetypeItem {
	//Updates & Create
	
	async _preUpdate(changed, options, user) {
		if (changed?.system?.background?.relations) {
			const currentRelations = this.organisedRelations;
			
			const newRelations = changed.system.background.relations;
			
			//relations might very well be empty at this point, so organise and fill them
			for (let i = 0; i < currentRelations.length; i++) {
				currentRelations[i] = newRelations.find(relation => relation.archetype == currentRelations[i].archetype) ?? {archetype : currentRelations[i].archetype, relation : newRelations[i].relation}
			}
			
			changed.system.background.relations = currentRelations;
		}
		
		await this.superPD._preUpdate(changed, options, user);
	}
	
	//Story
	get storyActor() {
		if (this.parent?.type == "story") {
			return this.parent;
		}
	}
	
	get archetypeAspect() {
		return this.storyActor?.getArchetypeAspect(this);
	}
	
	get siblingArchetypes() {
		return this.storyActor?.archetypes.filter(archetype => archetype != this) ?? [];
	}
	
	get organisedRelations() {
		//use this as basis for preupdates to make sure data is available
		const currentRelations = this.system.background.relations;
		
		return this.siblingArchetypes.map(archetype => ({archetype : archetype.id, relation : currentRelations.find(relation => relation.archetype == archetype.id)?.relation ?? ""}));
	}
	
	async reorganiseRelations() {
		return this.update({system : {background : {relations : this.organisedRelations}}})
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
		return Object.fromEntries(Object.entries(this.system.gear).sort((entrya, entryb) => entrya[1].sort - entryb[1].sort));
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
		return Object.fromEntries(Object.keys(this.system.gear).filter(id => this.isGuaranteedGear(id)).map(id => [id, this.system.gear[id]]).sort((entrya, entryb) => entrya[1].sort - entryb[1].sort));
	}
	
	get unguaranteedGear() {
		return Object.fromEntries(Object.keys(this.system.gear).filter(id => !this.isGuaranteedGear(id)).map(id => [id, this.system.gear[id]]).sort((entrya, entryb) => entrya[1].sort - entryb[1].sort));
	}
	
	get selectableGearCount() {
		return this.system.selectablegearcount
	}
	
	//Perks
	get perksData() {
		return Object.fromEntries(Object.entries(this.system.perks).sort((entrya, entryb) => entrya[1].sort - entryb[1].sort));
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
	
	//data preperation/handling
	get enrichables() {
		return {
			background: {
				description : this.system.background.description,
				goal: this.system.background.goal,
				traits: this.system.background.traits,
				relations: Object.fromEntries(this.system.background.relations.map(r => ([r.archetype, r.relation])))
			}
		}
	}
	
	async handleDrop(data, event, prepared) {
		let handled = false;
		let sort = this.hasPerk(data.perkID);
		
		if (prepared.dropZone && data.gearID) {
			if (data.parentArchetype == this.uuid) {
				switch(prepared.dropZone) {
					case "guaranteedGear":
						if (this.isGuaranteedGear(data.gearID)) sort = true
						else {
							await this.markAsGuaranteedGear(data.gearID);
							handled = true;
						}
						break;
					case "selectableGear":
						if (!this.isGuaranteedGear(data.gearID)) sort = true
						else {
							await this.removeFromGuaranteedGear(data.gearID);
							handled = true;
						}
						break;
				}
			}
		}
		
		if (sort) {
			const object = this.perksData[data.perkID] || this.gearData[data.gearID];
			const target = this.perksData[prepared.targetID.perkID] || this.gearData[prepared.targetID.gearID];

			if (object && target?.type == object.type) {
				let siblings = [];
				
				switch (object.type) {
					case "perk":
						siblings = Object.values(this.perksData);
						break;
					case "gear":
						siblings = Object.values(this.gearData);
						break;
				}

				if ((prepared.sortBefore || prepared.sortBefore == undefined) && object.sort < target.sort && !siblings.some(sibling => sibling.sort > object.sort && sibling.sort < target.sort)) prepared.sortBefore = false;
				if (prepared.sortBefore == undefined && !)

				const sorted = foundry.utils.performIntegerSort(object, {
					target: target,
					siblings: siblings,
					sortKey: "sort",
					sortBefore : prepared.sortBefore || prepared.sortBefore == undefined
				})
				
				switch (object.type) {
					case "perk":
						await this.update({system : {perks : {...Object.fromEntries(sorted.map(entry => ([entry.target._id, {sort : entry.update.sort}])))}}});
						break;
					case "gear":
						await this.update({system : {gear : {...Object.fromEntries(sorted.map(entry => ([entry.target._id, {sort : entry.update.sort}])))}}});
						break;
				}
				
				handled = true;
			}
			
		}
		
		if (!handled) {
			const object = prepared.object;
			//Default sheet drop
			if (!object) return handled;

			if(object.isPerk || object.isGear) {
				await this.addSubItem(object);
				handled = true;
			}
		}
		
		return handled;
	}
	
	prepareDragData(data, event) {
		data.parentArchetype = this.uuid;
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
						archetype: new DocumentIdField({required: true, blank: true, nullable: true}),
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