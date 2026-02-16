import fs from "node:fs";
import { Image } from "image-js";

import { evaluateCaptcha } from "../src/evaluate";
import type { KindEntry } from "../src/interface";
import { kinds } from "../src/kinds";

Object.values(kinds).forEach((kind: KindEntry) => {
  const files = fs.readdirSync(kind.data_path);

  const data: Map<string, Array<Array<number>>> = new Map();

  const promises = files.map(async (filename) => {
    const img = await Image.load(`${kind.data_path}/${filename}`);

    const res = await evaluateCaptcha(img);

    if (res.length === 6) {
      res.forEach((item, index) => {
        const char: string | undefined = filename[index];
        if (!char) return;

        if (!data.get(char)) {
          data.set(char, []);
        }

        data.get(char)?.push(item);
      });
    }

    return res;
  });

  Promise.all(promises).then(() => {
    const averaged_data: Map<string, Array<number>> = new Map();

    data.forEach((value, key: string) => {
      if (value.length > 1) {
        let sums = value.reduce((acc, new_val) => {
          return acc.map((item, index) => {
            const newValVal = new_val[index];
            return item + (newValVal ?? 0);
          });
        });

        sums = sums.map((item) => item / value.length);

        averaged_data.set(key, sums);
      } else {
        const firstVal = value[0];
        if (firstVal) {
          averaged_data.set(key, firstVal);
        }
      }
    });

    const json_data = JSON.stringify(Object.fromEntries(averaged_data));

    fs.writeFileSync(`src/data/${kind.write_name}`, json_data);
  });
});
