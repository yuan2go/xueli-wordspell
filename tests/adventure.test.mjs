import test from "node:test";
import assert from "node:assert/strict";
import {
  initialAdventure,
  runAdventure,
  board,
  goals,
  complete,
  sentenceTasks,
  unlocked,
  accessible,
  availableTargets,
  at,
} from "../src/game/adventure.ts";
import {
  encodeAdventure,
  decodeAdventure,
  loadAdventure,
  backup,
  ADVENTURE_KEY,
} from "../src/platform/adventure-save.ts";
import { parseSentence, assemble } from "../src/game/sentences.ts";
import { AUDIO } from "../src/content/manifest.ts";
import { SENTENCES } from "../src/content/sentences.ts";
import { initialSession, run, correctInput } from "../src/game/session.ts";
import { STEPS } from "../src/content/story.ts";
import { encode as oldEncode, SAVE_KEY } from "../src/platform/save.ts";
const stage = { kind: "stage" },
  inside = { kind: "relation", relation: "in", targetId: "bag-main" },
  head = { kind: "worn", targetId: "cat-companion" };
const on = (id) => ({ kind: "relation", relation: "on", targetId: id });
const command = (s, intent) => ({
  ...intent,
  sessionId: s.id,
  mode: s.mode,
  revision: s.revision,
  attemptId: `q-${s.revision}`,
});
const send = (s, intent) =>
  runAdventure(
    s,
    command(
      s,
      intent.action === "audio"
        ? {
            ...intent,
            assetId: AUDIO.find((a) => a.text === "map").id,
            audioSource: "development-speech",
            audioVersion: "speech-dev-v1",
          }
        : intent,
    ),
  );
const act = (s, intent) => {
  const r = send(s, intent);
  assert.ok(["valid", "done"].includes(r.kind), r.message);
  return r.session;
};
const word = (s, task, word = task) =>
  act(s, { action: "word", task, word: task === "wake" ? "cat" : word });
const move = (s, source, target) => act(s, { action: "place", source, target });
const morph = (s, source, word) =>
  act(s, { action: "transform", source, word, task: `morph:${source}` });
function tokens(task, text) {
  const used = new Set();
  return text.split(/\s+/).map((w) => {
    const token = task.tokens.find(
      (t) => t.text.toLowerCase() === w.toLowerCase() && !used.has(t.id),
    );
    assert.ok(token, w);
    used.add(token.id);
    return token.id;
  });
}
const say = (s, id, text) => {
  const task = sentenceTasks(s).find((t) => t.id === id);
  assert.ok(task, id);
  return act(s, {
    action: "sentence",
    task: id,
    ids: tokens(task, text ?? task.example.replace(".", "")),
  });
};
function meadow(seed = 0, reverse = false) {
  let s = word(initialAdventure("quest", seed), "wake");
  for (const id of reverse ? ["map", "bag"] : ["bag", "map"]) s = word(s, id);
  s = word(s, "hat");
  s = morph(s, "cat-card", "cap");
  s = move(s, "hat-main", head); // Early exploration is real and carries to the next scene.
  s = act(s, { action: "travel", value: "trail" });
  s = morph(s, "route-sheet", "mat");
  assert.equal(
    send(s, { action: "transform", source: "route-sheet", word: "map" }).kind,
    "blocked",
  );
  s = move(s, "route-sheet", { kind: "zone", id: "ink-road" });
  s = decodeAdventure(encodeAdventure(s));
  s = move(s, "route-sheet", stage);
  s = morph(s, "route-sheet", "map");
  s = act(s, { action: "travel", value: "meadow" });
  return word(s, "mat");
}
function taught(s) {
  s = act(s, { action: "bag" });
  s = say(s, "pack-cap");
  s = move(s, "hat-main", on("picnic-mat"));
  s = say(s, "describe-hat");
  return say(s, "invite-cat");
}
test("three world-goal acts allow either preparation order, actual crossing, personal ending and bounded creation", () => {
  for (const reverse of [false, true]) {
    let s = meadow(12, reverse);
    assert.equal(s.story.world.entities["route-sheet"].word, "map");
    assert.ok(at(s.story, "hat-main", "worn"));
    assert.equal(send(s, { action: "finish" }).kind, "blocked");
    s = taught(s);
    s = act(s, { action: "find", task: "find-map", source: "route-sheet" });
    s = move(s, reverse ? "cat-card" : "hat-main", head);
    s = move(
      s,
      reverse ? "hat-main" : "cat-card",
      reverse ? inside : on("picnic-mat"),
    );
    s = say(s, "recap");
    assert.ok(complete(s));
    s = act(s, { action: "finish" });
    const before = Object.keys(s.story.world.entities).length;
    s = act(s, { action: "craft", word: "mat" });
    assert.equal(Object.keys(s.story.world.entities).length, before + 1);
    assert.equal(send(s, { action: "craft", word: "mat" }).kind, "blocked");
    assert.equal(send(s, { action: "craft", word: "cat" }).kind, "outside");
    assert.equal(s.story.world.entities["cat-companion"].kind, "actor");
    assert.equal(s.story.world.entities["cat-card"].kind, "token");
    assert.notEqual(
      s.story.world.entities["picnic-mat"].id,
      s.story.world.entities["route-sheet"].id,
    );
    assert.deepEqual(decodeAdventure(encodeAdventure(s)), s);
  }
});
test("language, goal relevance and world permission are independent; descriptions never move things", () => {
  let s = meadow();
  const cap = SENTENCES["pack-cap"];
  const before = structuredClone(s.story.world);
  let r = send(s, {
    action: "sentence",
    task: cap.id,
    ids: tokens(cap, "Put the cap in the bag"),
  });
  assert.equal(r.kind, "blocked");
  assert.equal(r.session.events.at(-1).language, "correct");
  assert.deepEqual(r.session.story.world, before);
  s = act(r.session, { action: "bag" });
  r = send(s, {
    action: "sentence",
    task: cap.id,
    ids: tokens(cap, "Put the hat on the mat"),
  });
  assert.equal(r.kind, "mismatch");
  assert.equal(r.session.events.at(-1).language, "correct");
  assert.deepEqual(r.session.story.world, before);
  s = say(r.session, "pack-cap", "In the bag Put the cap");
  const desc = SENTENCES["describe-hat"];
  r = send(s, {
    action: "sentence",
    task: desc.id,
    ids: tokens(desc, "The hat is on the mat"),
  });
  assert.equal(r.kind, "mismatch");
  assert.equal(r.session.events.at(-1).language, "correct");
  assert.ok(at(r.session.story, "hat-main", "worn"));
  s = move(r.session, "hat-main", on("picnic-mat"));
  const revision = s.story.world.revision;
  s = say(s, "describe-hat", "On the mat is the hat");
  assert.equal(s.story.world.revision, revision);
});
test("unique repeated tokens, grammar variants, incomplete input and punctuation have honest feedback", () => {
  const task = SENTENCES["pack-cap"];
  const ids = tokens(task, "Put the cap in the bag");
  assert.notEqual(ids[1], ids[4]);
  assert.equal(assemble(task, [ids[1], ids[1]]), undefined);
  for (const text of ["Put the cap in the bag.", "IN the BAG, put the cap!"])
    assert.deepEqual(parseSentence(text).meaning, task.target);
  assert.equal(
    parseSentence("The hat is on the mat.").meaning.kind,
    "description",
  );
  assert.equal(parseSentence("Put the cap").status, "incomplete");
  assert.equal(parseSentence("the put cap the in bag").status, "structure");
  assert.equal(
    parseSentence("Please put the cap in the bag").status,
    "outside",
  );
  let s = meadow();
  const count = s.events.length;
  const r = send(s, {
    action: "sentence",
    task: task.id,
    ids: ids.slice(0, 3),
  });
  assert.equal(r.kind, "incomplete");
  assert.equal(r.session.events.length, count);
});
test("help survives refresh, no audio does not earn independent listening, replay and failures are not language errors", () => {
  let s = word(initialAdventure("evidence"), "wake");
  s = act(s, { action: "help", task: "map", value: "demo" });
  s = decodeAdventure(encodeAdventure(s));
  s = word(s, "map");
  assert.equal(s.events.at(-1).evidence, "demonstrated");
  s = word(s, "bag");
  assert.equal(s.events.at(-1).evidence, "guided");
  let unverified = word(initialAdventure("unverified"), "wake");
  unverified = word(unverified, "map");
  assert.equal(unverified.events.at(-1).evidence, "audio-unverified");
  let hearing = word(initialAdventure("hearing"), "wake");
  hearing = act(hearing, {
    action: "audio",
    task: "map",
    request: "a",
    value: "loading",
  });
  hearing = act(hearing, {
    action: "audio",
    task: "map",
    request: "b",
    value: "loading",
  });
  assert.equal(
    send(hearing, {
      action: "audio",
      task: "map",
      request: "a",
      value: "completed",
    }).kind,
    "stale",
  );
  hearing = act(hearing, {
    action: "audio",
    task: "map",
    request: "b",
    value: "playing",
  });
  hearing = act(hearing, { action: "replay", task: "map" });
  hearing = word(hearing, "map");
  assert.equal(hearing.events.at(-1).evidence, "independent");
  assert.equal(hearing.events.at(-1).support.replays, 1);
  assert.equal(hearing.events.at(-1).support.audioSource, "development-speech");
  assert.equal(hearing.events.at(-1).support.audioVersion, "speech-dev-v1");
  assert.equal(hearing.events.filter((e) => e.language === "adjust").length, 0);
});
test("duplicate/stale commands, reversible containment/occupancy and atomic failed swaps protect identities", () => {
  let s = meadow();
  const c = command(s, { action: "bag" }),
    r = runAdventure(s, c);
  assert.equal(runAdventure(r.session, c).session, r.session);
  assert.equal(
    runAdventure(r.session, { ...c, attemptId: "new" }).kind,
    "stale",
  );
  s = r.session;
  s = move(s, "cat-card", inside);
  assert.equal(
    send(s, { action: "transform", source: "cat-card", word: "cat" }).kind,
    "blocked",
  );
  s = move(s, "cat-card", stage);
  s = morph(s, "cat-card", "cat");
  s = morph(s, "cat-card", "cap");
  s = move(s, "hat-main", on("picnic-mat"));
  assert.equal(
    send(s, { action: "place", source: "picnic-mat", target: inside }).kind,
    "blocked",
  );
  s = move(s, "hat-main", stage);
  s = move(s, "picnic-mat", inside);
  assert.equal(
    send(s, {
      action: "place",
      source: "cat-companion",
      target: on("picnic-mat"),
    }).kind,
    "blocked",
  );
  s = move(s, "picnic-mat", stage);
  s = morph(s, "route-sheet", "mat");
  s = move(s, "cat-companion", on("route-sheet"));
  const old = s.story.world;
  const blocked = send(s, {
    action: "transform",
    source: "route-sheet",
    word: "map",
  });
  assert.equal(blocked.kind, "blocked");
  assert.deepEqual(blocked.session.story.world, old);
  assert.equal(
    send(s, { action: "transform", source: "cat-companion", word: "cap" }).kind,
    "blocked",
  );
  s = move(s, "cat-companion", stage);
  s = morph(s, "route-sheet", "map");
  assert.equal(s.story.world.entities["route-sheet"].word, "map");
});
function solveActivity(s, mode) {
  s = act(s, { action: "activity", value: mode });
  const variant = board(s).variant;
  if (mode === "dress") {
    if (variant === 1) {
      s = act(s, { action: "bag" });
      s = move(s, "cat-card", stage);
      s = move(s, "hat-main", on("picnic-mat"));
    }
    s = morph(s, "cat-card", "cap");
    s = move(s, "cat-card", head);
    if (variant === 0) {
      s = act(s, { action: "bag" });
      s = move(s, "hat-main", inside);
      s = act(s, { action: "bag" });
    }
  } else if (mode === "find") {
    if (variant === 1) {
      assert.equal(accessible(board(s), "cat-card"), false);
      s = move(s, "bag-main", stage);
      s = say(s, "find-behind");
      s = act(s, { action: "bag" });
      s = move(s, "cat-card", inside);
    } else {
      s = act(s, { action: "bag" });
      s = say(s, "find-inside");
      s = move(s, "hat-main", on("picnic-mat"));
    }
  } else {
    s = act(s, { action: "bag" });
    s = say(s, "helper-pack");
    if (variant === 0) {
      s = morph(s, "route-sheet", "mat");
      s = say(s, "helper-seat");
    } else {
      s = move(s, "hat-main", head);
      s = morph(s, "route-sheet", "map");
    }
  }
  assert.ok(complete(s), `${mode}/${variant}: ${JSON.stringify(goals(s))}`);
  return s;
}
test("all six authored variants are reachable and isolated, early unlocks and selected seeds survive refresh/replay", () => {
  assert.equal(unlocked(initialAdventure("empty"), "dress"), false);
  let early = word(word(word(initialAdventure("early"), "wake"), "bag"), "hat");
  early = morph(early, "cat-card", "cap");
  assert.equal(unlocked(early, "dress"), true);
  assert.equal(early.story.scene, "home");
  for (const seed of [0, 1])
    for (const mode of ["dress", "find", "helper"]) {
      let s = taught(meadow(seed));
      const story = structuredClone(s.story);
      s = solveActivity(s, mode);
      const v = board(s).variant;
      s = decodeAdventure(encodeAdventure(s));
      assert.equal(board(s).variant, v);
      assert.deepEqual(s.story, story);
      s = act(s, { action: "exit" });
      assert.deepEqual(s.story, story);
      s = act(s, { action: "activity", value: mode });
      assert.ok(complete(s));
      s = act(s, { action: "restart-activity" });
      assert.notEqual(board(s).variant, v);
      assert.equal(complete(s), false);
      assert.deepEqual(decodeAdventure(encodeAdventure(s)), s);
    }
});
test("saves reject forged projection/version/stale journals and preserve known legacy bytes before explicit restart", () => {
  const s = meadow();
  const raw = encodeAdventure(s);
  for (const mutate of [
    (v) => v.projection.story.facts.push("ending"),
    (v) => (v.content = "future"),
    (v) => v.journal.push(v.journal.at(-1)),
    (v) => (v.projection.story.world.entities["route-sheet"].word = "cap"),
  ]) {
    const v = JSON.parse(raw);
    mutate(v);
    assert.throws(() => decodeAdventure(JSON.stringify(v)));
  }
  let old = initialSession("legacy");
  for (let i = 0; i < 5; i++)
    old = run(old, {
      sessionId: old.id,
      stepId: STEPS[old.step].id,
      attemptId: `old-${i}`,
      expectedRevision: old.revision,
      type: "submit",
      input: correctInput(STEPS[old.step]),
    }).session;
  const bytes = oldEncode(old),
    data = new Map([[SAVE_KEY, bytes]]);
  globalThis.localStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
  try {
    const result = loadAdventure();
    assert.equal(result.blocked, true);
    assert.equal(result.legacy, true);
    assert.equal(data.get(SAVE_KEY), bytes);
    assert.ok(
      [...data.entries()].some(
        ([k, v]) => k.startsWith(`${SAVE_KEY}.backup.`) && v === bytes,
      ),
    );
    assert.equal(data.has(ADVENTURE_KEY), false);
    data.set(ADVENTURE_KEY, "{broken");
    backup(ADVENTURE_KEY);
    assert.equal(loadAdventure().blocked, true);
    assert.equal(data.get(ADVENTURE_KEY), "{broken");
  } finally {
    delete globalThis.localStorage;
  }
});
