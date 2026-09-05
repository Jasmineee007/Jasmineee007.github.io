---
title: PHP特性利用之MD5
date: 2026-06-22 14:00:00
cover: https://img.jasmine-iris.top/posts/PHP-MD5%E7%89%B9%E6%80%A7%E5%88%A9%E7%94%A8/cover.webp
categories: [CTF-WP, Lab-WP]
tags: [CTF, PHP]
description: CTF中PHP MD5弱类型比较漏洞的利用，包括0e科学计数法绕过、数组绕过、md5($pass,true) SQL注入与常见Web源码泄露场景。
---

# 一、[Bugku CTF] MD5
## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817618260_7gd8gq.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817620941_qpon5o.webp)

## 2. 解题思路
1. 在题目页面，发现有一个下载文件

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817622848_sm1faa.webp)



2. 代码审计，md5

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817624129_xt57nw.webp)

```php
<?php
$md51 = md5('QNKCDZO'); // 计算固定字符串的MD5，结果是0e83040045199491692543859291139
$a = @$_GET['a'];       // 接收GET参数a，@抑制错误
$md52 = @md5($a);       // 计算a的MD5，@抑制错误

if(isset($a)){          // 检查是否传入参数a
    if ($a != 'QNKCDZO' &&$md51 ==$md52) { // 核心条件：a≠QNKCDZO 且 两者MD5相等
        echo "flag**************"; // 满足条件输出flag
    } else {
        echo "false!!!";
    }
} else{
    echo "please input a"; // 未传a则提示
}
?>
```



### Q1：PHP MD5弱类型比较漏洞
> 1. md5('QNKCDZO') 的结果是 0e83040045199491692543859291139，以0e开头，PHP会将其解析为科学计数法的0；
> 2. 只要找一个不等于QNKCDZO的字符串，其MD5也以0e开头，就能满足 $md51 ==$md52；
> 3. 也可以用数组绕过（更通用）：md5(数组)返回NULL，但这里优先用经典的0e字符串解法。
>



3. 访问网页，它让我输入a。



4. 经典0e字符串

找MD5以`0e`开头且不等于`QNKCDZO`的字符串，常用的有：

```plain
?a=s878926199a
?a=240610708
```



5. 拿到flag

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817625278_sp1u6l.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817627450_e3zgn3.webp)

---

# 二、[ctf.show] web5
## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817631534_pjpf6z.webp)

## 2. 解题步骤
1. 读代码：

```php
<?php
$flag="";
$v1=$_GET['v1'];
$v2=$_GET['v2'];
if(isset($v1) && isset($v2)){
    if(!ctype_alpha($v1)){
        die("v1 error");
    }
    if(!is_numeric($v2)){
        die("v2 error");
    }
    if(md5($v1)==md5($v2){
        echo $flag;
    }
}
?>
```

+ `ctype_alpha($v1)`：要求 `v1` 必须是纯字母字符串。
+ `is_numeric($v2)`：要求 `v2` 必须是数字或数字字符串。
+ `$v1 == $v2`：使用了 PHP 的弱类型比较 `==`，这是本题的突破口。



2. 所以要找两个不同的字符串，一个是纯字母，一个是纯数字，它们md5哈希值在弱类型下判定为0



3. 0e 开头的 MD5 哈希值以及对应的原始明文：

```plain
// 原始值 => MD5哈希
$vulnerable_pairs = [
    "240610708" => "0e462097431906509019562988736854",
    "QNKCDZO"   => "0e830400451993494058024219903391",
    "aabg7XSs"  => "0e087386482136013740957780965295",
    "aabC9RqS"  => "0e041022518165728065344349536299",
    "s878926199a" => "0e545993274517709034328855841020",
    "s155964671a" => "0e342768416822451524974117254469",
];
```



4. 访问如下 URL 即可触发条件并获取 Flag：

```plain
QNKCDZO 
240610708
```

```plain
http://63a977ac-9022-493d-a0ff-b3294262a7be.challenge.ctf.show/?v1=QNKCDZO&v2=240610708
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817633687_qcnr10.webp)

---

# 三、[BJDCTF2020]Easy MD5
## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817636025_yko36i.webp)

## 2. 解题思路
1. 随便输入点东西点击“提交查询”发现没有任何回显，所以这里查看一下页面源代码，看一下是否有提示



2. 看到header联想到HTTP的头

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817638006_lin8fr.webp)



3. 浏览器开发者工具，在消息头中找到线索hint

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817640113_p1n1xu.webp)

```sql
select * from 'admin' where password=md5($pass,true)
```

给了一个sql语句，我们需要输入一个密码但是我们并不知道正确密码。这里需要利用md5绕过，让sql语句变成如下形式：

```sql
select * from 'admin' where password='' or '
```



4. payload： `ffifdyop` 
+ `md5($pass, true)` 会返回 16 位原始二进制字符串，而非 32 位十六进制字符串。



### Q2：`ffifdyop`原理
输入字符串 `ffifdyop` 时，`md5('ffifdyop', true)` 生成的二进制字符串开头为 `'or'6`，拼接后 SQL 语句变为：

```sql
select * from admin where password='or'6xxxxxxxx
```

`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">or</font>` 后面非空字符串 `<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">'6xxx'</font>` 等价 true 整个条件恒成立，构造永真条件，绕过密码验证。<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817642556_ulzluw.webp)



5. 查看页面源代码

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817644293_13bllq.webp)

PHP 中 `==` 是弱类型比较，以 `0e` 开头的字符串会被解析为科学计数法（值为 0），不同字符串的 MD5 若均以 `0e` 开头，比较结果为真。

+ **Payload（任选其一）**：
    - 科学计数法绕过：“0e”开头的字符串都会以科学计数法来解析，而0的乘积都为0。所以构造md5加密后开头为0e的字符串即可

```plain
?a=QNKCDZO&b=240610708
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817646684_z052mg.webp)

    - 数组绕过：

```plain
?a[]=1&b[]=2
```

（PHP 中 `md5(数组)` 返回 `null`，`null == null` 为真，且 `a[] != b[]`）<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817648398_uuakd8.webp)



6. 用POST方法传递数值，不能用GET方式

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817650343_afv0z7.webp)

```plain
param1[]=1&param2[]=2
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817652030_q2j44a.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817653703_h8vo2n.webp)

---

# 四、[CTFShow]web9
## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817655415_4xxb01.webp)

## 2. 解题思路
1. 尝试登录，盲猜密码，无报错，无反应。



2. 找源码泄露，先试最常见的泄露路径：
+ `index.php`
+ `index.php.swp`
+ `index.php.bak`
+ `robots.txt`
+ `index.phps`



3. 访问 `index.phps` 成功拿到源码。<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817656664_jbrhc8.webp)



4. 分析源码

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817658189_42ffa4.webp)

从泄露的源码里，看到核心逻辑：

```php
$sql = "select * from user where username ='admin' and password ='".md5($password,true)."'";
```

+ 关键漏洞：`md5($password, true)` 返回**原始二进制字符串**，如果这个字符串包含 `'or'`，就会构造出恒成立的 SQL 语句；



5. 构造 payload ：一个能让 MD5 二进制包含 `'or'` 的密码，用经典的 `ffifdyop` 作为密码。
+ 它的 MD5 原始二进制值包含 `'or'`，代入 SQL 后变成：

```sql
select * from user where username ='admin' and password =''or'6xxxx'
```



6. 输入 `ffifdyop` ，拿到flag

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817659884_h7evtg.webp)

---

## 3. 知识点总结
### Q3：常见Web源码泄露场景
#### 3.1 核心区分
| 文件类型 | 服务器处理逻辑 | 访问结果 |
| --- | --- | --- |
| `index.php` | 调用PHP解释器执行代码 | 仅显示页面内容，无源码 |
| 各类备份/泄露文件 | 直接返回纯文本/缓存内容 | 可查看完整PHP源码 |


#### 3.2 高频源码泄露文件/路径
| 泄露类型 | 典型路径 | 产生原因 |
| --- | --- | --- |
| PHP源码预览文件 | `index.phps` | 服务器配置为直接返回.phps后缀源码 |
| Vim缓存文件 | `index.php.swp`/`.swo`/`.swn` | Vim编辑意外退出（死机/断电）生成的缓存 |
| 手动备份文件 | `index.php.bak`/`.backup` | 开发者手动保存的源码备份 |
| 编辑器自动备份 | `index.php~` | Emacs等编辑器自动生成的备份文件 |
| 版本控制文件 | `.git/`/`.svn/` | 代码版本控制文件夹未删除 |
| 敏感路径提示 | `robots.txt` | 网站声明的禁止爬虫路径，可能泄露后台/源码路径 |


---

# 五、Easy MD5 1
## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817661559_8v6sld.webp)

## 2. 解题思路
1. username != password（还得互不相等）
2. 但 md5(username) === md5(password) 必须成立 —— 注意是三个等号的严格比较



### Q4：MD5 强比较绕过
数组绕过： PHP 中 `md5(数组)` 不会报错，返回 **NULL**



3. payload

```shell
username[]=1&password[]=2
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/PHP-MD5特性利用/1787817663216_r6nkxs.webp)

