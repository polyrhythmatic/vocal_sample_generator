const googleTranslate = require("google-translate-api");
const exec = require("child_process").exec;
const mkdirp = require("mkdirp");
const async = require("async");
const fs = require("fs");
const speakers = JSON.parse(fs.readFileSync("./languages.json"));
const languages = Object.keys(speakers);

var sentences = fs.readFileSync("./date_periods.txt").toString();
var words = sentences.split("\n");

var counter = 0;
var translations = JSON.parse(fs.readFileSync("translations.json", "utf8"));

let say = function(word, speaker, lang, origWord, cb) {
  const langDir = lang.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/g,"_");
  const wordDir = origWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/g,"_");

  console.log(wordDir);
  exec(`say -v ${speaker.name} -o ./test/${langDir}/${speaker.name}_${wordDir}.aiff "${word}"`, (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`)
      return;
    }
    if (stdout) console.log(`stdout: ${stdout}`);
    if (stderr) console.log(`stderr: ${stderr}`);
    console.log(counter);
    counter++;
    if (cb) cb();
  });
}

let translate = function(word, lang, cb) {
  if(translations[word] !== undefined && translations[word][lang]){
    speakers[lang].forEach((speaker) => {
      sayTasks.push((callback) => {
        say(translations[word][lang], speaker, lang, word, callback)
      });
    });
    process.nextTick(function(){
      cb();
    });
  } else{
    console.log("api")
    const code = googleTranslate.languages.getCode(lang);
    if (code === false) console.error(`${lang} is not supported`);
    googleTranslate(word, { from: "en", to: code }).then(res => {
      // console.log(word.replace(/ /g, "_"))
      // console.log(res.text);
      if(translations[word] == undefined) translations[word] = {};
      translations[word][lang] = res.text;
      speakers[lang].forEach((speaker) => {
        sayTasks.push((callback) => {
          say(res.text, speaker, lang, callback)
        });
      });
      cb();
    }).catch(err => {
      console.error(err);
    });
  }
}


var tasks = [];
var sayTasks = [];

words.forEach((word) => {
  languages.forEach((language) => {
    const langDir = language.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/g,"_");
    mkdirp.sync(`./test/${langDir}`);
    tasks.push((callback) => {
      // console.log("task started")
      translate(word, language, callback);
    });
  })
})

async.parallelLimit(tasks, 10, function(){
  console.log("Done first task");
  fs.writeFileSync("translations.json", JSON.stringify(translations), "utf8");
  async.parallelLimit(sayTasks, 10, function(){
    console.log("Done audio generation");
  })
})