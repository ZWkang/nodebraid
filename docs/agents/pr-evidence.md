# PR 审查、验证与界面证据

本流程把已执行的独立 Standards/Spec 审查、工程检查与真实 Examples Application 操作
放到 PR 可访问的位置。源代码、完整检查、界面场景和证据发布各自有结果；截图或成功上传
不能替代其他结果。执行资格、用户确认范围与按风险分级合并仍由
[本地工作流](../../.agents/workflows/local-agent.md) 决定。

## 入口与产物

```bash
bun run agents:preview --base <review-base-sha> --out <empty-output-dir> [--all]
bun run agents:report <run-dir> <output-dir>
bun run agents:publish-evidence prepare <output-dir> ZWkang/nodebraid <pr-number> <published-head-sha>
```

- `agents:preview` 要求干净、已提交的工作树，将传入 base 与 HEAD 的 merge-base 作为
  实际比较起点。它构建真实 Examples Application，通过锁定版本的 `agent-browser`
  驱动 Chromium，使用本机 ffmpeg 编码 MP4，保存 `preview.json`、PNG、MP4、可访问性快照与操作/构建日志。
  输出目录必须不存在或为空；每次尝试使用新目录，失败产物也保留。
- `agents:report` 读取既有 run 的 `prepared-task.json`、`verification.json`、
  `publication.json`，复用执行层校验，输出 `report.md`、`report.json`、两轴原文与
  已声明日志。它只创建新文件，不覆盖旧报告。可先采集 preview，再把 report 生成到
  同一输出目录；已有 preview 文件不会被当作 report 的输入。
  报告按 [pr-risk](../../.agents/skills/pr-risk/SKILL.md) 展示两轴风险依据、验证证据、
  回滚方案和最终分级/路由。历史记录缺失分级时明确显示 unclassified，需要人工审阅。
- `agents:publish-evidence prepare` 校验本地 manifest、身份和 artifact 字节，生成
  `publication-input.json`，供已连接的 GitHub 工具发布。它本身不写 GitHub。

两个 manifest 的 `source` 都含 `base`、`head`、`tree`、完整 binary patch 的 SHA-256；
其中 `base` 使用 prepared task 的目标分支审查起点，追加修复时也不改用源分支 head。
report 另保留 `localHead` 与独立保存并经实际第一父提交验证的 `expectedParent`；
其中 `head` 是 `publication.json` 的实际发布提交。
同一 bundle 的 base/head/tree/patch 必须一致。若 Git-data API 生成了不同于本地的 SHA，
先按本地协议记录 `publication`，再在实际发布 head 上采集 preview；不能手改 manifest
给旧证据换一个 SHA。所有 artifact 都声明相对路径、类型与 SHA-256；缺失文件、路径逃逸、
symlink、hash 不符或身份不一致直接报错。只复制明确声明的日志与报告，不扫描打包整个 run
或用户配置目录；发布前确认这些材料可公开，不把凭据放入日志、截图或 JSON。
旧 run 缺少 `expectedParent` 时保留其原文件和已发布报告，当前报告命令明确拒绝重生成；
另建新 run，不能给旧结果补写父提交或改变其审查起点。

## 场景与覆盖边界

可见 Canvas 变更和场景维护使用项目
[verify-nodebraid](../../.agents/skills/verify-nodebraid/SKILL.md) 及其
[feature map](../../.agents/skills/verify-nodebraid/features/README.md)。当前场景为 Viewport、
Selection/Duplicate/History、Port Connection、系统 Clipboard、Document 文件往返和 Node 创建/编辑。场景选择来自
[`preview-scenarios.ts`](../../scripts/preview-scenarios.ts)，`--all` 执行全部场景。

采集器为每个场景建立独立 session，固定偶数尺寸页面并开始录制后检查真实页面 ready 状态和初始
Canvas metrics，再使用原生鼠标、键盘操作；截图之外还断言结果。Before/After 表示
**同一 head 上操作前后的状态**，并非 base 与 head 的视觉差异。失败会留下原因及能够取得的
截图、快照和日志，并返回非零状态；没有选中场景时记录 `not-applicable` 及原因。

原始 `recording.mp4` 保留 agent-browser 输出；`review.mp4` 将同一批真实帧的时间轴
放慢 15 倍，便于审阅。它不改变应用操作或断言，不能用于测量性能；两份文件分别保存 hash。

这些场景不等于全部公共 API 覆盖。Examples Application 的手动 Auto layout 控件由
Basic SVG 浏览器 suite 验证；这些 preview 场景不点击该按钮，不能用它们的截图宣称
执行了 Layout。布局变更需另外保存实际点击前后的证据。Documentation Site 也不在这些
场景内。`bun run check`、任务特定验证与独立审查仍分别执行，未覆盖项保留在报告中。

## 行为证据输入

run 可额外提供 `behavior-evidence.json`，内容是以下记录的数组：

```ts
type BehaviorEvidence = {
  id: string;
  acceptance: string;
  command: string;
  exitCode: number | null;
  log?: string;
  phase: 'red' | 'green' | 'check';
  expectedExitCode?: number;
  status: 'passed' | 'failed' | 'not-run';
};
```

`id` 必须唯一，`acceptance` 写明验证的行为与预期/实际差异，`command` 保存可重放命令。
已执行记录必须有实际非负整数退出码和 run 目录内的原始日志；日志可用该目录内的绝对路径
或相对路径。`passed` 表示退出码符合预期，`failed` 表示不符合，默认预期为 0。
已执行的 `red` 必须显式给出非零 `expectedExitCode` 并解释行为失败；`green` 只能预期 0。
`not-run` 的 `exitCode` 必须为 `null`，且不能附执行日志。报告保留失败与未运行项。

非零退出本身不能证明回归有效；审查者仍需读日志，区分行为断言失败与编译、安装或环境错误。
这份输入整理已有真实验证，不启动另一套测试系统。缺少文件时报告明确显示
`Behavior evidence: not provided`；空数组显示没有声明检查，不推断 red/green 已通过。

## 本地连接器发布

没有现成 `GITHUB_TOKEN` 时使用已连接的 GitHub 工具；不复制连接器或订阅登录凭据。
以下步骤在已有发布授权内执行，并保留原始工具结果：

1. 读取目标 PR，确认仍 open、所属仓库与当前 head；读取该 head 的 Git commit，核对
   tree 与 manifest。运行上述 `prepare`，读取 `publication-input.json`。发布前再次
   使用 `loadEvidenceBundle` 校验输入文件，不能把可编辑 plan 当作已验证的远端事实。
2. 只上传 plan/bundle 声明的文件。按原始字节重新核对 SHA-256，再用 `create_blob`
   的 `encoding: base64` 上传，记录返回的 blob SHA。远端路径为
   `pr-<number>/<完整 head SHA>/preview/<artifact path>` 或 `review/<artifact path>`；
   `loadEvidenceBundle` 返回的文件键已含命名空间，不能由 artifact 自报路径选择写入另一类证据。
3. 读取 `pr-evidence` 分支当前 ref、commit 和 tree。已有分支时用该 tree 作为
   `create_tree.base_tree_sha`，保留其他 PR/head 的所有文件；新 commit 的
   `parent_sha` 使用刚读到的证据分支 head。首次发布创建只含证据文件的 tree，
   使用已核验的源 head 作首父，不修改源分支。
4. 再读 PR 当前 head。已有证据分支用 `update_ref`，指定刚读到的 `expected_sha`
   和 `force: false`；首次用 `create_branch` 指向新证据 commit。租约冲突时重读
   ref/tree 并重新组合，不强推、不删除已有证据。读回 ref 和声明文件以确认实际发布。
5. 再读 PR 最新正文与 head。使用
   [`replaceEvidenceBlock`](../../scripts/pr-evidence.ts) 生成更新，只替换
   `<!-- nodebraid-evidence:begin -->` 至 `<!-- nodebraid-evidence:end -->` 区块，
   保留作者正文。marker 残缺或重复时停止，不能猜测替换范围。若此次只有报告或只有 preview，
   先在任何上传前，从固定的证据 commit 读取另一份 manifest，校验完整 base/head/tree/patch
   及其声明文件的 hash 后组合；不能只检查 report.md 存在。保留已有完整报告链接。
6. 调用 `update_pull_request` 更新正文，随后读回 PR、head 与完整正文，确认未过期且内容
   一致。保存 PR URL、当前 source head/tree、证据 commit、报告 URL 与正文回读结果。
   只有 plan、blob 或 commit 创建成功，都不能称为 PR 证据已经发布。

CLI 也支持通过已有 GitHub API 登录直接执行：

```bash
# 环境中已有 GITHUB_TOKEN 与 GITHUB_REPOSITORY=ZWkang/nodebraid
bun run agents:publish-evidence <output-dir> <pr-number> <published-head-sha>
```

此路径通过 GitHub API 读回 current head/tree、追加证据 commit、更新正文并回读，成功后
写入本地 `publication-receipt.json`。这些环境变量用于 GitHub 发布，不是模型 API。
连接器路径保存同等实际回执；任一步失败、权限不足或 head 变化都显式记录，不能用静态链接
或本地文件代替成功结果。

## CI 权限与保存位置

[`Checks`](../../.github/workflows/test.yml) 的 `preview` job checkout 确切 PR head，
仅有 `contents: read`，不持久化 Git 凭据。它执行 collector，并在失败时也尝试上传
`pr-evidence` artifact；未产出文件会明确失败。

[`Publish PR evidence`](../../.github/workflows/pr-evidence.yml) 通过 `workflow_run`
接收完成的 Checks。具有写权限的 publisher 只从默认分支 `main` checkout 受信任代码，
重新读取来源 workflow 的 repository/path/event/head，并找到仍 open 且 head 精确相同的
唯一 PR，不信任 artifact 自报的 PR 号。下载前先运行只读
`agents:publish-evidence preflight`，完整读取源 workflow 和 commit 关联 PR 的所有分页。
源 PR 已关闭或 head 已被替换时，输出明确的 `not-applicable` 原因及 `publish=false`，跳过下载与
发布，不生成发布回执。仍有当前 PR 时输出 `publish=true`，之后仍须下载、验证并在实际发布时
重新检查 PR/head；API 读取失败、来源身份错误、多个匹配 PR 和当前 PR 缺失 artifact 仍然失败。
preflight 只用于 CI，要求既有 `GITHUB_TOKEN`、`GITHUB_REPOSITORY`、`GITHUB_EVENT_PATH` 和
runner 提供的 `GITHUB_OUTPUT`，不会新增登录或修改权限。
下载 artifact 后按数据验证，不执行 PR 脚本或生成的
HTML。这条 CI 路径只接受 preview，不接受 PR 代码提供的独立审查报告；没有已发布报告时，
PR 区块明确写“独立审查与本地验证报告：未提供”。完整本地报告走前述授权发布路径。

证据文件保存在独立 `pr-evidence` 分支的 `pr-<number>/<完整 head SHA>/`；其中
`preview/` 属于 PR 运行产生的视觉证据，`review/` 属于独立审查与验证报告，两个命名空间
互不覆盖。截图在 PR
正文展示，MP4 录屏和完整报告提供链接。分支只追加 commit，不删除旧 head 目录；同 head
再次发布的旧版本仍可通过此前 evidence commit 查看。源码分支与 Documentation Site
部署不被这条流程改写，Actions artifact 也不是唯一长期存储。

新 `workflow_run` publisher 必须先合入默认分支，之后才会按上述事件触发。在读取真实
workflow run、证据分支与 PR 回读结果前，只能报告本地实现/验证完成，不能称远端自动发布
已经部署或端到端运行成功。

## 交付判断与边界

每次报告 ready 前，执行者必须确认完整报告已实际发布到当前 PR head，并保存可访问报告
URL、source head 与 evidence commit；有可见变化时同时核验 preview 或明确未完成原因。
当前 `agents:run evaluate` 校验代码执行记录、CI 与反馈，**尚未自动校验证据展示回执**。
因此它返回 `ready` 或 `autoMergeCandidate` 不是报告/媒体已发布或合并前 ticket/验收
已完成的证明，执行者仍须完成上述发布与回读，以及本地工作流规定的合并前核对。

该实现沿用现有本地 Codex 调度，不增加模型 API、外部模型调用或新调度器；审阅和合并
按 [pr-risk](../../.agents/skills/pr-risk/SKILL.md) 路由。GitHub 分支保护/合并门禁仍是独立 [Issue #10](https://github.com/ZWkang/nodebraid/issues/10)，
本流程不修改其设置，也不把本地配置文件当成远端生效证据。

场景 skill 借鉴 pstack 的
[create-verification-skill](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/create-verification-skill/SKILL.md)
与 [maintain-verification-skill](https://github.com/backnotprop/pstack/blob/e44668c2aad92eacf4e84df47984121fefb11b82/skills/maintain-verification-skill/SKILL.md)，
PR 证据展示参考 [Magpie #1331](https://github.com/yetone/magpie/pull/1331) 的截图、录屏及
局限说明；实际执行使用本仓库的 `agent-browser` 和 GitHub 发布接口。本次不包含
`create-formal-verification-skill` / `maintain-formal-verification-skill` 或任何形式证明工具链。
