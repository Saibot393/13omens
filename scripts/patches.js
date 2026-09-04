export function patch() {
	//for virtual items
	const oldAEupdate = ActiveEffect.prototype.update;
	ActiveEffect.prototype.update = async function(data = {}, options = {}) {
		if (this.parent?.isVirtualItem) {
			await this.parent.updateEmbeddedDocuments("ActiveEffect", [{...data, _id : this._id}], options);
			this.sheet?.render(false);
			return this;
		}
		
		//core fallback
		return oldAEupdate.call(this, data, options);
	};
}