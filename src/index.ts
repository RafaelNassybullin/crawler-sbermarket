import puppeteer from "puppeteer";
import fs from "fs";
import { v4 as uuid } from "uuid";
import { toCsv } from "@iwsio/json-csv-node";
import { options } from "./configs";
import axios from "axios";

let browser: any;
(async () => {
  const browser = await puppeteer.launch({ headless: false });

  const response = await fetch("http://192.168.3.89:5001/get_goods_for_parse");
  const { data } = await response.json();
  // tsc && pm2 start ./build/index.js --max-memory-restart 10000 --name node-speech2
  // tsc && node ./build/index.js 
  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080
    });

    const name = uuid();
    const dataddd: any = [];

    for (let i = 0; i < data.length; i++) {

      await page.goto(
        `https://megamarket.ru/catalog/?q=${data[i].good_barcode}`,
        {
          waitUntil: "domcontentloaded",
        });
      await page.waitForNavigation();
      const notFoundEl = await page.waitForSelector(".catalog-listing-not-found-regular__title").catch(() => { })
      const notFound = await notFoundEl?.evaluate((el) => el.textContent);
      if (notFound !== "Мы это не нашли") {
        await page.click('.catalog-items-list div').catch(() => { })
        const decriptionEl = await page.waitForSelector(".clamped-text__text").catch(() => { });
        const descriptions = await decriptionEl?.evaluate((el) => el.textContent);
        const imageEl = await page.waitForSelector(".inner-image-zoom img").catch(() => { });
        const good_photo = await imageEl?.evaluate((el) => el.getAttribute('src'));
        const good_description = descriptions === undefined ? "@" : "Состав:" + descriptions;
        await axios.post('http://192.168.3.89:5001/post_photo_goods_for_parse', { good_description: good_description, good_photo: good_photo, good_barcode: data[i].good_barcode, status: "0" })
        dataddd.push({ good_description, good_photo, good_barcode: data[i].good_barcode, status: "0" })
        console.log({ good_description, good_photo, good_barcode: data[i].good_barcode, status: "0" })
        let resultQuestion = await toCsv(dataddd, options);
        const streamOne = fs.createWriteStream(
          `csv/data-${name}.csv`
        );
        streamOne.once("open", () => {
          streamOne.write(resultQuestion);
          streamOne.end();
        });
      } else {
        await axios.post('http://192.168.3.89:5001/post_photo_goods_for_parse', { good_description: "@", good_photo: "@", good_barcode: data[i].good_barcode, status: "0" })
        dataddd.push({ good_description: "@", good_photo: "@", good_barcode: data[i].good_barcode, status: "0" })
        console.log({ good_description: "@", good_photo: "@", good_barcode: data[i].good_barcode, status: "0" })
        continue
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }

})().catch(err => console.error(err)).finally(() => browser?.close());