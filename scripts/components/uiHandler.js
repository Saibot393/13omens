export function o13uiHandlerMixin(base) {
    return class o13uiHandler extends base {
        constructor(options = {}) {
            super(options);

            this._boundonAction = this._onAction.bind(this);
        }

        async _onRender(context, options) {
            this.element.removeEventListener("click", this._boundonAction)
            this.element.addEventListener("click", this._boundonAction);

            //tabs
            const html = this.element;
            html.querySelectorAll("nav.o13-nav").forEach(nav => {
                const group = nav.getAttribute("nav-group");

                nav.querySelectorAll("a[nav-tab]").forEach(a => {
                    const tab = a.getAttribute("nav-tab");

                    a.addEventListener("click", (event) => {
                        this._activateo13Tab(group, tab)
                    })
                })

                if (!nav.querySelector("a[nav-tab].active")) {
                    const tab = nav.querySelector("a[nav-tab]").getAttribute("nav-tab");

                    this._activateo13Tab(group, tab);
                }
            })
        }

        async _activateo13Tab(group, tab, fallback = true) {
            const html = this.element;

            if (html.querySelector(`nav.o13-nav[nav-group="${group}"]`)?.querySelector(`a[nav-tab="${tab}"]`)) {
                html.querySelector(`nav.o13-nav[nav-group="${group}"]`)?.querySelectorAll("a[nav-tab]").forEach(a => {
                    a.classList.toggle("active", a.getAttribute("nav-tab") == tab);
                })

                html.querySelectorAll(`section.o13-tab[nav-group="${group}"]`).forEach(section => {
                    section.classList.toggle("active", section.getAttribute("nav-tab") == tab);
                })
            }
            else {
                if (fallback) {
                    const fallback = html.querySelector(`nav.o13-nav[nav-group="${group}"]`)?.querySelector(`a[nav-tab]`);

                    const fallbbackTab = fallback?.getAttribute("nav-tab");

                    if (fallbbackTab) {
                        this._activateo13Tab(group, fallbbackTab, false);
                    }
                }
            }
        }

        async _replaceHTML(result, content, options) {
            //scrollables persistance
            const scrollCache = {};
            if (this.element) {
                const scrollables = this.element.querySelectorAll("[scroll-id]");
                for (const el of scrollables) {
                    const id = el.getAttribute("scroll-id");
                    if (id) {
                        scrollCache[id] = { top: el.scrollTop, left: el.scrollLeft };
                    }
                }
            }

            //tabs persistance
            const tabCache = {}
            if (this.element) {
                const tabs = this.element.querySelectorAll("nav.o13-nav[nav-group]");
                for (const el of tabs) {
                    const tab = (el.querySelector("a[nav-tab].active") || el.querySelector("a[nav-tab]"))?.getAttribute("nav-tab");

                    if (tab) {
                        tabCache[el.getAttribute("nav-group")] = tab;
                    }
                }
            }

            //input focus persistance
            const activeInputCache = {}
            if (this.element?.contains(document.activeElement)) {
                const active = document.activeElement;

                const name = active.getAttribute("name");
                if (name) {
                    activeInputCache.name = name;
                    activeInputCache.selectionStart = active.selectionStart;
                    activeInputCache.selectionEnd = active.selectionEnd;
                    activeInputCache.selectionDirection = active.selectionDirection;
                }
            }

            //textarea height persistance
            const textAreaHeights = {};
            if (this.element) {
                const textAreas = this.element.querySelectorAll("textarea[name]");

                for (const el of textAreas) {
                    const name = el.getAttribute("name");

                    if (name && el.style?.height) {
                        textAreaHeights[name] = el.style.height;
                    }
                }
            }

            await super._replaceHTML(result, content, options);

            //scrollables persistance
            if (this.element) {
                const newScrollables = this.element.querySelectorAll("[scroll-id]");
                for (const el of newScrollables) {
                    const id = el.getAttribute("scroll-id");
                    const saved = scrollCache[id];

                    if (saved) {
                        requestAnimationFrame(() => {
                            el.scrollTop = saved.top;
                            el.scrollLeft = saved.left;
                        });
                    }
                }
            }

            //tabs persistance
            for (const group of Object.keys(tabCache)) {
                this._activateo13Tab(group, tabCache[group]);
            }

            //input focus persistance
            if (activeInputCache.name) {
                const toActive = this.element.querySelector(`[name="${activeInputCache.name}"]`);
                if (toActive) {
                    toActive.focus();
                    if (activeInputCache.selectionStart != null && typeof toActive.setSelectionRange == "function") {
                        try {
                            toActive.setSelectionRange(activeInputCache.selectionStart, activeInputCache.selectionEnd, activeInputCache.selectionDirection);
                        } catch(e) {};
                    }
                }
            }

            //textarea height persistance
            for (const key of Object.keys(textAreaHeights)) {
                const textarea = this.element.querySelector(`textarea[name="${key}"]`);

                if (textarea) {
                    textarea.style.height = textAreaHeights[key];
                }
            }
        }

        async _onAction(event) {
            const target = event?.target?.closest("[data-action]");
            const action = target?.getAttribute("data-action");

            if (!action) return;

            event.stopPropagation();

            if (this.constructor.DEFAULT_OPTIONS?.actions?.[action]) return; //other defined sheets action, let foundry handle it

            if (typeof this[action] == "function") return this[action](event, target); //equally named sheet action

            if (typeof this.document?.[action] == "function") return this.document?.[action](); //equally named document action

            //some default foundry actions are not handled here:
            if (!["save"].includes(action))console.warn(`Unhandled sheet action ${action} at click:`, target);
        }
    }
}