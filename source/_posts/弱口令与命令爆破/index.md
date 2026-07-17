---
title: 弱口令与命令爆破
date: 2026-06-30 23:08:00
categories: [Web安全, 弱口令爆破]
tags: 弱口令
description: 弱口令定义与危害、密码字典生成（通用模式+社工定制）、Burp Suite四种爆破模式详解、Hydra多协议破解实战（SSH/RDP/MySQL/HTTP表单）
---

# 一、弱口令
## 1. 定义
**复杂度极低、极易被猜到/爆破的账号密码**，是渗透最常见突破口。

弱⼝令的来源：

1. 密码设置的⼈员疏忽⼤意，安全意识薄弱，为了⽅便记忆在不同的平台设置简单或同样的密码
2. 某些管理平台有默认的密码，⽽没有及时的修改密码

## 2. 危害
直接登录后台拿权限、篡改数据、上传木马、接管服务器

---
# 二、密码字典
## 1. 定义
**字典**：存放大量常用账号、密码的文本文件，一行一个，用于弱口令爆破遍历尝试。

## 2. 密码字典生成
### (1) 通用模式
基于人类通性和历史数据的概率盲打，获取方式简单，数量众多。

#### 常见密码
+ 收录高频弱口令（如 123456、password）。
+ 包含不同类型的变体，能否破解出完全看运气和字典质量。

#### 默认密码
+ 各种操作系统、中间件、网络设备安装后的出厂默认密码（如 Tomcat: `tomcat/tomcat`）。

### (2) 定制模式
针对特定目标（某人或某企业）的信息生成的定制字典，命中率极高。

####  社工信息收集 
+ **自主收集:** 通过 FOFA、Google Dorks 等搜索引擎获取资产与人员信息。（有关信息收集的笔记供参考：[https://blog.ss0t-hacked.top/2026/information-gathering](https://blog.ss0t-hacked.top/2026/information-gathering)）
+ **泄露查询:** 使用公开合法渠道（如 [https://www.reg007.com/](https://www.reg007.com/)）查验目标信息是否在已知泄露事件中（注意：数据通常不全）。

> **⚠️ 法律与安全红线:** 最好只使用自己收集的公开情报，**千万不要私自搭建对外的社工库（严重违法）**。
>

#### 社工字典生成 
将收集到的碎片信息转化为可用的弱口令字典。

+ **信息组合:** 平台原密码、邮箱前缀、QQ号、电话、生日、公司名等。
+ **规则变形:**
    - 姓名拼音 + 生日后缀（例：`zhangsan1990`）
    - 首字母大写 + 特殊符号（例：`Zhangsan@2026`）
+ **本地生成工具:** 社⼯字典⽣成 weakpass

---
# 三、自动化爆破工具
## 1. Burp Suite 爆破
### (1) 爆破模式
#### Sniper Attack（狙击手模式）
+ 字典数：1 个
+ 爆破点：1 个
+ **对单个定位点进行爆破，例如单独爆破密码。**

#### Battering Ram Attack 
+ **字典数：1 个**
+ **爆破点：≥2 个**
+ **多点爆破，对多个点位同时爆破，所有爆破点使用同一个字典**

#### Pitchfork Attack
+ **字典数：2 个（payload1、payload2）**
+ **爆破点：≥2 个**
+ **多点爆破，对多个点位进行同时爆破，每个爆破点都有属于自己字典，平行爆破，一一对应。**

#### Cluster Bomb Attack （集束炸弹）
+ **字典数：2 个**
+ **变量数：≥2 个**
+ **多点爆破，对多个点位进行同时爆破，每个爆破点都有属于自己字典，双字典全组合，一对多。**

### (2) 判断爆破成功
1. 通过响应状态码判断
2. 通过响应长度
3. 通过具体响应内容

### (3) 配置 Burp Suite 爆破的几种情况
#### 只知道用户名但不知道密码
示例：已知用户名是 admin，但是不知道密码

1. 抓包，发送到 intruder

![](/img/posts/弱口令与命令爆破/1782657757747-8e364181-7127-4aa2-9563-982f2be1e2cc.png)

2. 配置BP爆破

![](/img/posts/弱口令与命令爆破/1782657941824-b7530397-ddda-43c2-81b4-d179a429c8c6.png)

![](/img/posts/弱口令与命令爆破/1782658086706-836481b2-298c-4818-8d56-0a412e2c54db.png)

![](/img/posts/弱口令与命令爆破/1782658136065-1528067f-8ed9-4f78-9fbd-17da318274e4.png)

2. 判断爆破成功--通过响应状态码判断

![](/img/posts/弱口令与命令爆破/1782658374478-ba26a932-6dba-4f30-b816-5aa9274cb6aa.png)

#### 用户名和密码都不知道
1. 依旧先抓包
2. 配置 bp 爆破

![](/img/posts/弱口令与命令爆破/1782659693635-bea05b2b-87a6-4435-b9bf-26ad152bf887.png)

![](/img/posts/弱口令与命令爆破/1782659766347-42b2dbde-7827-4752-870c-02405f41ced8.png)

在用户名和密码都未知的情况下，爆破成功率极低，不建议尝试。

3. 使用 bp 验证码爆破（需要拓展插件 xiapao、使用 Cluster Bomb Attack ）

示例：seacms 靶场

首先安装好靶场，再进入后台管理系统。

![](/img/posts/弱口令与命令爆破/1782795429784-1f7f9236-dd04-488d-bfab-17b4124649e3.png)

![](/img/posts/弱口令与命令爆破/1782795728259-191e40e9-ddd5-42d2-bdf0-3253497a46a8.png)

```plain
http://127.0.0.1/weakpasswd/CMS/upload/4qy2hw
```

![](/img/posts/弱口令与命令爆破/1782795754779-d0be99f0-13d6-4589-ac2d-7ca9a13b9cab.png)

配置 xiapao 插件

![](/img/posts/弱口令与命令爆破/1782796133046-1851e7c0-0a2d-4079-a58d-47a79dfdc33b.png)

![](/img/posts/弱口令与命令爆破/1782796199781-b19d890f-a0f2-458a-bab2-0a4ed54ace82.png)

![](/img/posts/弱口令与命令爆破/1782796232138-2d79cdb7-b43c-4858-adee-dc1f56d955b9.png)

注意：不要关掉终端页面，否则刚刚访问的网页也会没。

![](/img/posts/弱口令与命令爆破/1782796341091-f455984a-39a7-4c60-9568-f4b5eef3d4a4.png)

往 bp 安装插件

注意：插件的路径不能有中文。

![](/img/posts/弱口令与命令爆破/1782796486792-be3450f0-c495-449c-919a-04d1a241a979.png)

![](/img/posts/弱口令与命令爆破/1782796622126-ad58e4d3-76c9-4533-bad4-67dde7542fb1.png)

![](/img/posts/弱口令与命令爆破/1782797331419-391d2e89-1cd9-49f8-980e-5df71da6d27b.png)

![](/img/posts/弱口令与命令爆破/1782797435929-24edb6d3-f833-4615-9b27-93d590d1691d.png)

![](/img/posts/弱口令与命令爆破/1782797456346-900f91f2-4759-4398-9219-3fa322a581ed.png)

只有【输出】板块有内容，【错误】里面没有就是安装成功了

![](/img/posts/弱口令与命令爆破/1782797469424-1ef9ed32-201b-4745-8487-40e68ac41a76.png)

成功导入插件。

抓包

先复制验证码的图像地址：

```plain
http://127.0.0.1/weakpasswd/CMS/upload/include/vdimgck.php
```

![](/img/posts/弱口令与命令爆破/1782826948520-7eb1475e-bc76-4a1f-ac93-8ad39fe18022.png)

抓包

![](/img/posts/弱口令与命令爆破/1782827016168-7258d403-06ce-47d3-9cb6-32a8649b8c82.png)
![](/img/posts/弱口令与命令爆破/1782827039632-3e450df4-ab7b-4f1c-b0b4-bcdd9697e999.png)

爆破密码

![](/img/posts/弱口令与命令爆破/1782827401525-dc75b18a-1006-410c-b53b-4b1bd25865c1.png)

爆破验证码

![](/img/posts/弱口令与命令爆破/1782827485407-ff26dc5a-c30e-4712-84e2-7093ab52d53a.png)

![](/img/posts/弱口令与命令爆破/1782827577861-81190c06-d5c9-4d33-9ef9-11907806cf68.png)

![](/img/posts/弱口令与命令爆破/1782827619595-ec26efa0-6035-4b1a-ac08-fb4297396a70.png)

![](/img/posts/弱口令与命令爆破/1782827705061-f1059e9b-0d1b-4f4a-b99d-3a60decc386a.png)

把线程设置为1。

刚刚复制的图片地址

```plain
xiapao: http://127.0.0.1/weakpasswd/CMS/upload/include/vdimgck.php
```

![](/img/posts/弱口令与命令爆破/1782827929465-315ee01c-afff-45b4-a6e3-2f1396e60c4b.png)

开始攻击

![](/img/posts/弱口令与命令爆破/1782831808785-729621fd-0d86-4d55-ac8a-e63c8e825d50.png)

## 2. 九头蛇（Hydra）
### (1) 定义
hydra是著名组织thc的⼀款开源的暴⼒破解密码⼯具。kali下是默认安装的，⼏乎⽀持所有协议的在线破解。 密码能否破解，在于字典是否强⼤以及电脑的性能。、

### (2) 参数
+ -llogin⼩写，指定⽤户名进⾏破解
+ -Lfile⼤写，指定⽤户的⽤户名字典
+ -ppass⼩写，⽤于指定密码破解，很少使⽤，⼀般采⽤密码字典。
+ -Pfile⼤写，⽤于指定密码字典。
+ -ens额外的选项，n：空密码试探，s：使⽤指定账⼾和密码试探
+ -Mfile指定⽬标ip列表⽂件，批量破解。
+ -ofile指定结果输出⽂件 -f找到第⼀对登录名或者密码的时候中⽌破解。
+ -ttasks同时运⾏的线程数，默认是16
+ -wtime设置最⼤超时时间，单位
+ -v/-V显⽰详细过程
+ -R恢复爆破（如果破解中断了，下次执⾏hydra-R/path/to/hydra.restore就可以继续任务。）
+ -x⾃定义密码。

### (3) 使用
```bash
# 切换root权限
sudo su
```

![](/img/posts/弱口令与命令爆破/1782661054984-2e6f6d2a-6ea9-4934-ad5d-8cdd082b6fee.png)

```bash
# 先进入文件所在目录
cd /home/kali/弱口令爆破/passwordDict/
```

#### 破解 SSH 密码
**命令：**

```bash
hydra -l <已知用户名,例如root或kali> -P <密码字典路径.txt> -t 3 -e ns <目标IP> ssh
```

**示例：**

针对 Linux 服务器的默认远程管理端口（22）进行爆破， 拿本机的 `kali` 账号进行测试。  

```bash
# 先要确定ssh是启动的
service ssh restart

#指定kali账号 用password.txt文件 使用3个线程，爆破本地的ssh
hydra -l kali -P top500.txt -t 3 -e ns 127.0.0.1 ssh
```

![](/img/posts/弱口令与命令爆破/1782661258678-67c0deb4-a8d8-4b8e-803a-1b565e7f6f47.png)

成功拿到 kali 的账号和密码。

#### 破解 Windows RDP 远程桌面
**命令：**

```bash
hydra -l administrator -P <密码字典路径.txt> -t 3 -e ns <目标IP> rdp
```

+ `-l administrator`: Windows 的最高权限默认管理员账号通常是 `administrator`（注意拼写）。
+ `rdp`: 指定攻击模块为 Remote Desktop Protocol。

**示例：**

 针对 Windows 主机的 3389 端口进行爆破。用同一局域网内的 Windows2003 进行测试。

靶机 IP：

![](/img/posts/弱口令与命令爆破/1782746389936-e5e4c7f6-2b85-4a18-9461-a699337e7e4e.png)

```bash
# nmap扫描靶机的3389端口是否开放
nmap -p 3389 192.168.23.129
hydra -l administrator -P top500.txt -t 3 -e ns 192.168.23.129 rdp
```

![](/img/posts/弱口令与命令爆破/1782746445217-90bbd6de-beb0-40b9-8a98-b91810789fd4.png)

![](/img/posts/弱口令与命令爆破/1782746484006-fb60cd6c-3238-4bf0-8b63-d0a986af3e08.png)

成功拿到 Windows2003 的账号和密码。

#### 破解 MySQL 密码
MySQL 端口 3306

**场景 A：已知高权限用户名（如 root），仅爆破密码**

```bash
hydra -l root -P <你的密码字典路径.txt> -t 3 -e ns <目标IP> mysql
```

+ `-l root` : 指定单个用户名（小写 `l`）。
+ `-P dict.txt` : 指定密码字典文件（大写 `P`）。
+ `-t 3` : 线程数设为 3（线程过高容易导致服务拒绝连接）。
+ `-e ns` : 附加测试空密码 (`n`ull) 和同用户名密码 (`s`ame)。

**场景 B：用户名和密码均未知（双字典交叉爆破）**

```bash
hydra -L <用户名字典路径.txt> -P <密码字典路径.txt> -t 3 -e ns <目标IP> mysql
```

+ `-L users.txt` : 指定用户名字典文件（大写 `L`）。

#### 破解 HTTP 表单登录（POST）
**命令：**

```bash
hydra -t 3 -l <已知用户名> -P <密码字典路径.txt> -s <目标端口> <目标IP> http-post-form "<表单提交路径>:<POST请求数据，使用^USER^和^PASS^占位>:<失败特征码>"
```

 格式说明：`登录URL:POST参数格式:失败提示字符串`

+ `^USER^` 和 `^PASS^` 是 Hydra 的占位符，会自动替换为用户名和字典中的密码
+ `用户名或密码错误`是登录失败时页面返回的提示，Hydra 以此判断登录是否失败

**示例：**

```bash
hydra -t 3 -l admin -P password.txt -s 80 192.168.0.47 http-post-form "/wz/login.php:user=^USER^&pass=^PASS^:用户名或密码错误"
```

#### 破解 HTTP 表单登录（GET）
```bash
hydra -t 3 -l admin -P password.txt -s 80 192.168.209.1 http-get-form "/wz/login.php:user=^USER^&pass=^PASS^:用户名或密码错误"
```

