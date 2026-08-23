const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

import {virtualItem} from "./virtualItem.js";

export class o13gearItem extends virtualItem {
	//Quantity
	get quantityValue() {
		return this.system.quantity.value ?? this.system.quantity.max;
	}
	
	get quantityMax() {
		return this.system.quantity.max ?? Infinity;
	}
	
	get hasQuantityMax() {
		return this.quantityMax < Infinity;
	}

	async changeQuantity(change) {
		return this.update({system : {quantity : {value : Math.min(Math.max(0, this.quantityValue + change), this.quantityMax)}}});
	}
	
	async breakGear() {
		return this.changeQuantity(-1);
	}
	
	async repairGear() {
		return this.changeQuantity(1);
	}
	
	get completelyBroken() {
		return this.quantityValue <= 0;
	}
	
	//data preperation
	get enrichables() {
		return {
			description : this.system.description
		}
	}
}

export class gearDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			quantity: new SchemaField({
				max : new NumberField({ required: true, integer: true, nullable: true, min: 0, initial: 1 }),
				value : new NumberField({ required: true, integer: true, nullable: true, min: 0, initial: null })
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