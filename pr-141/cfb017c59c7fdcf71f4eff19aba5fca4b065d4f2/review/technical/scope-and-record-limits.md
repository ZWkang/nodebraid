# Execution and presentation scope

The raw cleanup Diagnostic Event now retains the unchanged application AggregateError containing NaN. The caller's disposal rejection was already correct in the original red; it was never a hanging disposal or a lost caller rejection.

- [Byte-identical public source](public-program.ts.log.txt), [emitted JS](public-program.js.log.txt), [source map](public-program.js.map.log.txt), [execution provenance](public-execution-provenance.log.txt), [baseline observations](public-baseline-observations.log.txt), and [repair observations](public-repair-observations.log.txt).
- [Primary tracer source snapshot](primary-red-green-test-snapshot.ts.log.txt) and [TDD provenance](primary-tdd-provenance.log.txt) retain the actual red and unchanged-test green. The final PR adds two compatibility cases afterwards; the original source/receipts are not rewritten.
- [Reviewed complete patch](reviewed.patch.log.txt), [affected scope](affected-scope.log.txt), [affected receipt](affected-receipt.log.txt), and [source publication readback](source-publication-readback-summary.log.txt).
- [Complete Checks log](source-ci-checks.log), [preview log](source-ci-preview.log), [trusted publisher log](trusted-publisher.log), and [CI identity/counter provenance](ci-log-provenance.log.txt).
- [All69 media-file byte readbacks](preview-content-readback.log.txt) and [declared log construction](behavior-log-provenance.log.txt).

Local formal verification ran on f5df3997555bf3470eababb626c0b87c453720c1:1698tests/10854assertions. GitData published cfb017c59c7fdcf71f4eff19aba5fca4b065d4f2 has the same complete4591a2f tree and sole parent447d7ae. The actual complete946-leaf remote Git byte readback and API tree/parent/base inheritance were verified. Local tests are not represented as executions at the different GitData SHA. Linux Checks used the actual86c04af PR test merge with the same tree and ordered parents[447d7ae,cfb017c], producing1698tests/10848assertions. These execution counts remain separate; they are not added to browser cases or reviewer execution. Both independent reviewers executed0 checks in this review.

The sourceCI mapper selected all6 mapped native scenes. Their68 artifacts plus preview.json,69files total, were read byte/size/SHA256/Gitblob/header exactly from immutable87f6b43f1a3d039c1a304558132de80aa0b671be. The existing media are inherited; the coordinator did not collect an additional --all run or reupload the same media. The normal Canvas interaction scenes do not establish a browser Fault UI for this NaN path. Before/after are interaction states at this same source head, not a base comparison. Original recording and15x setpts review playback are distinct; playback is not a performance measure.

Observed passing scope is finite: eight native Bun public controls, three repository lifecycle regressions plus existing related/affected/full checks and the current CI. It is not whole-Runtime, arbitrary scheduling, resource exhaustion, deep-equality policy or new error-value restrictions.

## Preserved coordinator errors and limits

Several local reading/collection mistakes were retained and corrected without changing product values or assertions:
- An overly broad serialized-history filter matched the local-workflows directory name and truncated output; narrower seam-name selection completed dedup reading.
- Guessed local source/manifest names were absent. Real inventories corrected them; a combined guidance output truncation was completed with smaller reads.
- One archive input used raw REST number/API URL rather than the canonical normalized issue_number/public URL. The local CLI assertion failed before archive writes; the same successful live read was normalized and archived. No GitHub request had failed or been retried.
- A parent record validator initially required taskDigest inside each review record, although that field is optional there. Required head/tree/patch/changedFiles were verified; neither independent original record nor Markdown was changed.
- One successful GitHub blob fetch returned TypeScript text. A JSON-only coordinator reader failed to parse it; that discarded response was not certified as an API byte readback. No same request was retried. The already planned first Git fetch then completed actual946-file bytes alongside the saved complete API commit/tree metadata. The source readback summary explicitly retains this limitation.

The original strict compiler0/native Bun1 public red and primary repository red remain real failures; they were not replaced with weaker checks. The public program source and primary red/green test bytes stayed identical across their relevant executions. Product code changed only the existing member same-value comparison. No dependency, public API, cap, retry, fallback, flattening or scheduling policy was added.

The original prepared task, verification, publication and both complete independent Markdown reports remain unchanged. This publication copy only extends the report artifact manifest with explicitly typed technical attachments. Raw TS/JS/map/patch bytes are declared plain-log containers for inspection, not executed report assets. Derived portable observations/receipts omit personal machine paths and identify their original local hashes; raw technical logs retain their original bytes. The original complete report Markdown is unchanged.

Required focused human review/merge and actual-main whole-task acceptance remain later gates. The observed PR test-merge commit is not actual integration. This evidence package supplies no independent Issue-closing authority.
