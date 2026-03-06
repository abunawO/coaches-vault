export class UploadQueue {
  constructor({ maxActive = 2 } = {}) {
    this.maxActive = maxActive;
    this.activeSlots = 0;
    this.waiters = [];
  }

  async acquire() {
    if (this.activeSlots < this.maxActive) {
      this.activeSlots += 1;
      return this.makeReleaser();
    }

    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.activeSlots += 1;
        resolve(this.makeReleaser());
      });
    });
  }

  makeReleaser() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeSlots = Math.max(0, this.activeSlots - 1);
      const next = this.waiters.shift();
      if (next) next();
    };
  }
}
