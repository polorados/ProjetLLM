import typia from "typia";
import { writeFileSync } from "node:fs"
import { Function_Tools } from "./function_tools.ts" 

export function build() {
    const application = typia.llm.application<Function_Tools>();

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

    console.log("Function_Tools saved to tools.json");
}

export function main() {
    build();
}