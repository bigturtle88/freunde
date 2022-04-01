/**
 * Freunde for LinkedIn
 * v 1.0
 *
 * @author Vyacheslav B
 */

const fs = require('fs');
const readline = require('readline');
const puppeteer = require('puppeteer');
const config = require('./config.json');

let parseFlag = true;
let timeId;
let delay = 1000;
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
let session = {};
try {
  session = require('./session.json');
} catch (err) {
  (async () => saveSession({}))();
}


/**
 * Main function
 * @param  {[type]} async [description]
 * @return {[type]}       [description]
 */
(async () => {


  console.log('Freunde - start');
  console.log(`Press any key to start - Press 'q' to quit`);

  let statusSession = await checkSession(session);
  if (!statusSession) { process.exit(); }
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    slowMo: 25,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await parseController(page);
  await signin(page);
  process.stdin.on('keypress', (str, key) => {
    if ( key.name == 'q') {
      (async () => {
        await page.close();
        await browser.close();
        process.exit();
      })();
    } else if (key.name) {

       parseController(page);

    } else {
      console.log(`Press any key to start - Press 'q' to quit`);
    }
  });



})();

async function saveSession(session) {
  await fs.writeFile('session.json', JSON.stringify(session), 'utf8', () => {
    console.log('Save session');
  });
}

async function parseController(page) {
  parseFlag = !parseFlag;
  if (parseFlag) {
  console.log('continue');
    timeId = setTimeout(parseSearchCards, delay, page);
  } else {
      console.log('stop');
       clearTimeout(timeId);

  }
}

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
 * Function parsing links to users in search
 * @param  {object} page Contains an object created by puppeteer
 * @param  {String} url Link of a search page
 * @param  {Object} done List of user that we have already visited
 * @return {Object} cards List of users we should visit
 */
async function parseSearchCards(page) {
  const linkedinUrl = config.url;
  let rawCards = {};
  if (await page.evaluate(() => {
      if (!document.querySelectorAll('.search-no-results__image-container')[0] &&
        !!document.querySelector('div.search-result__info > a.search-result__result-link')) {
        return true
      }
      return false;
    })) {
    await page.waitFor(timeRandom());
    await autoScroll(page);
    console.log('Search scroll');
    rawCards = Object.assign(await page.evaluate(({linkedinUrl}) => {
      let cards = {};

      for (let item of document.querySelectorAll('div.search-result__info > a.search-result__result-link')) {

        let key = item.href.replace(`${linkedinUrl}in/`, '');
        console.log(item.querySelectorAll('.actor-name')[0].innerHTML);
        cards[key] = item.querySelectorAll('.actor-name')[0].innerHTML;


      }

      return cards;
    },{linkedinUrl}), rawCards);
    let pageUrl = page.url();
    for (let key in rawCards) {
      let url = key;
      let fullname = rawCards[key];
      try {
          console.log(`${fullname} - ${linkedinUrl}in/${key}`);
          await connect(url, fullname, page);
          await incCount(session);
          if(!await checkSession(session)){

              break;

          }

      } catch (e) {
      console.log(`Error ${linkedinUrl}in/${key}`);

    }
    console.log(`Goto ${pageUrl}`);
      await page.goto(pageUrl);
    }


  }
  await autoScroll(page);
  if (await page.evaluate(() => {
      if (!!document.querySelector('button[aria-label="Next"]')) {
        if (document.querySelector('button[aria-label="Next"]').disabled) {
          return false;
        }
        return true;
      } else {
        return false;
      }
    })) {
    console.log('wait 1 minute!');
    await page.waitFor(30000);
    console.log('wait 30 sec!');
    await page.waitFor(30000);
    await page.click('button[aria-label="Next"]');
    await parseSearchCards(page);
  } else {
    await parseController(page);

  }

}

/**
 * Function generates a random number
 * @return {Number} number from 3000 to 4000
 */
function timeRandom() {
  console.log(`wait 3-4 sec`);
  return Math.floor(Math.random() * 1000) + 3000;
}

async function connect(url, fullname, page){
  let message = config.message;
  let arrName = fullname.split(' ');
  let name = arrName[0];
  let surname = arrName[1];
  let emailStatus = true;
  message = message.replace('{fullname}', fullname);
  message = message.replace('{name}', name);
  message = message.replace('{surname}', surname);

  const linkedinUrl = config.url;
  await page.goto(`${linkedinUrl}in/${url}`);
  await autoScroll(page);
  await page.keyboard.press('Home');
  await page.waitFor(timeRandom());
  await page.evaluate(() => {
       document.getElementsByClassName("pv-s-profile-actions--connect")[0].click();
    });
  await page.waitFor(timeRandom());
  await page.evaluate(() => {
      document.getElementsByClassName("artdeco-modal__actionbar")[0].getElementsByClassName("artdeco-button--secondary")[0].click();
  });
  await page.focus('#custom-message');
  await page.waitFor(timeRandom());

  emailStatus = await page.evaluate(() => {
      if (!document.querySelector('#email')) {
        return true
      }
      return false;
    })
  if(!emailStatus) { console.log('Email field found - exit');  throw new Error(); }

  await page.keyboard.type(message);
  await page.focus('button[aria-label="Send invitation"]');
  await page.click('button[aria-label="Send invitation"]');
}
async function incCount(session) {
  let date = new Date();
  let count = ++session[date.getMonth()][date.getDate()]['count'];
  console.log(`connect - ${count}`);
  await saveSession(session);
}

async function checkSession(session) {
  let date = new Date();

  if(date.getMonth() in session) {
    if(date.getDate() in session[date.getMonth()]) {

          if(session[date.getMonth()][date.getDate()]['count'] < config.count) {
              console.log(`Limit is good`);
              return true;

          }
          else {
            console.log(`Limit exceeded. Last visit: ${session['visit']}`);
              return false;
          }

    } else {
      if('visit' in session) {
      let visitDate = new Date(session['visit']);
      visitDate.setDate(visitDate.getDate() + 1);
      if(visitDate > date) {
        console.log(`Date is not good. Please wait. Last visit: ${session['visit']}`);
        return false;
      }
        console.log(`Date is good. Last visit: ${session['visit']}`);

      }
    }
  } else {

      session[date.getMonth()] = {};

  }

      session[date.getMonth()][date.getDate()] = {};
      session['visit'] = date;
      session[date.getMonth()][date.getDate()]['count'] = 0;
      await saveSession(session);
      console.log(`Save session: ${date}`);
      return true;
}
