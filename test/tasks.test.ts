import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTask, toTask, toPlain, setStatus } from "../lib/tasks.ts";

test("task recognition — valid prefixes are tasks with the matching status", () => {
	assert.deepEqual(parseTask("- [ ] 1. сходить на дейли"), { status: "empty" });
	assert.deepEqual(parseTask("- [✔] 1. сходить на дейли"), { status: "done" });
	assert.deepEqual(parseTask("- [✘] 5. отмыть кофеварку"), { status: "cancelled" });
	assert.deepEqual(parseTask("- [✲] 3. проверить, что ничего не отвалилось"), { status: "partial" });
});

test("task recognition — prefixed line without content is still a task", () => {
	assert.deepEqual(parseTask("- [ ] "), { status: "empty" });
	assert.deepEqual(parseTask("- [✔] "), { status: "done" });
});

test("task recognition — edge cases are not tasks", () => {
	// Indented lines are not tasks.
	assert.equal(parseTask("  - [ ] 1. сходить на дейли"), null);
	assert.equal(parseTask("\t- [ ] 1. сходить на дейли"), null);
	// Native Obsidian checkbox is not a task.
	assert.equal(parseTask("- [x] 7. мусор"), null);
	// Prefix without the trailing space is not a task.
	assert.equal(parseTask("- [ ]1. сходить на дейли"), null);
	assert.equal(parseTask("- [✔]1. сходить на дейли"), null);
	assert.equal(parseTask("- [ ]"), null);
	// Plain text and empty lines are not tasks.
	assert.equal(parseTask("1. сходить на дейли"), null);
	assert.equal(parseTask("- обычный список"), null);
	assert.equal(parseTask(""), null);
});

test("Alt-Enter — ordinary line becomes a task", () => {
	assert.equal(toTask("1. сходить на дейли"), "- [ ] 1. сходить на дейли");
});

test("Alt-Enter — empty line becomes the bare prefix", () => {
	assert.equal(toTask(""), "- [ ] ");
});

test("Alt-Enter — task becomes ordinary text (first 6 characters removed)", () => {
	const plain = toPlain("- [✔] 1. сходить на дейли");
	assert.equal(plain, "1. сходить на дейли");
	assert.equal(plain.length, "- [✔] 1. сходить на дейли".length - 6);
});

test("Alt-Enter — task without content becomes an empty string", () => {
	assert.equal(toPlain("- [ ] "), "");
	assert.equal(toPlain("- [✔] "), "");
});

test("Alt-Enter — round-trip", () => {
	assert.equal(toPlain(toTask("1. сходить на дейли")), "1. сходить на дейли");
});

test("Alt-D — not started → done", () => {
	assert.equal(setStatus("- [ ] 1. сходить на дейли", "done"), "- [✔] 1. сходить на дейли");
});

test("Alt-D — cancelled → done", () => {
	assert.equal(setStatus("- [✘] 5. отмыть кофеварку", "done"), "- [✔] 5. отмыть кофеварку");
});

test("Alt-D — partial → done", () => {
	assert.equal(setStatus("- [✲] 3. проверить, что ничего не отвалилось", "done"), "- [✔] 3. проверить, что ничего не отвалилось");
});

test("Alt-D — done → not started", () => {
	assert.equal(setStatus("- [✔] 1. сходить на дейли", "done"), "- [ ] 1. сходить на дейли");
});

test("Alt-C — partial → cancelled", () => {
	assert.equal(setStatus("- [✲] 3. проверить, что ничего не отвалилось", "cancelled"), "- [✘] 3. проверить, что ничего не отвалилось");
});

test("Alt-C — not started → cancelled", () => {
	assert.equal(setStatus("- [ ] 5. отмыть кофеварку", "cancelled"), "- [✘] 5. отмыть кофеварку");
});

test("Alt-C — done → cancelled", () => {
	assert.equal(setStatus("- [✔] 1. сходить на дейли", "cancelled"), "- [✘] 1. сходить на дейли");
});

test("Alt-C — cancelled → not started", () => {
	assert.equal(setStatus("- [✘] 5. отмыть кофеварку", "cancelled"), "- [ ] 5. отмыть кофеварку");
});

test("Alt-S — not started → partial", () => {
	assert.equal(setStatus("- [ ] 6. написать заявку на замену кондиционера", "partial"), "- [✲] 6. написать заявку на замену кондиционера");
});

test("Alt-S — done → partial", () => {
	assert.equal(setStatus("- [✔] 1. сходить на дейли", "partial"), "- [✲] 1. сходить на дейли");
});

test("Alt-S — cancelled → partial", () => {
	assert.equal(setStatus("- [✘] 5. отмыть кофеварку", "partial"), "- [✲] 5. отмыть кофеварку");
});

test("Alt-S — partial → not started", () => {
	assert.equal(setStatus("- [✲] 3. проверить, что ничего не отвалилось", "partial"), "- [ ] 3. проверить, что ничего не отвалилось");
});

test("status toggle — line length never changes", () => {
	const line = "- [ ] 1. сходить на дейли";
	assert.equal(setStatus(line, "done").length, line.length);
	assert.equal(setStatus("- [✔] 1. сходить на дейли", "done").length, line.length);
});

test("status toggle — non-task lines stay unchanged", () => {
	assert.equal(setStatus("1. сходить на дейли", "done"), "1. сходить на дейли");
	assert.equal(setStatus("- [x] 7. мусор", "done"), "- [x] 7. мусор");
	assert.equal(setStatus("  - [✘] отступ — не задача", "cancelled"), "  - [✘] отступ — не задача");
	assert.equal(setStatus("- [ ]без пробела", "done"), "- [ ]без пробела");
});
