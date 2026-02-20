import { Image } from "image-js";
import { CONFIG } from "./constants";
import DATA_BOLD from "./data/bold_data.json";
import DATA_SLIM from "./data/slim_data.json";
import { asCaptcha, ResultTypes, type SolveResult } from "./interface";

let EMPTY_PATH = "assets/empty.jpg";
let DATA_PATH = "data";

interface WebExtensionApi {
  runtime: {
    getURL(path: string): string;
  };
}
declare const browser: WebExtensionApi | undefined;
declare const chrome: WebExtensionApi | undefined;

if (typeof window === "object") {
  // biome-ignore lint/complexity/useOptionalChain: Needed for safe cross-browser check
  if (typeof browser !== "undefined" && browser?.runtime) {
    // Firefox
    EMPTY_PATH = browser.runtime.getURL(EMPTY_PATH);
    DATA_PATH = browser.runtime.getURL(DATA_PATH);
  } else {
    // biome-ignore lint/complexity/useOptionalChain: Needed for safe cross-browser check
    if (typeof chrome !== "undefined" && chrome?.runtime) {
      // Chrome
      EMPTY_PATH = chrome.runtime.getURL(EMPTY_PATH);
      DATA_PATH = chrome.runtime.getURL(DATA_PATH);
    }
  }
} else {
  EMPTY_PATH = `./src/${EMPTY_PATH}`;
  DATA_PATH = `./src/${DATA_PATH}`;
}

const FACTORS = CONFIG.SOLVER.FACTORS;

enum Kind {
  Bold,
  Slim,
}

export const solveCaptcha = async (
  captchaUri: string,
  kind?: Kind,
): Promise<SolveResult> => {
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
    if (!item) continue;
    const similarities = Object.entries(data).map(
      ([char, properties]): [string, number] => {
        let absSum = 0;

        properties.forEach((prop, index) => {
          const itemVal = item[index];
          if (typeof itemVal === "number") {
            absSum += (FACTORS[index] || 1) * Math.abs(prop - itemVal);
          }
        });

        return [char, absSum];
      },
    );

    const sortedValues = similarities.sort((a, b) => a[1] - b[1]);

    // Increased threshold slightly due to more factors (9 instead of 5)
    const firstVal = sortedValues[0];
    const secondVal = sortedValues[1];

    if (
      !firstVal ||
      !secondVal ||
      firstVal[1] > CONFIG.SOLVER.LOW_CONFIDENCE_THRESHOLD ||
      secondVal[1] - firstVal[1] < CONFIG.SOLVER.CONFIDENCE_GAP
    ) {
      if (typeof kind !== "undefined") {
        return {
          type: ResultTypes.LowConfidence,
          value: asCaptcha(captcha),
        };
      }
      return solveCaptcha(captchaUri, Kind.Slim);
    }

    captcha += firstVal[0];
  }

  if (captchaValue.length === CONFIG.SOLVER.REQUIRED_LENGTH) {
    return { type: ResultTypes.Success, value: asCaptcha(captcha) };
  } else {
    return {
      type: ResultTypes.InvalidLength,
      value: asCaptcha(captcha),
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
export const evaluateCaptcha = async (img: Image): Promise<number[][]> => {
  const cleaned = await cleanImage(img);

  let counter = 0;
  let matrix: number[] = [];
  const matrixList: number[][] = [];

  // Splitting images by characters
  for (let i = 0; i < CONFIG.IMAGE.MAX_WIDTH; i++) {
    let isColumnEmpty = true;
    for (let j = 0; j < CONFIG.IMAGE.CHAR_HEIGHT; j++) {
      if (cleaned.data[CONFIG.IMAGE.MAX_WIDTH * j + i]) {
        if (!counter) {
          matrix.splice(
            0,
            matrix.length - (matrix.length % CONFIG.IMAGE.CHAR_HEIGHT),
          );
        }
        isColumnEmpty = false;
        matrix.push(1);
        counter++;
      } else if (
        j === CONFIG.IMAGE.CHAR_HEIGHT - 1 &&
        counter &&
        isColumnEmpty
      ) {
        matrix.push(0);
        matrixList.push(
          matrix.splice(0, matrix.length - CONFIG.IMAGE.CHAR_HEIGHT),
        );

        matrix = [];
        counter = 0;
      } else {
        matrix.push(0);
      }
    }
  }

  const averages: number[][] = [];

  matrixList.forEach((charMat: number[]) => {
    const tempImg = toImage(charMat, CONFIG.IMAGE.CHAR_HEIGHT)
      .rotateRight()
      .flipX();
    const average =
      tempImg.getSum().reduce((acc, val) => acc + val) /
      CONFIG.IMAGE.AVERAGE_DIVISOR;

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
      charMat.length / CONFIG.IMAGE.CHAR_HEIGHT,
      tlAvg,
      trAvg,
      blAvg,
      brAvg,
    ]);
  });

  return averages;
}

// Pixel array to Image
function toImage(matrix: number[], width = CONFIG.IMAGE.CHAR_HEIGHT): Image {
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

  let cleaned = empty
    .subtractImage(data)
    .multiply(CONFIG.IMAGE.CLEAN_MULTIPLIER);

  cleaned.data.forEach((item, index) => {
    if (item < CONFIG.IMAGE.PIXEL_THRESHOLD) {
      cleaned.setPixel(index, [0]);
    } else {
      cleaned.setPixel(index, [255]);
    }
  });

  cleaned = cleaned.crop({
    y: CONFIG.IMAGE.CROP.Y,
    x: CONFIG.IMAGE.CROP.X,
    height: CONFIG.IMAGE.CROP.HEIGHT,
    width: CONFIG.IMAGE.CROP.WIDTH,
  });
  return cleaned;
}

function calculateQuadrantAvg(
  charImg: Image,
  isLeft: boolean,
  isTop: boolean,
): number {
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

  return (
    quadrant.getSum().reduce((acc, val) => acc + val) /
    CONFIG.IMAGE.AVERAGE_DIVISOR
  );
}

// Average pixel value of horizontal top half
function calculateHTopAvg(charImg: Image): number {
  const tempImg = charImg.crop({
    y: 0,
    x: 0,
    height: Math.ceil(charImg.height / 2 + 1),
    width: charImg.width,
  });

  return (
    tempImg.getSum().reduce((acc, val) => acc + val) /
    CONFIG.IMAGE.AVERAGE_DIVISOR
  );
}

// Average pixel value of horizontal bottom half
function calculateHBotAvg(charImg: Image): number {
  const tempImg = charImg.crop({
    y: Math.ceil(charImg.height / 2 + 1),
    x: 0,
    height: CONFIG.IMAGE.CHAR_HEIGHT - Math.ceil(charImg.height / 2 + 1),
    width: charImg.width,
  });

  return (
    tempImg.getSum().reduce((acc, val) => acc + val) /
    CONFIG.IMAGE.AVERAGE_DIVISOR
  );
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

  return (
    transformedImage.getSum().reduce((acc, val) => acc + val) /
    CONFIG.IMAGE.AVERAGE_DIVISOR
  );
}

// No explicit export needed as they are exported inline
