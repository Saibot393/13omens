const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

import {virtualItem} from "./virtualItem.js";

export class o13perkItem extends virtualItem {
	//Choose
	get isChosen() {
	}
	
	//Use
	resetUses() {
	}
}

export class perkDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			usesper:  new SchemaField({
				filled : new StringField({ required: true, nullable: true, initial: "passive", choices: ["passive", "act", "story"]}),
				max : new NumberField({ required: true, integer: true, nullable: true, min: 1, initial: null }),
				value : new NumberField({ required: true, integer: true, nullable: true, min: 0, initial: null })
			}),
			
			used : new SchemaField({
				story : new SchemaField({
					uses : new NumberField({ required: true, integer: true, min: 0, initial: 0 })
				}),
				
				acts : new ArrayField(new SchemaField({
					uses : new NumberField({ required: true, integer: true, min: 0, initial: 0 })
				}), {initial: () => Array.from({length : 4}, () => ({uses : 0}))})
			}),
			
			origin: new SchemaField({
				id: new DocumentIdField({required: false, nullable: true, initial: null}),
				parentArchetype: new DocumentUUIDField({required: false, nullable: true, initial: null})
			})
		};
	}
	
	prepareDerivedData() {
		
	}
}