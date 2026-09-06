const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField } = foundry.data.fields;

import {inventoryActor} from "./inventoryActor.js";

export class o13npcActor extends inventoryActor {
	//data preperation
	get enrichables() {
		return {
			description : this.system.description
		}
	}
}

export class npcDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, blank: true, initial: "" })
		};
	}
}