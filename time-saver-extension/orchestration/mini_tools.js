export const TOOL_DEFS = [
    {
      type: "function",
      name: "helloWorld",
      description: "sends a message",
      parameters: {
        type: "object",
        properties: {
          somethingToSay: {
            type: "string",
            description: "The message to send",
          },
        },
        required: ["somethingToSay"],
        additionalProperties: false,
      },
      strict: true,
    },
];

export async function run(name, input) {
       const impls = {
        async helloWorld({ somethingToSay }) {
            return `Hello, ${somethingToSay}!`;
        },
    };

    const impl = impls[name];

    if (!impl) {
        throw new Error(`Unknown tool: ${name}`);
    }

    return await impl(input);
}

export const WEB_SEARCH = {
    type: "web_search",
    filters: {
        allowed_domains: [
            "chromewebstore.google.com",
            "developer.chrome.com",
            "support.google.com"
        ]
    }
};

export const FIRST_MESSAGE = "Hello World";
export const TEST_PROMPT = "Test all the tools available and give the outputs of all of them in your response"
