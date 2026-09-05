---
title: PHP特性利用之弱比较
date: 2026-06-23 12:00:00
cover: https://img.jasmine-iris.top/posts/PHP弱比较/cover.webp
categories: [CTF-WP, Lab-WP]
tags: [CTF, PHP]
description: PHP弱类型比较漏洞的系统总结，包括0e科学计数法、数字截断、ffifdyop SQL注入、数组绕过等方法与CTF实战题目。
---

# 一、前置知识：
## 1. 基础概念区分
1. `==` 弱比较  
PHP会**自动隐式转换两边数据类型**后再对比，是所有CTF弱类型题的核心漏洞点。
2. `===` 强比较  
同时校验**值 + 数据类型**，不做任何自动转换，无法用弱类型绕过，是标准防御写法。

---

## 2. 绕过方法
### 2.1 0e MD5 科学计数法绕过
1. 原理
+ 以 `0e` 开头且后续**全为纯数字**的字符串，在进行弱比较（`==`）时，会被 PHP 强制解析为科学计数法 `0 × 10<sup>n</sup>= 0`。因此，任意两个满足此格式的字符串 `==` 判定恒为 `true`。
+ 示例：

```php
$a = md5('240610708'); // 0e462097431906509019562988736854
$b = md5('QNKCDZO');   // 0e830400458393240665909944582762
var_dump($a == $b); // true
var_dump($a === $b);// false
```

2. 适用场景：后端使用弱比较判断两个不同输入的 MD5 或 SHA1 值是否相等。

---

### 2.2 数字字符串截断匹配
1. 原理(PHP 8 之前)
+ 字符串和数字进行弱对比时，PHP 会从字符串开头提取数字，后面的字母直接丢弃。如果开头没有数字，则直接转为 0。字符串和数字`==`对比时，会从字符串开头提取数字，后面字符直接丢弃。
+ 示例

```php
var_dump(123 == "123abc");  // true
var_dump(0 == "abc123");    // true，无开头数字直接转为0
var_dump(0 == "flag");     // true
```

2. 注意：PHP 8 此特性已废弃。PHP 8 会将数字转为字符串再比较，0 == "flag" 的结果变为 false。 
3. 适用场景：要求传入的参数等于某个特定数字，传入“数字+字母”或“字母”触发隐式转换绕过（仅限 PHP 7 及以下）。

---

### 2.3 ffifdyop MD5 SQL注入绕过
```php
$sql = "select * from user where username ='admin' and password ='".md5($password,true)."'";
```

1. 原理
+ 当后端使用 md5($password, true) 时，第二个参数 true 会让函数返回 16 字节的原始二进制格式，而不是 32 位的十六进制字符串。 
2. 利用方式
+ 明文 ffifdyop 的 MD5 二进制数据中，恰好包含字符串 'or'6。拼接到 SQL 语句。
    - 拼接前：

```sql
select * from user where username ='admin' and password ='' 
```

    - 拼接后：	

```sql
select * from user where username ='admin' and password =''or'6...' 
```

这闭合了单引号，并形成了 or 6 的永真条件，直接绕过登录验证。我在 PHP特性利用之 MD5 这篇中有提到这种题目。

---

### 2.4 数组绕过
数组和字符串直接比较 [] == "admin" 结果是 false。真正的漏洞在于 PHP 的内置处理函数。 

1. 利用方式
+ md5()、sha1()、strcmp() 等函数期望接收字符串。如果传入数组（如：pass[]=1），函数无法处理会报错并返回 null。 
+ 示例 1 (弱比较绕过)

```php
strcmp($pass, "admin") == 0
```

传入数组后函数返回 null，随后 null == 0 判定为 true，成功绕过。 

+ 示例 2 (强比较绕过)

```php
$a !== $b
md5($a) === md5($b)
```

传入两个不同的数组，哈希函数均返回 null，随后 null === null 判定为 true，成功绕过。 

+ 注意：在 PHP 8 中，向这类函数传入数组不再返回 null，而是直接抛出 TypeError 致命错误导致程序崩溃，该方法失效。

---

## 3. 总结
通用类型转换规则：

1. 数字与字符串： PHP 8 之前：字符串转数字（从头截取，无数字转0）。 PHP 8 及以后：数字转字符串比较。
2. 0e 规则： 0e开头纯数字 == 0e开头纯数字，结果恒为 true。
3. 数组特性： 数组与任意数字或字符串直接弱比较，结果为 false。 数组传入 md5 或 strcmp 等仅接收字符串的函数，返回 null (PHP 8 之前) 或直接报错 (PHP 8 及以后)。
4. null == false == 0 == "" 互相弱比较全为 true。 注意：PHP 8 中 0 == "" 的结果变为 false。

---

# 二、[攻防世界] simple_php
## 1. 题目
![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549090289_ktn3w8.png)

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549093936_5e1zbo.png)

## 2. 解题思路
1. 读代码

```php
<?php
show_source(__FILE__);
include("config.php");
$a = @$_GET['a'];
$b = @$_GET['b'];
if ($a == 0 and$a) {
    echo$flag1;
}
if (is_numeric($b)) {
    exit();
}
if ($b > 1234) {
    echo$flag2;
}
?>
```

+ **$a 的要求**：弱等于 0，但又不能是 0 或空值（比如 `0a`、`abc`）。
+ **$b 的要求**：不能是纯数字/数字字符串，但弱比较要大于 1234（比如 `1235a`）。
2. 构造Payload如`?a=0a&b=1235a`即可同时获取`flag1`和`flag2`![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549096021_szdwlu.png)

---

# 三、[攻防世界] PHP2
## 1. 题目
![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549097969_dwwzci.png)

## 2. 解题思路
1. 这句话 “Can you authenticate to this website?” 的意思是：“你能通过这个网站的身份验证吗？” 或 “你能登录/认证到这个网站吗？”
+ 这个页面没有提供登录框、输入框等明显的交互方式，说明认证逻辑**藏在代码或请求里**，需要去挖掘。
+ 需要找到绕过身份验证的方法，比如：
    - 查看页面源码或备份文件
    - 分析隐藏的参数或 Cookie
    - 利用编码、弱类型等漏洞
2. 由于题目的标题是PHP，所以我们试一下index.php  或者  index.phps![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549099560_vivdwx.png)
3. 读代码

```php
<?php
if("admin"===$_GET[id]) {
    echo("<p>not allowed!</p>");
    exit();
}

$_GET[id] = urldecode($_GET[id]);
if($_GET[id] == "admin")
{
    echo "<p>Access granted!</p>";
    echo "<p>Key: xxxxxxx </p>";
}
?>
```

+ `===` 强比较：禁止直接传入 `id=admin`。
+ 代码对 `id` 进行了第二次 URL 解码，我们可以利用这一点。
+ **绕过思路**：对 `"admin"` 进行 **两次 URL 编码**，让浏览器第一次解码后不等于 `"admin"`，通过第一层判断；代码第二次解码后得到 `"admin"`，触发第二层判断。
4. 用bp，对 `admin` 进行两次 URL 编码

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549101332_m9vyd6.png)

得到：

```plain
%25%36%31%25%36%34%25%36%64%25%36%39%25%36%65
```

5. 构造 payload：	

```plain
?id=%25%36%31%25%36%34%25%36%64%25%36%39%25%36%65
```

6. 成功绕过认证，获取 Flag![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549104223_e1k1b5.png)

---

# 四、[Bugku CTF] 各种绕过哟
## 1. 题目：![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549105922_8m2x5b.png)
## 2. 解题思路
1. 代码审计

```php
<?php
highlight_file('flag.php');
$id = urldecode($_GET['id']);
$flag = 'flag(xxxxxxxxxxxxxxx)';
if (isset($_GET['uname']) and isset($_POST['passwd'])) {
    if ($_GET['uname'] ==$_POST['passwd']) {
        print 'passwd can not be uname.';
    }
    else if (sha1($_GET['uname']) === sha1($_POST['passwd']) && ($id=='margin')) {
        die('Flag:'.$flag); 
    }
    else {
        print 'sorry!';
    }
}
?>
```

+ **GET**传 `uname` 和 `id`；
+ **POST**传 `passwd`；
+ 需满足的条件：
    - `$_GET['uname'] !=$_POST['passwd']` 
    - `sha1($_GET['uname']) === sha1($_POST['passwd'])`（SHA1强相等）；
    - `$id = urldecode($_GET['id']);`并且`$id=='margin'`
2. 分析条件
+ PHP的`sha1()`函数**只接受字符串/数字**，传入**数组**会返回`NULL`；要求SHA1值必须强相等，那么传入两个不同的数组（比如`uname[]=1`和`passwd[]=2`）满足`uname != passwd`
+ `id`直接传`margin`，源码没有 `if($id == 'margin')` 这类校验逻辑，不存在匹配拦截，所以不需要二次 URL 编码绕过。

## 3. 解题步骤
1. 代码审计，读懂代码，找到漏洞
2. 要满足拿到flag的三个条件
3. 给 GET 的`uname`传数组：`uname[]=1` → `sha1(uname) = NULL`；

给 POST 的`passwd`传数组：`passwd[]=2` → `sha1(passwd) = NULL`；

`id`直接传`margin`

4. 开发者工具→hackbar![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549108754_y7xyjn.png)![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549110099_j677io.png)
5. 或者用bp

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549112076_jufni5.png)

**请求方式改为 **`**POST**`

```plain
POST /?id=margin&uname[]=1 HTTP/1.1
```

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549114328_wdaufh.png)

---

# 五、[Bugku CTF] 矛盾
## 1. 题目
## ![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549116808_n91zmz.png)
## 2. 解题思路
1. 代码分析

```php
$num = $_GET['num'];
if(!is_numeric($num))  
{
    echo $num;
    if($num==1)  
    echo 'flag{*********}';
}
```

+ `is_numeric()` 的官方定义是：专门用来检测变量是否为数字或纯数字字符串
+ **条件1**：`!is_numeric($num)` 要求 `num` 的值不能是数字或数字字符串
+ **条件2**：`$num==1` 要求 `num` 在弱比较中等于 `1`。
2. 绕过：传值 1+除数字之外的

我们需要传一个**不是数字类型，但弱比较等于1**的值。

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549118504_7i792x.png)![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549120350_4u7u6c.png)![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549122109_u0skt3.png)

---

# 六、[MRCTF2020]Ez_bypass
## 1. 题目
![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549124459_nt8e8f.png)

## 2. 解题思路
1. 查看源码

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549126932_9ogrtp.png)

2. 代码分析

`md5($id) === md5($gg) && $id !== $gg`

+ 要让 `$id` 和 `$gg` 的 MD5 哈希值完全一样，但 `$id` 和 `$gg` 本身的内容必须不同。
+ **数组绕过**：给 `$id` 和 `$gg` 传**不同的数组**

`!is_numeric($passwd) && $passwd == 1234567`

+ 传入的 `passwd` 不能是「纯数字」（`is_numeric` 返回 false），但用弱类型比较时，它又要等于数字 1234567。
3. 构造payload

GET 部分

```plain
?gg[]=1&id[]=2
```

POST 部分

```plain
passwd=1234567a
```

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549128905_rbgkxk.png)

4. 得到flag

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549130944_8s7okl.png)

---

# **七、[CTFShow]web11**
## **1. 题目**
![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549133338_edjkxb.png)

## **2. 解题思路**
1. 分析代码![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549135852_zfipjd.png)
+ **弱类型比较**：最终使用 `==` 弱类型比较密码与 `$_SESSION['password']`
+ **绕过思路**：`$_SESSION['password']`和`$password`为空。简单说就是，删除 `PHPSESSID` 强制服务器生成未初始化的空 Session（其值为 `NULL`），并传入空字符串密码（`""`），利用 PHP 底层 `"" == NULL` 恒为真的弱比较漏洞，成功绕过了登录验证。
2. bp抓包修改。<u></u>![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549137631_wjai93.png)
3. ![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549137631_wjai93.png)

![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549139377_0smgo4.png)

4. 得到flag![](https://img.jasmine-iris.top/posts/PHP弱比较/1786549141942_n83y9t.png)