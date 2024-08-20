/**
 * @fileoverview
 * This script is a dev manager for dictionary files.
 * It is used to manage the dictionary files in the `src/dictionaries` directory.
 * Use this script to create, update, and delete dictionary items.
 */

import fs from "fs";
import path from "path";
import { Command } from "commander";

const program = new Command();
program.version("0.0.1");

// create a new key in the dictionary, requires a key, zh, and en
program
  .command("create <key> <zh> <en>")
  .description("Create a new dictionary item")
  .alias("c")
  .action((key: string, zh: string, en: string) => {
    const enPath = path.resolve(__dirname, "../src/dictionaries/en.json");
    const zhPath = path.resolve(__dirname, "../src/dictionaries/zh.json");

    const enDict = require(enPath);
    const zhDict = require(zhPath);

    const keys = key.split(".") ?? [];
    if (keys.length === 0) {
      console.error("Key not be empty and is traversed by .");
      process.exit(1);
    }
    // if keys starts with dict, remove it
    if (keys[0] === "dict") keys.shift();
    const lastKey = keys.pop();

    if (!lastKey) {
      console.error("Key should not be empty");
      process.exit(1);
    }

    let enPointer = enDict;
    let zhPointer = zhDict;

    keys.forEach((k) => {
      if (!enPointer[k]) enPointer[k] = {};
      if (!zhPointer[k]) zhPointer[k] = {};

      enPointer = enPointer[k];
      zhPointer = zhPointer[k];
    });

    function write() {}

    // check if key already exists, confirm overwrite
    if (enPointer[lastKey] || zhPointer[lastKey])
      console.log("Key already exists, overwritting");
    enPointer[lastKey!] = en;
    zhPointer[lastKey!] = zh;

    fs.writeFileSync(enPath, JSON.stringify(enDict, null, 2));
    fs.writeFileSync(zhPath, JSON.stringify(zhDict, null, 2));

    console.log("Dictionary item created successfully");
  });

// remove a key from the dictionary
program
  .command("remove <key>")
  .description("Remove a dictionary item")
  .alias("r")
  .action((key: string) => {
    const enPath = path.resolve(__dirname, "../src/dictionaries/en.json");
    const zhPath = path.resolve(__dirname, "../src/dictionaries/zh.json");

    const enDict = require(enPath);
    const zhDict = require(zhPath);

    const keys = key.split(".") ?? [];
    if (keys.length === 0) {
      console.error("Key not be empty and is traversed by .");
      process.exit(1);
    }
    // if keys starts with dict, remove it
    if (keys[0] === "dict") keys.shift();
    const lastKey = keys.pop();

    if (!lastKey) {
      console.error("Key should not be empty");
      process.exit(1);
    }

    let enPointer = enDict;
    let zhPointer = zhDict;

    keys.forEach((k) => {
      if (!enPointer[k]) enPointer[k] = {};
      if (!zhPointer[k]) zhPointer[k] = {};

      enPointer = enPointer[k];
      zhPointer = zhPointer[k];
    });

    if (!enPointer[lastKey] || !zhPointer[lastKey]) {
      console.error("Key does not exist");
      process.exit(1);
    }

    delete enPointer[lastKey!];
    delete zhPointer[lastKey!];

    fs.writeFileSync(enPath, JSON.stringify(enDict, null, 2));
    fs.writeFileSync(zhPath, JSON.stringify(zhDict, null, 2));

    console.log("Dictionary item removed successfully");
  });

// move a key in the dictionary
program
  .command("move <key> <newKey>")
  .description("Move a dictionary item")
  .alias("m")
  .action((key: string, newKey: string) => {
    const enPath = path.resolve(__dirname, "../src/dictionaries/en.json");
    const zhPath = path.resolve(__dirname, "../src/dictionaries/zh.json");

    const enDict = require(enPath);
    const zhDict = require(zhPath);

    const keys = key.split(".") ?? [];
    if (keys.length === 0) {
      console.error("Key not be empty and is traversed by .");
      process.exit(1);
    }
    // if keys starts with dict, remove it
    if (keys[0] === "dict") keys.shift();
    const lastKey = keys.pop();

    if (!lastKey) {
      console.error("Key should not be empty");
      process.exit(1);
    }

    let enPointer = enDict;
    let zhPointer = zhDict;

    keys.forEach((k) => {
      if (!enPointer[k]) enPointer[k] = {};
      if (!zhPointer[k]) zhPointer[k] = {};

      enPointer = enPointer[k];
      zhPointer = zhPointer[k];
    });

    if (!enPointer[lastKey] || !zhPointer[lastKey]) {
      console.error("Key does not exist");
      process.exit(1);
    }

    // copy the key to the new location, remove the original key
    let enNewPointer = enDict;
    let zhNewPointer = zhDict;

    const newKeys = newKey.split(".") ?? [];
    if (keys.length === 0) {
      console.error("Key not be empty and is traversed by .");
      process.exit(1);
    }
    // if keys starts with dict, remove it
    if (newKeys[0] === "dict") newKeys.shift();
    const newLastKey = newKeys.pop();

    if (!newLastKey) {
      console.error("Key should not be empty");
      process.exit(1);
    }

    newKeys.forEach((k) => {
      if (!enNewPointer[k]) enNewPointer[k] = {};
      if (!zhNewPointer[k]) zhNewPointer[k] = {};

      enNewPointer = enNewPointer[k];
      zhNewPointer = zhNewPointer[k];
    });

    enNewPointer[newLastKey!] = enPointer[lastKey];
    zhNewPointer[newLastKey!] = zhPointer[lastKey];

    delete enPointer[lastKey!];
    delete zhPointer[lastKey!];

    fs.writeFileSync(enPath, JSON.stringify(enDict, null, 2));
    fs.writeFileSync(zhPath, JSON.stringify(zhDict, null, 2));

    console.log("Dictionary item moved successfully");
  });

program.parse();
