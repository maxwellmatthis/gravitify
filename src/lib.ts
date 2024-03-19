import { Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint, IEngineDefinition, IChamferableBodyDefinition, IConstraintDefinition } from "matter-js";
import { toCanvas } from 'html-to-image';

export type IsSpecialEntityFn = (e: HTMLElement) => (Promise<boolean> | boolean);

export const defaultIsSpecialEntity: IsSpecialEntityFn = (e) => {
    return e.children.length === 0;
};

export const image = async (e: HTMLElement) => {
    return (await toCanvas(e)).toDataURL(undefined, 1);
};

export const SHRINK_CLASS_IDENTIFIER = "shrink-183ba3343c62f17b";
export const DEFAULT_SHRINK_DEFINITION = "display:inline-block;margin:0;";

/**
 * A configuration object used to configure the physics
 * engine and the physical behavior of elements.
 */
export interface PhysicsOptions {
    engine: Pick<
        IEngineDefinition,
        "positionIterations" | "velocityIterations" | "enableSleeping" | "constraintIterations"
    >,
    /** Gravity in x- and y-direction in m/s^2. */
    gravity: {
        /**
         * The gravity `x` component in `0.1*(m/s^2)`.
         * @default 1m/s^2
         */
        x: number,
        /**
         * The gravity `y` component in `0.1*(m/s^2)`.
         * @default 0m/s^2
         */
        y: number,
    },
    body: Pick<
        IChamferableBodyDefinition,
        "density" | "restitution" | "friction" | "frictionAir" | "isStatic"
    >,
    mouse: Pick<
        IConstraintDefinition,
        "stiffness" | "damping"
    >,
}

/**
 * Brings your DOM to the canvas and applies physics - most importantly gravity - to everything.
 * @param rootElement The element to recreate in the canvas.
 * @param canvas The canvas to use for rendering. Will create a new canvas if left blank. Canvas will automatically resize to the client size of the `rootElement`)
 * @param entitySelectors An array of selectors which specifies which non-special entities are added as entities. 
 * @param isSpecialEntity A function that checks if an element should be added to the canvas as an entity. Default=All elements with zero children.
 * @param shrinkDefinition A CSS definition (format: `"a:1,b:2"`) that is applied to each element right before it is added to the canvas as an entity. This is intended to 'shrinks' and simplify the element (e.g. removing margin) so that the image and resulting physics body are of higher quality.
 * @param physicsOptions A configuration object used to configure the physics engine and the physical behavior of elements.
 * @returns A reference to the Matter.js `Matter.Engine` instance and the canvas being used.
 */
export async function gravitify(
    rootElement: HTMLElement,
    canvas: HTMLCanvasElement = document.createElement("canvas"),
    entitySelectors: string[] = ["button", "a"],
    isSpecialEntity: IsSpecialEntityFn = defaultIsSpecialEntity,
    shrinkDefinition: string = DEFAULT_SHRINK_DEFINITION,
    physicsOptions?: Partial<PhysicsOptions>
) {
    const engine = Engine.create({
        positionIterations: physicsOptions?.engine?.positionIterations,
        velocityIterations: physicsOptions?.engine?.velocityIterations,
        constraintIterations: physicsOptions?.engine?.constraintIterations,
        gravity: {
            y: physicsOptions?.gravity?.y,
            x: physicsOptions?.gravity?.x
        },
    });
    const render = Render.create({
        engine: engine,
        canvas,
        options: {
            width: rootElement.clientWidth,
            height: rootElement.clientHeight,
            wireframes: false,
            background: "#fff"
        }
    });
    const runner = Runner.create();

    // Add elements
    await addElementsToScene(
        engine,
        render,
        rootElement,
        entitySelectors,
        isSpecialEntity,
        shrinkDefinition,
        physicsOptions
    );
    addMouseEvents(engine, render);

    // Run engine
    Runner.run(runner, engine);
    Render.run(render);

    return { engine, canvas };
}

/**
 * Adds all the elements and a floor to keep the elements in the canvas to the scene.
 */
async function addElementsToScene(
    engine: Engine,
    render: Render,
    rootElement: HTMLElement,
    entitySelectors: string[],
    isSpecialEntity: IsSpecialEntityFn,
    shrinkDefinition: string,
    physicsOptions?: Partial<PhysicsOptions>
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
    style.innerHTML = `.${SHRINK_CLASS_IDENTIFIER} {${shrinkDefinition}}`;
    const body = document.querySelector("body");
    if (body) body.appendChild(style);
    else console.warn("Gravitify: Unable to add shrink style definition to body: `document.querySelector('body')` is `undefined`.");
    await addChildren(engine, rootElement, entitySelectors, isSpecialEntity, physicsOptions);
}

/**
 * Recursively parses HTML DOM and creates sprites for 'top level' elements.
 */
async function addChildren(
    engine: Engine,
    element: HTMLElement,
    entitySelectors: string[],
    isSpecialEntity: IsSpecialEntityFn,
    physicsOptions?: Partial<PhysicsOptions>
) {
    const eligibleChildren = new Set<HTMLElement>();

    for (const selector of entitySelectors) {
        for (const child of Array.from(element.querySelectorAll(`:scope > ${selector}`))) {
            eligibleChildren.add(child as HTMLElement);
        }
    }

    for (const child of (element.children as any) as HTMLElement[]) {
        if (!eligibleChildren.has(child) && !(await isSpecialEntity(child))) {
            addChildren(engine, child, entitySelectors, isSpecialEntity, physicsOptions);
        } else eligibleChildren.add(child);
    }

    for (const child of eligibleChildren) {
        // Ignore elements with no size because they cannot be seen
        // and cause zero division errors in the physics engine.
        if (child.clientWidth === 0 || child.clientHeight === 0) continue;
        addEntity(engine, child, physicsOptions);
    }
}

export async function addEntity(
    engine: Engine,
    sourceElement: HTMLElement,
    physicsOptions?: Partial<PhysicsOptions>
) {
    sourceElement.classList.add(SHRINK_CLASS_IDENTIFIER);
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
            restitution: physicsOptions?.body?.restitution,
            friction: physicsOptions?.body?.friction,
            density: physicsOptions?.body?.density,
            frictionAir: physicsOptions?.body?.frictionAir,
            // isStatic: physicsOptions?.body?.isStatic,
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
function addMouseEvents(engine: Engine, render: Render, physicsOptions?: Partial<PhysicsOptions>) {
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
            stiffness: physicsOptions?.mouse?.stiffness,
            damping: physicsOptions?.mouse?.damping,
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
