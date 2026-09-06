export class inventoryActor {
	async removeGear(id) {
		let gear = this.items.get(id);
		
		if (gear?.isGear) {
			return this.deleteEmbeddedDocuments("Item", [id]);
		}
	}
	
	get gear() {
		let gear = this.items.filter(item => item.isGear).sort((a,b) => a.sort - b.sort);
		
		return Object.fromEntries(gear.map(item => [item.id, item]));
	}
	
	async createNewGear(data) {
		const gear = {name : game.i18n.localize("13omens.titles.gear"), ...data, type : "gear"};
		
		return this.createEmbeddedDocuments("Item", [gear]);
	}
	
	async geartoChatMessage(id, messageData = {}) {
		const gear = this.items.get(id);
		
		if (gear?.isGear) {
			gear.toChatMessage(messageData);
		}
	}
}