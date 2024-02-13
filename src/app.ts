import { gravitify, enableCustomEventListeners } from "./lib";

const canvas = document.querySelector("canvas");
const main = document.querySelector("main");
const button = document.querySelector("button#a");

enableCustomEventListeners();
const fn = () => {
    console.log("Hello from the button!");
};
button.addEventListener("click", fn);
// setTimeout(() => button.removeEventListener("click", fn), 4000)

gravitify(main, canvas);
