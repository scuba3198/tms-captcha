import { Image } from "image-js";

import DATA_BOLD from "./data/bold_data.json";
import DATA_SLIM from "./data/slim_data.json";
import { ResultTypes, SolveResult } from "./interface";

let EMPTY_PATH = "assets/empty.jpg";
let DATA_PATH = "data";

declare const browser: any;
declare const chrome: any;

if (typeof window === "object") {
  if (typeof browser !== "undefined") {
    // Firefox
    EMPTY_PATH = browser.runtime.getURL(EMPTY_PATH);
    DATA_PATH = browser.runtime.getURL(DATA_PATH);
  } else if (typeof chrome !== "undefined") {
    // Chrome
    EMPTY_PATH = chrome.runtime.getURL(EMPTY_PATH);
    DATA_PATH = chrome.runtime.getURL(DATA_PATH);
  }
} else {
  EMPTY_PATH = `./src/${EMPTY_PATH}`;
  DATA_PATH = `./src/${DATA_PATH}`;
}

const FACTORS = [1, 2, 2, 2, 4, 3, 3, 3, 3];

enum Kind {
  Bold,
  Slim
}

async function solveCaptcha(
  captchaUri: string,
  kind?: Kind,
): Promise<SolveResult> {
  let data: Record<string, number[]>;

  if (kind === Kind.Bold || !kind) {
    data = DATA_BOLD as Record<string, number[]>;
  } else {
    data = DATA_SLIM as Record<string, number[]>;
  }

  const captchaImg = await Image.load(captchaUri);
  const captchaValue = await evaluateCaptcha(captchaImg);

  let captcha = "";

  for (let i = 0; i < captchaValue.length; i++) {
    const item = captchaValue[i];
    const similarities = Object.entries(data).map(([char, properties]): [string, number] => {
      let absSum = 0;

      properties.forEach((prop, index) => {
        absSum += (FACTORS[index] || 1) * Math.abs(prop - item[index]);
      });

      return [char, absSum];
    });

    const sortedValues = similarities.sort((a, b) => a[1] - b[1]);

    // Increased threshold slightly due to more factors (9 instead of 5)
    if (sortedValues[0][1] > 100 || sortedValues[1][1] - sortedValues[0][1] < 5) {
      if (typeof kind !== "undefined") {
        return {
          type: ResultTypes.LowConfidence,
          value: captcha,
        };
      } else {
        return solveCaptcha(captchaUri, Kind.Slim);
      }
    }

    captcha += sortedValues[0][0];
  }

  if (captchaValue.length === 6) {
    return { type: ResultTypes.Success, value: captcha };
  } else {
    return {
      type: ResultTypes.InvalidLength,
      value: captcha,
    };
  }
}

/*
Image is first splitted into individual characters by finding empty line between
characters.

Then each character is evalauated based on 9 factors:
  - Average Pixel Value
  - Average Pixel of Vertical Left Half of Image
  - Average Pixel of Horizontal Top Half of Image
  - Average Pixel of Horizontal Bottom Half of Image
  - Horizontal Length of Image
  - Top Left Quadrant Average
  - Top Right Quadrant Average
  - Bottom Left Quadrant Average
  - Bottom Right Quadrant Average
*/
async function evaluateCaptcha(img: Image): Promise<number[][]> {
  const cleaned = await cleanImage(img);

  let counter = 0;
  let matrix: number[] = [];
  const matrixList: number[][] = [];

  // Splitting images by characters
  for (let i = 0; i < 130; i++) {
    let isColumnEmpty = true;
    for (let j = 0; j < 35; j++) {
      if (cleaned.data[130 * j + i]) {
        if (!counter) {
          matrix.splice(0, matrix.length - (matrix.length % 35));
        }
        isColumnEmpty = false;
        matrix.push(1);
        counter++;
      } else if (j === 34 && counter && isColumnEmpty) {
        matrix.push(0);
        matrixList.push(matrix.splice(0, matrix.length - 35));

        matrix = [];
        counter = 0;
      } else {
        matrix.push(0);
      }
    }
  }

  const averages: number[][] = [];

  matrixList.forEach((charMat: number[]) => {
    const tempImg = toImage(charMat, 35).rotateRight().flipX();
    const average = tempImg.getSum().reduce((acc, val) => acc + val) / 256;

    const vAvgValue = calculateVAvg(tempImg);
    const hTopAvgValue = calculateHTopAvg(tempImg);
    const hBotAvgValue = calculateHBotAvg(tempImg);

    // Quadrant-based averages
    const tlAvg = calculateQuadrantAvg(tempImg, true, true);
    const trAvg = calculateQuadrantAvg(tempImg, false, true);
    const blAvg = calculateQuadrantAvg(tempImg, true, false);
    const brAvg = calculateQuadrantAvg(tempImg, false, false);

    averages.push([
      average,
      vAvgValue,
      hTopAvgValue,
      hBotAvgValue,
      charMat.length / 35,
      tlAvg,
      trAvg,
      blAvg,
      brAvg,
    ]);
  });

  return averages;
}

// Pixel array to Image
function toImage(matrix: number[], width = 35): Image {
  const image = new Image(width, matrix.length / width).grey();

  matrix.forEach((item, index) => {
    if (item) {
      image.setPixel(index, [255]);
    }
  });

  return image;
}

// Subtract the background noise image
async function cleanImage(img: Image): Promise<Image> {
  const empty = (await Image.load(EMPTY_PATH)).grey();
  const data = img.grey();

  let cleaned = empty.subtractImage(data).multiply(10);

  cleaned.data.forEach((item, index) => {
    if (item < 50) {
      cleaned.setPixel(index, [0]);
    } else {
      cleaned.setPixel(index, [255]);
    }
  });

  cleaned = cleaned.crop({ y: 24, x: 75, height: 35, width: 130 });
  return cleaned;
}

function calculateQuadrantAvg(charImg: Image, isLeft: boolean, isTop: boolean): number {
  const midX = Math.floor(charImg.width / 2);
  const midY = Math.floor(charImg.height / 2);

  const cropX = isLeft ? 0 : midX;
  const cropY = isTop ? 0 : midY;
  const cropWidth = isLeft ? midX : charImg.width - midX;
  const cropHeight = isTop ? midY : charImg.height - midY;

  if (cropWidth <= 0 || cropHeight <= 0) return 0;

  const quadrant = charImg.crop({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });

  return quadrant.getSum().reduce((acc, val) => acc + val) / 256;
}

// Average pixel value of horizontal top half
function calculateHTopAvg(charImg: Image): number {
  const tempImg = charImg.crop({
    y: 0,
    x: 0,
    height: Math.ceil(charImg.height / 2 + 1),
    width: charImg.width,
  });

  return tempImg.getSum().reduce((acc, val) => acc + val) / 256;
}

// Average pixel value of horizontal bottom half
function calculateHBotAvg(charImg: Image): number {
  const tempImg = charImg.crop({
    y: Math.ceil(charImg.height / 2 + 1),
    x: 0,
    height: 35 - Math.ceil(charImg.height / 2 + 1),
    width: charImg.width,
  });

  return tempImg.getSum().reduce((acc, val) => acc + val) / 256;
}

// Average pixel value of vertical half
function calculateVAvg(charImg: Image): number {
  let transformedImage = charImg.rotateRight();

  transformedImage = transformedImage.crop({
    y: 0,
    x: 0,
    height: Math.floor(transformedImage.height / 2 + 1),
    width: transformedImage.width,
  });

  return transformedImage.getSum().reduce((acc, val) => acc + val) / 256;
}

export { solveCaptcha, evaluateCaptcha };
