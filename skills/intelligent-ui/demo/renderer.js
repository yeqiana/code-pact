"use strict";

// 安全示例：模型只返回数据，绝不运行模型提供的脚本、HTML 或事件表达式。
const DEFAULT_SPEC = {
  version: "intelligent-ui-demo/v1",
  title: "Java 线程池配置器",
  description: "拖动滑块观察演示公式，最大线程数 = 核心线程数 × 2，非生产通用推荐值。",
  controls: [{ id: "core", type: "slider", label: "核心线程数", min: 1, max: 16, step: 1, value: 4 }],
  metrics: [
    { label: "核心线程数", source: "core", multiplier: 1, suffix: " 线程" },
    { label: "最大线程数（示例）", source: "core", multiplier: 2, suffix: " 线程" }
  ],
  note: "实际线程池容量还需考虑任务类型、队列容量、拒绝策略及压测结果。"
};

const preview = document.getElementById("preview");
const input = document.getElementById("spec-input");
const status = document.getElementById("status");
const renderButton = document.getElementById("render-button");
const fileInput = document.getElementById("file-input");

function assertObject(x, name) {
  if (x === null || typeof x !== "object" || Array.isArray(x)) throw Error(name + " 必须为对象");
}
function assertFields(value, allowed, name) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw Error(name + " 不支持字段：" + key);
  }
}
function assertText(value, name, length = 160) {
  if (typeof value !== "string" || value.length > length) throw Error(name + " 必须为长度不超过 " + length + " 的字符串");
}
function assertNumber(value, name, min = -10000, max = 10000) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw Error(name + " 数值无效");
}
function validate(spec) {
  assertObject(spec, "协议");
  assertFields(spec, ["version", "title", "description", "controls", "metrics", "note"], "协议");
  if (spec.version !== "intelligent-ui-demo/v1") throw Error("不支持的协议版本");
  assertText(spec.title, "title", 100);
  assertText(spec.description, "description", 500);
  assertText(spec.note, "note", 300);
  if (!Array.isArray(spec.controls) || spec.controls.length < 1 || spec.controls.length > 8) throw Error("controls 必须包含 1~8 个滑块");
  if (!Array.isArray(spec.metrics) || spec.metrics.length > 12) throw Error("metrics 不得超过 12 个");
  const ids = new Set();
  for (const c of spec.controls) {
    assertObject(c, "control");
    assertFields(c, ["id", "type", "label", "min", "max", "step", "value"], "control");
    if (c.type !== "slider") throw Error("仅支持 slider 组件");
    if (typeof c.id !== "string" || !/^[a-zA-Z][\w-]{0,31}$/.test(c.id) || ids.has(c.id)) throw Error("无效或重复的 slider id");
    ids.add(c.id);
    assertText(c.label, "slider.label", 100);
    for (const key of ["min", "max", "step", "value"]) assertNumber(c[key], "slider." + key);
    if (c.min >= c.max || c.step <= 0 || c.value < c.min || c.value > c.max) throw Error("slider 数值边界无效");
    if (Math.abs((c.value - c.min) / c.step - Math.round((c.value - c.min) / c.step)) > 1e-7) throw Error("slider 默认值不符合步长");
  }
  for (const m of spec.metrics) {
    assertObject(m, "metric");
    assertFields(m, ["label", "source", "multiplier", "suffix"], "metric");
    assertText(m.label, "metric.label", 100);
    assertText(m.suffix, "metric.suffix", 40);
    if (typeof m.source !== "string" || !ids.has(m.source)) throw Error("metric.source 引用了未知滑块");
    assertNumber(m.multiplier, "metric.multiplier", -1000, 1000);
  }
  return spec;
}
function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
}
function render(spec) {
  validate(spec);
  const root = document.createDocumentFragment();
  root.append(element("h2", "", spec.title));
  root.append(element("p", "muted", spec.description));
  const values = Object.create(null);
  const outputs = [];
  for (const c of spec.controls) {
    values[c.id] = c.value;
    const field = element("div", "field");
    const top = element("div", "field-top");
    const label = element("label", "", c.label);
    const valueDisplay = element("output", "", c.value);
    const range = document.createElement("input");
    range.type = "range";
    range.id = "slider-" + c.id;
    range.min = String(c.min);
    range.max = String(c.max);
    range.step = String(c.step);
    range.value = String(c.value);
    label.htmlFor = range.id;
    range.setAttribute("aria-label", c.label);
    top.append(label, valueDisplay);
    field.append(top, range);
    range.addEventListener("input", () => {
      values[c.id] = Number(range.value);
      valueDisplay.textContent = range.value;
      for (const item of outputs) {
        item.node.textContent = String(Number((values[item.metric.source] * item.metric.multiplier).toFixed(8))) + item.metric.suffix;
      }
    });
    root.append(field);
  }
  const grid = element("dl");
  for (const metric of spec.metrics) {
    const box = element("div", "metric");
    box.append(element("dt", "", metric.label));
    const value = element("dd");
    value.textContent = String(Number((values[metric.source] * metric.multiplier).toFixed(8))) + metric.suffix;
    box.append(value);
    grid.append(box);
    outputs.push({ metric, node: value });
  }
  root.append(grid, element("p", "note", spec.note));
  preview.replaceChildren(root);
}
function tryRender() {
  try {
    if (input.value.length > 40000) throw Error("JSON 过大（上限 40 KB 字符）");
    render(JSON.parse(input.value));
    status.textContent = "已完成本地协议校验与渲染；没有触发远程操作。";
    status.dataset.kind = "ok";
  } catch (error) {
    preview.replaceChildren(element("p", "note", "渲染失败。请检查 JSON；普通 Markdown 可参考 examples/thread-pool.md。"));
    status.textContent = "协议无效：" + String(error.message || error);
    status.dataset.kind = "error";
  }
}
renderButton.addEventListener("click", tryRender);
fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  if (file.size > 40000) {
    status.textContent = "文件超过 40 KB 限制";
    status.dataset.kind = "error";
    return;
  }
  try {
    input.value = await file.text();
    tryRender();
  } catch (error) {
    status.textContent = "读取失败：" + String(error.message || error);
    status.dataset.kind = "error";
  }
});
input.value = JSON.stringify(DEFAULT_SPEC, null, 2);
tryRender();
