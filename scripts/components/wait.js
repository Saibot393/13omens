export function o13WaitMixIn(baseClass) {
	return class o13Wait extends baseClass {
		constructor(...args) {
			super(...args);
			
			this._waitResolver = null;
			this._waitResolved = false;
		}
	
		async wait(render = false) {
			if (render && this.render) this.render(true);
			
			return new Promise((resolver) => {
				this._waitResolver = resolver;
			})
		}
		
		async _resolveWait(resolveValue, close = false) {
			if (!this._waitResolved && this._waitResolver) {
				this._waitResolved = true;
				this._waitResolver(resolveValue);
				
				if (close && this.close) await this.close();
			}
		}
		
		async close(...args) {
			if (!this._waitResolved) {
				this._resolveWait(null);
			}
			
			return super.close(...args);
		}
	}
}