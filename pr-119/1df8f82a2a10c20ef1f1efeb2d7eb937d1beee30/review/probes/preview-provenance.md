# Preview provenance

The changed-source CI preview selected only the Document file scene. The trusted main publisher verified CI run40266720778, PR119 and source head1df8f82a2a10c20ef1f1efeb2d7eb937d1beee30 before publishing it. Its original17 files were read back exactly and remain at [immutable CI preview](https://github.com/ZWkang/nodebraid/blob/cde2aacdf59dd3fe0b977756afbfb2b878aaef5a/pr-119/1df8f82a2a10c20ef1f1efeb2d7eb937d1beee30/preview/preview.json).

The complete mapped set was separately captured with the unchanged versioned main collector using --all on that same published head, base, tree and patch. All five native scenarios passed. The complete bundle uses that unmodified full collector manifest and its55 original files, each verified by bytes/hash. The original CI preview is preserved separately; it is not relabeled as having run five scenes.

The source IDs and local validation receipt are:

```json
{
  "source": {
    "base": "c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d",
    "head": "1df8f82a2a10c20ef1f1efeb2d7eb937d1beee30",
    "tree": "f7cc6c61b670b49c3d2cfe4079471d7df9adaf58",
    "patch": "7486a70010106403bbc66592cf79b9643fea9951e1f27f1e2e656d8afe64d133"
  },
  "origin": "actual current-head local collector --all",
  "collector": {
    "scriptCommit": "c7d7f1b8c5a729a1e127bf6a1a080a1487b4471d",
    "scriptBlob": "56a9f6ddcce958d5d54af12c0b67f9a2eb8378b9",
    "sourceHead": "1df8f82a2a10c20ef1f1efeb2d7eb937d1beee30",
    "configuration": "--all; exact actual source head, unchanged versioned main collector"
  },
  "scenes": [
    "viewport",
    "selection-history",
    "port-connection",
    "clipboard",
    "document-files"
  ],
  "trustedCIPreviewCommit": "cde2aacdf59dd3fe0b977756afbfb2b878aaef5a",
  "trustedCIPreviewScenes": [
    "document-files"
  ]
}
```

The complete [preview manifest](../../preview/preview.json) describes interaction before/after at one head, not a visual comparison with the base. Both original recording and labeled slow review playback remain distinct artifacts; playback does not measure performance. Adversarial array failures are proven by the public compiled controls, not by Canvas screenshots.
