# Current-head CI and native evidence

Source: `64812aa11c3194a34e1866e500c5022305014cac`; tree `4800054aa64c34564818f5a5533b4e6698a35e32`.

- [Checks run](https://github.com/ZWkang/nodebraid/actions/runs/40632139722): checks/preview success; Deploy skipped as expected for a PR. Checks executed `2b783c2ed16f06d70de935c1d32988d6819b2cb1`, the GitHub test merge with ordered parents e282 +648; the actual Git tree is the same4800054. This is not actual main integration.
- Linux:1608 tests,9572 assertions. Local formal verification ran at37d7131 with1608 tests,9578 assertions. The local37 to published648 same-tree/parent mapping is recorded separately.
- Preview checked out source648 directly. The dynamically mapped5 scenes and55 original files were read back from immutable614d24b47ac4d187f938c8e66f2e6f50ff4a3abf and verified by bytes/size/SHA256/Git blob/header. No additional local --all capture or media upload was performed.
- [Trusted publisher](https://github.com/ZWkang/nodebraid/actions/runs/40632581834) checked out main e282 and its raw eligibility output bound source run40632139722/head648/PR135 before publishing.
- Original recording and15x review retain separate hashes. Before/after shows interaction at the same sourcehead, not base comparison or performance. The Bun public diagnostic-failure controls do not claim browser Fault UI coverage.

The canonical full report and both independent review Markdown texts remain byte-identical. This supplement preserves actual CI provenance and raw logs.
