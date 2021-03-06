const fs = require('fs');
const util = require("util");
const path = require("path");
const utils = require("./utils");
const logger = require("../logger");
const mapping = require("../data/mapping.json");
const personal = require("../data/personal.json");

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

class Brain {
  constructor(path) {
    this.path = path;
    this.data = {};
    this.requestedAnswer = false;
    this.preferences = {
      i: personal.preferences || {}
    }
  }

  async init() {
    const content = await this.load();
    this.data = content;
  }

  async load() {
    const content = await readFile(path.join(__dirname, this.path), 'utf8');
    return JSON.parse(content);
  }

  async save() {
    await writeFile(path.join(__dirname, this.path), JSON.stringify(this.data), 'utf8');
  }

  async learn(file) {
    const content = await readFile(file, 'utf8');
    const results = await this.analyze(content, this.data, true);

    return results;
  }

  async reply(input, results) {
    logger.info(`Replying to "${results.contexts.join(' ')}"`);

    const keywords = [];

    const subject = Object.keys(mapping.subjects.schema).reduce((result, sbj) => {
      const subject = mapping.subjects.schema[sbj];
      const targetSubject = results.contexts.find(ctx => ctx.match(new RegExp(`^${sbj}$`, 'i')));
      const targetPossessiveSuject = results.contexts.find(ctx => ctx.match(new RegExp(`^${subject.possessive}$`, 'i')));

      if (targetSubject || targetPossessiveSuject) {
        result = subject;
        result.isPossessive = !!targetPossessiveSuject;
        result.key = sbj;
      }

      return result;
    }, null);

    logger.debug(`subject: ${subject ? JSON.stringify(subject) : subject}`);

    const question = mapping.questions.members.find(q => {
      return results.contexts.find(ctx => ctx.match(new RegExp(q, 'i')));
    }) || null;

    const greeting = mapping.greetings.members.find(q => {
      return results.contexts.find(ctx => ctx.match(new RegExp(q, 'i')));
    }) || null;

    logger.debug(`question: ${question}`);
    logger.debug(`greeting: ${greeting}`);


    if (greeting) {
      const greetingDefinition = mapping.greetings.schema[greeting];
      const response = greetingDefinition.feedbacks[
        Math.floor(greetingDefinition.feedbacks.length * Math.random())
      ];

      keywords.push(response)
    }

    if (subject) {
      if (this.requestedAnswer) {
        const _object = results.contexts.splice(-1).join(' ');

        if (!this.preferences[this.requestedAnswer.subject]) {
          this.preferences[this.requestedAnswer.subject] = {};
        }

        if (!this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object]) {
          this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object] = [];
        }

        const targetPrefence = this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object];

        targetPrefence.push(_object);
        keywords.push(`Nice! ${_object} it is.`);

        this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object] = targetPrefence;
        this.requestedAnswer = false;
      }

      if (!!question) {
        const _subject = mapping.subjects.schema[subject.target];

        // Possessive answer what 
        if (subject.isPossessive) {
          const _possessiveSubject = _subject.possessive;

          const _object = results.contexts.splice(
            results.contexts.indexOf(subject.possessive) + 1,
            results.contexts.length - 1
          ).join(' ');

          const _verb = results.contexts[results.contexts.indexOf(question) + 1];

          const _preferences = this.preferences[_subject.id] || {};
          const _answer = Object.keys(_preferences).reduce((prev, curr) => {
            const answerObject = _preferences[curr];
            const answerRegexp = new RegExp(curr, 'i');

            if (_object.match(answerRegexp)) {
              return answerObject.join(' and ');
            }

            return prev;
          }, null)

          logger.debug(`_possessiveSubject: ${_possessiveSubject}`);
          logger.debug(`_object: ${_object}`);
          logger.debug(`_verb: ${_verb}`);
          logger.debug(`_answer: ${_answer}`);

          if (_answer) {
            keywords.push(_possessiveSubject);
            keywords.push(_object);
            keywords.push(_verb);
            keywords.push(_answer);
          } else {
            keywords.push('I don\'t know.');
            keywords.push(question);
            keywords.push(_verb);
            keywords.push(_possessiveSubject);
            keywords.push(`${_object}?`);

            this.requestedAnswer = {
              subject: _subject.id,
              object: _object
            };
          }

        } else {
          const _subject = subject.target;
          const _object = results.contexts.splice(
            results.contexts.indexOf(subject.key) + 1,
            results.contexts.length - 1
          ).join(' ');

          logger.debug(`_subject: ${_subject}`);
          logger.debug(`_object: ${_object}`);

          keywords.push(_subject);
          keywords.push(_object);
        }
      }
    } else {
      if (this.requestedAnswer) {
        const _object = results.contexts.join('');

        if (!this.preferences[this.requestedAnswer.subject]) {
          this.preferences[this.requestedAnswer.subject] = {};
        }

        if (!this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object]) {
          this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object] = [];
        }

        const targetPrefence = this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object];

        targetPrefence.push(_object);
        keywords.push(`Nice! ${_object} it is.`);

        this.preferences[this.requestedAnswer.subject][this.requestedAnswer.object] = targetPrefence;
        this.requestedAnswer = false;
      }
    }

    const reply = keywords.join(' ');

    return reply || 'I don\'t know how to answer that yet...';
  }

  async process(input) {
    const commandLearnRegExp = /^learn\s+(.*)/;
    if (commandLearnRegExp.test(input)) {
      const filePath = commandLearnRegExp.exec(input)[1].trim();
      const result = await this.learn(filePath);

      return `I just learned about ${Object.keys(result.contexts).length} new words!`;
    }

    const result = await this.analyze(input, this.data, true);

    return this.reply(input, result);
  }

  async analyze(source, list = {}) {
    const contexts = [];
    const data = source.replace(/\s+/gmi, " ").split(/\.[\"|\']?/gmi).reduce((list, sentence) => {
      const words = sentence
        .split(/\s/)
        .map(word => utils.normalizeString(word).replace(/\W/gmi, '').toLowerCase())
        .filter(word => !!word && word !== 'constructor'); // Dummy JS parsing
  
        words.map(word => contexts.push(word))

      return list;
    }, list);

    return {
      data,
      contexts,
    };
  }
}

module.exports = Brain;