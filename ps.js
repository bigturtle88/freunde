const program = require('commander');
const fs = require('fs');
const http = require('http');
const csv = require('csv-parser');
const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const loc = require('./usloc.json');
const local_news = "local news";
const csvWriter = createCsvWriter({
    path: 'out.csv',
    header: [
      {id: 'id', title: 'id'},
      {id: 'url', title: 'url'},
    ]
  });
(async () => {
    let rss = [];
const browser = await puppeteer.launch({ headless: false,
    defaultViewport: null,
    slowMo:20,
    args: ['--no-sandbox']});

const page = await browser.newPage();

for( var element of loc ) {
try {
    page.goto(`https://www.google.com/`);
    console.log(`${element.name}`)

    await page.waitForSelector("input[name=q]");
    await page.click("input[name=q]");
    await page.type("input[name=q]", `${local_news} ${element.name}`);
    await page.focus(`input[name="btnK"]`)
    await page.click(`input[name="btnK"]`)
    await page.waitForSelector(`div[class="g"]`);
        var rawRss = await page.evaluate(function(){
        let r = [];
        let arrRaw = document.querySelectorAll('.g');
       for (let one of arrRaw) { 
            one.innerText.toLowerCase().indexOf('local') < 0 ? '' : r.push(one.querySelector('a').href)
       }
       console.log(r)
        return r

    })
     await page.waitFor(20000);
 
    console.log(rawRss)
    } catch (err) {}
    rawRss = rawRss.map(i=>{
        return {id: element.id, url:i }
    });
    rss.concat(rawRss)
    console.log(rss)
    csvWriter
  .writeRecords(  rss.concat(rawRss))
  .then(()=> console.log('The CSV file was written successfully'));
}
})();
