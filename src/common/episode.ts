import jsonStableStringify from "json-stable-stringify";
import fs from "fs-extra";
import path from "path";
import appRoot from "app-root-path";
import { mkdirp } from "mkdirp";
import ffmpeg, { FilterSpecification } from "fluent-ffmpeg";
import { promisify } from "util";
import { SyntheticLoom } from "./synthetic-loom";
import { sha256 } from "./sha256";

const ffprobe = promisify<string, ffmpeg.FfprobeData>(ffmpeg.ffprobe);

function ffmpegRun(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on("end", () => {
      resolve();
    });
    command.on("error", (err) => {
      reject(err);
    });
    command.run();
  });
}

export enum EpisodePartType {
  VOICE = "voice",
}

export type EpisodePart = {
  type: EpisodePartType.VOICE;
  text: string;
};

export enum EpisodeSequenceItemType {
  MEDIA = "media",
  PART = "part",
  PAUSE = "pause",
}

export type EpisodeSequenceItem =
  | {
      type: EpisodeSequenceItemType.PART;
      partId: string;
    }
  | {
      type: EpisodeSequenceItemType.MEDIA;
      path: string;
    }
  | {
      type: EpisodeSequenceItemType.PAUSE;
      durationMs: number;
    };

export type EpisodeSequenceItemMeta = {
  path?: string;
  durationSeconds?: number;
  ffmpegInputIndex?: number;
  ffmpegFilterIndex?: number;
};

export type EpisodeTrack = {
  sequence: EpisodeSequenceItem[];
};

export type EpisodeDefinition = {
  id: string;
  parts: {
    [key: string]: EpisodePart;
  };
  tracks: EpisodeTrack[];
};

export class Episode {
  private loom: SyntheticLoom;
  private definition: EpisodeDefinition;
  private episodeRootDir: string;

  private partsHashes: { [key: string]: string } = {};

  constructor(definition: EpisodeDefinition) {
    this.loom = new SyntheticLoom();
    this.definition = definition;

    for (const partId of Object.keys(definition.parts)) {
      this.partsHashes[partId] = sha256(
        jsonStableStringify(definition.parts[partId])
      ).slice(0, 8);
    }

    this.episodeRootDir = path.join(
      appRoot.toString(),
      "episodes",
      definition.id
    );
  }

  async getSequenceItemPath(
    item: EpisodeSequenceItem
  ): Promise<string | undefined> {
    if (item.type === EpisodeSequenceItemType.MEDIA) {
      return path.join(appRoot.toString(), "media", item.path);
    } else if (item.type === EpisodeSequenceItemType.PART) {
      const partsRoot = path.join(this.episodeRootDir, "parts");
      await mkdirp(partsRoot);
      return path.join(
        partsRoot,
        `${item.partId}-${this.partsHashes[item.partId]}.mp3`
      );
    } else if (item.type === EpisodeSequenceItemType.PAUSE) {
      return undefined;
    }
    throw new Error(`Unknown sequence item type: ${(<any>item).type}`);
  }

  async generateParts() {
    for (const track of this.definition.tracks) {
      for (const item of track.sequence) {
        if (item.type === EpisodeSequenceItemType.PART) {
          const partPath = await this.getSequenceItemPath(item);
          if (!partPath) {
            continue;
          }

          if (fs.existsSync(partPath)) {
            continue;
          }

          const part = this.definition.parts[item.partId];
          if (part.type === EpisodePartType.VOICE) {
            const audio = await this.loom.toSpeech(part.text);
            await audio.save(partPath);
            console.log(`Saved part ${partPath}`);
          }
        }
      }
    }
  }

  async verifySequenceItems() {
    for (const track of this.definition.tracks) {
      for (const item of track.sequence) {
        const path = await this.getSequenceItemPath(item);
        if (!path) {
          continue;
        }

        if (!fs.existsSync(path)) {
          throw new Error(`Sequence item ${item} does not exist`);
        }
      }
    }
  }

  async bounce(): Promise<string> {
    await this.generateParts();
    await this.verifySequenceItems();
    const outputPath = path.join(this.episodeRootDir, "output.mp3");

    for (const track of this.definition.tracks) {
      const command = ffmpeg();
      const itemsMeta: EpisodeSequenceItemMeta[] = [];
      let currentFfmpegInputIndex = 0;
      let currentFfmpegFilterIndex = 0;

      for (const item of track.sequence) {
        const p = await this.getSequenceItemPath(item);
        const newMeta: EpisodeSequenceItemMeta = {};

        if (p) {
          newMeta.path = p;
          const ffprobeData = await ffprobe(p);
          newMeta.durationSeconds = ffprobeData.format.duration!;

          command.input(p);
          newMeta.ffmpegInputIndex = currentFfmpegInputIndex;
          currentFfmpegInputIndex++;
        }

        if (item.type === EpisodeSequenceItemType.PAUSE) {
          newMeta.durationSeconds = item.durationMs / 1000;
          newMeta.ffmpegFilterIndex = currentFfmpegFilterIndex;
          currentFfmpegFilterIndex++;
        }

        itemsMeta.push(newMeta);
      }

      const filters: (string | FilterSpecification)[] = [];
      for (let i = 0; i < track.sequence.length; i++) {
        const item = track.sequence[i];
        const itemMeta = itemsMeta[i];
        if (itemMeta.path) {
          continue;
        }

        if (item.type === EpisodeSequenceItemType.PAUSE) {
          filters.push({
            filter: "anullsrc",
            options: {
              r: 44100,
              cl: "stereo",
              d: item.durationMs / 1000,
            },
            outputs: `s${itemMeta.ffmpegFilterIndex}`,
          });
        }
      }

      filters.push({
        filter: "concat",
        options: {
          n: track.sequence.length,
          v: 0,
          a: 1,
        },
        inputs: itemsMeta.map((itemMeta) => {
          if (itemMeta.ffmpegInputIndex !== undefined) {
            return `[${itemMeta.ffmpegInputIndex}:a]`;
          } else if (itemMeta.ffmpegFilterIndex !== undefined) {
            return `[s${itemMeta.ffmpegFilterIndex}]`;
          }
          throw new Error(`Invalid item meta: ${JSON.stringify(itemMeta)}`);
        }),
        outputs: "out",
      });

      command.complexFilter(filters);
      command.outputOptions("-map [out]").output(outputPath);
      await ffmpegRun(command);
      console.log(`Bounced track to ${outputPath}`);
    }

    return outputPath;
  }
}
