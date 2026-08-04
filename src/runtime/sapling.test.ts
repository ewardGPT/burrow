import { describe, expect, test } from "bun:test";
import type { BurrowRow, MessageRow, RunRow } from "../db/schema.ts";
import { composeSaplingPrompt, saplingRuntime } from "./sapling.ts";

function fakeBurrow(): BurrowRow {
	return {
		id: "bur_x",
		parentId: null,
		kind: "project",
		name: null,
		projectRoot: "/r",
		workspacePath: "/r/ws",
		branch: "main",
		provider: "local",
		providerStateJson: null,
		profileJson: {},
		state: "active",
		createdAt: new Date(0),
		updatedAt: new Date(0),
		destroyedAt: null,
	};
}

function fakeRun(extra: Partial<RunRow> = {}): RunRow {
	return {
		id: "run_x",
		burrowId: "bur_x",
		agentId: "sapling",
		prompt: "p",
		resumeOfRunId: null,
		state: "queued",
		exitCode: null,
		errorMessage: null,
		metadataJson: null,
		queuedAt: new Date(0),
		startedAt: null,
		completedAt: null,
		...extra,
	};
}

function fakeMessage(extra: Partial<MessageRow> = {}): MessageRow {
	return {
		id: "msg_1",
		burrowId: "bur_x",
		fromActor: "user",
		body: "be quick",
		priority: "normal",
		state: "unread",
		deliveredAtRunId: null,
		createdAt: new Date(0),
		deliveredAt: null,
		...extra,
	};
}

describe("saplingRuntime.buildSpawnCommand", () => {
	test("argv includes --json + the composed prompt", () => {
		const cmd = saplingRuntime.buildSpawnCommand({
			burrow: fakeBurrow(),
			run: fakeRun(),
			prompt: "ship the feature",
			pendingMessages: [fakeMessage({ body: "add tests", priority: "high" })],
			envResolved: {},
			workspacePath: "/ws",
		});
		expect(cmd.argv[0]).toBe("sapling");
		expect(cmd.argv[1]).toBe("run");
		expect(cmd.argv).toContain("--json");
		const composed = cmd.argv.at(-1) ?? "";
		expect(composed).toContain("[STEERING]");
		expect(composed).toContain("priority: high");
		expect(composed).toContain("ship the feature");
	});
});

describe("saplingRuntime provider frontmatter", () => {
	test("renders provider and model using Sapling's run flags", () => {
		const cmd = saplingRuntime.buildSpawnCommand({
			burrow: fakeBurrow(),
			run: fakeRun(),
			prompt: "inspect",
			pendingMessages: [],
			envResolved: {},
			workspacePath: "/ws",
			frontmatter: { provider: "openai", model: "opencode-go/glm-5.2" },
		});
		expect(cmd.argv).toEqual([
			"sapling",
			"run",
			"--json",
			"--backend",
			"openai",
			"--model",
			"opencode-go/glm-5.2",
			"inspect",
		]);
	});
});

describe("saplingRuntime.envPassthrough", () => {
	test("forwards provider credentials and compatible base URLs into the sandbox", () => {
		expect(saplingRuntime.envPassthrough).toEqual([
			"OPENAI_API_KEY",
			"OPENAI_BASE_URL",
			"ANTHROPIC_API_KEY",
			"ANTHROPIC_BASE_URL",
			"DEEPSEEK_API_KEY",
		]);
	});
});

describe("saplingRuntime resume support", () => {
	test("does not advertise unsupported CLI resume semantics", () => {
		expect(saplingRuntime.supportsResume).toBe(false);
		expect(saplingRuntime.buildResumeCommand).toBeUndefined();
	});
});

describe("composeSaplingPrompt", () => {
	test("returns the bare prompt when there are no pending messages", () => {
		expect(composeSaplingPrompt("just do it", [])).toBe("just do it");
	});

	test("returns only the steering block when prompt is empty", () => {
		const out = composeSaplingPrompt("", [fakeMessage({ body: "hi", priority: "low" })]);
		expect(out).toContain("[STEERING]");
		expect(out).toContain("hi");
		expect(out.endsWith("\n")).toBe(false);
	});
});
