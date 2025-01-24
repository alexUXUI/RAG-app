import * as dotenv from "dotenv";
import { RAGService } from "./rag";
import * as readline from "readline";

// Load environment variables before anything else
dotenv.config();

// Verify API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set in .env file");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  try {
    console.log("Initializing RAG service...");
    const ragService = new RAGService();

    console.log("Loading documents from ./docs directory...");
    await ragService.initialize("./docs");

    console.log(
      "\nRAG Assistant ready! Ask questions about your documents (type 'quit' to exit)"
    );

    const askQuestion = () => {
      rl.question("\nYour question: ", async (question) => {
        if (question.toLowerCase() === "quit") {
          rl.close();
          return;
        }

        try {
          const answer = await ragService.askQuestion(question);
          console.log("\nAnswer:", answer);
        } catch (error) {
          console.error("Error during question processing:", error);
        }

        askQuestion();
      });
    };

    askQuestion();
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
