export class disPatcher {
	/*	The disPatcher patches dis
		dis being document classes, as FoundryVTT only allows once class per actor/item/et.c. document and i do not like using the data models for functions/getters/setter etc.,
		this class will allow for seperate type dependent document types to be written and then be patched into the base class
		The following is either smart js usage or abuse of it, your choice
	*/
	
	static patch(documentClass) {
		class patched extends documentClass {
			get isDisPatched() {
				return true;
			}
		}
		
		if (patched._disPatchInfo) {		
			//patches
			const typePatches = patched._disPatchInfo.typePatches;
						
			const types = Object.keys(typePatches).filter(key => typeof typePatches[key] === "function" && documentClass.prototype.isPrototypeOf(typePatches[key].prototype));
			
			if (types.length != Object.keys(typePatches).length) {
				console.error(`disPatcher has encountered problem while patching a document class: The following classes can not be patched onto the provided document class`, documentClass, Object.keys(typePatches).filter(key => !types.includes(key)));
			}
			
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
					
					if (!targetTypes.length) {
						console.error(`disPatcher has encountered problem while patching a document class: Key "${pKey}" does not have a patchable property type, skipping Key`, patched);
						continue;
					}
					
					const allEqual = targetTypes.every(target => target === targetTypes[0]);
					
					if (!allEqual) {
						console.error(`disPatcher has encountered problem while patching a document class: Not all patch entries of key "${pKey}" are of the same type, types are:`, targetTypes, `skipping Key`, patched);
						continue;
					}

					//apply descriptors
					switch (targetTypes[0]) {
						case "function":
							const pdFunction = patched.prototype[pKey];
							
							Object.defineProperty(patched.prototype, pKey, {
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
							const pdDescriptor = Object.getOwnPropertyDescriptor(patched.prototype, pKey);
						
							Object.defineProperty(patched.prototype, pKey, {
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
		
		return patched;
	}
}