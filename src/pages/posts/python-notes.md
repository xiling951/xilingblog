---
layout: ../../layouts/MarkdownPostLayout.astro
title: 'Python 学习笔记'
author: '西岭'
description: '重学 Python 基本语法时记下的几个点：math 模块、Unicode 与汉字比大小、成员判断和短路运算。'
pubDate: 2026-03-02
tags: ['python', '学习笔记']
---

记录一些 Python 学习中的重要知识点和技巧，尤其是数据处理相关的部分。

## 看看 math 模块里有什么

```python
import math
print(dir(math))
```

输出：

```text
['__doc__', '__loader__', '__name__', '__package__', '__spec__', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'comb', 'copysign', 'cos', 'cosh', 'degrees', 'dist', 'e', 'erf', 'erfc', 'exp', 'exp2', 'expm1', 'fabs', 'factorial', 'floor', 'fmod', 'frexp', 'fsum', 'gamma', 'gcd', 'hypot', 'inf', 'isclose', 'isfinite', 'isinf', 'isnan', 'isqrt', 'lcm', 'ldexp', 'lgamma', 'log', 'log10', 'log1p', 'log2', 'modf', 'nan', 'nextafter', 'perm', 'pi', 'pow', 'prod', 'radians', 'remainder', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'tau', 'trunc', 'ulp']
```

## Unicode 与汉字比大小

Python 中每一个字都有其独有的 Unicode 编码，Python 3 中默认使用 Unicode 编码，故可以将汉字比大小。

```python
print("男" > "女")
```

输出结果为 `True`。这里可以用 `print(ord("男"))` 和 `print(ord("女"))` 来查看它们的 Unicode 编码，输出结果分别为 `30007` 和 `22899`。

Unicode 中还有很多表情包，可以这样遍历看看：

```python
for i in range(127900, 128000):
    print(i, chr(i))
```

（这段在 Windows 终端里会报 `UnicodeEncodeError: 'gbk' codec can't encode character`，因为默认编码是 GBK，需要 `chcp 65001` 或给 `sys.stdout.reconfigure(encoding="utf-8")`。）

## 成员判断与短路运算

`in` 和 `not in` 用于判断成员是否在某个序列中。

Python 中存在短路运算，例如 `1 and 'x'` 会输出 `'x'`，而 `0 and 'x'` 会输出 `0`。

## 当时敲的练习脚本

```python
import math
a = 2
print(a)
a = 2.6
print(a)
b = a
print(b)
a = [1, 3, 8]
print(a)
b = a
b[1] = 5.6
print(a)
print(dir(math))
print(math.ceil(b[1]))
a, b = 1, 2
print(a, b)
print("男" > "女")
print(ord('男'))
print(ord('女'))
print(1 and 'x')
```
