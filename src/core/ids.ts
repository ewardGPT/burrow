/**
 * Prefixed ID generators (SPEC §7).
 *
 * Each ID is a stable two-part string: a domain prefix and a random suffix
 * encoded as 12 lowercase base32 chars (~60 bits of entropy). Prefixes are
 * reserved per kind so a stray ID can be classified at a glance.
 *
 * ```
 * bur_xxxxxxxxxxxx  burrow
 * run_xxxxxxxxxxxx  run
 * msg_xxxxxxxxxxxx  steering message
 * evt_xxxxxxxxxxxx  event (only used for external display; DB row id is INT)
 * ```
 *
 * `evt_` IDs are not stored — `events.id` is an autoincrement int — but we
 * mint them when surfacing events through the public API.
 */

const BASE32_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const SUFFIX_LEN = 12;

const PREFIXES = {
	burrow: "bur",
	run: "run",
	message: "msg",
	event: "evt",
} as const;

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ID_PATTERN = new RegExp(
	`^(${Object.values(PREFIXES).map(escapeRegExp).join("|")})_(.{${SUFFIX_LEN}})$`,
);

export type IdKind = keyof typeof PREFIXES;

export function generateId(kind: IdKind): string {
	return `${PREFIXES[kind]}_${randomSuffix()}`;
}

export function isId(kind: IdKind, value: unknown): value is string {
	if (typeof value !== "string") return false;
	const prefix = `${PREFIXES[kind]}_`;
	if (!value.startsWith(prefix)) return false;
	const suffix = value.slice(prefix.length);
	if (suffix.length !== SUFFIX_LEN) return false;
	for (const ch of suffix) {
		if (!BASE32_ALPHABET.includes(ch)) return false;
	}
	return true;
}

/**
 * Split an ID back into its kind and suffix.
 *
 * Returns `null` for strings that are not a well-formed ID (wrong length,
 * characters outside the base32 alphabet, or an unknown prefix). Unlike
 * {@link isId} this does not require the caller to know the kind up front.
 */
export function parseId(value: string): { kind: IdKind; suffix: string } | null {
	const match = value.match(ID_PATTERN);
	if (!match) return null;
	const kind = Object.entries(PREFIXES).find(([, prefix]) => prefix === match[1])?.[0] as
		| IdKind
		| undefined;
	if (!kind) return null;
	const suffix = match[2];
	if (!suffix) return null;
	for (const ch of suffix) {
		if (!BASE32_ALPHABET.includes(ch)) return null;
	}
	return { kind, suffix };
}

function randomSuffix(): string {
	const bytes = new Uint8Array(SUFFIX_LEN);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const byte of bytes) {
		const idx = byte % BASE32_ALPHABET.length;
		out += BASE32_ALPHABET[idx];
	}
	return out;
}
