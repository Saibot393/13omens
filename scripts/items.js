export class o13Item extends Actor {
	get isArchetype() {
		return this.type == "archetype";
	}
	
	get storyActor() {
		if (this.isArchetype) {
			if (this.parent?.type == "story") {
				return this.parent;
			}
		}
	}
	
	get archetypeAspect() {
		if (this.isArchetype) {
			return this.storyActor?.getArchetypeAspect(this);
		}
	}
}