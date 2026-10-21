# Verification report

Run: 04a05de6-6b68-4752-9e55-fd114398078f · ZWkang/nodebraid · issue #45

## Reviewed and published source

- Base: `90275b30daa43c2e207d7c9af94b8bb442e2f2a0`
- Published head: `13d7ad66b9e06de3212289aceb779431394a3f5d`
- Reviewed local head: `a35985b1ec0c2fcb5410e38f1bc101c260498efc`
- Tree: `6f4a5a19f07544d76321ca49cc7340d98d813789`
- Complete binary patch SHA-256: `52c6b9896e79fad2fdd10cc725a766601e0d9bc87e473223a765028659563c7d`

The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.

## Acceptance plan

Spec #44 and approval comment6312325365: deliver ordinary verification skill, agent-browser evidence, full review/validation reports and current-head PR publishing; no formal verification or account/branch-protection changes.

### evidence

Real Examples scenes preserve screenshots, video, snapshots, errors and versioned evidence after cleanup; reporters preserve actual review and command evidence; publisher refuses stale head and retains author prose.

Dependencies: none

## Full engineering check

`bun run check` — exit 0; checked source remained unchanged.

[Original command output](logs/full-check.log)

## Standards review

Verdict: passed. [Original report](reviews/standards.md)

Independent /root/standards_review: passed. 已复核完整变更及最终录像增量，未发现确凿规范问题。原始 recording.mp4 在转码前保存并计算哈希；review.mp4 使用真实 ffmpeg 转码，保存独立哈希、命令和编码日志。启动错误或非零退出使场景失败，已有证据保留，清理仍执行。PR 区分原始录像与1/15速审阅录像并标出截图文件名，文档明确不能用于性能/真实耗时测量。此前P1/P2已修：preview/review路径隔离；分次发布在任何写入前校验另一份证据的base/head/tree/patch及文件hash。维护规则核对新增入口与覆盖缺口，无产品契约、形式验证、调度或#10门禁扩展。无额外精简建议。独立执行 bun test tests/pr-evidence.test.ts tests/verification-report.test.ts tests/preview-scenes.test.ts：25 pass / 0 fail；git diff --check通过，工作树干净。已回读#44/#45讨论，范围未变。未执行完整构建、浏览器或真实发布；当前head实际媒体/远端发布以独立验收为准。

## Spec review

Verdict: passed. [Original report](reviews/spec.md)

Independent /root/spec_review: PASS，0项发现。已复核#44/#45、批准评论6312325365、完整规格身份与最终四文件增量。原始recording.mp4保留，真实ffmpeg生成独立review.mp4并记录命令、编码输出与hash；编码失败使场景失败且仍清理。PR明确区分原始/1/15速审阅录像和截图文件名，文档禁止把慢放当性能或实际耗时。维护新增入口漂移检查，旧地图通过不等于新功能已验证。原P1的preview/review隔离和写前完整身份/hash检查保持有效，未发现超范围实现。当前SHA相关19 tests通过及纯函数媒体标签/命名空间断言；完整patch diff --check通过，工作树干净。未运行build、浏览器或完整工程检查。35a旧head的四场景通过不作为本head证据；最终head真实录像/慢放、完整检查、PR报告媒体回读及原生父子关系仍需实际交付确认。默认分支publisher尚不能视为已部署或已触发。

## Behavior evidence

### publisher-boundaries-before

red — passed; exit 1; expected exit 1.

旧实现2142faa的隔离源码快照运行新的4项发布边界回归：缺少命名空间隔离、写前范围/hash校验产生真实断言失败；不属于最终版本失败。

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/04a05de6-6b68-4752-9e55-fd114398078f/publisher-regression/tests/pr-evidence.test.ts -t "untrusted preview names|different saved base/patch|previous report requires" (with saved before.ts as scripts/pr-evidence.ts)`

[Original command output](logs/behavior-1.log)

### publisher-boundaries-after

green — passed; exit 0; expected exit 0.

最终a35985b发布器的同4项回归通过；拒绝跨类覆盖、两个方向的不同base/patch混合，以及已发布字节污染。

Command: `bun test /Users/zhou/.codex/local-workflows/nodebraid/runs/04a05de6-6b68-4752-9e55-fd114398078f/publisher-regression/tests/pr-evidence.test.ts -t untrusted preview names|different saved base/patch|previous report requires`

[Original command output](logs/behavior-2.log)

### browser-feature-map

check — passed; exit 0; expected exit 0.

实际发布head13d7ad6重新执行四项真实场景并全部通过；这是本次collector原始结果清单，40个产物独立保存，包含hash、native操作和清理事实。

Command: `bun scripts/collect-preview.ts --base 90275b30daa43c2e207d7c9af94b8bb442e2f2a0 --out .tmp/pr-evidence-13d7ad6 --all`

[Original command output](logs/behavior-3.log)

### recording-decode

check — passed; exit 0; expected exit 0.

实际发布head13d7ad6重新生成的8份MP4均经ffprobe解码，H264、1280x720且多帧；原始和15倍慢放分别保存，不作为性能证明。

Command: `ffprobe -v error -count_frames -show_entries stream=codec_name,width,height,nb_read_frames:format=duration -of json <each declared MP4>`

[Original command output](logs/behavior-4.log)


## Feedback dispositions

No feedback dispositions were included in this run.

## Scope and limitations

The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.

Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.

A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.
