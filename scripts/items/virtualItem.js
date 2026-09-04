export class virtualItem {
	//virtual items can be imbedded in archetypes, so basically gear and perks, make sure they have an origin in their data model, otherwise oh oh
	
	//basics
	get hasParentAchetype() {
		return Boolean(this.system.origin.parentArchetype);
	}
	
	get parentArchetype() {
		const parentUUID = this.system.origin.parentArchetype;
		
		return fromUuidSync(parentUUID);
	}
	
	get isVirtualItem() {
		return this.hasParentAchetype && !this.parent;
	}
	
	get originID() {
		return this.system.origin.id
	}
	
	get isArchetypeOrigin() {
		return Boolean(this.system.origin?.id && this.system.origin?.parentArchetype);
	}	
	
	isFromOrigin(originid) {
		return this.originID == originid;
	}
	
	get parentArchetype() {
		if (this.isPerk || this.isGear) {
			const uuid = this.system.origin.parentArchetype;
			
			if (uuid) {
				const archetype = fromUuidSync(uuid);
				
				if (archetype.isArchetype) {
					return archetype;
				}
			}
		}
	}
	
	isFromArchetype(archetype) {
		if (this.isPerk && this.isGear) {
			return this.system.origin.parentArchetype == archetype?.id;
		}
	}
	
	//overwrites
	async update(data={}, options={}) {
		if (this.hasParentAchetype && !this.parent) {
			await this.parentArchetype.updateSubItem(this.originID, data);
			
			let source = {}
			
			switch (this.type) {
				case "perk" : source = this.parentArchetype.perksData[this.id]; break;
				case "gear" : source = this.parentArchetype.gearData[this.id]; break;
			}
			
			this.updateSource(source);
			
			for (const id of [...this.effects.keys()].filter(key => !source.effects.find(entry => entry._id == key))) {
				this.effects.delete(id);
			}
			
			this.sheet?.render(false);
            return this;
		}
		
		return this.superPD.update(data, options);
	}

	async createEmbeddedDocuments(embeddedName, data = [], operation = {}) {
		if (this.isVirtualItem) {
			if (embeddedName == "ActiveEffect") {
				const currentCollection = [...this.effects];
				
				if (currentCollection) {
					for (const d of data) if (d._id == undefined) d._id = foundry.utils.randomID();
					
					const newCollection = currentCollection.concat(data);
					
					await this.update({effects : newCollection});
				}
			}
		}
		else {
			return this.superPD.createEmbeddedDocuments(embeddedName, data, operation);
		}
	}
	
	async updateEmbeddedDocuments(embeddedName, data = [], operation = {}) {
        if (this.isVirtualItem) {
            if (embeddedName == "ActiveEffect") {
                const currentCollection = this.toObject().effects || [];
                
				if (currentCollection) {
					const newCollection = currentCollection.map(effect => {
						const update = data.find(d => d._id == effect._id);
						return update ? foundry.utils.mergeObject(effect, update) : effect;
					})
					
					await this.update({ effects: newCollection });
				}
            }
        }
        else {
            return this.superPD.updateEmbeddedDocuments(embeddedName, data, operation);
        }
    }
	
	async deleteEmbeddedDocuments(embeddedName, data = [], operation = {}) {
		if (this.isVirtualItem) {
			if (embeddedName == "ActiveEffect") {
				const currentCollection = [...this.effects];
				
				if (currentCollection) {
					const newCollection = currentCollection.filter(effect => !data.includes(effect.id))
					
					await this.update({effects : newCollection});
				}
			}
		}
		else {
			return this.superPD.deleteEmbeddedDocuments(embeddedName, data, operation);
		}
	}
}