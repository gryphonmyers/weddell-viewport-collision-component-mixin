const debounce = require('debounce')
const { Mixin } = require('mixwith-es5');

function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

module.exports = Mixin(WeddellComponent => class extends WeddellComponent {
    constructor(opts) {
        super(defaults(opts, {
            state: {
                offEdges: {
                    topTop: true,
                    topBottom: true,
                    bottomTop: true,
                    bottomBottom: true,
                    leftLeft: true,
                    leftRight: true,
                    rightRight: true,
                    rightLeft: true
                },
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
    
    onDOMCreate() {
        new Promise(resolve => {
            var handle = setInterval(() => {
                if (isVisible(this.el)) {
                    clearInterval(handle);
                    resolve();
                }
            }, 1000);
        })
        .then(() => {
            this.addElementVisibilityListeners();
        })
    }

    onMount() {
        if (this.el && !this.checkViewportCollision) {
            this.addElementVisibilityListeners();
        }
    }

    addElementVisibilityListeners() {
        window.addEventListener('scroll', this.checkViewportCollision = evt => {
            if (isVisible(this.el)) {
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
            } else {
                this.reset();
            }      
        });
        window.addEventListener('resize', this.checkViewportCollisionDebounced = debounce(this.checkViewportCollision.bind(this), 300));
        this.checkViewportCollision();
    }

    removeElementVisibilityListeners() {
        if (this.checkViewportCollision) {
            window.removeEventListener('scroll', this.checkViewportCollision);
            window.removeEventListener('resize', this.checkViewportCollisionDebounced);
            delete this.checkViewportCollision;
            delete this.checkViewportCollisionDebounced;
        }   
    }

    reset() {
        this.state.offEdges = {
            topTop: true,
            topBottom: true,
            bottomTop: true,
            bottomBottom: true,
            leftLeft: true,
            leftRight: true,
            rightRight: true,
            rightLeft: true
        };
    }

    onUnmount() {
        this.removeElementVisibilityListeners();
        this.reset();
    }
})