const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField } = foundry.data.fields;

import {inventoryActor} from "./inventoryActor.js";

export class o13npcActor extends inventoryActor {
	//data preperation
	get enrichables() {
		return {
			description : this.system.description
		}
	}
	
	//looting & description
	get lootable() {
		return this.system.lootable;
	}
	
	get revealDescription() {
		return this.system.revealdescription;
	}
	
	get freeView() {
		return this.lootable || this.revealDescription;
	}
}

export class npcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, blank: true, initial: "" }),
			
			lootable : new BooleanField({ required: true, initial: false}),
			revealdescription : new BooleanField({ required: true, initial: false})
		};
	}
}