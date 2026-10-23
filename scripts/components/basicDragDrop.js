const { DragDrop } = foundry.applications.ux;

export function o13BasicDragDropMixin(base)  {
    return class o13BasicDragDrop extends base {
        #dragDropHandler = new DragDrop({
            dragSelector : ".draggable",
            dropSelector : ".dropArea",
            callbacks : {
                drop: event => this._onDrop?.(event),
                dragstart: event => this._onDragStart?.(event)
            }
        })

        _onRender(context, options) {
            super._onRender(context, options);
            this.#dragDropHandler.bind(this.element);
        }
    }
}