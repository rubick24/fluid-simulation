
export default class TouchInput {
  public updateRate: number = 1000/60 //ms
  public touchList: Touch[] = []
  public lastTouchList: Touch[] = []
  private innerTouchList: Touch[] = []
  private raf = 0
  private t = performance.now()
  constructor(public el: HTMLElement, options?: { updateRate?: number}) {
    if (options) {
      if (options.updateRate !== undefined) {
        this.updateRate = options.updateRate
      }
    }

    const touchStart = (e: TouchEvent) => {
      this.innerTouchList = Array.from(e.touches)
    }
    const touchMove = (e: TouchEvent) => {
      this.innerTouchList = Array.from(e.touches)
    }
    const touchEnd = (e: TouchEvent) => {
      this.innerTouchList = Array.from(e.touches)
    }

    el.addEventListener('touchstart', touchStart, { passive: true })
    el.addEventListener('touchmove', touchMove, { passive: true })
    el.addEventListener('touchend', touchEnd, { passive: true })

    let lastT = 0
    const af = (t: number) => {
      if (t - lastT > this.updateRate) {
        lastT = t
        this.lastTouchList = this.touchList
        this.touchList = this.innerTouchList
      }
      requestAnimationFrame(af)
    }
    this.raf = requestAnimationFrame(af)
  }
}
