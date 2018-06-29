var debounce = require('debounce')
var { Mixin } = require('mixwith-es5');
var defaults = require('defaults-es6/deep-merge');
const EventDelegator = require('es6-event-delegator');

function isVisible(el) {
    return !!((el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

function makeOffscreenObj() {
    return {
        topTop: true,
        topBottom: true,
        bottomTop: true,
        bottomBottom: true,
        leftLeft: true,
        leftRight: true,
        rightRight: true,
        rightLeft: true
    }
}

var scrollDelegator = new EventDelegator(window, 'scroll');
var resizeDelegator = new EventDelegator(window, 'resize');

module.exports = Mixin(WeddellComponent => class extends WeddellComponent {
    constructor(opts) {
        super(defaults(opts, {
            state: {
                offEdges: makeOffscreenObj(),
                viewportVisibilityBuffer: 0,
                //@TODO add adaptive buffer dependent on scroll delta
                isFullyInViewport: function(){
                    return this.offEdges && Object.values(this.offEdges).every(val => !val);
                },
                isInViewport: function(){
                    return this.offEdges && 
                        !(this.offEdges.topBottom ||
                        this.offEdges.leftRight ||
                        this.offEdges.rightLeft ||
                        this.offEdges.bottomTop);
                }
            }
        }))
    }
    
    onDOMCreateOrChange() {
        this.removeElementVisibilityListeners();
        this.addElementVisibilityListeners();
        this.checkViewportCollision();
    }

    onMount() {
        if (this.el) {
            this.checkViewportCollision();
        }
    }

    addElementVisibilityListeners(el=this.el) {
        scrollDelegator.addListener(this, this.checkViewportCollision.bind(this));
        resizeDelegator.addListener(this, debounce(this.checkViewportCollision.bind(this), 300));
    }

    removeElementVisibilityListeners() {
        scrollDelegator.removeListener(this);
        resizeDelegator.removeListener(this);
    }

    onUnmount() {
        this.removeElementVisibilityListeners();
        this.state.offEdges = makeOffscreenObj();
    }

    checkViewportCollision(evt) {
        if (!this.currPromise && this.el) {
            this.currPromise = (isVisible(this.el) ? Promise.resolve() : new Promise((resolve, reject) => {
                this.state.offEdges = makeOffscreenObj();
                var handle = setInterval(() => {
                    if (!this.el) {
                        return reject();
                    }
                    if (isVisible(this.el)) {
                        clearInterval(handle);
                        resolve();
                    }
                }, 500);
            }))
            .then(() => {
                delete this.currPromise;
                var rect = this.el.getBoundingClientRect();
                this.state.offEdges = {
                    topTop: rect.top < (0 - this.state.viewportVisibilityBuffer),
                    topBottom: rect.top > (window.innerHeight + this.state.viewportVisibilityBuffer),
                    bottomTop: rect.bottom < (0 - this.state.viewportVisibilityBuffer),
                    bottomBottom: rect.bottom > window.innerHeight,
                    leftLeft: rect.left < (0 - this.state.viewportVisibilityBuffer),
                    leftRight: rect.left > (window.innerWidth + this.state.viewportVisibilityBuffer),
                    rightRight: rect.right < (0 - this.state.viewportVisibilityBuffer),
                    rightLeft: rect.right > (window.innerWidth + this.state.viewportVisibilityBuffer)
                };
            }, () => {
                this.removeElementVisibilityListeners();
                delete this.currPromise;
            });
        }  
    }
})