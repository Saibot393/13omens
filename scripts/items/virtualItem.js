export class virtualItem {
	//virtual items can be imbedded in archetypes, so basically gear and perks, make sure they have an origin in their data model, otherwise oh oh
	
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
	
	async update(data={}, options={}) {
		if (this.hasParentAchetype && !this.parent) {
			await this.parentArchetype.updateSubItem(this.originID, data);
			
			switch (this.type) {
				case "perk" : this.updateSource(this.parentArchetype.perksData[this.id]); break;
				case "gear" : this.updateSource(this.parentArchetype.gearData[this.id]); break;
			}
			
			this.sheet?.render(false);
            return this;
		}
		
		return super.update(data, options);
	}
}