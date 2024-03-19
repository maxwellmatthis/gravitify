import { gravitify } from "../src/lib"; /* simple for quick development */
// import { gravitify } from "gravitify"; /* with `npm link && npm link gravitify` */

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
const main = document.querySelector("main") as HTMLElement;
const mainHeading = document.querySelector("h1#main-heading");
(document.querySelector("button#a") as HTMLButtonElement).addEventListener("click", () => {
    console.log("A-Blue");
    if (mainHeading) mainHeading.textContent = "Hello, Blue Button!";
});
(document.querySelector("button#b") as HTMLButtonElement).addEventListener("click", () => console.log("B-Magenta"));
(document.querySelector("button#c") as HTMLButtonElement).addEventListener("click", () => console.log("C-Green"));

gravitify(main, canvas, ["#super-specific", "button", "a"]);
