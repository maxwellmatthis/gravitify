import { Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint } from "matter-js";
import { toCanvas } from 'html-to-image';

export type IsSpecialEntityFn = (e: HTMLElement) => boolean;

const defaultIsSpecialEntity: IsSpecialEntityFn = (e) => {
    return e.children.length === 0;
};

const image = async (e: HTMLElement) => {
    return (await toCanvas(e)).toDataURL(undefined, 1);
};

/**
 * Brings your DOM to the canvas and applies physics - most importantly gravity - to everything.
 * @param rootElement The element to recreate in the canvas.
 * @param canvas The canvas to use for rendering. Will create a new canvas if left blank. Canvas will automatically resize to the client size of the `rootElement`)
 * @param entitySelectors An array of selectors which specifies which non-special entities are added as entities. 
 * @param isSpecialEntity A function that checks if an element should be added to the canvas as an entity. Default=All elements with zero children.
 * @returns A bunch of useful stuff.
 */
export async function gravitify(
    rootElement: HTMLElement,
    canvas: HTMLCanvasElement = document.createElement("canvas"),
    entitySelectors: string[] = ["button", "a"],
    isSpecialEntity: IsSpecialEntityFn = defaultIsSpecialEntity,
) {
    const engine = Engine.create({
        positionIterations: 6 * 1.5,
        velocityIterations: 4 * 1.5,
        gravity: { y: 0.3 }
    });
    const render = Render.create({
        engine: engine,
        canvas,
        options: {
            width: rootElement.clientWidth,
            height: rootElement.clientHeight + 200,
            wireframes: false,
            background: "#fff"
        }
    });
    const runner = Runner.create();

    // Add elements
    await addElementsToScene(engine, render, rootElement, entitySelectors, isSpecialEntity);
    addMouseEvents(engine, render);

    // Run engine
    Runner.run(runner, engine);
    Render.run(render);

    return { engine, render, canvas };
}

const SHRINK_CLASS = "shrink-183ba3343c62f17b";

/**
 * Adds all the elements and a floor to keep the elements in the canvas to the scene.
 */
async function addElementsToScene(
    engine: Engine,
    render: Render,
    rootElement: HTMLElement,
    entitySelectors: string[],
    isSpecialEntity: IsSpecialEntityFn
) {
    const width = render.options.width || 800;
    const height = render.options.height || 600;
    // TODO: handle window.resize && teleport elements that clip back into the canvas
    const floor = Bodies.rectangle(Math.floor(width / 2), height, width, 1, { isStatic: true });
    const ceiling = Bodies.rectangle(Math.floor(width / 2), 0, width, 1, { isStatic: true });
    const leftWall = Bodies.rectangle(0, Math.floor(height / 2), 1, height, { isStatic: true });
    const rightWall = Bodies.rectangle(width, Math.floor(height / 2), 1, height, { isStatic: true });
    Composite.add(engine.world, [floor, ceiling, leftWall, rightWall]);

    const style = document.createElement("style");
    style.innerHTML = `.${SHRINK_CLASS} {display:inline-block;margin:0;}`;
    document.querySelector("body")?.appendChild(style);
    addChildren(engine, rootElement, entitySelectors, isSpecialEntity);
}

/**
 * Recursively parses HTML DOM and creates sprites for 'top level' elements.
 */
function addChildren(
    engine: Engine,
    element: HTMLElement,
    entitySelectors: string[],
    isSpecialEntity: IsSpecialEntityFn
) {
    const eligibleChildren = new Set<HTMLElement>();

    for (const selector of entitySelectors) {
        for (const child of Array.from(element.querySelectorAll(`:scope > ${selector}`))) {
            eligibleChildren.add(child as HTMLElement);
        }
    }

    for (const child of (element.children as any) as HTMLElement[]) {
        if (!isSpecialEntity(child) && !eligibleChildren.has(child)) addChildren(engine, child, entitySelectors, isSpecialEntity);
        else eligibleChildren.add(child);
    }

    for (const child of eligibleChildren) {
        // Ignore elements with no size because they cannot be seen
        // and cause zero division errors in the physics engine.
        if (child.clientWidth === 0 || child.clientHeight === 0) continue;
        makeEntity(engine, child);
    }
}

async function makeEntity(engine: Engine, sourceElement: HTMLElement) {
    sourceElement.classList.add(SHRINK_CLASS);
    const newBody = Bodies.rectangle(
        sourceElement.offsetLeft + Math.floor(sourceElement.clientWidth / 2),
        sourceElement.offsetTop,
        sourceElement.clientWidth,
        sourceElement.clientHeight,
        {
            render: {
                sprite: {
                    texture: await image(sourceElement),
                    xScale: 0.5,
                    yScale: 0.5,
                },
            },
            restitution: 0.6,
            friction: 0.1,
            // @ts-ignore
            sourceElement,
        }
    );
    const updateTexture = async () => {
        if (newBody.render.sprite?.texture) {
            newBody.render.sprite.texture = await image(sourceElement);
        }
    };
    sourceElement.addEventListener("input", updateTexture);
    sourceElement.addEventListener("change", updateTexture);
    sourceElement.addEventListener("resize", updateTexture);
    const observer = new MutationObserver(updateTexture);
    observer.observe(sourceElement, { characterData: false, childList: true, attributes: false });
    Composite.add(engine.world, newBody);
}

/**
 * Adds mouse constraints and interprets mouse events.
 */
function addMouseEvents(engine: Engine, render: Render) {
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
            stiffness: 0.2,
            render: {
                visible: false
            }
        }
    });
    Composite.add(engine.world, mouseConstraint);
    Events.on(mouseConstraint, "mousedown", (_e) => {
        if (mouseConstraint.body) {
            // @ts-ignore
            const sourceElement: HTMLElement = mouseConstraint.body.sourceElement;
            sourceElement.click();
            sourceElement.focus();
        }
    });
}
