# assets/_raw — file thô truoc post-process

Bo file gen tu ChatGPT/ImageGen vao day, roi:

```bash
python3 scripts/asset_postprocess.py --init-manifest   # tao manifest.tsv
#   -> mo manifest.tsv, dien cot `name` theo naming convention (asset-list-designer.md §11)
python3 scripts/asset_postprocess.py --dry-run         # xem bao cao QA truoc
python3 scripts/asset_postprocess.py                   # ghi that vao assets/
```

Script lam: chroma-key removal (#00ff00 / #ff00ff) -> despill -> crop theo alpha that
-> resize ve native production crop (asset-generation-prompts.md §2) -> pad + anchor
-> doi ten -> QA report theo §16.1.

| Thu muc | La gi |
|---|---|
| `assets/_raw/` | file thô + `manifest.tsv` (khong dung trong game) |
| `assets/_review/` | asset edge phuc tap (§1.8) cho duyet mat truoc khi dung |
| `assets/_qa/` | anh QA 4x / 1x / 32px de kiem tra do doc duoc |
| `assets/` | asset production that |

Ba thu muc `_raw/`, `_review/`, `_qa/` nen them vao `.gitignore` neu khong muon commit
file thô (anh 1024x1024 rat nang).
