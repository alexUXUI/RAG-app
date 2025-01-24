import * as dotenv from "dotenv";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { Document } from "langchain/document";
import { HumanMessage, AIMessage } from "langchain/schema";

export class RAGService {
  private chain: ConversationalRetrievalQAChain | null = null;
  private chatHistory: (HumanMessage | AIMessage)[] = [];

  async initialize(directory: string) {
    const documents = await this.loadDocuments(directory);
    this.chain = await this.createRagChain(documents);
  }

  private async loadDocuments(directory: string): Promise<Document[]> {
    const loader = new DirectoryLoader(directory, {
      ".txt": (path) => new TextLoader(path),
      ".md": (path) => new TextLoader(path),
    });
    const documents = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    return await textSplitter.splitDocuments(documents);
  }

  private async createRagChain(documents: Document[]) {
    try {
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Replace Chroma with MemoryVectorStore
      const vectorstore = await MemoryVectorStore.fromDocuments(
        documents,
        embeddings
      );

      const model = new ChatOpenAI({
        temperature: 0.7,
        modelName: "gpt-3.5-turbo",
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      return ConversationalRetrievalQAChain.fromLLM(
        model,
        vectorstore.asRetriever(3),
        {
          returnSourceDocuments: true,
        }
      );
    } catch (error) {
      if (error instanceof Error && error?.message?.includes("429")) {
        throw new Error(
          "OpenAI API quota exceeded. Please check your API key and billing details."
        );
      }
      throw error;
    }
  }

  async askQuestion(question: string) {
    if (!this.chain) {
      throw new Error("RAG service not initialized");
    }

    const response = await this.chain.call({
      question,
      chat_history: this.chatHistory,
    });

    // Update chat history with proper message objects
    this.chatHistory.push(new HumanMessage(question));
    this.chatHistory.push(new AIMessage(response.text));

    return response.text;
  }
}
