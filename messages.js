/**
 * Messages for LinkedIn
 * v 1.0
 *
 * @author Vyacheslav B
 */

const fs = require('fs');
const readline = require('readline');
const puppeteer = require('puppeteer');
const config = require('./config.json');
const csv = require('csv-parser');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
const results = [];

let session ={};
/**
 * Main function
 * @param  {[type]} async [description]
 * @return {[type]}       [description]
 */
(async () => {


  console.log('Freunde - start');
  console.log(`Press any key to start - Press 'q' to quit`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    slowMo: 25,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  await signin(page);

  await  fs.createReadStream('url.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
    });

  process.stdin.on('keypress', (str, key) => {
    if ( key.name == 'q') {
      (async () => {
        await page.close();
        await browser.close();
        process.exit();
      })();
    } else if (key.name) {

        messages(page, results);

    } else {
      console.log(`Press any key to start - Press 'q' to quit`);
    }
  });



})();


/**
 * Function for signin in Linkedin
 * @param  {Object} page Contains an object created by puppeteer
 */
async function signin(page) {
  await page.goto(config.url);
  console.log(`Please signin in ${config.url}`);
}


/**
 * Function scroll
 * @param  {Object} page Contains an object created by puppeteer
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const { scrollHeight } = document.body;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 250);
    });
  });
}


/**
 * Function generates a random number
 * @return {Number} number from 3000 to 4000
 */
function timeRandom() {
  console.log(`wait 3-4 sec`);
  return Math.floor(Math.random() * 1000) + 3000;
}

async function messages (page, url) {
let messageCount = 0;

for (let item of url) {
  let message = config.message;
try {
if(messageCount > config.count) { break;}
  const linkedinUrl = config.url;
  let mUrl = item.url;
  mUrl = mUrl.replace(`${linkedinUrl}in/`, '');
  console.log(mUrl);
  await page.goto(`${linkedinUrl}in/${mUrl}`);
let fullname;
fullname = await page.evaluate(() => {
     if(document.querySelector('.break-words').outerText) {
       return document.querySelector('.break-words').outerText
     } else return 'Friend'
  });

let arrName = fullname.split(' ');
let name = arrName[0];
let surname = arrName[1];

message = message.replace('{fullname}', fullname);
message = message.replace('{name}', name);
message = message.replace('{surname}', surname);

    await autoScroll(page);
    await page.keyboard.press('Home');
    await page.evaluate(() => {
          document.getElementsByClassName("pv-s-profile-actions--message")[0].click();
    });
    await page.focus('.msg-form__msg-content-container--scrollable');
    await page.keyboard.type(message);
    await page.waitFor(timeRandom());
    await page.focus('button[data-control-name="send"]');
    await page.click('button[data-control-name="send"]');
    messageCount++;
    console.log(`Message ${messageCount}`);
    await page.waitFor(timeRandom());
  }
  catch(e) {
      console.log(`Error`);
  }
}


}
