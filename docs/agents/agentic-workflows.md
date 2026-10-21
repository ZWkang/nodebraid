# 本地订阅 Agent 工作流

执行入口为本机 Codex 的 ChatGPT 登录。GitHub 保存 Issue、PR、review 和工程 CI；
调查、实现与反馈修复由 Codex 本地聊天自动化执行，使用订阅内的 Codex 额度并受其限额约束。
执行协议以 [local-agent.md](../../.agents/workflows/local-agent.md) 为准，领域词汇以
`CONTEXT.md` 为准。本次迁移合并后，旧 gh-aw API 执行入口删除，不同时运行两套 Agent。

```mermaid
flowchart TD
  A[本地 Codex 周期检查 GitHub] --> B[Issue / 已确认 Spec / 新 main 变更]
  B --> C[真实调查、复现、查重]
  C -->|范围明确| D[拆任务、TDD、Ponytail full]
  C -->|需要决策| E[返回 grill / spec / docs]
  D --> F[独立 Standards + Spec review、完整检查]
  F --> G[pr + show-me、完整报告和界面证据发布到原 PR]
  G --> H[GitHub CI / review]
  H -->|明确问题| D
  H -->|当前 head 已验证| I[用户最终审阅和合并]
```

## 运行方式与计费

机器和 Codex 桌面应用需要保持运行。使用当前聊天的 heartbeat，每五分钟检查一次；
这属于轮询，不承诺 webhook 实时响应。应用离线、订阅限额耗尽或连接器失效时不能执行，
恢复后重新读取 GitHub 状态；不切到付费 API，不把失败报告为没有任务。

本机已验证 `codex login status` 返回 `Logged in using ChatGPT`。检查命令：

```bash
bun run agents:check        # 检查协议、skills 和仓库中是否残留托管 API 执行入口
bun run agents:local-check  # 另检查本机 ChatGPT CLI 登录及 API-key 环境变量
bun test tests/agent-issue.test.ts tests/pr-feedback.test.ts tests/defect-scan.test.ts
```

GitHub CI 的本地协议检查只执行第一个命令，不需要本机登录或 OpenAI API key。
证据 publisher 使用 Actions 自带的 GitHub token，不要求另配发布 PAT。
`agents:check` 只验证仓库执行契约，不能证明调度器已启用或某个任务已经完成。
本地登录检查也不证明还有多少剩余额度，实际限额错误仍需保留。

GitHub 操作优先使用本地 Codex 已连接的 GitHub 工具；已登录的 Git client 也可使用。
不要求复制连接器凭据或创建 `AGENT_PR_TOKEN`。个人 `auth.json`、订阅登录文件和 API key
都不能上传到 GitHub；本方案不安装公开仓库的 self-hosted Actions runner。
官方说明见 [认证](https://learn.chatgpt.com/docs/auth#openai-authentication)、
[自动化认证](https://learn.chatgpt.com/docs/non-interactive-mode#authenticate-in-automation)和
[本地聊天定时任务](https://learn.chatgpt.com/docs/automations#schedule-a-task-inside-a-chat)。

## 自主执行范围

用户参与前期 grill、spec、领域文档和公共测试 seam，以及最终审阅和合并。
确认后，Agent 自主拆分、审计划、实现、测试、独立 review 和修正，不逐票询问。
需求、公开契约、ADR 或安全策略发生变化时返回前期讨论。

实现采用 `ponytail` full：读真实调用链，优先复用，做最小充分修复。
Standards 同时应用 `ponytail-review`，Spec 独立核对原始要求。不能因精简而删除必要的
错误处理、公共 seam 或 ADR 约束。使用同一份包含新文件的完整 patch，记录 base、tree、
patch digest、命令与结果。修正后复验，详细轨迹保留在运行记录中。

可见 Canvas 变更与场景维护使用项目 [verify-nodebraid](../../.agents/skills/verify-nodebraid/SKILL.md)。
完整审查报告、行为证据与真实截图/录屏通过 [PR 证据流程](./pr-evidence.md) 发布到当前 head。
该流程沿用现有订阅执行与 GitHub CI，不增加模型 API 或调度器。

开发循环按影响范围执行检查：

```bash
bun run check:affected             # 默认比较 HEAD，包含暂存、未暂存和未跟踪文件
bun run check:affected --base main # 同时检查相对 main 的分支差异
bun run check:affected --plan      # 只展示检查范围，不执行
```

定向通过不代表完成交付。实现或反馈修复先做定向检查，再完成双轴 review，最后由
`agents:run verify` 执行本次交付验证的全量检查；不要在它之前人工预跑同一套
`bun run check`。GitHub CI 仍执行全量检查。

Issue 标签路由见 [issue-tracker.md](./issue-tracker.md)。只有实际复现且预期已明确的缺陷，
或已确认的 spec 可以实现；风格问题、缺少测试、新需求和不明确的预期不能冒充 bug。
GitHub 是实时任务状态来源，本地 ledger 保存证据和去重元数据，不维护另一套人工任务清单。

托管 PR 使用 `feat/issue-N` 与 `[local-agent] ` 标题；也接管既有 `[agent] ` issue PR。
移除前缀、关闭 PR 或转为 draft 后不再自动处理。每次写入前重新检查当前资格和 head；
不得复用旧 head 的绿灯。新 review、编辑或已解决 thread 的新回复都需重新判断。
人类 `changes requested` 和争议 thread 不自动 dismiss／approve；需要人工批准时明确等待。

发布为 append-only，GitHub Git-data API 路径必须核对远端 tree 与已审阅 tree 一致，
使用 expected head 更新分支，不 force push。API 生成的 commit SHA 与本地 SHA 可能不同，
receipt 记录实际远端 SHA。当前 head 的 `Checks / checks`、其他已报告 CI、mergeability、
未解决反馈与有效处置共同决定能否交付给用户。未关闭 thread 的处置必须在当前 head 复核。
合并可信 main 和机械冲突修复也需测试与 review；设计或策略冲突不能擅自决定。

## 主动调查和持久证据

本地检查发现 main 有新变更时，调查自上次完整调查的 SHA 起的变更及受影响公共 seam。
首次没有基线，明确记录当前 snapshot 与实际检查区域，不虚构历史覆盖率。
在干净的、已 fetch 的 main worktree 中生成范围：

```bash
bun run agents:scan                    # 第一次 snapshot 调查
bun run agents:scan <last-reviewed-sha> # 后续完整变更范围
```

该命令写入忽略的 `.tmp/agent-defect-scan.json`。调查后按根因、症状和公共接口查重，
新 Issue 包含真实可运行复现、命令退出状态、base/head、预期契约、实际行为与验收条件。
调查失败或 Issue 未实际发布时不推进基线；没有新发现不等于全仓无缺陷。
全局 SHA 只表示变更调查位置。另用 `discovery.json` 保存公共 seam 的待办；首次迁移
显式 `init`，保守地将所有现存 package、workflow、docs 和 examples 标为 pending，
已执行的调查再以原始证据逐项完成。`sync` 保留未完成和已删除 package 的调查记录，
只有受影响的已完成 seam 会重新排队。没有新提交也继续 pending seam，不重复完整构建。

本机状态存放在 `$CODEX_HOME/local-workflows/nodebraid/`，包含 checkpoint、反馈摘要、
当前 PR head 和不可混同的阶段证据。不得存密钥。损坏状态直接报错；首次创建明确初始化。
原始工具结果与 GitHub 链接保留，不把成功注册调度、一次检查通过或本地 commit 当成整个闭环成功。

需求/spec 及其实现任务的本地副本保存在同级 `issues/<number>/`：`current.md` 方便阅读，
`current.json` 保留原始字段，`history/<content-hash>.md/.json` 保留不同版本。GitHub 仍是事实源；
本地副本不回写、不参与资格判断，不提交到源码仓库，也不随 worktree 清理。每次按既有讨论边界
完整读取 GitHub 或写入后回读成功，执行 `agents:run archive-issue`；无需新增定时任务。
相同内容不重复归档，关闭 Issue 的副本继续保留。输入与失败处理见
[本地副本约定](./issue-tracker.md#local-reading-and-archive-copies)。

## 执行命令和恢复

执行使用版本管理的 `scripts/local-agent.ts`，不再调用忽略目录中的临时验收脚本。
每次 Issue 或 PR 反馈请求有独立 run 目录，通常放在上述本机 `runs/<run-id>/`。

```bash
bun run agents:run archive-issue snapshot.json ~/.codex/local-workflows/nodebraid/issues
bun run agents:run normalize raw-github.json published-feedback.json snapshot.json
bun run agents:run prepare task-input.json /absolute/path/to/run
bun run agents:run frontier /absolute/path/to/run completed-steps.json
bun run agents:run inspect /absolute/path/to/run
bun run agents:run verify /absolute/path/to/run reviews.json decisions.json
bun run agents:run publication /absolute/path/to/run actual-remote-commit.json
bun run agents:run evaluate /absolute/path/to/run snapshot.json
```

`task-input.json` 的字段为 `run`、`repository`、`source: {kind: issue|pr, number}`、
`branch`、完整 SHA `base`、原始请求摘要 `request`、待处理反馈 `pending`，以及
`plan: [{id, blockedBy, acceptance}]`。`base` 是本轮发布将追加的远端提交；它必须是
本地验证提交的祖先。原 Issue/spec revision 和用户已确认的验收条件随输入一起归档。
`pending` 来自完整归一化快照的 `evaluateFeedback` 结果。依赖图必须无环且引用存在，
`completed-steps.json` 是已有执行证据的已完成 step ID 数组，不能越过未完成 blocker。

`prepare` 独立写入 `prepared-task.json`，重启后相同输入可恢复，变更输入需要新 run；
不能从结果 receipt 复制一个“预期 task”。`inspect` 输出当前完整 head、tree 和原始
`git diff --binary <base> HEAD` 的 SHA-256，两个 reviewer 以同一组值审查完整 patch。
`reviews.json` 是 `{standards, spec}`，每轴包含 `head`、`tree`、`patch`、实际 `report` 和
明确的 `verdict: passed|changes-requested|needs-design`；仅两轴均 passed 可验证发布。
`decisions.json` 必须恰好覆盖原 pending 的 key/digest、处置和原因。

`verify` 是托管交付全量检查的唯一入口，在干净提交上运行真实 `bun run check`，收据中的
命令保持 `bun run check`。每次尝试保留唯一日志，并检查运行前后 source 没变。失败结果
保存在 `verification.json`，原始日志不覆盖；重启后可以复验。同一 head 的新尝试也会
重新执行真实进程，不缓存或跳过检查。`publication` 读取 GitHub Git commit 原始返回值
`{sha, tree: {sha}, parents: [{sha}]}`，核对远端 tree 与已检查 tree，且第一父提交必须是
本轮 expected remote head；不能仅在后续 merge parent 中找到旧 base 就接受发布。
API 生成的远端 SHA 可以不同，但一份 run 不得绑定第二次发布。先记录发布再调整本地 ref。

证据命令为 `agents:preview --base <sha> --out <empty-dir> [--all]`、
`agents:report <run-dir> <output-dir>` 与
`agents:publish-evidence prepare <output-dir> <repository> <pr> <head>`。
先采集 preview，再将 report 生成到同一目录；report 只创建新文件。`prepare` 只生成连接器
发布计划；已有 `GITHUB_TOKEN` / `GITHUB_REPOSITORY` 的环境可直接执行
`agents:publish-evidence <output-dir> <pr> <head>`。参数、行为证据 schema、连接器操作和
CI 权限边界见 [PR 证据](./pr-evidence.md)。

`normalize` 的完整输入契约为 `scripts/github-feedback.ts` 的 `GitHubFeedback`：
`comments`、`reviews` 为每页 100 条的 REST page 数组，包含最后短页（恰好 100 条时
还要读空页）；`threads` 包含外层页和已读完 cursor 的评论；CI arrays 匹配报告总数。
实际 workflow 的 head/path/name 用于识别项目 Checks，workflow 自身的 pending/failure
也保留，不能只挑成功的 job。combined-status 响应的原始 `sha` 也必须核对当前 head。
普通 COMMENTED 不能清除同一人的 changes requested，只有其后正式批准或 dismiss
才更新有效决定。`published-feedback.json` 仅含已发布且 key/digest 精确
匹配的自己评论。新评论、编辑、resolved thread 的新回复和人类 changes requested
都进入判断。新 head 返回 `waiting-verification`，不会把旧 tree、测试和 review 改贴到新 SHA。

`evaluate` 尚未自动检查完整报告和媒体的发布回执。每次交付 ready 前，执行者还必须实际
发布并回读当前 head 的报告，记录报告 URL、source head 与 evidence commit；不能把
`evaluate` 的 ready 或 CI preview 上传成功当成这一步已完成。

调查队列的命令为：

```bash
bun run agents:discovery init /absolute/path/to/discovery.json
bun run agents:discovery sync /absolute/path/to/discovery.json
bun run agents:discovery finish /absolute/path/to/discovery.json report.json
```

命令在已 fetch 的干净 main 上执行。`report.json` 含 `seam`（如 `packages/kernel`）、
`head`、`evidence`、`remaining: [剩余公共接口的唯一名称]` 和 `commands: [{command, exitCode}]`。命令失败、报告缺失或过期不会
清掉 pending；原始命令输出、查重和 Issue 发布结果仍随报告归档。成功报告保存成不可变
evidence 文件再原子更新队列；相同报告恢复不会重复完成任务。一次完成只代表报告中实际
调查的公共接口，仍未检查的部分必须在 `remaining` 中拆成剩余待办（全部完成时显式 `[]`），不能用一行概述声称整个 package 已覆盖。

## GitHub 合并门禁

配置默认分支时使用独立的 `main-pr-and-checks` ruleset：required PR、由 GitHub Actions 上报的
`checks`、最新 main、讨论解决和非快进/删除保护。单人维护时 approving review count
为 0，避免作者无法批准自己的 PR；最终审阅和合并仍由用户手动完成。原 disabled `deny`
规则含限制所有更新等其他策略，不能直接启用代替上述配置。
可审查的请求正文保存在 `docs/agents/main-ruleset.json`；它只是配置输入，不代表远端已启用。

只有读回 active rules 及默认分支后才能报告生效。管理操作需要已有 GitHub 管理登录，
连接器不能写 rulesets 或认证失效时保留错误；准备好的 JSON 不算已生效。不能通过
关闭 TLS 校验、复制连接器凭据或调用付费模型完成配置。

## 验证与验收状态

开发迭代执行 `bun run check:affected`，按行为增加公共 seam red/green、状态序列、故障注入、
真实 Chromium、声明隔离或 package 消费测试。正式交付仍需全量 `bun run check`，托管任务
由 `agents:run verify` 执行一次，不在此前重复人工执行。具体选择来自任务风险；不宣称每个
包都已拥有属性测试、状态模型或故障注入。禁止弱化断言、假成功和静默 fallback。

首次真实验收使用 [Issue #6](https://github.com/ZWkang/nodebraid/issues/6)：

- 在 `9d2964337e7e1a86d98d02d7ad7397905375087d` 执行 Dagre 公共 seam 复现，exit **1**；
  普通 ID 通过，合法特殊 ID 丢失一条边的布局约束。
- 旧 API triage 运行 [39364597209](https://github.com/ZWkang/nodebraid/actions/runs/39364597209)
  在启动前明确失败：没有 `CODEX_API_KEY`／`OPENAI_API_KEY`。这不计作本地订阅验收。
- 后续本地实现、双轴 review、PR、实际 CI 与反馈修复分别记录其真实结果；不人为破坏
  main 或伪造 review 来补齐验收项目。最终合并由用户执行。

本地执行层测试使用隔离 Git 仓库和真实子进程，覆盖检查失败/恢复、task 不可重绑、
新 head、分页和依赖前沿。这些 fixture 结果与下一次真实远端 CI/review 修复验收分开记录；
未真实触发的线上分支继续标为 unverified。

新增 `Checks / preview` 在确切 PR head 上采集证据；`workflow_run` publisher 只从受信任
main 执行，并只接受 PR artifact 的 preview 数据。完整独立审查报告通过本地授权路径发布。
新 publisher 合入默认分支后才会触发；未读到真实 run、证据分支和 PR 回读结果前，不报告
远端部署或端到端验收完成。此交付不修改独立 Issue #10 的 GitHub 合并门禁。

在 Codex Scheduled 中关闭这条本地自动化可停止新调度，正在运行的 turn 另行取消。
GitHub CI 不依赖这台机器；已有 GitHub secrets 不被自动删除，但迁移后不再被 AI 工作流使用。
