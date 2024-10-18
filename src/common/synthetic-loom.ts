import { default as OpenAIClient } from "openai";
import dotenv from "dotenv";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { ElevenLabsClient, ElevenLabs, play } from "elevenlabs";
import { Readable } from "stream";
import fs from "fs-extra";

export class Audio {
  constructor(private bufferedAudio: Buffer) {}

  static async readFromStream(audioStream: Readable): Promise<Audio> {
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    return new Audio(Buffer.concat(chunks));
  }

  async play() {
    if (!this.bufferedAudio) {
      throw new Error("Audio not yet buffered.");
    }

    const audioStream = Readable.from(this.bufferedAudio);
    return play(audioStream);
  }

  async save(path: string): Promise<void> {
    if (!this.bufferedAudio) {
      throw new Error("Audio not yet buffered.");
    }

    await fs.writeFile(path, this.bufferedAudio);
  }
}

/**
 * Weaves together different types of synthetic "intelligence".
 */
export class SyntheticLoom {
  private openai: OpenAIClient;
  private elevenlabs: ElevenLabsClient;

  constructor() {
    dotenv.config();
    this.openai = new OpenAIClient();
    this.elevenlabs = new ElevenLabsClient();
  }

  private async createCompletionFromMessages(
    messages: any[],
    responseFormat?: any
  ) {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: responseFormat,
    });

    const content = completion.choices[0].message.content!;
    return responseFormat ? JSON.parse(content) : content;
  }

  private async createCompletionFromString<T>(
    question: string,
    responseFormat?: any,
    systemPrompt?: string
  ): Promise<T> {
    return this.createCompletionFromMessages(
      [
        systemPrompt
          ? {
              role: "system",
              content: systemPrompt,
            }
          : undefined,
        {
          role: "user",
          content: question,
        },
      ].filter((x) => !!x),
      responseFormat
    );
  }

  async ask(question: string, systemPrompt?: string): Promise<string> {
    return this.createCompletionFromString(question, undefined, systemPrompt);
  }

  async askStringArray(question: string): Promise<string[]> {
    const res = await this.createCompletionFromString<{ items: string[] }>(
      question,
      zodResponseFormat(
        z.object({
          items: z.array(z.string()),
        }),
        "string_array"
      )
    );
    return res.items;
  }

  async toSpeech(
    text: string,
    voice?: string,
    voiceSettings?: ElevenLabs.VoiceSettings
  ): Promise<Audio> {
    return Audio.readFromStream(
      await this.elevenlabs.generate({
        voice: voice ?? "Chris",
        text: text.replace(/Divizend/g, "Divisend"),
        model_id: "eleven_multilingual_v2",
        voice_settings: voiceSettings,
      })
    );
  }

  async getSoundEffect(text: string, durationSeconds: number): Promise<Audio> {
    return Audio.readFromStream(
      await this.elevenlabs.textToSoundEffects.convert({
        text,
        duration_seconds: durationSeconds,
      })
    );
  }
}
