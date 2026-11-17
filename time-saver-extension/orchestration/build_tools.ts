import typia from "typia";
import { writeFileSync } from "node:fs"
import { Tools } from "./tools";

const application = typia.llm.application<Tools>();

const tools = application.functions.map(fn => ({
    type: "function" as const,
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters,
    strict: true,
}));


writeFileSync(
    "tools.json",
    JSON.stringify(tools, null, 2),
    "utf-8"
);

console.log("Tools saved to tools.json");