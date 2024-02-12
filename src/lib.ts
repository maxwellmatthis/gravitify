import { use, Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint } from "matter-js";
import MatterWrap from "matter-wrap";
import { toCanvas } from 'html-to-image';

/**
 * Recursively parses HTML DOM and creates sprites for top level elements.
 */
async function addChildren(engine: Engine, render: Render, element: HTMLElement) {
    console.log("elem", element);
    for (const child of (element.children as any) as HTMLElement[]) {
        if (child.children.length === 0 || child.children.length === 1) {
            console.log(child, (await toCanvas(child)).toDataURL());
            Composite.add(
                engine.world,
                Bodies.rectangle(
                    child.offsetLeft + Math.floor(child.clientWidth / 2),
                    child.offsetTop,
                    child.offsetWidth,
                    child.offsetHeight,
                    {
                        render: {
                            sprite: {
                                texture: (await toCanvas(child)).toDataURL(),
                                xScale: 0.5,
                                yScale: 0.5,
                            },
                        },
                        restitution: 0.6,
                        friction: 0.1
                    }
                )
            );
        }
        else addChildren(engine, render, child);
    }
}

/**
 * Adds all the elements and a floor to keep the elements in the canvas to the scene.
 */
async function addElementsToScene(engine: Engine, render: Render, rootElement: HTMLElement) {
    const floor = Bodies.rectangle(Math.floor(render.options.width / 2), render.options.height, render.options.width, 1, { isStatic: true });
    Composite.add(engine.world, floor);
    await addChildren(engine, render, rootElement);
}

/**
 * Adds mouse constraints and interprets mouse events.
 */
function addMouseEvents(engine: Engine, render: Render, runner: Runner) {
    // Add Mouse Events
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
    Events.on(runner, "tick", (event) => {
        if (mouseConstraint.body) {
            // Composite.remove(engine.world, mouseConstraint.body);
        }
    });
}

/**
 * Applies the Matter-Wrap plugin, which keeps the objects in the screen by having objects that
 * leave the screen enter on the opposite side.
 */
function applyMatterWarp(engine: Engine, render: Render) {
    use(MatterWrap);
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: render.options.width, y: render.options.height }
    });
    const allBodies = Composite.allBodies(engine.world);
    for (var i = 0; i < allBodies.length; i += 1) {
        allBodies[i].plugin.wrap = {
            min: { x: render.bounds.min.x - 100, y: render.bounds.min.y },
            max: { x: render.bounds.max.x + 100, y: render.bounds.max.y }
        };
    }
}

export async function gravitify(rootElement: HTMLElement, canvas: HTMLCanvasElement = document.createElement("canvas")) {
    const engine = Engine.create();
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

    await addElementsToScene(engine, render, rootElement);
    addMouseEvents(engine, render, runner);
    applyMatterWarp(engine, render);

    // Run engine
    Runner.run(runner, engine);
    Render.run(render);

    return { engine, render, canvas };
}
