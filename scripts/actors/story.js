export class o13storyActor {
	//PCs
	get pcActors() {
		return this.system.pcs.map(pc => game.actors.get(pc.id)).filter(actor => actor?.isPC);
	}
	
	get pcCount() {
		return this.pcActors.length;
	}
	
	get pcliveCount() {
		return this.pcActors.filter(actor => !actor.isDead).length;
	}
	
	//archetypes
	get archetypes() {
		return [...this.items].filter(item => item.type == "archetype");
	}
	
	get availableArchetype() {
		return this.archetypes.filter(archetype => !this.pcActors.find(pc => pc.archetype == archetype));
	}
	
	//Aspects
	getArchetypeAspect(archetype) {
		archetype = archetype instanceof Item ? archetype : this.items.get(archetype);

		if (this.archetypes?.includes(archetype)) {
			return this.system.archetypeaspects[archetype.id];
		}
	}
}