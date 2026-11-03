import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const code = fs.readFileSync(path.join(root, "demo/renderer.js"), "utf8");
const sample = JSON.parse(fs.readFileSync(path.join(root, "examples/thread-pool.ui.json"), "utf8"));

class FakeNode {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.textContent = "";
    this.value = "";
    this.files = [];
  }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = [...items]; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  setAttribute(key, value) { this[key] = value; }
}
function setup() {
  const elements = new Map();
  for (const id of ["preview", "spec-input", "status", "render-button", "file-input"]) {
    elements.set(id, new FakeNode(id));
  }
  const document = {
    getElementById(id) { return elements.get(id); },
    createElement(tag) { return new FakeNode(tag); },
    createDocumentFragment() { return new FakeNode("fragment"); }
  };
  const context = vm.createContext({ document });
  vm.runInContext(code, context, { filename: "renderer.js" });
  return { context, elements };
}
function find(node, tag) {
  const result = [];
  if (node.tagName === tag) result.push(node);
  for (const child of node.children || []) result.push(...find(child, tag));
  return result;
}
function copy(object) {
  return JSON.parse(JSON.stringify(object));
}

test("默认 JSON 渲染且指标随 slider 更新", () => {
  const { elements } = setup();
  const preview = elements.get("preview");
  assert.equal(elements.get("status").dataset.kind, "ok");
  let inputs = find(preview, "input");
  assert.equal(inputs.length, 1);
  const slider = inputs[0];
  slider.value = "6";
  slider.listeners.input();
  assert.deepEqual(find(preview, "dd").map(n => n.textContent), ["6 线程", "12 线程"]);
});

test("协议示例有效，版本或未知字段拒绝", () => {
  const { context } = setup();
  assert.equal(context.validate(copy(sample)).title, sample.title);
  assert.throws(() => context.validate({ ...copy(sample), version: "DIL" }), /版本/);
  assert.throws(() => context.validate({ ...copy(sample), onClick: "alert(1)" }), /不支持字段/);
});

test("非法控件、重复 ID、引用错误与数值越界拒绝", () => {
  const { context } = setup();
  const wrongType = copy(sample);
  wrongType.controls[0].type = "html";
  assert.throws(() => context.validate(wrongType), /slider/);

  const duplicated = copy(sample);
  duplicated.controls.push({ ...duplicated.controls[0] });
  assert.throws(() => context.validate(duplicated), /重复/);

  const wrongReference = copy(sample);
  wrongReference.metrics[0].source = "unknown";
  assert.throws(() => context.validate(wrongReference), /未知/);

  const overflow = copy(sample);
  overflow.controls[0].value = 100;
  assert.throws(() => context.validate(overflow), /边界/);

  const stepMismatch = copy(sample);
  stepMismatch.controls[0].step = 3;
  stepMismatch.controls[0].value = 5;
  assert.throws(() => context.validate(stepMismatch), /步长/);
});

test("HTML 字符串作为纯文本，JSON 错误不执行代码", () => {
  const { context, elements } = setup();
  const literal = copy(sample);
  literal.title = "<img src=x onerror=alert(1)>";
  context.render(literal);
  const headers = find(elements.get("preview"), "h2");
  assert.equal(headers[0].textContent, literal.title);

  elements.get("spec-input").value = '{"version":';
  elements.get("render-button").listeners.click();
  assert.equal(elements.get("status").dataset.kind, "error");
  assert.match(elements.get("preview").children[0].textContent, /渲染失败/);
});
