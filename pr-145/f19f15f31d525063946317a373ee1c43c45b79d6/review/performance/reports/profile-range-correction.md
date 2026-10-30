# Profile 时间覆盖断言修正记录

初版 owned 分析器额外断言 `profile.startTime <= firstTransaction.start <= lastTransaction.end <= profile.endTime`。该假设被真实 CPU profile 否定，曾导致分析器抛出 AssertionError；这是分析器自身错误，不能据此把原始采样判为失败。

初版字节保留为 `analyze-profiles-v2.initial.py`，SHA-256：`0c90a1500df99bfe478ff386a9dbdca2f68da80ac1705bd84696a0db9476fb35`。原始 v2 `analyze` 函数完全不改；AST 比较与全部分类字段比较通过。

修正计算每笔事务区间与 profile 声明区间的实际交集，记录首部/尾部未覆盖时长、部分/完全覆盖事务数和栈吻合率。没有加入容差，没有改动 raw profile 或 harness，没有给未观测尾部补零成本。

对保留的 7 份 base 与 7 份 optimized profile 解析完成；全部 14 份均与 60 笔事务发生交集，其中如下 6 份最后一笔只有部分覆盖。其余文件的全部事务均在声明区间内。

| 版本 / Profile | 未覆盖头部 ms | 未覆盖尾部 ms | 覆盖 / 完全覆盖事务 | measured transact 栈吻合率 |
| --- | ---: | ---: | ---: | ---: |
| base / hub-50000-rewire-one-r1.cpuprofile | 0.000000 | 0.022000 | 60 / 59 | 99.870% |
| base / hub-50000-rewire-one-r2.cpuprofile | 0.000000 | 0.046250 | 60 / 59 | 99.776% |
| base / sparse-50000-move-one-r3.cpuprofile | 0.000000 | 0.489250 | 60 / 59 | 99.872% |
| optimized / hub-50000-rewire-one-r1.cpuprofile | 0.000000 | 0.216000 | 60 / 59 | 99.813% |
| optimized / hub-50000-rewire-one-r2.cpuprofile | 0.000000 | 0.464000 | 60 / 59 | 99.861% |
| optimized / sparse-50000-move-one-r3.cpuprofile | 0.000000 | 0.524500 | 60 / 59 | 99.886% |

这些是 profile 声明区间的覆盖量，不是连续 CPU 观测。即便一个事务完全落在区间中，采样间隔仍然存在；百分比只描述捕获到的样本，不能据此精确计量 GC、native 执行或等待。

14 份 profile 的栈吻合率范围为 99.592% 至 99.886%。
