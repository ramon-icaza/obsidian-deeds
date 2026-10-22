/**
 * Core task-line logic for the Deeds plugin.
 *
 * This module must stay free of any `obsidian` imports so it can be
 * unit-tested with the plain Node test runner (design decision 2).
 */

/** Task statuses recognized by the plugin. */
export type TaskStatus = "empty" | "done" | "cancelled" | "partial";

/** Character used inside `[...]` for each status; `" "` yields `- [ ] `. */
const STATUS_CHARS: Record<TaskStatus, string> = {
	empty: " ",
	done: "✔",
	cancelled: "✘",
	partial: "✲",
};

const STATUS_BY_CHAR: Record<string, TaskStatus | undefined> = {
	" ": "empty",
	"✔": "done",
	"✘": "cancelled",
	"✲": "partial",
};

/** The six-character task prefixes, one per status, trailing space included. */
export const TASK_PREFIXES: readonly string[] = Object.entries(STATUS_CHARS).map(
	([status, char]) => `- [${char}] `,
);

/**
 * Matches a task prefix with any recognized status: `- [ ] `, `- [✔] `,
 * `- [✘] `, `- [✲] ` — closing space included. Indented lines, `- [x] `
 * and prefixes without the trailing space do not match.
 */
const TASK_PREFIX_RE = /^- \[( |✔|✘|✲)\] /;

/** Length of a task prefix (`- [ ] `), used to strip it back off. */
export const TASK_PREFIX_LENGTH = 6;

/** Parse a line into a task. Returns `null` when the line is not a task. */
export function parseTask(line: string): { status: TaskStatus } | null {
	const match = TASK_PREFIX_RE.exec(line);
	if (match === null) return null;
	const status = STATUS_BY_CHAR[match[1]];
	if (status === undefined) return null;
	return { status };
}

/** True when the line is a task recognized by the plugin. */
export function isTask(line: string): boolean {
	return parseTask(line) !== null;
}

/** Turn any line into a fresh task by prepending the `- [ ] ` prefix. */
export function toTask(line: string): string {
	return `- [ ] ` + line;
}

/**
 * Turn a task back into plain text by removing its 6-character prefix.
 * A task with no content becomes an empty string. A non-task line is
 * returned unchanged.
 */
export function toPlain(line: string): string {
	return isTask(line) ? line.slice(TASK_PREFIX_LENGTH) : line;
}

/**
 * Set the status of the task on `line` to `target`. A task already in the
 * target status resets to `- [ ] `. A non-task line is returned unchanged.
 */
export function setStatus(line: string, target: TaskStatus): string {
	const task = parseTask(line);
	if (task === null) return line;
	const char = task.status === target ? " " : STATUS_CHARS[target];
	return `- [${char}] ` + line.slice(TASK_PREFIX_LENGTH);
}
