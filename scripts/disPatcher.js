export class disPatcher {
	/*	The disPatcher patches dis
		dis being document classes, as FoundryVTT only allows once class per actor/item/et.c. document and i do not like using the data models for functions/getters/setter etc.,
		this class will allow for seperate type dependent document types to be written and then be patched into the base class, super methods that are overwritten will be stored in superPD
		The following is either smart js usage or abuse of it, your choice
	*/
	
	static patch(documentClass) {
		if (documentClass._disPatchInfo) {
			//super PD
			const superPD = documentClass._disPatchInfo.superPD; //pre dispatch super function to be saved, can later be refered to as superPD.xyz instead of super.xyz, usefull when overwriting base methods
			
			const superPDFunctions = {};
			
			for (const pd of superPD) {
				let currentProto = documentClass.prototype;
				let pdFunction;

				while (currentProto && !pdFunction) {
					pdFunction = Object.getOwnPropertyDescriptor(currentProto, pd);
					if (!pdFunction) currentProto = Object.getPrototypeOf(currentProto);
				}

				if (pdFunction && typeof pdFunction.value == "function") {
					superPDFunctions[pd] = pdFunction.value;
				} else {
					console.warn(`disPatcher has not foundry an function for "${pd}" in the prototype chain`, documentClass);
				}
			}
		
			Object.defineProperty(documentClass.prototype, "superPD", {
				get() {
					const instance = this;
					return new Proxy(superPDFunctions, {
						get(target, sFunction) {
							const baseMethod = target[sFunction];
							
							if (!baseMethod) return undefined;
							
							return baseMethod.bind(instance);
						}
					});
				},
				configurable: true
			});
			
			//patches
			const typePatches = documentClass._disPatchInfo.typePatches;
						
			const types = Object.keys(typePatches).filter(key => typeof typePatches[key] === "function" /*&& documentClass.prototype.isPrototypeOf(typePatches[key].prototype)*/);
			
			if (types.length) {
				const descriptors = {};
				let propertyKeys = [];
				
				
				for (const type of types) {
					//traverse all extended prototypes to make sure all properties are included
					descriptors[type] = {};
					let currentProto = typePatches[type].prototype;
					
					while (currentProto && currentProto !== Object.prototype && currentProto !== documentClass.prototype) {
						const currentDescriptors = Object.getOwnPropertyDescriptors(currentProto);

						for (const [key, descriptor] of Object.entries(currentDescriptors)) {
							if (!(key in descriptors[type])) {
								descriptors[type][key] = descriptor;
							}
						}

						currentProto = Object.getPrototypeOf(currentProto);
					}

					propertyKeys = [...propertyKeys, ...Object.keys(descriptors[type])];
				}
				
				const uniqueKeys = new Set(propertyKeys);
				
				for (const pKey of uniqueKeys) {
					//patch preperations
					if (pKey == "constructor") continue; //lets not do this
					
					const patches = {};
					let targetTypes = [];
					
					for (const type of types) {
						patches[type] = descriptors[type][pKey];
						
						if (patches[type]) {
							if (typeof patches[type].value === "function") {
								targetTypes.push("function")
							}
							if (typeof patches[type].get === "function" || typeof patches[type].set === "function") {
								targetTypes.push("getset")
							}
						}
					}
					
					console.log(targetTypes);
					
					if (!targetTypes.length) {
						console.error(`disPatcher has encountered problem while patching a document class: Key "${pKey}" does not have a patchable property type, skipping Key`, documentClass);
						continue;
					}
					
					const allEqual = targetTypes.every(target => target === targetTypes[0]);
					
					if (!allEqual) {
						console.error(`disPatcher has encountered problem while patching a document class: Not all patch entries of key "${pKey}" are of the same type, types are:`, targetTypes, `skipping Key`, documentClass);
						continue;
					}

					//apply descriptors
					switch (targetTypes[0]) {
						case "function":
							const pdFunction = documentClass.prototype[pKey];
							
							Object.defineProperty(documentClass.prototype, pKey, {
								value : function(...args) {
									if (patches[this.type]?.value) {
										return patches[this.type].value.call(this, ...args);
									}
									
									if (pdFunction) {
										return pdFunction.call(this, ...args);
									}
								},
								configurable: true,
								writable: true
							});
							break;
						case "getset": 
							const pdDescriptor = Object.getOwnPropertyDescriptor(documentClass.prototype, pKey);
						
							Object.defineProperty(documentClass.prototype, pKey, {
								get() {
									if (patches[this.type]?.get) {
										return patches[this.type].get.call(this)
									}
									
									if (pdDescriptor?.get) {
										return pdDescriptor.get.call(this);
									}
								},
								set(arg) {
									if (patches[this.type]?.set) {
										return patches[this.type].set.call(this, arg)
									}
									
									if (pdDescriptor?.set) {
										return pdDescriptor.set.call(this, arg);
									}
								},
								configurable: true
							});
							break;
					}
				}
			}
		}
	}
}