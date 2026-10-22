# Verification report

Run: 7c45457f-3b3b-4d3c-8e6b-bc13b2c20df9 · ZWkang/nodebraid · issue #94

## Reviewed and published source

- Review base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Independently prepared append parent: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Published head: `efb0d9f4ef66ff198c39c5402c0d6fd8c12f320f`
- Reviewed local head: `7916c115aa57c0f9e44c138e91f162c38333a5e5`
- Tree: `d7b34834b717a5ba403b1b22913ad243c6b99490`
- Complete binary patch SHA-256: `fc5dc07c335630cc6459583ebe85efadf53f4e9b98d268e28a1319f3e4ba463c`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

## 已确认缺陷

在 fetched main `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`，中英文 `@nodebraid/plugin-renderer` 模块文档的 “Dependencies and composition / 依赖与组合” 安装代码漏掉必需的 `portPlugin`。正文正确列出了 PortService，但代码只安装 Kernel、Session 和 Renderer，读者照抄后 `Promise.all(installations.map(i => i.whenActive()))` 持续等待，Renderer Factory 从未执行。

原始位置：
- [中文组合示例](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/website/modules/plugin-renderer.md)
- [英文组合示例](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/website/en/modules/plugin-renderer.md)
- [Renderer 的现有 Required Services](https://github.com/ZWkang/nodebraid/blob/1c85d79db1e275e59f84a9bb77d1fe75c0a582e6/packages/plugin-renderer/src/renderer-plugin.ts)

## 真实复现

已分别抽取两种语言的原始安装代码，使用 freshly built 的公共 package entry、真实 Plugin Host / Kernel / Session 与边界 Recording Renderer 执行。等到已有 Kernel/Session Installation active 后，Renderer 仍是 pending、Factory 调用 0 次；仅补装 Port Plugin，原来同一组 readiness promises 即全部完成，Factory 1 次、Document reset 后 Session 各 1 次，Host dispose 释放 Renderer 1 次。没有 browser/视觉验收主张。

最小公开复现（Bun，先构建 workspace）：

```ts
import assert from 'node:assert/strict';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { portPlugin } from '@nodebraid/plugin-port';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import { createPluginHost } from '@nodebraid/runtime-cordis';
let calls = 0;
const host = createPluginHost();
const renderer = createRendererPlugin(() => {
  calls++;
  return {
    updateDocument() {}, updateSession() {}, updateInteraction() {},
    subscribeInput() { return () => {}; }, hitTest() { return null; },
    capturePointer() {}, releasePointer() {}, focus() {}, async dispose() {},
  };
});
try {
  const kernel = host.install(kernelPlugin);
  const session = host.install(sessionPlugin);
  const pending = host.install(renderer);
  await Promise.all([kernel.whenActive(), session.whenActive()]);
  assert.equal(pending.getSnapshot().status, 'pending');
  assert.equal(calls, 0);
  const ports = host.install(portPlugin);
  await Promise.all([pending.whenActive(), ports.whenActive()]);
  assert.equal(pending.getSnapshot().status, 'active');
  assert.equal(calls, 1);
} finally {
  await host.dispose();
}
```

原始源码、失败的 activation 断言和补装单一 Provider 的对照输出保存在本地 run `20261022T114018-maintenance`；两个 causal reproduction 均 exit 0，明确确认缺陷，而不是宣称原示例成功。

## 验收及范围

- 两种语言的现有组合代码都从 `@nodebraid/plugin-port` 导入并安装 `portPlugin`，保留原有 Provider 选择、Config、等待及释放方式。
- 从修复后的实际 Markdown 重新抽取同一完整示例，在真实公共 Host/Plugin seam 验证所有 Installation active、Factory 创建一次、初始 reset/session 交付和 Host 清理。保留原始 red/causal 对照证据。
- 只修文档组合遗漏；不改变 Runtime/Renderer/Port 公共契约、pending 策略、默认 Provider、安全策略或调度机制，不加 timeout/fallback/依赖。
- 执行文档相关/affected 检查，独立 Standards + ponytail-review / Spec，版本管理的正式完整检查，准确发布、当前 head CI/反馈和报告 readback。
- 最终由用户审阅合并；实际 main 集成及整体验收前保持 Issue 开放。

## 查重

已完整读取 all-state Issues/PR collection 的最终短页：93 个 issue/PR 条目及 48 个 PR，逐项检索标题及正文的 Renderer、Port、pending 和组合示例症状/原因，未发现同一遗漏的已有任务。现有六个在途修复 PR 的范围均不同。

### documented-composition-red-green

Preserve both original Markdown activation failures and causal Port-only controls. Add exactly the Port Plugin import and installation to both locales; execute the full freshly extracted Markdown examples against public compiled packages and a recording Renderer, validating active status, reset/session and disposal.

Dependencies: none

### documentation-validation

Run documentation/affected checks and preserve exact checked source. No Runtime/Renderer behavior, scripts, dependencies or public contract changes.

Dependencies: documented-composition-red-green

### independent-review

Independent Standards plus ponytail-review and Spec review identical complete head/tree/patch against original Issue94 and existing Renderer dependencies.

Dependencies: documentation-validation

### formal-engineering-check

Pinned main agents:run verify performs real full bun run check after both reviews; preserve every attempt and source stability.

Dependencies: independent-review

### publish-and-current-head-acceptance

Publish exact checked tree with independent parent; one PR to main. Validate actual current-head CI/full feedback/mergeability and immutable full report/media byte readback before ready.

Dependencies: formal-engineering-check

### main-integration-acceptance

Leave Issue94 open until human review/merge, actual fetched-main integration and whole-Issue acceptance.

Dependencies: publish-and-current-head-acceptance

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

What this change does: Both Renderer documentation examples now import and install the Port Plugin. This supplies the existing Port Service required by Renderer, alongside Kernel and Session.

Verdict: passed. Looks good. Ship.

Reviewed identity:

- Base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- Head: `7916c115aa57c0f9e44c138e91f162c38333a5e5`
- Tree: `d7b34834b717a5ba403b1b22913ad243c6b99490`
- Binary patch SHA256: `fc5dc07c335630cc6459583ebe85efadf53f4e9b98d268e28a1319f3e4ba463c`

Hard standards: no violations found. Read both complete examples, Issue #94 and its saved complete empty discussion, prepared plan, AGENTS, CONTRIBUTING, CONTEXT, tracker/discussion rules and applicable principle guidance. The two-file, four-line change preserves explicit Provider choice, readiness waiting and Host disposal. It matches Renderer’s actual static requirements and the service-availability/resource ownership contracts in ADR0002, ADR0004, ADR0044 and ADR0081.

Judgment checks: no concrete Fowler smell found. Applying ponytail-review, this is the smallest complete correction for one isolated Host per Canvas. No runtime behavior, public interface, dependency or test framework changes.

Independent checks at the reviewed head: saved patch equals the exact Git diff and stated hash; clean worktree; `git diff --check` passed. Audited and reran both complete example drivers. Each reached four active Installations, called the Provider once, delivered Document reset before Session, and disposed the Renderer once. Verified their executed installation bodies match the current Markdown after public compiled-entry path resolution and explicit recording-Provider/assertion instrumentation. `bun run docs:verify` passed for 25 modules. Actual command output is in `standards-command-log.txt`.

Not checked: visual rendering, browser input, full engineering gate, fresh builds, remote CI and report publication. The recording Provider proves protocol and lifecycle behavior, not visual output. This Standards review does not replace the independent Spec review.


## Spec review

Verdict: passed. [Original report](reviews/spec.md)

verdict: **passed**

独立审查完整两文件四行补丁、Issue #94 全文/空讨论与空 blocker 页、独立 prepared plan、AGENTS/CONTEXT、tracker/讨论规范，以及 Renderer/Port/Host 相关 ADR 和真实 Required Services。未发现规格遗漏、错误实现或范围扩张。

满足“两种语言的现有组合代码都从 @nodebraid/plugin-port 导入并安装 portPlugin”：中英完整示例各导入/安装一次，匹配 Renderer 既有 Kernel/Port/Session 静态依赖。Provider 选择、providerConfig、原 readiness Promise.all 与 finally 中 Host dispose 均保留；产品源码、pending/安全/调度策略及依赖未改，无 timeout 或 fallback。

本轮从当前 Markdown 抽取完整代码并逐行核对可执行 fixture，记录 code hashes；实际用 Bun 分别运行 `doc-zh-complete-green.ts`、`doc-en-complete-green.ts`，均 exit 0。每例 4 个 Installation 全部 active，Factory 1 次，Document reset → Session 各 1 次，Renderer dispose 1 次。命令、精确 head/tree 和原始输出保存于 `spec-review-commands.log`；`git diff --check` 通过。现有 Port-only causal 日志保留原同组 readiness promises 被解锁的证据，未把 pending.missing 当作实时依赖诊断。

Recording Renderer 仅是公共 Provider 边界的生命周期验证，不是视觉/browser 证明。未独立运行 affected/docs 全套、构建、browser/full engineering gate，未执行远端 CI、报告/媒体发布回读或最终 main 集成。Issue 保持开放；定向通过不代表完整交付验收。

- base: `1c85d79db1e275e59f84a9bb77d1fe75c0a582e6`
- head: `7916c115aa57c0f9e44c138e91f162c38333a5e5`
- tree: `d7b34834b717a5ba403b1b22913ad243c6b99490`
- binary patch SHA256: `fc5dc07c335630cc6459583ebe85efadf53f4e9b98d268e28a1319f3e4ba463c`


## Behavior evidence

### zh-original-missing-provider

red — passed; exit 1; expected exit 1.

Original documented composition remains pending and Factory uncalled after existing Providers activate; actual active-status assertion fails. The missing list is initial metadata, not a live token diagnosis. Separate Port-only causal control confirms omitted Provider.

Command: `bun renderer-doc-zh-repro.ts (original fetched main)`

[Original command output](logs/behavior-1.log)

### zh-port-only-control

check — passed; exit 0; expected exit 0.

Adding only the omitted Port Plugin to the original Host settles the same readiness promises, Factory1, reset/session, disposal1.

Command: `bun renderer-doc-zh-causal-repro.ts (original fetched main)`

[Original command output](logs/behavior-2.log)

### zh-complete-corrected-document

green — passed; exit 0; expected exit 0.

Freshly extracted full actual Markdown code, with public package entries and supplied recording Provider/Config, yields four active installations, Factory1, real initial reset0/session-empty and disposal1. No native/visual acceptance is inferred.

Command: `bun doc-zh-complete-green.ts`

[Original command output](logs/behavior-3.log)

### en-original-missing-provider

red — passed; exit 1; expected exit 1.

Original documented composition remains pending and Factory uncalled after existing Providers activate; actual active-status assertion fails. The missing list is initial metadata, not a live token diagnosis. Separate Port-only causal control confirms omitted Provider.

Command: `bun renderer-doc-en-repro.ts (original fetched main)`

[Original command output](logs/behavior-4.log)

### en-port-only-control

check — passed; exit 0; expected exit 0.

Adding only the omitted Port Plugin to the original Host settles the same readiness promises, Factory1, reset/session, disposal1.

Command: `bun renderer-doc-en-causal-repro.ts (original fetched main)`

[Original command output](logs/behavior-5.log)

### en-complete-corrected-document

green — passed; exit 0; expected exit 0.

Freshly extracted full actual Markdown code, with public package entries and supplied recording Provider/Config, yields four active installations, Factory1, real initial reset0/session-empty and disposal1. No native/visual acceptance is inferred.

Command: `bun doc-en-complete-green.ts`

[Original command output](logs/behavior-6.log)

### documentation-affected

check — passed; exit 0; expected exit 0.

Affected planner selects only docs. Actual docs content, real Quick Start, and VitePress build pass.

Command: `bun run check:affected`

[Original command output](logs/behavior-7.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
