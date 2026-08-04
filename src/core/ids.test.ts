import { describe, expect, test } from "bun:test";
import { generateId, isId, parseId } from "./ids.ts";

describe("generateId", () => {
	test("emits the right prefix for each kind", () => {
		expect(generateId("burrow")).toMatch(/^bur_[0-9a-z]{12}$/);
		expect(generateId("run")).toMatch(/^run_[0-9a-z]{12}$/);
		expect(generateId("message")).toMatch(/^msg_[0-9a-z]{12}$/);
		expect(generateId("event")).toMatch(/^evt_[0-9a-z]{12}$/);
	});

	test("ids are unique across many invocations", () => {
		const ids = new Set<string>();
		for (let i = 0; i < 10_000; i++) ids.add(generateId("burrow"));
		expect(ids.size).toBe(10_000);
	});
});

describe("parseId", () => {
	test("splits a generated id back into kind and suffix", () => {
		for (const kind of ["burrow", "run", "message", "event"] as const) {
			const parsed = parseId(generateId(kind));
			expect(parsed?.kind).toBe(kind);
			expect(parsed?.suffix).toMatch(/^[0-9a-z]{12}$/);
		}
	});

	test("rejects malformed ids", () => {
		expect(parseId("bur_short")).toBeNull();
		expect(parseId("foo_0123456789ab")).toBeNull();
		expect(parseId("bur_0123456789ab_extra")).toBeNull();
		expect(parseId("BUR_0123456789ab")).toBeNull();
		expect(parseId("bur_!!!!!!!!!!!!")).toBeNull();
	});
});

describe("isId", () => {
	test("validates prefix and suffix shape", () => {
		const burrowId = generateId("burrow");
		expect(isId("burrow", burrowId)).toBe(true);
		expect(isId("run", burrowId)).toBe(false);
		expect(isId("burrow", "bur_short")).toBe(false);
		expect(isId("burrow", "BUR_0123456789ab")).toBe(false);
		expect(isId("burrow", "bur_!!!!!!!!!!!!")).toBe(false);
		expect(isId("burrow", undefined)).toBe(false);
		expect(isId("burrow", 42)).toBe(false);
	});
});
