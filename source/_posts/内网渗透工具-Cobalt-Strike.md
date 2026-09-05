---
title: 内网渗透工具-Cobalt Strike
date: 2026-08-15 12:00:00
cover: https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt-Strike/cover.webp
categories:
  - 内网渗透
tags:
  - CS
  - 工具使用
description: 内网渗透工具 Cobalt Strike 详解：TeamServer/Client/Beacon 核心组件、Kali 环境搭建、木马生成与免杀、CS 联动 MSF、凭证抓取与横向移动等完整使用教程。
---

# 一、Cobalt Strike 是什么？
## 1. 介绍
Cobalt Strike是⼀款美国RedTeam开发的渗透测试神器，其拥有多种协议主机上线方式，集成了提权，凭据导出，端口转发，socket代理，office攻击，文件捆绑，钓鱼等功能。  同时，还可以调用 Mimikatz 等其他工具。

它分为客户端与服务端，服务端是一个，客户端可以有多个，可被团队进行分布式协团操作。主要用于内网渗透以及 APT 攻击。

项目官网：[https://www.cobaltstrike.com/](https://www.cobaltstrike.com/)

---

## 2. 核心组件
### 2.1 TeamServer （团队服务器）  
运行在 Linux（Kali 常用），整套 CS 的 C2（命令与控制平台）指挥部

+ 默认端口：50050
+ 负责接收 Beacon 回连、存储所有上线主机、凭证、截图；
+ 支持多名攻击者客户端同时连接，数据互通

关闭客户端不影响 TeamServer 运行，已上线的 Beacon 不会掉线；只有终止 TeamServer 进程，所有木马连接才会断开。

---

### 2.2 Client（客户端）
 GUI 客户端（ **Graphical User Interface**），可以运行 Windows/Linux；连接 TeamServer 下发指令。

+ 仅作为远程登录工具，连接 TeamServer 下发操作指令；
+ 提供可视化菜单：创建监听器、生成木马载荷、内网扫描、一键抓取凭证、远程桌面控制；
+ 多人聊天、任务分发，团队协同操作。

注：Client 本身不接收木马连接，所有流量中转均经过 TeamServer；仅用于人机交互操作。

---

### 2.3 Listener（监听器）
在 TeamServer 上开辟通信通道，等待木马（Beacon）主动回来连接。

常见类型：

| 监听器类型 | 适用场景 | 特点 |
| --- | --- | --- |
| Beacon HTTP/HTTPS | 外网跳板上线（最常用） | 木马主动向外网 C2 发起网页流量连接，适配公网渗透 |
| Beacon SMB | 内网横向移动专用 | 仅在内网主机间通信，不直接外联外网，隐蔽性极强 |
| Foreign | MSF 框架会话互通 | 实现 CS 与 Metasploit 会话互相传递，组合利用漏洞 |


---

### 2.4 Beacon（受害端后门载荷 Payload）
指投递到受害主机上的恶意程序。

**2.4.1 优势：**

**1. 异步心跳通信**

非长连接，每隔自定义时间主动发送数据包访问 C2 查询任务。好处是减少网络连接特征，大幅降低被防火墙、EDR 检测概率；可通过sleep命令调整时间间隔。

如果电脑/服务器一直保持连接，持续收发数据。防火墙/杀毒软件会监控。



**2. 内存执行与进程注入：**

**内存执行** 是指无文件落地，即只通过脚本、网页加载，所有代码只在内存里运行；硬盘里不留任何恶意文件，关机/重启后内存清空，不留痕迹。

**进程注入** 是指把 Beacon 代码塞进系统程序里（浏览器、记事本、 explorer 资源管理器  等正规进程）

如果直接把普通木马的 exe 程序保存到受害者的硬盘（桌面/文件夹），杀毒软件会扫描磁盘文件，发现恶意 exe 直接查杀。



**3. 流量自定义（Malleable C2）**

加载流量配置文件，修改请求头、数据包格式，**伪装成正常网页浏览流量**，绕过入侵检测系统 IDS、终端防护 EDR。

如果是不加伪装的原始流量，经 IDS/EDR 一抓包，识别出这是 Cobalt Strike 木马流量，直接阻断连接。



**2.4.2 核心执行能力：**

1. 执行系统命令：查电脑信息、用户、IP 地址
2. 文件传输：把内网服务器文件偷下载，或者上传工具到靶机
3. 内网网段扫描：找出公司内网里所有在线电脑、开放端口
4. 凭据抓取：读取电脑保存的账号、密码、登录哈希，用来登录其他内网机器
5. 横向移动：从这一台电脑跳到内网另一台电脑控制
6. 持久化权限：创建开机自启后门，就算受害者重启电脑，后门依然自动上线，黑客持续控制

---

**<font style="color:#DF2A3F;">EDR 是什么？</font>**

☞ **Endpoint Detection and Response **终端检测与响应系统

终端指什么？

☞ 公司里每一台电脑、服务器、办公主机都叫**终端**。

如果说 杀毒软件（360、火绒）是基础防护，那么 EDR 是企业级更强的专业防护工具。



**普通杀毒** ☞ 只扫描**硬盘上的文件**  
如果你的木马exe存在磁盘里，它扫描文件特征码直接杀掉；但内存运行、注入进程、无文件木马（比如CS Beacon）很难拦住。

**EDR** ☞ **全程监控电脑所有行为**，不止看文件，实时盯着电脑每一步操作

1. 监控进程行为：有没有程序偷偷注入浏览器、explorer等正常进程
2. 监控内存：检测内存里隐藏的恶意代码（CS内存Beacon重点针对）
3. 监控网络外联：程序偷偷往外陌生服务器频繁发包、心跳通信
4. 监控系统操作：读取密码、注册表写入后门、内网扫描445端口、横向移动行为
5. 日志全记录：电脑所有操作全部上报给安全管理员后台

---

**<font style="color:#DF2A3F;">IDS 是什么？</font>**

☞ **Intrusion Detection System** 入侵检测系统

IDS 是干什么的？

☞ 全程抓取整个局域网所有网络数据包，检查流量有没有攻击特征，发现异常立刻告警。  
主要检测两类行为：

1. **外网攻击内网**：网站漏洞扫描、木马外联黑客C2服务器（比如CS Beacon连TeamServer）
2. **内网横向攻击**：一台电脑疯狂扫445、3389端口、SMB爆破、大量内网数据传输

IDS 的两个分类

1. **NIDS（网络型IDS）**  
最常见，部署在网关，监控整个局域网所有设备流量，就是上面讲的IDS。
2. **HIDS（主机型IDS）**  
装在单台服务器上，兼顾流量+本地文件行为，现在基本被EDR替代。

区别：

+ IDS：**只检测、告警，不会主动阻断**，只会记录日志通知管理员
+ IPS（入侵防御系统）：IDS升级版，检测到攻击**直接切断流量、拦截连接**

---

**<font style="color:#DF2A3F;">IDS vs EDR </font>**

| 工具 | 部署位置 | 监控对象 | 擅长抓CS什么行为 |
| --- | --- | --- | --- |
| IDS | 网络网关（交换机/防火墙） | 全网数据包、网络流量 | 木马和C2服务器的异常通信、内网端口扫描 |
| EDR | 电脑本地终端 | 进程、内存、系统操作 | 进程注入、内存后门、抓取密码、本地提权 |


相当于：

+ IDS = 小区大门监控摄像头（网络流量）
+ EDR = 家里的监控（电脑内部行为）

---

# 二、环境搭建
CS的部署：

[https://blog.csdn.net/weixin_43263566/article/details/128567148](https://blog.csdn.net/weixin_43263566/article/details/128567148)

服务端：Linux

客户端：Windows

## 1. 安装依赖
1. 先查看当前系统已有的Java版本

```bash
java --version
```

如果输出`openjdk 11`：直接跳过安装步骤，直接启动CS；

输出`openjdk 21`等高版本：继续下面安装JDK11操作

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772265777_buwik7.webp)

2. 更新软件源，安装CS兼容的JDK11

```bash
sudo apt update
sudo apt install openjdk-11-jdk -y
```

执行完成后，JDK11和原有高版本JDK会共存，不会覆盖删除。

3. 切换与CS兼容的 JDK11 

```bash
sudo update-alternatives --config java
```

4. 列表里找到`java-11-openjdk-amd64`，输入它前面的序号回车
5. 验证：

```bash
java --version
# 显示11代表切换成功，之后正常启动CS即可
```

> 影响说明：之后所有Java程序默认用JDK11，少数需要高版本Java的工具会报错，需要时再切回去。
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772267604_pg4c5o.webp)

---

## 2. 开启服务端
1. 安装 Cobalt Strike 4.8，把安装包拖到 kali 里面去，给 teamserver 文件赋予执行权限。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772269738_0fkw04.webp)

```bash
# 切换root权限
sudo su
# 进入CS目录（使用自己的文件路径）
cd /home/kali/CS4.8/
# 进入服务端文件夹
cd /home/kali/CS4.8/Server/
# 添加运行权
chmod +x teamserver
chmod +x TeamServerImage
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772271334_dy4bcr.webp)

4. 启动服务端

查看服务端的 IP 地址

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772273027_elcwjc.webp)

```bash
./teamserver 服务端IP地址 连接密码
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772275484_zfoxc2.webp)

## 3. 客户端连接
两个都可以运行，任选其一，但是有黑窗口的那个，一旦黑窗口关闭程序也随之关闭。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772277522_qz6x7c.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772279541_zysghg.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772281504_gp7c5g.webp)

 Fingerprint（指纹）是 CS 服务端的加密校验串，用来防止客户端连接到伪造、劫持的 TeamServer，保障通信安全。  

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772283527_gwaqd5.webp)

---

# 三、CS 的使用
## 1. 生成木马
### 1.1 设置监听
reverse_http	表示反向连接，别人主动连接

beacon_bind	 表示正向连接，我们主动连接别人

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772284720_un7blo.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772286924_6qwct9.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772288769_yiandh.webp)

+ name：监听器名字，可任意设置
+ payload：payload类型
+ HTTP Hosts：shell反弹的主机，也就是我们kali的ip
+ HTTP Hosts(Stager): Stager的马请求下载payload的地址（一般也是和上面的ip填一样）
+ HTTP Port(C2): C2监听的端口

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772290055_ks92zf.webp)

---

### 1.2 打开载荷生成菜单  
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772292153_x6petp.webp)

1. HTA 文档后门
+ **产物**：.hta 后缀 HTML 类型后门文件
+ **原理**：Windows 系统可直接双击运行 HTA，内置 VBS/Javascript 执行代码，无需依托浏览器，可绕过简单防护执行系统命令、反弹 Shell。
+ **适用场景**：钓鱼、本地 Windows 主机执行恶意代码。
2. Office 宏后门
+ **产物**：带宏的 Word (.doc)、Excel (.xls)、PPT 文档
+ **原理**：利用 Office VBA 宏代码执行恶意逻辑，打开文档启用宏后自动运行后门。
+ **局限**：新版 Office 默认阻止宏运行，多用于低版本 Office 钓鱼。
3. payload 生成器（常规载荷，stage 类型）  
**产物**：C/Python/PHP/Java 等多语言 shellcode 后门代码  
**原理**：分段载荷（staged），分为两部分：  
短加载器（stager）：先执行，连接 C2 服务器；  
完整 payload（stage）：从服务端下载完整后门功能。  
**特点**：shellcode 体积小，易注入漏洞，但依赖网络下载完整载荷，断网会失效。
4. 有效载荷生成器 (stageless，无状态载荷)  
**产物**：完整单段 shellcode，内置全部后门逻辑  
**原理**：无分段，一段代码包含全部反弹 / 执行功能，不需要额外下载 stage。  
**优缺点**：不依赖网络，离线也可完整运行；代码体积更大。
5. Windows 常规 EXE 程序（stage 分段型）  
**产物**：.exe 可执行文件，分段载荷封装  
**特点**：exe 体积小，运行后主动连接 C2 拉取完整后门；网络中断后门功能失效。
6. Windows stageless 无状态 EXE  
**产物**：独立完整 exe 程序，内置全部 payload 逻辑  
**特点**：无需联网下载第二阶段，一次性执行全部后门功能，文件体积更大。
7. Windows stageless 全载荷批量生成  
一键批量生成 Windows 平台所有无状态 (stageless) 格式载荷，用于批量测试、多渠道钓鱼投递。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772293830_1lfg76.webp)

---

### 1.3 选择对应的监听器  
<font style="color:rgb(0, 0, 0);">在弹出窗口的【监听器】下拉框，选中已经建好的监听器</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772295640_ko067v.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772298172_8u0l6m.webp)

---

### 1.4 保存后门
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772300704_emyutv.webp)

---

### 1.5 免杀
#### 1.5.1 定义
免杀全称**避免杀毒软件查杀**。  
杀毒软件（360、火绒、Windows Defender、企业EDR）会通过**特征码、行为分析、内存扫描**识别恶意程序（CS后门、MSF木马、病毒）；  
免杀就是通过修改后门代码、加密、混淆、伪装等手段，绕过杀毒软件检测，让恶意程序能正常在目标电脑运行不被拦截/删除。

---

#### 1.5.2 杀毒检测的两种核心方式（为什么会被杀）
1. **静态查杀（特征码查杀）**  
杀毒内置木马特征库，后门代码、字符串、资源和库内黑名单匹配，直接报毒删除。  
比如原始CS的exe、MSF生成meterpreter默认一上传就被杀。
2. **动态查杀（行为/内存查杀）**  
程序运行后，杀毒监控行为：创建进程、注入内存、联网回连、读取密码等高危操作，一旦触发直接拦截。

---

#### 1.5.3 常见免杀手段
1. **加壳免杀**  
用UPX、VMProtect、Themida等壳程序加密压缩木马，打乱原始特征码，静态查杀无法匹配。
2. **代码混淆/加密**  
加密shellcode、异或加密、base64编码、分割载荷，隐藏恶意字符串。
3. **资源替换、图标伪装**  
修改exe图标、文件描述，伪装成正常软件（QQ、微信、办公工具）降低警惕，辅助绕过浅层静态检测。
4. **进程注入分离**  
不直接运行完整后门，把shellcode注入记事本、浏览器、explorer等正常系统进程，规避独立恶意进程检测。
5. **内存加载无文件落地**  
不把exe写入硬盘，通过powershell、wscript、mshta直接在内存运行载荷，硬盘无恶意文件，静态扫描找不到样本。
6. **修改源码重编译**  
修改CS、MSF源码后自己编译，生成独一无二无特征的程序。

免杀指通过加壳、代码混淆、内存加载、进程注入等方式，绕过杀毒软件、EDR的静态特征检测与动态行为监控，让恶意后门程序不被查杀，正常在受害主机执行。

---

#### 1.5.4 步骤
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772301980_4tesap.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772303829_ppok49.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772305323_xywc69.webp)

使用 AI 实现免杀。

---

#### 1.5.5 CS 载荷输出格式详解：
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772306410_uzxeuv.webp)

1. PowerShell

输出PowerShell脚本形式载荷。  
✅用途：无文件攻击，直接在目标PowerShell中粘贴执行，不落地exe到磁盘；常用于横向渗透、内存执行。  
⚠️缺点：容易被系统PowerShell策略、杀毒拦截。

2. Raw

原始二进制Shellcode（裸字节流），不是可执行文件。  
✅用途：嵌入C/C++、Python加载器，用于进程注入、免杀二次开发；做分离免杀最常用格式。  
⚠️不能直接双击运行，必须依靠加载器解析执行。

3. Windows EXE

普通独立可执行程序，`.exe`后缀。  
✅用途：直接双击运行；staged/stageless模式都支持。  
⚠️原生CS特征明显，容易被Defender、杀毒静态查杀。

4. Windows Service EXE

Windows服务程序格式exe。  
✅用途：上传目标后注册成系统服务启动，适合权限维持、开机自启。  
⚠️运行权限通常较高，行为容易触发安全软件告警。

5. Windows DLL

动态链接库文件`.dll`。  
✅用途：DLL注入、DLL劫持漏洞利用；使用`rundll32.exe`加载执行。

> 常用执行命令示例：  
`rundll32 xxx.dll,Start`
>

---

## 2. 上传后门到目标服务器，运行后门，CS监听上线
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772307660_tp718q.webp)

---

## 3. 基本功能
<font style="color:rgb(25, 27, 31);">CobaltStrike使用详解：</font>

[https://zhuanlan.zhihu.com/p/359251293?utm_id=0](https://zhuanlan.zhihu.com/p/359251293?utm_id=0)

### 3.1 beacon 命令行
** **点击上线主机，进入 Beacon 交互命令行，输入`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">?</font>`可查看全部可用指令； 

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772309418_syo7th.webp)

+ 基础指令示例：  
`sleep 1`：修改心跳回连间隔为1秒；`sleep 0`切换实时交互  
`shell whoami`：执行cmd查询当前登录账号  
`shell dir`：查看当前目录文件
+ 核心作用：对被控主机下发各类后渗透操作指令，完成信息收集、文件操作、进程管理、内网扫描等全部控制操作。

---

### 3.2 远程桌面VNC控制
右键目标会话打开VNC窗口，直接可视化远程操作目标桌面，实时查看屏幕、操作鼠标键盘。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772310969_63dhuq.webp)

---

### 3.3 远程文件管理
内置文件管理器，支持：

+ 浏览目标全盘目录、查看文件；
+ 本地与目标双向**上传、下载**文件；
+ 删除、重命名目标主机文件。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772312903_sjfvj4.webp)

---

### 3.4 内网网络探测
1. **局域网共享探测**：自动扫描同网段存活主机、共享文件夹，结果在目标列表展示；
2. **端口扫描**：自定义网段、端口范围，支持ARP/ICMP扫描，ARP扫描防火墙拦截概率低；
3. **进程列表查看**：列出目标全部进程PID、运行用户、程序架构；支持`kill`结束进程、进程注入、伪造Token。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772315067_w9301s.webp)

### 3.5 监听器管理
创建HTTP/SMB/TCP/Foreign等多协议监听通道，定义攻击机IP、端口；生成后门时必须绑定对应监听器，等待目标后门主动回连上线。

### 3.6 多格式Payload后门生成
菜单栏【有效载荷】一键生成多种钓鱼/漏洞后门：

+ HTA文档、Office宏Word/Excel/PPT；
+ staged分段EXE、stageless完整无状态EXE；
+ Python/PHP/C等各类语言Shellcode载荷。

### 3.7 插件扩展
1. 顶部打开「脚本管理器」；
2. Load加载`.cna`格式插件；
3. 加载成功状态栏显示√，拓展内网扫描、凭证抓取、提权等额外工具（如Ladon）。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772317530_q447in.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772319523_qh75q2.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772321539_vy48l1.webp)

### 3.8 工具联动（CS联动MSF）
1. kali 启动 MSF

```bash
msfconsole -q
```

2. CS创建`Foreign HTTP`监听器；

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772323660_rq913r.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772326246_zdrbrr.webp)

3. Kali MSF开启handler对应IP端口；

```bash
use exploit/multi/handler
#选择工具

set payload windows/meterpreter/reverse_http
#设置监听的会话（注意会话类型要和CS的会话一致）

set lhost 192.168.23.131
#设置IP地址（IP地址为kali的监听的机器的IP地址，和CS中保持一致）

set lport 9999
#设置端口（和CS中自定义的端口保持一致）

run
#开始监听
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772328148_qfw6b7.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772330059_3m9jtw.webp)

4. Beacon会话右键，找到「新建会话」，转发流量至MS，调用Metasploit漏洞库、Meterpreter功能。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772331950_0orv2i.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772334147_ofkf52.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772336427_j95pqg.webp)



测试：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/内网渗透工具-Cobalt%20Strike/1786772338771_ujrgct.webp)

### 3.9 团队协作多客户端
CS分服务端（TeamServer）、客户端，多人可同时连接同一服务端；

+ 全局聊天：直接输入文字全员可见；
+ 私聊：`/msg 用户名 消息`；  
所有上线主机、操作日志全团队同步查看。

### 3.10 钓鱼攻击生成
内置Office宏后门、HTA网页后门，可结合邮件钓鱼投递，目标启用宏/双击hta即可回连CS上线。

邮件钓鱼的使用：[https://mp.weixin.qq.com/s/wS2klFeWXe7zO8PXwnFTmQ](https://mp.weixin.qq.com/s/wS2klFeWXe7zO8PXwnFTmQ)

#### Q1：什么是 Office 宏？渗透中的作用？  
<font style="color:rgb(0, 0, 0);">宏是 Office 文档内嵌入的 VBA 脚本，原本用于办公自动化；攻击者编写恶意宏代码制作钓鱼文档，诱导受害者启用宏后执行恶意程序，实现主机上线控制；docx 格式无法携带宏，通常使用 doc、docm 等后缀。</font>

#### Q2：原理
打开 Office 文档后，如果用户启用宏，文档内部的 VBA 代码就会自动运行，可以调用系统组件执行程序、下载文件、启动恶意载荷。  

### 3.11 流量隧道代理
支持Socks4a代理、反向端口转发，以内网被控主机为跳板，访问内网隔离网段、数据库、后台系统。

### 3.12 凭证抓取&本地提权
内置Mimikatz、hashdump工具，抓取Windows内存账号密码、本地NTLM哈希；`getsystem`一键尝试提升至SYSTEM最高权限，用于内网横向移动。

### 3.13 内网横向移动
集成psexec、winrm、哈希传递等方式，利用抓取的账号凭证，在内网多主机批量植入Beacon会话。

### 3.14 渗透报告导出
全程记录所有操作日志、主机信息、漏洞行为，支持导出完整红队演练报告。

