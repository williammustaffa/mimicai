const Brain = require('./Brain');

class AI {
  constructor() {
    this.data = [];
    this.ready = false;

    this.brain = new Brain('./brain.json')

    this.init();
  } 

  async init() {
    await this.brain.init();
    this.ready = true;
  }

  process(input) {
    return new Promise(async (resolve) => {
      if (!this.ready) {
        resolve('Wait... I still loading my data!');
        return;
      }

      const result = await this.brain.process(input)

      resolve(result);
    });
  }
}

module.exports = AI;