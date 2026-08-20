export class utils {
	static randomPermut(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			
			[array[i], array[j]] = [array[j], array[i]];
		}
		
		return array;
	}

	static counttobag(count) {
		let bag = [];
		
		for (let key of Object.keys(count)) {
			for (let i = 1; i <= count[key]; i++) {
				bag.push(key);
			}
		}
		
		return bag;
	}
	
	static expandRollData(data) {
		data.flaws = data.flaws.map(flaw => typeof flaw == "string" ? {name : flaw} : flaw)
	}
}