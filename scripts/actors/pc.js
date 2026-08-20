export class o13pcActor {
	//archetypes
	get archetypes() {
		return this.storyActor?.archetypes;
	}
	
	get availableArchetype() {
		return this.storyActor ? (this.archetype ? [this.archetype, ...this.storyActor.availableArchetype] : this.storyActor.availableArchetype) : [];
	}
	
	get archetype() {
		const archetype = this.storyActor?.items.get(this.system.archetype);
		
		return archetype?.type == "archetype" ? archetype : undefined;
	}
	
	//Perks
	getPerks(filterpicked = false) {
		let perks = this.items.filter(item => item.isPerk);
		
		if (filterpicked) {
			perks = perks.filter(perk => this.system.pickedperks[perk.id]);
		}
		
		return Object.fromEntries(perks.map(perk => [perk.id, perk]));
	}
	
	async removePerk(id) {
		const perk = this.items.get(id);
		
		if (perk?.isPerk) {
			return this.deleteEmbeddedDocuments("Item", [id]);
		}
	}
	
	get perks() {
		return this.getPerks();
	}
	
	//Gear
	async removeGear(id) {
		let gear = this.items.get(id);
		
		if (gear?.isGear) {
			return this.deleteEmbeddedDocuments("Item", [id]);
		}
	}
	
	get gear() {
		let gear = this.items.filter(item => item.isGear);
		
		return Object.fromEntries(gear.map(item => [item.id, item]));
	}
	
	//Select gear (from archetype)
	get selectableGearCount() {
		if (this.isPC) {
			return this.archetype?.selectableGearCount ?? 0;
		}
	}
	
	hasGearSelected(originid) {
		return this.inventory.some(gear => gear.isFromOrigin(originid));
	}
	
	get selectableGearInfo() {
		const selectableGear = this.archetype?.unguaranteedGear;
		
		if (selectableGear) {
			return Object.fromEntries(Object.keys(selectableGear).map(id => [id, {name : selectableGear[id].name, selected : this.hasGearSelected(id), id : id}]));
		}
		
		return {};
	}
	
	toggleSelectGear(originid) {
		if (this.hasGearSelected(originid)) {
			const matchingGear = this.inventory.find(gear => gear.isFromOrigin(originid));

			if (matchingGear) {
				this.deleteEmbeddedDocuments("Item", [matchingGear.id])
			}
		}
		else {
			const gearData = this.archetype?.unguaranteedGear[originid];

			if (gearData) {
				this.createEmbeddedDocuments("Item", [gearData]);
			}
		}
	}
	
	//Aspects
	getArchetypeAspect(archetype) {
		return this.storyActor?.getArchetypeAspect(archetype);
	}
	
	get archetypeAspect() {
		return this.getArchetypeAspect(this.archetype);
	}
}