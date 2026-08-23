const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

import {virtualItem} from "./virtualItem.js";

const USESPEROPTIONS = ["passive", "act", "story", "custom"];

export class o13perkItem extends virtualItem {
	//Choose
	get isChosen() {
		const owner = this.parent;
		
		if (owner?.isPC) {
			return owner.hasPickedPerk(this.id);
		}
	}
	
	//Use
	async resetUses() {
		return this.update({system : {usesper : {value : this.system.usesper.max}}})
	}
	
	get usesPerOptions() {
		return USESPEROPTIONS;
	}
	
	get canBeUsed() {
		return (this.system.usesper.per != USESPEROPTIONS[0]);
	}
	
	get usesMax() {
		return this.system.usesper.max;
	}
	
	get hasMax() {
		return this.system.usesper.max != null
	}
	
	get usesLeft() {
		return this.system.usesper.value ?? 0;
	}
	
	async newAct() {
		if (this.system.usesper.per == "act") {
			await this.resetUses();
		}
	}
	
	async use() {
		if (this.canBeUsed && this.usesLeft > 0) {
			this.update({system : {usesper : {value : this.usesLeft - 1}}})
		}
	}
	
	//data preperation
	get enrichables() {
		return {
			description : this.system.description
		}
	}
}

export class perkDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			usesper:  new SchemaField({
				per : new StringField({ required: true, nullable: true, initial: "passive", choices: USESPEROPTIONS}),
				max : new NumberField({ required: true, integer: true, nullable: true, min: 1, initial: 1 }),
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