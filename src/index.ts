import { SyntheticLoom } from "./common/synthetic-loom";

(async () => {
  const loom = new SyntheticLoom();
  const res = await loom.ask("What is the capital of the moon?");
  console.log(res);

  const audio = await loom.toSpeech(res);
  await audio.play();
})();
