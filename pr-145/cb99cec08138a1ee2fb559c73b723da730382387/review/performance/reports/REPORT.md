# Kernel 性能比较

Base：`843c9484a7d32e957dceba6658b31a5662560329`；optimized：`ece568a07a2f56ae25d6daa63d9f16d88108a5af`。
运行时：`Bun 1.4.2`；harness SHA-256：`e41e3d7fc9fe2ebd88dbd333d2e07b31dc18b6ea71a3639c6f78460db5e03d81`。

历史 base 用于展示原始基线；本次 base 与 optimized 使用相同字节的 harness，在同一轮中相邻配对、串行运行。
12 个 sparse 场景，每场景 3 对独立进程；每进程 20 次 warmup、30 次事务计时。全局 18 对 AB、18 对 BA。
无强制 GC、无计时阈值。计时只包含公开 kernel.transact；准备与断言在窗口外，但其分配仍可能影响后续自然 GC。

| 节点 / 操作 | 历史 base 中位 ms | 本次 base 中位 ms | optimized 中位 ms | 配对降幅中位 | 3 对降幅范围 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1,000 / move-one | 0.754 | 0.755 | 0.428 | +42.1% | +34.9% 至 +46.7% |
| 1,000 / move-1pct | 0.805 | 0.917 | 0.403 | +45.2% | +44.9% 至 +87.8% |
| 1,000 / rewire-one | 0.725 | 0.765 | 0.525 | +29.6% | +24.2% 至 +38.4% |
| 1,000 / net-zero | 0.334 | 0.307 | 0.305 | -1.1% | -4.2% 至 +6.5% |
| 10,000 / move-one | 10.049 | 11.704 | 5.970 | +53.6% | +40.6% 至 +57.5% |
| 10,000 / move-1pct | 9.888 | 11.716 | 6.054 | +51.0% | +9.1% 至 +54.7% |
| 10,000 / rewire-one | 9.711 | 11.164 | 8.011 | +25.3% | +24.2% 至 +38.0% |
| 10,000 / net-zero | 3.239 | 3.843 | 3.339 | +13.5% | +9.0% 至 +14.5% |
| 50,000 / move-one | 68.387 | 66.228 | 35.042 | +45.6% | +42.9% 至 +54.2% |
| 50,000 / move-1pct | 66.487 | 71.370 | 33.943 | +50.8% | +46.6% 至 +57.3% |
| 50,000 / rewire-one | 64.181 | 71.518 | 48.889 | +33.6% | +26.9% 至 +37.8% |
| 50,000 / net-zero | 22.038 | 20.967 | 22.740 | -8.9% | -13.5% 至 -8.2% |

正降幅表示 optimized 耗时减少，负数表示变慢；每对降幅基于两个进程各自 30 次计时的中位数。
表中 ms 是同一场景 90 次观测的合并中位数；配对降幅的中位数与合并中位数之比不是同一统计量。

## 进程间波动与尾延迟

| 节点 / 操作 | base 3 次中位 ms | optimized 3 次中位 ms | base / optimized 合并 p95 ms | base 相对历史漂移 |
| --- | --- | --- | ---: | ---: |
| 1,000 / move-one | 0.755 / 0.732 / 0.763 | 0.402 / 0.424 / 0.496 | 1.381 / 1.064 | +0.1% |
| 1,000 / move-1pct | 0.721 / 0.735 / 3.409 | 0.397 / 0.403 / 0.415 | 14.564 / 0.979 | +13.9% |
| 1,000 / rewire-one | 0.685 / 0.780 / 0.831 | 0.519 / 0.549 / 0.512 | 1.269 / 1.113 | +5.5% |
| 1,000 / net-zero | 0.292 / 0.304 / 0.326 | 0.304 / 0.307 / 0.305 | 0.752 / 0.818 | -8.0% |
| 10,000 / move-one | 11.249 / 10.087 / 14.505 | 6.685 / 4.680 / 6.170 | 20.546 / 8.537 | +16.5% |
| 10,000 / move-1pct | 10.232 / 11.993 / 11.878 | 5.018 / 5.433 / 10.798 | 16.442 / 31.967 | +18.5% |
| 10,000 / rewire-one | 10.617 / 11.214 / 12.024 | 7.936 / 6.950 / 9.109 | 14.587 / 12.436 | +15.0% |
| 10,000 / net-zero | 3.843 / 3.727 / 3.863 | 3.325 / 3.391 / 3.301 | 9.046 / 5.209 | +18.7% |
| 50,000 / move-one | 67.228 / 65.146 / 65.804 | 36.544 / 29.842 / 37.574 | 75.326 / 50.711 | -3.2% |
| 50,000 / move-1pct | 73.723 / 72.537 / 65.667 | 31.472 / 35.668 / 35.096 | 91.020 / 42.876 | +7.3% |
| 50,000 / rewire-one | 71.871 / 65.096 / 83.756 | 44.727 / 47.615 / 55.612 | 105.125 / 76.274 | +11.4% |
| 50,000 / net-zero | 20.056 / 19.574 / 23.318 | 22.767 / 21.188 / 25.399 | 29.586 / 32.761 | -4.9% |

## 净零对照与解释范围

净零事务保持原 View 与 revision，不进入新的 committed View 构建路径。其变化单独列出，不能据此宣称该路径受益：
- 1,000 节点：3 对降幅 -4.2%, -1.1%, +6.5%。
- 10,000 节点：3 对降幅 +13.5%, +9.0%, +14.5%。
- 50,000 节点：3 对降幅 -13.5%, -8.2%, -8.9%。

3 次独立重复仅描述本机观测与波动，不构成跨机器保证或统计显著性结论。
RSS 是进程前后净值，不能当作总分配量、峰值或 GC 暂停时间；原始 JSON 保留内存读数。
每次调用都检查真实 Commit／净零结果、图规模、revision、ChangeSet、旧 View 与相关查询。
配对期间保存并比对两套 package 文件哈希；完整命令、退出码、运行顺序、负载与原始计时保留在 paired 目录。

## 独立完整矩阵

另保留 unchanged run-baseline.py 的 20 场景 optimized 观测（含 hub、nested、保留 20 个旧 View）。
这组与历史 base 不相邻配对；可验证覆盖范围并展示观测，不把两组差值直接当成优化因果收益。

| 场景 | 历史 base 中位 ms | optimized 完整矩阵中位 ms | optimized 3 次中位范围 ms |
| --- | ---: | ---: | ---: |
| sparse-1000-move-one-retain0 | 0.754 | 0.410 | 0.377 至 0.449 |
| sparse-1000-move-1pct-retain0 | 0.805 | 0.416 | 0.401 至 0.472 |
| sparse-1000-rewire-one-retain0 | 0.725 | 0.514 | 0.494 至 0.524 |
| sparse-1000-net-zero-retain0 | 0.334 | 0.307 | 0.289 至 0.337 |
| sparse-10000-move-one-retain0 | 10.049 | 5.244 | 4.790 至 6.116 |
| sparse-10000-move-1pct-retain0 | 9.888 | 5.662 | 5.391 至 5.974 |
| sparse-10000-rewire-one-retain0 | 9.711 | 7.255 | 6.638 至 8.715 |
| sparse-10000-net-zero-retain0 | 3.239 | 3.196 | 2.914 至 3.738 |
| sparse-50000-move-one-retain0 | 68.387 | 31.776 | 29.962 至 36.899 |
| sparse-50000-move-1pct-retain0 | 66.487 | 31.728 | 28.641 至 33.275 |
| sparse-50000-rewire-one-retain0 | 64.181 | 49.572 | 45.675 至 53.200 |
| sparse-50000-net-zero-retain0 | 22.038 | 26.892 | 23.255 至 31.804 |
| hub-10000-move-one-retain0 | 9.763 | 5.276 | 4.657 至 5.732 |
| hub-10000-rewire-one-retain0 | 10.408 | 7.601 | 7.245 至 8.836 |
| nested-10000-move-one-retain0 | 10.574 | 5.550 | 5.306 至 5.744 |
| sparse-10000-move-one-retain20 | 10.338 | 5.438 | 5.284 至 5.672 |
| hub-50000-move-one-retain0 | 66.706 | 32.547 | 31.295 至 33.572 |
| hub-50000-rewire-one-retain0 | 65.302 | 50.321 | 44.650 至 59.308 |
| nested-50000-move-one-retain0 | 77.721 | 36.313 | 33.896 至 38.525 |
| sparse-50000-move-one-retain20 | 67.846 | 34.883 | 32.678 至 45.475 |

## base CPU 采样

以下百分比仅为事务时间窗内样本占比，不是阶段耗时；按完整祖先链互斥分类。
GC、native 执行和采样等待不能由现有样本单独可靠拆分；没有 GC 标记不表示没有 GC。

| Profile | 事务窗口样本 / measured transact 栈吻合数 | 类别样本占比 |
| --- | ---: | --- |
| hub-50000-rewire-one-r1.cpuprofile | 3073 / 3069 | draft-index 15.5%; graph-validation 15.5%; snapshot-and-view-excluding-index 52.6%; committed-index 15.4%; map-copy 0.7%; unattributed-or-boundary-sample 0.1%; entity-write 0.0%; change-set 0.0% |
| hub-50000-rewire-one-r2.cpuprofile | 3131 / 3124 | draft-index 15.8%; graph-validation 15.8%; snapshot-and-view-excluding-index 51.9%; committed-index 15.3%; map-copy 1.0%; unattributed-or-boundary-sample 0.2%; entity-write 0.0% |
| sparse-50000-move-one-r1.cpuprofile | 3131 / 3126 | draft-index 15.6%; graph-validation 15.3%; snapshot-and-view-excluding-index 52.3%; committed-index 15.6%; map-copy 0.9%; unattributed-or-boundary-sample 0.2%; other-transaction 0.1%; change-set 0.0%; entity-write 0.0% |
| sparse-50000-move-one-r2.cpuprofile | 3099 / 3095 | draft-index 15.2%; graph-validation 14.8%; snapshot-and-view-excluding-index 52.7%; committed-index 16.0%; map-copy 1.0%; change-set 0.1%; unattributed-or-boundary-sample 0.1%; other-transaction 0.1% |
| sparse-50000-move-one-r3.cpuprofile | 3124 / 3120 | draft-index 15.9%; graph-validation 15.3%; snapshot-and-view-excluding-index 52.0%; committed-index 15.8%; unattributed-or-boundary-sample 0.1%; map-copy 0.9% |
| sparse-50000-net-zero-r1.cpuprofile | 981 / 977 | draft-index 51.6%; graph-validation 45.8%; map-copy 2.2%; unattributed-or-boundary-sample 0.4% |
| sparse-50000-net-zero-r2.cpuprofile | 984 / 982 | draft-index 48.6%; graph-validation 47.9%; map-copy 2.9%; change-set 0.1%; other-transaction 0.2%; entity-write 0.1%; unattributed-or-boundary-sample 0.2% |

## optimized CPU 采样

以下百分比仅为事务时间窗内样本占比，不是阶段耗时；按完整祖先链互斥分类。
GC、native 执行和采样等待不能由现有样本单独可靠拆分；没有 GC 标记不表示没有 GC。

| Profile | 事务窗口样本 / measured transact 栈吻合数 | 类别样本占比 |
| --- | ---: | --- |
| hub-50000-rewire-one-r1.cpuprofile | 2139 / 2135 | map-copy 1.2%; draft-index 21.8%; graph-validation 21.7%; snapshot-and-view-excluding-index 54.8%; unattributed-or-boundary-sample 0.2%; entity-write 0.1%; other-transaction 0.1% |
| hub-50000-rewire-one-r2.cpuprofile | 2161 / 2158 | draft-index 22.3%; graph-validation 21.5%; snapshot-and-view-excluding-index 54.8%; map-copy 1.2%; unattributed-or-boundary-sample 0.1%; entity-write 0.0%; other-transaction 0.1% |
| sparse-50000-move-one-r1.cpuprofile | 1979 / 1976 | map-copy 1.7%; draft-index 34.5%; graph-validation 34.6%; snapshot-and-view-excluding-index 29.0%; unattributed-or-boundary-sample 0.2%; entity-write 0.1%; other-transaction 0.1% |
| sparse-50000-move-one-r2.cpuprofile | 1679 / 1676 | draft-index 35.5%; graph-validation 33.3%; snapshot-and-view-excluding-index 29.7%; map-copy 1.1%; other-transaction 0.2%; unattributed-or-boundary-sample 0.2% |
| sparse-50000-move-one-r3.cpuprofile | 1757 / 1755 | draft-index 33.6%; graph-validation 33.4%; snapshot-and-view-excluding-index 30.8%; map-copy 1.9%; entity-write 0.1%; other-transaction 0.1%; unattributed-or-boundary-sample 0.1% |
| sparse-50000-net-zero-r1.cpuprofile | 968 / 966 | draft-index 50.1%; graph-validation 47.8%; map-copy 1.7%; other-transaction 0.2%; unattributed-or-boundary-sample 0.2% |
| sparse-50000-net-zero-r2.cpuprofile | 1088 / 1086 | draft-index 49.0%; graph-validation 48.5%; map-copy 2.2%; unattributed-or-boundary-sample 0.2%; entity-write 0.1% |

## 追加净零诊断与最终判断

原主对照的 50k 净零三对均慢 8.24–13.51%。随后固定配置的六对复测三慢三快，配对变化中位为 +0.66%（正数为更慢），范围 −5.95% 至 +27.78%。两批均完整保留；不能宣称净零稳定提速或普遍无回退，原因仍未定位。见 [全部九对诊断](netzero-diagnostic.md)。

有效 Node/Edge 提交的收益在三组配对中都出现；不把这项结果扩大为全部路径或浏览器帧率承诺。两项优化保持现有公开契约，不增加新限制。

Profile 原始采样结束可早于最后事务结束不足一个采样间隔。分析器记录实际覆盖与未观测尾部，未增加任意容差，原分类函数与全部采样分类保持不变，见 [修正说明](profile-range-correction.md)。
